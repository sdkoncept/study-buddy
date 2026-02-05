-- Add image_url to questions table for image-based questions (e.g. diagrams)
-- Run in Supabase SQL Editor: Dashboard → SQL Editor → New query

ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS image_url text;
