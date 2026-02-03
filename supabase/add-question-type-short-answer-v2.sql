-- Add short-answer columns (minimal version; run if the main migration fails).
-- Run in Supabase SQL Editor.

alter table public.questions add column if not exists question_type text not null default 'multiple_choice';
alter table public.questions add column if not exists correct_answer_text text;
