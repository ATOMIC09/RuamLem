-- 003c: let a signed-in user see (and therefore delete) the exam files they uploaded themselves.
--
-- Why: Storage deletes use "delete ... returning", which also needs a SELECT policy to pass. The only SELECT
-- policy on the exams bucket ("read while the post is visible") needs a files row that links the object to a
-- post. Between the upload and that link, the uploader could not remove their own object, so cleaning up after
-- a failed post or file save silently did nothing and left an orphan file.
--
-- Also takes the two admin-only functions away from the anon role. They already refuse non-admins inside, so
-- this only tidies the security advisor's warnings.
--
-- Safe to run more than once.

drop policy if exists "exams: owner reads own uploads" on storage.objects;
create policy "exams: owner reads own uploads" on storage.objects for select to authenticated
  using (bucket_id = 'exams' and owner_id = (select auth.uid())::text);

revoke execute on function public.admin_list_users(), public.admin_delete_user(uuid) from anon, public;
grant execute on function public.admin_list_users(), public.admin_delete_user(uuid) to authenticated;

-- ============ DOWN ============
-- drop policy if exists "exams: owner reads own uploads" on storage.objects;
-- grant execute on function public.admin_list_users(), public.admin_delete_user(uuid) to anon;
