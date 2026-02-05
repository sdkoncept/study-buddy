-- Table for teacher/admin to upload student work (e.g. drawing) and score external_answer questions.
-- Run in Supabase SQL Editor after add-question-type-external-answer.sql

create table if not exists public.external_answer_grades (
  id uuid primary key default uuid_generate_v4(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  image_url text,
  score int not null check (score >= 0 and score <= 100),
  graded_by uuid not null references auth.users(id) on delete cascade,
  graded_at timestamptz default now(),
  unique(attempt_id, question_id)
);

alter table public.external_answer_grades enable row level security;

-- Admins can do everything
create policy "Admin manage external_answer_grades"
  on public.external_answer_grades for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Parents can insert/update grades for their linked students' attempts
create policy "Parents can grade linked students external answers"
  on public.external_answer_grades for all to authenticated
  using (
    exists (
      select 1 from public.quiz_attempts qa
      join public.parent_students ps on ps.student_id = qa.user_id and ps.parent_id = auth.uid()
      where qa.id = attempt_id
    )
  );

-- Admin can read all quiz attempts (for /admin/attempts page)
create policy "Admin can read all quiz attempts"
  on public.quiz_attempts for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
