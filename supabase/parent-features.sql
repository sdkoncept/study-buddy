-- Run in Supabase SQL Editor once. Adds parent goals, parent messages, and RLS.

-- Weekly goal: parent sets how many topics they want the child to complete per week
create table if not exists public.parent_goals (
  parent_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  topics_per_week int not null default 2,
  updated_at timestamptz default now(),
  primary key (parent_id, student_id)
);

-- Message from parent to child (one active message per parent-student; new overwrites or we keep history - keep last one only for simplicity)
create table if not exists public.parent_messages (
  id uuid primary key default uuid_generate_v4(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

alter table public.parent_goals enable row level security;
alter table public.parent_messages enable row level security;

create policy "Parents manage own goals" on public.parent_goals for all using (parent_id = auth.uid());
create policy "Students read own goals" on public.parent_goals for select using (student_id = auth.uid());

create policy "Parents manage own messages" on public.parent_messages for all using (parent_id = auth.uid());
create policy "Students read messages for self" on public.parent_messages for select using (student_id = auth.uid());
