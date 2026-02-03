-- Allow multiple correct options for multiple-choice questions (student can pick more than one).
-- Run in Supabase SQL Editor.

alter table public.questions
  add column if not exists correct_indices jsonb default '[]'::jsonb;

comment on column public.questions.correct_indices is 'For multiple_choice: array of correct option indices (e.g. [0, 2]). If empty, correct_index is used as single correct.';

-- Backfill: existing questions get correct_indices = [correct_index]
update public.questions
  set correct_indices = jsonb_build_array(correct_index)
  where correct_indices = '[]'::jsonb or correct_indices is null;
