-- Run as the project owner in Supabase SQL Editor after 20261013_admin.sql.
-- Grants only the existing, confirmed designated account a server-managed role.
begin;
do $$
declare
  admin_id uuid;
begin
  select id into admin_id from auth.users
  where lower(email) = 'rmmlvnc@gmail.com' and email_confirmed_at is not null;
  if admin_id is null then
    raise exception 'Register and confirm rmmlvnc@gmail.com before assigning staff access';
  end if;
  insert into public.hq_staff(user_id) values (admin_id)
  on conflict (user_id) do nothing;
end;
$$;
commit;

select u.email, s.created_at
from public.hq_staff s join auth.users u on u.id = s.user_id
where lower(u.email) = 'rmmlvnc@gmail.com';
