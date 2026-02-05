-- Add external_answer question type: student answers outside the platform (e.g. draws on paper).
-- Run in Supabase SQL Editor if your DB was created before this change.

-- Drop existing check (PostgreSQL names it questions_question_type_check for inline column check)
alter table public.questions drop constraint if exists questions_question_type_check;

alter table public.questions add constraint questions_question_type_check
  check (question_type in ('multiple_choice', 'short_answer', 'external_answer'));

comment on column public.questions.question_type is 'multiple_choice = pick from options; short_answer = type answer; external_answer = answer on paper / outside platform (e.g. drawing).';
