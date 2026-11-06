-- Run once after the existing HeadQuarters migrations.
-- Stores Expo push tokens in Supabase. Tokens are tied to the signed-in user.

begin;

create table if not exists public.hq_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique check (length(token) between 20 and 300),
  platform text not null check (platform in ('android', 'ios')),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists hq_push_tokens_user_idx on public.hq_push_tokens(user_id);
alter table public.hq_push_tokens enable row level security;

create policy "member_read_own_push_tokens" on public.hq_push_tokens
  for select to authenticated using (user_id = auth.uid());
create policy "member_insert_own_push_tokens" on public.hq_push_tokens
  for insert to authenticated with check (user_id = auth.uid());
create policy "member_update_own_push_tokens" on public.hq_push_tokens
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "staff_read_push_tokens" on public.hq_push_tokens
  for select to authenticated using (public.hq_is_admin());

grant select, insert, update on public.hq_push_tokens to authenticated;

commit;
