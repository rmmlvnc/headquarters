-- Run once in Supabase SQL Editor as the project owner.
begin;
create table public.hq_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.hq_staff enable row level security;
create policy staff_read_self on public.hq_staff for select to authenticated using (user_id = auth.uid());
create function public.hq_is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.hq_staff where user_id = auth.uid());
$$;
revoke all on function public.hq_is_admin() from public;
grant execute on function public.hq_is_admin() to authenticated;

create table public.hq_resources (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 120),
 kind text not null check(kind in ('Desk','Room','Equipment')), capacity integer not null check(capacity between 1 and 1000),
 hourly_rate numeric(12,2) not null check(hourly_rate >= 0), active boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.hq_plans (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 120),
 price numeric(12,2) not null check(price >= 0), valid_days integer not null check(valid_days between 1 and 3660),
 included_hours integer not null check(included_hours between 1 and 10000), active boolean not null default true
);
create table public.hq_memberships (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 plan_id uuid not null references public.hq_plans(id), expires_at timestamptz not null,
 remaining_hours integer not null check(remaining_hours >= 0), status text not null default 'active' check(status in ('active','suspended')),
 created_at timestamptz not null default now()
);
create table public.hq_reservations (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 resource_id uuid not null references public.hq_resources(id), starts_at timestamptz not null, ends_at timestamptz not null,
 status text not null default 'reserved' check(status in ('reserved','checked-in','completed','cancelled')),
 quoted_total numeric(12,2) not null check(quoted_total >= 0), hourly_rate numeric(12,2) not null check(hourly_rate >= 0),
 overtime_due numeric(12,2) not null default 0 check(overtime_due >= 0), refund_estimate numeric(12,2) not null default 0,
 checked_in_at timestamptz, checked_out_at timestamptz, created_at timestamptz not null default now(),
 check(ends_at > starts_at)
);
create index hq_reservation_slot on public.hq_reservations(resource_id,starts_at,ends_at) where status in ('reserved','checked-in');
create table public.hq_payments (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 reservation_id uuid references public.hq_reservations(id), amount numeric(12,2) not null check(amount >= 0),
 status text not null check(status in ('pending','paid','failed','refunded')), provider_reference text unique,
 created_at timestamptz not null default now()
);
create table public.hq_refunds (
 id uuid primary key default gen_random_uuid(), reservation_id uuid not null references public.hq_reservations(id),
 amount numeric(12,2) not null check(amount >= 0), reason text not null,
 status text not null default 'requested' check(status in ('requested','approved','rejected')),
 created_at timestamptz not null default now(), reviewed_at timestamptz
);
create unique index hq_one_refund on public.hq_refunds(reservation_id);
create table public.hq_policy (
 id integer primary key default 1 check(id = 1), free_cancellation_hours integer not null default 24 check(free_cancellation_hours between 0 and 720)
);
insert into public.hq_policy(id) values(1);
create table public.hq_audit (
 id bigint generated always as identity primary key, actor uuid references auth.users(id), action text not null,
 record_id text, created_at timestamptz not null default now()
);

-- Staff can maintain inventory and plans; all reservation transitions go through locked server functions.
do $$ declare t text; begin
 foreach t in array array['hq_resources','hq_plans','hq_memberships','hq_reservations','hq_payments','hq_refunds','hq_policy','hq_audit'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy staff_read on public.%I for select to authenticated using (public.hq_is_admin())',t);
 end loop;
 foreach t in array array['hq_resources','hq_plans','hq_memberships','hq_policy'] loop
  execute format('create policy staff_insert on public.%I for insert to authenticated with check (public.hq_is_admin())',t);
  execute format('create policy staff_update on public.%I for update to authenticated using (public.hq_is_admin()) with check (public.hq_is_admin())',t);
 end loop;
end $$;
-- Members can read their own server reservations/memberships/payments; no client billing writes.
create policy own_reservations on public.hq_reservations for select to authenticated using(user_id=auth.uid());
create policy own_memberships on public.hq_memberships for select to authenticated using(user_id=auth.uid());
create policy own_payments on public.hq_payments for select to authenticated using(user_id=auth.uid());

create function public.hq_log_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.hq_audit(actor,action,record_id) values(auth.uid(),tg_table_name||':'||tg_op,new.id::text);
 return new;
end $$;
do $$ declare t text; begin
 foreach t in array array['hq_resources','hq_plans','hq_memberships','hq_policy','hq_reservations','hq_refunds'] loop
 execute format('create trigger log_change after insert or update on public.%I for each row execute function public.hq_log_change()',t);
 end loop;
end $$;

create function public.hq_create_reservation(p_user uuid,p_resource uuid,p_start timestamptz,p_end timestamptz) returns uuid
language plpgsql security definer set search_path='' as $$
declare r public.hq_resources; peak integer; new_id uuid;
begin
 if not public.hq_is_admin() then raise exception 'Staff access required'; end if;
 select * into r from public.hq_resources where id=p_resource for update;
 if not found or not r.active then raise exception 'Resource unavailable'; end if;
 if p_start is null or p_end is null or p_start<now() or p_end<=p_start or p_end>p_start+interval '24 hours' then raise exception 'Choose a future slot of up to 24 hours'; end if;
 -- Evaluate occupancy at the new start and every existing start within the slot.
 select coalesce(max((select count(*) from public.hq_reservations b where b.resource_id=p_resource and b.status in ('reserved','checked-in') and b.starts_at<=points.t and b.ends_at>points.t)),0)
 into peak from (select p_start as t union select starts_at from public.hq_reservations where resource_id=p_resource and status in ('reserved','checked-in') and starts_at>=p_start and starts_at<p_end) points;
 if peak >= r.capacity then raise exception 'Resource is fully booked for this slot'; end if;
 insert into public.hq_reservations(user_id,resource_id,starts_at,ends_at,quoted_total,hourly_rate)
 values(p_user,p_resource,p_start,p_end,ceil(extract(epoch from(p_end-p_start))/3600)*r.hourly_rate,r.hourly_rate) returning id into new_id;
 return new_id;
end $$;
create function public.hq_reservation_action(p_id uuid,p_action text) returns void
language plpgsql security definer set search_path='' as $$
declare b public.hq_reservations; refund numeric; cutoff integer;
begin
 if not public.hq_is_admin() then raise exception 'Staff access required'; end if;
 select * into b from public.hq_reservations where id=p_id for update;
 if not found then raise exception 'Reservation not found'; end if;
 if p_action='check-in' then
  if b.status<>'reserved' or now()<b.starts_at or now()>=b.ends_at then raise exception 'Check-in requires an active reserved time slot'; end if;
  update public.hq_reservations set status='checked-in',checked_in_at=now() where id=p_id;
 elsif p_action='check-out' then
  if b.status<>'checked-in' then raise exception 'Reservation is not checked in'; end if;
  update public.hq_reservations set status='completed',checked_out_at=now(),overtime_due=greatest(0,ceil(extract(epoch from(now()-b.ends_at))/3600))*b.hourly_rate where id=p_id;
 elsif p_action='cancel' then
  if b.status<>'reserved' then raise exception 'Only reserved bookings can be cancelled'; end if;
  select free_cancellation_hours into cutoff from public.hq_policy where id=1;
  refund=case when b.starts_at>=now()+make_interval(hours=>cutoff) then b.quoted_total else 0 end;
  update public.hq_reservations set status='cancelled',refund_estimate=refund where id=p_id;
  -- Refunds must be tied to a collected payment, never merely a booking quote.
  if refund>0 and exists(select 1 from public.hq_payments where reservation_id=p_id and status='paid') then
   insert into public.hq_refunds(reservation_id,amount,reason) select p_id,least(refund,sum(amount)),'Eligible cancellation' from public.hq_payments where reservation_id=p_id and status='paid';
  end if;
 else raise exception 'Unknown reservation action'; end if;
end $$;
create function public.hq_review_refund(p_id uuid,p_decision text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.hq_is_admin() then raise exception 'Staff access required'; end if;
 if p_decision not in ('approved','rejected') then raise exception 'Invalid review decision'; end if;
 update public.hq_refunds set status=p_decision,reviewed_at=now() where id=p_id and status='requested';
 if not found then raise exception 'Refund was already reviewed or does not exist'; end if;
 -- Approval is a review decision only. A payment-provider webhook must confirm money returned.
end $$;
revoke all on function public.hq_create_reservation(uuid,uuid,timestamptz,timestamptz) from public;
revoke all on function public.hq_reservation_action(uuid,text) from public;
revoke all on function public.hq_review_refund(uuid,text) from public;
grant execute on function public.hq_create_reservation(uuid,uuid,timestamptz,timestamptz), public.hq_reservation_action(uuid,text), public.hq_review_refund(uuid,text) to authenticated;
-- Explicit privileges plus RLS. Staff-role assignment is project-owner-only.
revoke all on public.hq_staff from anon,authenticated;
grant select on public.hq_staff to authenticated;
grant select on public.hq_resources,public.hq_plans,public.hq_memberships,public.hq_reservations,public.hq_payments,public.hq_refunds,public.hq_policy,public.hq_audit to authenticated;
grant insert,update on public.hq_resources,public.hq_plans,public.hq_memberships,public.hq_policy to authenticated;
revoke insert,update,delete on public.hq_reservations,public.hq_payments,public.hq_refunds,public.hq_audit from anon,authenticated;

insert into public.hq_resources(name,kind,capacity,hourly_rate) values
 ('Standard Station','Desk',12,35),('Private Station','Desk',6,55),('Premium Solo','Desk',4,75),('Meeting Room','Room',2,250),('Laptop','Equipment',4,50),('Projector','Equipment',2,80),('Locker','Equipment',10,10);
insert into public.hq_plans(name,price,valid_days,included_hours) values('Daily Pass',250,1,8),('Flex Membership',1800,30,60),('Pro Membership',3200,30,120);
create function public.hq_list_members() returns table(id uuid,email text,full_name text,mobile_number text) language plpgsql stable security definer set search_path='' as $$
begin
 if not public.hq_is_admin() then raise exception 'Staff access required'; end if;
 return query select u.id,u.email::text,u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'mobile_number' from auth.users u order by u.created_at desc limit 500;
end $$;
create function public.hq_grant_membership(p_user uuid,p_plan uuid) returns void language plpgsql security definer set search_path='' as $$
declare p public.hq_plans; m public.hq_memberships;
begin
 if not public.hq_is_admin() then raise exception 'Staff access required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select * into p from public.hq_plans where id=p_plan and active;
 if not found then raise exception 'Plan is unavailable'; end if;
 select * into m from public.hq_memberships where user_id=p_user and status='active' and expires_at>now() order by expires_at desc limit 1 for update;
 if found then
  if m.plan_id<>p_plan then raise exception 'Member already has a different active plan'; end if;
  update public.hq_memberships set expires_at=expires_at+make_interval(days=>p.valid_days),remaining_hours=remaining_hours+p.included_hours where id=m.id;
 else
  insert into public.hq_memberships(user_id,plan_id,expires_at,remaining_hours) values(p_user,p_plan,now()+make_interval(days=>p.valid_days),p.included_hours);
 end if;
end $$;
revoke all on function public.hq_list_members(),public.hq_grant_membership(uuid,uuid) from public;
grant execute on function public.hq_list_members(),public.hq_grant_membership(uuid,uuid) to authenticated;
commit;

