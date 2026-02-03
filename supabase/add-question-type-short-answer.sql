-- Add short-answer question type: student types answer; admin sets correct answer and explanation.
-- Run in Supabase SQL Editor if your DB was created before this change.

alter table public.questions
  add column if not exists question_type text not null default 'multiple_choice'
    check (question_type in ('multiple_choice', 'short_answer'));

alter table public.questions
  add column if not exists correct_answer_text text;

comment on column public.questions.question_type is 'multiple_choice = pick from options; short_answer = student types answer, compared to correct_answer_text.';
comment on column public.questions.correct_answer_text is 'For short_answer: expected answer (trimmed, case-insensitive compare).';
