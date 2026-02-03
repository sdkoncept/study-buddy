-- Add week_range to topics so the same subject can have multiple uploads (e.g. Mathematics Term 1 vs Term 2, different weeks/topics).
-- Run in Supabase SQL Editor if your DB was created before this change.

alter table public.topics
  add column if not exists week_range text;

comment on column public.topics.week_range is 'e.g. "1 & 2", "3", "4-5" from scheme of work; allows multiple PDF uploads per subject with different weeks.';
