-- Reset all content from PDF uploads and manual entry: topics, lessons, questions.
-- Keeps: subjects, profiles, parent_students (users and links stay).
-- Run in Supabase SQL Editor when you want to start fresh with the new implementations.

-- Order matters: delete dependent rows first (progress and attempts), then questions, lessons, topics.
delete from public.lesson_progress;
delete from public.quiz_attempts;
delete from public.questions;
delete from public.lessons;
delete from public.topics;

-- Optional: also remove all subjects so you can re-seed from schema (uncomment if needed):
-- delete from public.topics;   -- already done above
-- delete from public.subjects;

-- After running this, re-run supabase/schema.sql if you want seed data (Mathematics & English),
-- or create subjects and upload PDFs again via Admin → Upload notes.
--
-- To also remove uploaded PDF page images: Supabase Dashboard → Storage → lesson-images
-- → select all objects and delete (or leave them; they will just be orphaned).
