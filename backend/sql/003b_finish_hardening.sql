-- Finishes 003_database_hardening.sql. Run this in the Supabase SQL editor.
--
-- 003 was applied to the live project EXCEPT the statements below. They remove access or delete things, so the
-- assistant that applied the rest was not allowed to run them. Until they run, these holes are still open to
-- anyone holding the public anon key:
--   - reading and inserting rows in post_views and file_downloads (IP addresses, fake counts)
--   - listing, downloading, uploading, overwriting and deleting exam files, and writing to the avatars bucket
--   - the table privileges (TRUNCATE and so on) that anon and authenticated still hold
--   - deleting a user from the admin screen (the function does not exist yet)
--
-- It is safe to run more than once. Each statement is explained; the DOWN section restores the previous state.

-- ============ UP ============

-- 1. The old policies that gave everyone (role `public`) full access to the visitor logs.
drop policy if exists "Service role can insert downloads"    on public.file_downloads;
drop policy if exists "Service role can read all downloads"  on public.file_downloads;
drop policy if exists "Service role can insert post views"   on public.post_views;
drop policy if exists "Service role can read all post views" on public.post_views;

-- 2. The old storage policies. The new ones (applied) tie reads to a visible post and writes to the owner.
drop policy if exists "Do everything for logged in user 1lpwz8_0" on storage.objects;
drop policy if exists "Do everything for logged in user 1lpwz8_1" on storage.objects;
drop policy if exists "Do everything for logged in user 1lpwz8_2" on storage.objects;
drop policy if exists "Do everything for logged in user 1lpwz8_3" on storage.objects;
drop policy if exists "TAKE IT ALL 1oj01fe_0" on storage.objects;
drop policy if exists "TAKE IT ALL 1oj01fe_1" on storage.objects;
drop policy if exists "TAKE IT ALL 1oj01fe_2" on storage.objects;
drop policy if exists "TAKE IT ALL 1oj01fe_3" on storage.objects;

-- 3. Table privileges: anon and authenticated held ALL (even TRUNCATE). Give back only what each needs.
--    One statement block, so there is no moment with no access.
revoke all on table
  public.profiles, public.posts, public.comments, public.files, public.tags, public.post_tags,
  public.post_likes, public.post_views, public.file_downloads, public."KeepAlive",
  public.post_embeddings, public.moderation_log
from anon, authenticated;

grant select on table
  public.profiles, public.posts, public.comments, public.files, public.tags, public.post_tags,
  public.post_likes, public.post_embeddings, public."KeepAlive"
to anon, authenticated;
grant update on public.profiles to authenticated;
grant insert, update, delete on public.posts, public.comments to authenticated;
grant insert, delete on public.files to authenticated;
grant insert on public.tags to authenticated;
grant insert, update, delete on public.post_tags to authenticated;
grant insert, delete on public.post_likes to authenticated;
grant usage, select on sequence public.post_likes_id_seq to authenticated;
grant insert, update, delete on public.post_embeddings to authenticated;
grant select, insert on public.moderation_log to authenticated;

-- 4. New functions are executable by everyone by default; keep only the intended callers.
revoke all on function
  public.record_post_view(integer, text), public.record_file_download(integer, integer, text),
  public.post_view_counts(bigint[]), public.file_download_counts(bigint[]), public.engagement_totals(),
  public.admin_list_users(), public.is_admin()
from public;
grant execute on function
  public.record_post_view(integer, text), public.record_file_download(integer, integer, text),
  public.post_view_counts(bigint[]), public.file_download_counts(bigint[]), public.engagement_totals(), public.is_admin()
to anon, authenticated;
grant execute on function public.admin_list_users() to authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- 5. Admin only: delete an account. The database cascades to the profile, posts, comments and files rows.
create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'you cannot delete your own account here' using errcode = '42501';
  end if;
  delete from auth.users where id = p_user_id;
end
$$;
revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- ============ DOWN (restores the open policies and privileges) ============
-- drop function if exists public.admin_delete_user(uuid);
-- grant all on table public.profiles, public.posts, public.comments, public.files, public.tags, public.post_tags,
--   public.post_likes, public.post_views, public.file_downloads, public."KeepAlive" to anon, authenticated;
-- create policy "Service role can insert downloads"    on public.file_downloads for insert to public with check (true);
-- create policy "Service role can read all downloads"  on public.file_downloads for select to public using (true);
-- create policy "Service role can insert post views"   on public.post_views     for insert to public with check (true);
-- create policy "Service role can read all post views" on public.post_views     for select to public using (true);
-- create policy "Do everything for logged in user 1lpwz8_0" on storage.objects for select to public using (bucket_id = 'exams');
-- create policy "Do everything for logged in user 1lpwz8_1" on storage.objects for insert to public with check (bucket_id = 'exams');
-- create policy "Do everything for logged in user 1lpwz8_2" on storage.objects for update to public using (bucket_id = 'exams');
-- create policy "Do everything for logged in user 1lpwz8_3" on storage.objects for delete to public using (bucket_id = 'exams');
-- create policy "TAKE IT ALL 1oj01fe_0" on storage.objects for select to public using (bucket_id = 'avatars');
-- create policy "TAKE IT ALL 1oj01fe_1" on storage.objects for insert to public with check (bucket_id = 'avatars');
-- create policy "TAKE IT ALL 1oj01fe_2" on storage.objects for update to public using (bucket_id = 'avatars');
-- create policy "TAKE IT ALL 1oj01fe_3" on storage.objects for delete to public using (bucket_id = 'avatars');
