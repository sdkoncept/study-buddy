-- Storage RLS policies for lesson-images bucket
-- Required for: PDF notes upload, question image upload
-- Run in Supabase SQL Editor: Dashboard → SQL Editor → New query
--
-- Prerequisite: Bucket "lesson-images" must exist (Storage → New bucket, name: lesson-images, Public)

-- Admins can upload (insert) to lesson-images
create policy "Admins can upload to lesson-images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'lesson-images'
  and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Parents can upload to external-answers/ (student work for grading)
create policy "Parents can upload external answer images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'lesson-images'
  and (storage.foldername(name))[1] = 'external-answers'
  and exists (select 1 from public.profiles where id = auth.uid() and role = 'parent')
);

-- Public can read (select) from lesson-images (for public bucket)
create policy "Public can read lesson-images"
on storage.objects
for select
to public
using (bucket_id = 'lesson-images');
