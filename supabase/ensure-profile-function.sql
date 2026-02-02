-- Run this in Supabase SQL Editor once. Fixes "parent cannot sign in" when profile is missing.
-- Creates a function that ensures the logged-in user has a profile (bypasses RLS).

create or replace function public.ensure_profile()
returns json
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  u_role text;
  result json;
begin
  select coalesce(nullif(trim(u.raw_user_meta_data->>'role'), ''), 'student') into u_role
  from auth.users u where u.id = auth.uid();
  if u_role not in ('student', 'parent', 'admin') then
    u_role := 'student';
  end if;
  insert into public.profiles (id, email, full_name, role)
  select
    u.id,
    coalesce(u.email, ''),
    u.raw_user_meta_data->>'full_name',
    u_role
  from auth.users u
  where u.id = auth.uid()
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, profiles.full_name),
    role = excluded.role,
    updated_at = now();
  select row_to_json(p) into result from public.profiles p where p.id = auth.uid();
  return result;
end;
$$;

grant execute on function public.ensure_profile() to authenticated;
grant execute on function public.ensure_profile() to service_role;
