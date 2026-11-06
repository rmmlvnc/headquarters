-- HeadQuarters: secure QR access for paid/approved reservations.
-- Run once AFTER 20261013_admin.sql. Do not re-run the original admin migration.

begin;

alter table public.hq_reservations
  add column if not exists access_token uuid unique,
  add column if not exists access_token_expires_at timestamptz;

create index if not exists hq_reservations_access_token_idx
  on public.hq_reservations(access_token)
  where access_token is not null;

-- A member creates a real server reservation. The server locks the resource,
-- checks capacity, and calculates the quote; the client does not set the price.
create or replace function public.hq_member_create_reservation(
  p_resource uuid,
  p_start timestamptz,
  p_end timestamptz
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  r public.hq_resources;
  peak integer;
  new_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  select * into r from public.hq_resources where id = p_resource for update;
  if not found or not r.active then raise exception 'Resource unavailable'; end if;
  if p_start is null or p_end is null or p_start < now() or p_end <= p_start
    or p_end > p_start + interval '24 hours' then
    raise exception 'Choose a future slot of up to 24 hours';
  end if;
  select coalesce(max((select count(*) from public.hq_reservations b
    where b.resource_id = p_resource and b.status in ('reserved','checked-in')
      and b.starts_at <= points.t and b.ends_at > points.t)), 0)
  into peak
  from (
    select p_start as t
    union
    select starts_at from public.hq_reservations
      where resource_id = p_resource and status in ('reserved','checked-in')
        and starts_at >= p_start and starts_at < p_end
  ) points;
  if peak >= r.capacity then raise exception 'Resource is fully booked for this slot'; end if;
  insert into public.hq_reservations(user_id, resource_id, starts_at, ends_at, quoted_total, hourly_rate)
  values (
    auth.uid(), p_resource, p_start, p_end,
    ceil(extract(epoch from (p_end - p_start)) / 3600) * r.hourly_rate,
    r.hourly_rate
  ) returning id into new_id;
  return new_id;
end;
$$;

-- Issues an opaque, unpredictable QR token. It includes no name, email, price,
-- or reservation details. A paid payment record is required before issuance.
create or replace function public.hq_issue_access_pass(p_reservation uuid)
returns table(token uuid, valid_from timestamptz, valid_until timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  b public.hq_reservations;
  new_token uuid;
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  select * into b from public.hq_reservations
    where id = p_reservation and user_id = auth.uid() for update;
  if not found then raise exception 'Reservation not found'; end if;
  if b.status <> 'reserved' then raise exception 'Only an active reservation can receive an access pass'; end if;
  if b.ends_at <= now() then raise exception 'This reservation has expired'; end if;
  if not exists (
    select 1 from public.hq_payments p
      where p.reservation_id = b.id and p.status = 'paid'
  ) then raise exception 'Payment or staff approval is required before QR access is available'; end if;
  new_token := pg_catalog.gen_random_uuid();
  update public.hq_reservations
    set access_token = new_token, access_token_expires_at = b.ends_at
    where id = b.id;
  return query select new_token, b.starts_at, b.ends_at;
end;
$$;

-- Staff scanner validation. The token is checked server-side before any state change.
create or replace function public.hq_validate_access_pass(p_token uuid, p_action text)
returns table(reservation_id uuid, resource_name text, status text, checked_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  b public.hq_reservations;
  resource_label text;
begin
  if not public.hq_is_admin() then raise exception 'Staff access required'; end if;
  select * into b from public.hq_reservations
    where access_token = p_token for update;
  if not found then raise exception 'Invalid QR access pass'; end if;
  if b.access_token_expires_at is null or b.access_token_expires_at < now() then
    raise exception 'This QR access pass has expired';
  end if;
  select name into resource_label from public.hq_resources where id = b.resource_id;
  if p_action = 'check-in' then
    if b.status <> 'reserved' or now() < b.starts_at or now() >= b.ends_at then
      raise exception 'Check-in is not valid for this reservation at this time';
    end if;
    update public.hq_reservations set status = 'checked-in', checked_in_at = now()
      where id = b.id;
  elsif p_action = 'check-out' then
    if b.status <> 'checked-in' then raise exception 'Reservation is not checked in'; end if;
    update public.hq_reservations
      set status = 'completed', checked_out_at = now(),
        overtime_due = greatest(0, ceil(extract(epoch from (now() - b.ends_at)) / 3600)) * b.hourly_rate
      where id = b.id;
  else
    raise exception 'Unknown QR action';
  end if;
  return query
    select b.id, resource_label,
      case when p_action = 'check-in' then 'checked-in' else 'completed' end,
      now();
end;
$$;

revoke all on function public.hq_member_create_reservation(uuid,timestamptz,timestamptz) from public;
revoke all on function public.hq_issue_access_pass(uuid) from public;
revoke all on function public.hq_validate_access_pass(uuid,text) from public;
grant execute on function public.hq_member_create_reservation(uuid,timestamptz,timestamptz),
  public.hq_issue_access_pass(uuid), public.hq_validate_access_pass(uuid,text)
  to authenticated;

commit;
