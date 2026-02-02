-- Run in Supabase SQL Editor if a user can sign in (Auth works) but gets sent back to login.
-- This creates profile rows for any auth users that don't have one yet.
-- Replace 'parent' with the correct role for each user if needed.

insert into public.profiles (id, email, full_name, role)
select
  u.id,
  u.email,
  u.raw_user_meta_data->>'full_name',
  coalesce(u.raw_user_meta_data->>'role', 'student')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do update set
  email = excluded.email,
  full_name = coalesce(excluded.full_name, profiles.full_name),
  updated_at = now();
