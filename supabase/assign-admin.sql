-- First register and confirm your own account in the app.
-- Replace the email below with your account email, then run in SQL Editor.
insert into public.hq_staff(user_id)
select id from auth.users where lower(email)=lower('REPLACE_WITH_YOUR_ADMIN_EMAIL')
on conflict(user_id) do nothing;
-- Verify that exactly the intended account was granted staff access:
select u.email,s.created_at from public.hq_staff s join auth.users u on u.id=s.user_id;
