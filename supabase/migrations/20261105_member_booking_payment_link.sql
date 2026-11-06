-- Run once AFTER 20261105_secure_qr_access.sql and 20261105_paypal_sandbox.sql.
-- Connects member-created reservations to payment records and QR access passes.

begin;

-- Align the original seed inventory with the customer-facing HeadQuarters offers.
update public.hq_resources set hourly_rate = 45 where name = 'Standard Station';
update public.hq_resources set hourly_rate = 60 where name = 'Private Station';
update public.hq_resources set name = 'Huddle Room', hourly_rate = 280, capacity = 8
  where name = 'Meeting Room';

-- Customers may see only currently active resources; all writes remain server functions.
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public'
      and tablename = 'hq_resources' and policyname = 'member_read_active_resources'
  ) then
    create policy member_read_active_resources on public.hq_resources
      for select to authenticated using (active);
  end if;
end $$;

-- Members may view active offers while only staff may edit them.
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public'
      and tablename = 'hq_plans' and policyname = 'member_read_active_plans'
  ) then
    create policy member_read_active_plans on public.hq_plans
      for select to authenticated using (active);
  end if;
end $$;

-- Members can refresh only their own server-created bookings.
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public'
      and tablename = 'hq_reservations' and policyname = 'member_read_own_reservations'
  ) then
    create policy member_read_own_reservations on public.hq_reservations
      for select to authenticated using (user_id = auth.uid());
  end if;
end $$;

alter table public.hq_paypal_orders
  add column if not exists reservation_id uuid references public.hq_reservations(id);
create index if not exists hq_paypal_orders_reservation_idx
  on public.hq_paypal_orders(reservation_id)
  where reservation_id is not null;

-- Cash requests are recorded on the server as pending. Staff must change them
-- to paid before a QR pass can be issued.
create or replace function public.hq_member_request_cash_payment(p_reservation uuid)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  b public.hq_reservations;
  payment_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  select * into b from public.hq_reservations
    where id = p_reservation and user_id = auth.uid() for update;
  if not found then raise exception 'Reservation not found'; end if;
  if b.status <> 'reserved' or b.ends_at <= now() then
    raise exception 'This reservation is not available for a cash-payment request';
  end if;
  select id into payment_id from public.hq_payments
    where reservation_id = b.id and status in ('pending','paid')
    order by created_at desc limit 1;
  if payment_id is not null then return payment_id; end if;
  insert into public.hq_payments(user_id, reservation_id, amount, status, provider_reference)
    values (auth.uid(), b.id, b.quoted_total, 'pending', 'cash:' || pg_catalog.gen_random_uuid())
    returning id into payment_id;
  return payment_id;
end;
$$;

revoke all on function public.hq_member_request_cash_payment(uuid) from public;
grant execute on function public.hq_member_request_cash_payment(uuid) to authenticated;

commit;
