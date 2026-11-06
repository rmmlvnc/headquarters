-- Run after 20261013_admin.sql. This records server-created PayPal orders only.
begin;

create table public.hq_paypal_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id text not null unique,
  purchase_kind text not null check (purchase_kind in ('booking','membership')),
  title text not null,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'created' check (status in ('created','captured','failed')),
  created_at timestamptz not null default now(),
  captured_at timestamptz
);

alter table public.hq_paypal_orders enable row level security;
create policy own_paypal_orders on public.hq_paypal_orders for select to authenticated using (user_id = auth.uid());
create policy staff_read_paypal_orders on public.hq_paypal_orders for select to authenticated using (public.hq_is_admin());
revoke all on public.hq_paypal_orders from anon, authenticated;
grant select on public.hq_paypal_orders to authenticated;
commit;
