-- Database hardening: lock every table and storage bucket to "backend only".
--
-- BEFORE running this, deploy the backend that uses SUPABASE_SERVICE_ROLE_KEY for data and storage
-- (and set that variable where the backend runs, e.g. Render). The OLD backend reads and writes with the
-- anon key and stops working the moment this is applied. The new code works with or without this SQL.
--
-- What it fixes (found by the Supabase security advisor and by reading pg_policies):
--   1. Row level security was OFF on profiles, posts, comments, files, tags, post_tags and "KeepAlive",
--      so anyone holding the anon key could read or change every row.
--   2. post_views and file_downloads had policies named "Service role ..." that actually grant `public`
--      (everyone) full insert and read.
--   3. Storage policies on the `exams` bucket allowed anyone to read, upload, overwrite and delete exam
--      files, and `avatars` allowed anyone to write. The backend now uses the service role for storage.
--
-- Tested: the RLS part was applied to the live project for a few minutes with the new backend (26 of 26
-- smoke checks passed, and the anon key saw 0 rows on all seven tables), then rolled back. The policy drops
-- in section UP were reviewed but NOT executed during that test, so run and check them when you apply this.
--
-- RLS with no policy denies anon and authenticated users; the service role bypasses RLS.
-- Reads against "KeepAlive" with the anon key still answer 200 (an empty list), so a keep-alive ping keeps working.
-- The DOWN section at the bottom restores the previous state exactly.

-- ============ UP ============

alter table public.profiles   enable row level security;
alter table public.posts      enable row level security;
alter table public.comments   enable row level security;
alter table public.files      enable row level security;
alter table public.tags       enable row level security;
alter table public.post_tags  enable row level security;
alter table public."KeepAlive" enable row level security;

-- Views and downloads are written and read by the backend only.
drop policy if exists "Service role can insert downloads"       on public.file_downloads;
drop policy if exists "Service role can read all downloads"     on public.file_downloads;
drop policy if exists "Service role can insert post views"      on public.post_views;
drop policy if exists "Service role can read all post views"    on public.post_views;

-- Storage: exam files are served through short-lived signed URLs created by the backend, and avatars are
-- a public bucket (public URLs need no policy). Nobody needs direct anon access to either.
drop policy if exists "Do everything for logged in user 1lpwz8_0" on storage.objects;
drop policy if exists "Do everything for logged in user 1lpwz8_1" on storage.objects;
drop policy if exists "Do everything for logged in user 1lpwz8_2" on storage.objects;
drop policy if exists "Do everything for logged in user 1lpwz8_3" on storage.objects;
drop policy if exists "TAKE IT ALL 1oj01fe_0" on storage.objects;
drop policy if exists "TAKE IT ALL 1oj01fe_1" on storage.objects;
drop policy if exists "TAKE IT ALL 1oj01fe_2" on storage.objects;
drop policy if exists "TAKE IT ALL 1oj01fe_3" on storage.objects;

-- ============ DOWN (run to restore the previous state exactly) ============
-- alter table public.profiles   disable row level security;
-- alter table public.posts      disable row level security;
-- alter table public.comments   disable row level security;
-- alter table public.files      disable row level security;
-- alter table public.tags       disable row level security;
-- alter table public.post_tags  disable row level security;
-- alter table public."KeepAlive" disable row level security;
--
-- create policy "Service role can insert downloads"    on public.file_downloads for insert to public with check (true);
-- create policy "Service role can read all downloads"  on public.file_downloads for select to public using (true);
-- create policy "Service role can insert post views"   on public.post_views     for insert to public with check (true);
-- create policy "Service role can read all post views" on public.post_views     for select to public using (true);
--
-- create policy "Do everything for logged in user 1lpwz8_0" on storage.objects for select to public using (bucket_id = 'exams');
-- create policy "Do everything for logged in user 1lpwz8_1" on storage.objects for insert to public with check (bucket_id = 'exams');
-- create policy "Do everything for logged in user 1lpwz8_2" on storage.objects for update to public using (bucket_id = 'exams');
-- create policy "Do everything for logged in user 1lpwz8_3" on storage.objects for delete to public using (bucket_id = 'exams');
-- create policy "TAKE IT ALL 1oj01fe_0" on storage.objects for select to public using (bucket_id = 'avatars');
-- create policy "TAKE IT ALL 1oj01fe_1" on storage.objects for insert to public with check (bucket_id = 'avatars');
-- create policy "TAKE IT ALL 1oj01fe_2" on storage.objects for update to public using (bucket_id = 'avatars');
-- create policy "TAKE IT ALL 1oj01fe_3" on storage.objects for delete to public using (bucket_id = 'avatars');
