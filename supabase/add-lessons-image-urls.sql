-- Add image_urls to lessons for multiple images per lesson (e.g. from PDF page extraction).
-- Run in Supabase SQL Editor if your DB was created before this change.

alter table public.lessons
  add column if not exists image_urls jsonb default '[]'::jsonb;

comment on column public.lessons.image_urls is 'Array of image URLs (e.g. from PDF upload). When set, these are shown in addition to image_url.';
