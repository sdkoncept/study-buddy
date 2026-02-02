-- Run this once in Supabase SQL Editor if parent gets "No account found with that email"
-- when linking a child. It lets parents look up students by email so the link can be created.

create policy "Parents can look up students by email for linking" on public.profiles
  for select using (
    (select p.role from public.profiles p where p.id = auth.uid()) = 'parent'
    and role = 'student'
  );
