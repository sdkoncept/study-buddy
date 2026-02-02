-- Fix: "infinite recursion detected in policy for relation profiles"
-- The old policy queried profiles inside a profiles policy. Replace with a SECURITY DEFINER helper.

-- 1. Drop the recursive policy
drop policy if exists "Parents can look up students by email for linking" on public.profiles;

-- 2. Helper: returns true if current user is a parent (reads profiles with definer rights, no RLS recursion)
create or replace function public.is_parent()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'parent');
$$;

-- 3. New policy: parents can select student rows only (no subquery on profiles)
create policy "Parents can look up students by email for linking" on public.profiles
  for select using (public.is_parent() and role = 'student');
