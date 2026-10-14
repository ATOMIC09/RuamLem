-- Database hardening: row level security with real policies, for production.
--
-- Design: the backend acts as the SIGNED-IN USER. It sends each request's own access token to Supabase, so the
-- policies below decide what that person may read and change. The backend does NOT hold the service-role key
-- (the key that bypasses all of this). The only places that need extra power are a few narrow functions at the
-- bottom, each of which checks who is calling.
--
-- Roles seen by the database: `anon` (not signed in) and `authenticated` (a signed-in user). `public.is_admin()`
-- is true for an `admin` profile.
--
--   Who may do what
--   - Everyone reads published posts and comments, profiles, tags and likes.
--   - A signed-in user creates posts, comments, files and likes as themselves, and edits or deletes their own.
--     They also see their own held or rejected posts and comments.
--   - Admins read and change everything the moderation and admin screens need.
--   - Nobody except an admin can change a role, and nobody can overturn an admin's rejection.
--   - View and download counts, the user list with emails, and deleting a user go through narrow functions.
--   - Storage: exam files are readable only while their post is visible; uploads and deletes are tied to the owner.
--
-- Rolling it out: apply this file and deploy the matching backend one right after the other. The OLD backend
-- (the one that sent every request with the anon key and no user token) cannot write once this is on.
-- The DOWN section at the bottom restores the previous state exactly.

-- ============ UP ============

-- ---------------------------------------------------------------------------
-- 1. Helper: is the caller an admin?  (SECURITY DEFINER so it can read profiles without recursion)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.user_role::text = 'admin' from public.profiles p where p.uuid = auth.uid()), false)
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Table privileges: only what each role needs (anon and authenticated used to hold ALL, even TRUNCATE).
-- ---------------------------------------------------------------------------
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
-- post_views and file_downloads: no direct access at all; see the functions in section 6.

-- ---------------------------------------------------------------------------
-- 3. Guards that RLS cannot express (they only apply to API users, never to the dashboard or SQL editor)
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if new.uuid is distinct from old.uuid then
      raise exception 'a profile id cannot be changed' using errcode = '42501';
    end if;
    if new.user_role is distinct from old.user_role and not public.is_admin() then
      raise exception 'only an admin can change a role' using errcode = '42501';
    end if;
  end if;
  return new;
end
$$;
drop trigger if exists guard_profile_update on public.profiles;
create trigger guard_profile_update before update on public.profiles
  for each row execute function public.guard_profile_update();

-- An author cannot hand their post to someone else, and cannot overturn an admin's rejection.
create or replace function public.guard_moderation_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    if new.user_id is distinct from old.user_id then
      raise exception 'the author of a post or comment cannot be changed' using errcode = '42501';
    end if;
    if old.moderation_reason = 'admin_rejected'
       and (new.moderation_status is distinct from old.moderation_status
            or new.moderation_reason is distinct from old.moderation_reason
            or new.moderation_appealed is distinct from old.moderation_appealed) then
      raise exception 'an admin rejected this and the decision is final' using errcode = '42501';
    end if;
  end if;
  return new;
end
$$;
drop trigger if exists guard_moderation_update on public.posts;
create trigger guard_moderation_update before update on public.posts
  for each row execute function public.guard_moderation_update();
drop trigger if exists guard_moderation_update on public.comments;
create trigger guard_moderation_update before update on public.comments
  for each row execute function public.guard_moderation_update();

-- ---------------------------------------------------------------------------
-- 4. Sign-up creates the profile in the database. (A person who has just signed up has no session yet, so the
--    backend cannot insert it as them.) The backend sends first_name and last_name as user metadata.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (uuid, first_name, last_name, user_role)
  values (new.id, new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'last_name', 'member')
  on conflict (uuid) do nothing;
  return new;
end
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 5. Row level security and policies
-- ---------------------------------------------------------------------------
alter table public.profiles    enable row level security;
alter table public.posts       enable row level security;
alter table public.comments    enable row level security;
alter table public.files       enable row level security;
alter table public.tags        enable row level security;
alter table public.post_tags   enable row level security;
alter table public."KeepAlive" enable row level security;
-- already on: post_likes, post_views, file_downloads, post_embeddings, moderation_log

-- profiles
drop policy if exists "profiles: everyone reads" on public.profiles;
create policy "profiles: everyone reads" on public.profiles for select to anon, authenticated using (true);
drop policy if exists "profiles: owner or admin updates" on public.profiles;
create policy "profiles: owner or admin updates" on public.profiles for update to authenticated
  using (uuid = (select auth.uid()) or (select public.is_admin()))
  with check (uuid = (select auth.uid()) or (select public.is_admin()));

-- posts
drop policy if exists "posts: read published, own or all as admin" on public.posts;
create policy "posts: read published, own or all as admin" on public.posts for select to anon, authenticated
  using (moderation_status = 'published' or user_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists "posts: create as yourself" on public.posts;
create policy "posts: create as yourself" on public.posts for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists "posts: owner or admin updates" on public.posts;
create policy "posts: owner or admin updates" on public.posts for update to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists "posts: owner or admin deletes" on public.posts;
create policy "posts: owner or admin deletes" on public.posts for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- comments
drop policy if exists "comments: read published, own or all as admin" on public.comments;
create policy "comments: read published, own or all as admin" on public.comments for select to anon, authenticated
  using (moderation_status = 'published' or user_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists "comments: create as yourself" on public.comments;
create policy "comments: create as yourself" on public.comments for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists "comments: owner or admin updates" on public.comments;
create policy "comments: owner or admin updates" on public.comments for update to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists "comments: owner or admin deletes" on public.comments;
create policy "comments: owner or admin deletes" on public.comments for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- tags and post_tags
drop policy if exists "tags: everyone reads" on public.tags;
create policy "tags: everyone reads" on public.tags for select to anon, authenticated using (true);
drop policy if exists "tags: signed-in users add a tag" on public.tags;
create policy "tags: signed-in users add a tag" on public.tags for insert to authenticated with check (true);

drop policy if exists "post_tags: everyone reads" on public.post_tags;
create policy "post_tags: everyone reads" on public.post_tags for select to anon, authenticated using (true);
drop policy if exists "post_tags: the post's owner or an admin writes" on public.post_tags;
create policy "post_tags: the post's owner or an admin writes" on public.post_tags for all to authenticated
  using (exists (select 1 from public.posts p where p.id = post_tags.post_id
                 and (p.user_id = (select auth.uid()) or (select public.is_admin()))))
  with check (exists (select 1 from public.posts p where p.id = post_tags.post_id
                      and (p.user_id = (select auth.uid()) or (select public.is_admin()))));

-- files (attachments)
drop policy if exists "files: read while the post is visible" on public.files;
create policy "files: read while the post is visible" on public.files for select to anon, authenticated
  using (user_id = (select auth.uid())
         or (select public.is_admin())
         or exists (select 1 from public.posts p where p.id = files.post_id and p.moderation_status = 'published'));
drop policy if exists "files: attach to your own post" on public.files;
create policy "files: attach to your own post" on public.files for insert to authenticated
  with check (user_id = (select auth.uid())
              and (post_id is null
                   or exists (select 1 from public.posts p where p.id = files.post_id and p.user_id = (select auth.uid()))));
drop policy if exists "files: owner or admin deletes" on public.files;
create policy "files: owner or admin deletes" on public.files for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- likes keep their existing policies (everyone reads, you add and remove your own); post_likes_id_seq is granted above.

-- the keep-alive table is read by a ping with the anon key
drop policy if exists "KeepAlive: everyone reads" on public."KeepAlive";
create policy "KeepAlive: everyone reads" on public."KeepAlive" for select to anon, authenticated using (true);

-- AI: the search index of published posts. Embeddings of public posts are not secret.
drop policy if exists "post_embeddings: read for published posts" on public.post_embeddings;
create policy "post_embeddings: read for published posts" on public.post_embeddings for select to anon, authenticated
  using (exists (select 1 from public.posts p where p.id = post_embeddings.post_id and p.moderation_status = 'published'));
drop policy if exists "post_embeddings: the post's owner or an admin writes" on public.post_embeddings;
create policy "post_embeddings: the post's owner or an admin writes" on public.post_embeddings for all to authenticated
  using (exists (select 1 from public.posts p where p.id = post_embeddings.post_id
                 and (p.user_id = (select auth.uid()) or (select public.is_admin()))))
  with check (exists (select 1 from public.posts p where p.id = post_embeddings.post_id
                      and (p.user_id = (select auth.uid()) or (select public.is_admin()))));
grant execute on function public.match_posts(vector, int, float) to anon, authenticated;

-- AI: the audit log. Only admins read it. A person can record decisions about their OWN content (the AI's
-- decision, or their own appeal); an admin can record anything.
drop policy if exists "moderation_log: admins read" on public.moderation_log;
create policy "moderation_log: admins read" on public.moderation_log for select to authenticated
  using ((select public.is_admin()));
drop policy if exists "moderation_log: record decisions" on public.moderation_log;
create policy "moderation_log: record decisions" on public.moderation_log for insert to authenticated
  with check (
    (select public.is_admin())
    or (
      (actor = 'ai' or actor = (select auth.uid())::text)
      and case target_type
            when 'post' then exists (select 1 from public.posts p where p.id = target_id and p.user_id = (select auth.uid()))
            else exists (select 1 from public.comments c where c.id = target_id and c.user_id = (select auth.uid()))
          end
    )
  );

-- the open policies that gave everyone access to view and download logs are gone
drop policy if exists "Service role can insert downloads"    on public.file_downloads;
drop policy if exists "Service role can read all downloads"  on public.file_downloads;
drop policy if exists "Service role can insert post views"   on public.post_views;
drop policy if exists "Service role can read all post views" on public.post_views;
-- (the per-user "view your own" policies stay; with no table privilege they grant nothing)

-- helpful indexes for the policies
create index if not exists posts_user_id_idx    on public.posts (user_id);
create index if not exists comments_user_id_idx on public.comments (user_id);
create index if not exists files_post_id_idx    on public.files (post_id);
create index if not exists files_file_url_idx   on public.files (file_url);

-- ---------------------------------------------------------------------------
-- 6. Narrow functions for what the tables no longer allow directly. Each checks who is calling.
-- ---------------------------------------------------------------------------

-- Count a page view once per user (or per IP address when signed out) per 24 hours. Only for published posts.
create or replace function public.record_post_view(p_post_id integer, p_ip text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if not exists (select 1 from public.posts p where p.id = p_post_id and p.moderation_status = 'published') then
    return 'ignored';
  end if;

  if v_user is not null or p_ip is not null then
    if exists (
      select 1 from public.post_views v
      where v.post_id = p_post_id
        and v.created_at >= now() - interval '24 hours'
        and case when v_user is not null then v.user_id = v_user else v.ip_address = p_ip end
    ) then
      return 'already_recorded';
    end if;
  end if;

  insert into public.post_views (post_id, user_id, ip_address) values (p_post_id, v_user, p_ip);
  return 'recorded';
end
$$;

create or replace function public.record_file_download(p_file_id integer, p_post_id integer, p_ip text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.files f join public.posts p on p.id = f.post_id
    where f.id = p_file_id and f.post_id = p_post_id and p.moderation_status = 'published'
  ) then
    return 'ignored';
  end if;

  insert into public.file_downloads (file_id, post_id, user_id, ip_address) values (p_file_id, p_post_id, auth.uid(), p_ip);
  return 'recorded';
end
$$;

create or replace function public.post_view_counts(p_post_ids bigint[])
returns table (post_id integer, view_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select v.post_id, count(*) from public.post_views v where v.post_id = any (p_post_ids) group by v.post_id
$$;

create or replace function public.file_download_counts(p_file_ids bigint[])
returns table (file_id integer, download_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select d.file_id, count(*) from public.file_downloads d where d.file_id = any (p_file_ids) group by d.file_id
$$;

create or replace function public.engagement_totals()
returns table (total_views bigint, total_downloads bigint)
language sql
stable
security definer
set search_path = public
as $$
  select (select count(*) from public.post_views), (select count(*) from public.file_downloads)
$$;

-- Admin only: every user with an email address and counts (emails live in auth.users).
create or replace function public.admin_list_users()
returns table (
  uuid uuid, first_name text, last_name text, email text, avatar_url text, bio text, user_role text,
  created_at timestamptz, updated_at timestamptz, post_count bigint, comment_count bigint
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
    select p.uuid, p.first_name, p.last_name, u.email::text, p.avatar_url, p.bio, p.user_role::text,
           p.created_at, p.updated_at,
           (select count(*) from public.posts x where x.user_id = p.uuid),
           (select count(*) from public.comments c where c.user_id = p.uuid)
    from public.profiles p
    left join auth.users u on u.id = p.uuid
    order by p.created_at desc;
end
$$;

-- Admin only: delete an account. The database cascades to the profile, posts, comments and files rows.
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

revoke all on function
  public.record_post_view(integer, text), public.record_file_download(integer, integer, text),
  public.post_view_counts(bigint[]), public.file_download_counts(bigint[]), public.engagement_totals(),
  public.admin_list_users(), public.admin_delete_user(uuid)
from public;
grant execute on function
  public.record_post_view(integer, text), public.record_file_download(integer, integer, text),
  public.post_view_counts(bigint[]), public.file_download_counts(bigint[]), public.engagement_totals()
to anon, authenticated;
grant execute on function public.admin_list_users(), public.admin_delete_user(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Storage
-- ---------------------------------------------------------------------------
-- Existing exam files get an owner, so their authors can delete them.
update storage.objects o
set owner_id = f.user_id::text
from public.files f
where o.bucket_id = 'exams' and o.name = f.file_url and f.user_id is not null and o.owner_id is distinct from f.user_id::text;

drop policy if exists "Do everything for logged in user 1lpwz8_0" on storage.objects;
drop policy if exists "Do everything for logged in user 1lpwz8_1" on storage.objects;
drop policy if exists "Do everything for logged in user 1lpwz8_2" on storage.objects;
drop policy if exists "Do everything for logged in user 1lpwz8_3" on storage.objects;
drop policy if exists "TAKE IT ALL 1oj01fe_0" on storage.objects;
drop policy if exists "TAKE IT ALL 1oj01fe_1" on storage.objects;
drop policy if exists "TAKE IT ALL 1oj01fe_2" on storage.objects;
drop policy if exists "TAKE IT ALL 1oj01fe_3" on storage.objects;

-- exams (private): a file can be downloaded (signed URL) only while its post is visible to the caller
drop policy if exists "exams: read while the post is visible" on storage.objects;
create policy "exams: read while the post is visible" on storage.objects for select to anon, authenticated
  using (bucket_id = 'exams' and exists (
    select 1 from public.files f join public.posts p on p.id = f.post_id
    where f.file_url = objects.name
      and (p.moderation_status = 'published' or p.user_id = (select auth.uid()) or (select public.is_admin()))
  ));
drop policy if exists "exams: signed-in users upload" on storage.objects;
create policy "exams: signed-in users upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'exams');
drop policy if exists "exams: owner or admin deletes" on storage.objects;
create policy "exams: owner or admin deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'exams' and (owner_id = (select auth.uid())::text or (select public.is_admin())));

-- avatars (public bucket, so reading needs no policy): you write only inside your own folder
drop policy if exists "avatars: write inside your own folder" on storage.objects;
create policy "avatars: write inside your own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "avatars: delete inside your own folder" on storage.objects;
create policy "avatars: delete inside your own folder" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ============ DOWN (run to restore the previous state exactly) ============
-- -- storage
-- drop policy if exists "exams: read while the post is visible" on storage.objects;
-- drop policy if exists "exams: signed-in users upload" on storage.objects;
-- drop policy if exists "exams: owner or admin deletes" on storage.objects;
-- drop policy if exists "avatars: write inside your own folder" on storage.objects;
-- drop policy if exists "avatars: delete inside your own folder" on storage.objects;
-- create policy "Do everything for logged in user 1lpwz8_0" on storage.objects for select to public using (bucket_id = 'exams');
-- create policy "Do everything for logged in user 1lpwz8_1" on storage.objects for insert to public with check (bucket_id = 'exams');
-- create policy "Do everything for logged in user 1lpwz8_2" on storage.objects for update to public using (bucket_id = 'exams');
-- create policy "Do everything for logged in user 1lpwz8_3" on storage.objects for delete to public using (bucket_id = 'exams');
-- create policy "TAKE IT ALL 1oj01fe_0" on storage.objects for select to public using (bucket_id = 'avatars');
-- create policy "TAKE IT ALL 1oj01fe_1" on storage.objects for insert to public with check (bucket_id = 'avatars');
-- create policy "TAKE IT ALL 1oj01fe_2" on storage.objects for update to public using (bucket_id = 'avatars');
-- create policy "TAKE IT ALL 1oj01fe_3" on storage.objects for delete to public using (bucket_id = 'avatars');
--
-- -- functions
-- drop function if exists public.record_post_view(integer, text);
-- drop function if exists public.record_file_download(integer, integer, text);
-- drop function if exists public.post_view_counts(bigint[]);
-- drop function if exists public.file_download_counts(bigint[]);
-- drop function if exists public.engagement_totals();
-- drop function if exists public.admin_list_users();
-- drop function if exists public.admin_delete_user(uuid);
--
-- -- indexes
-- drop index if exists public.posts_user_id_idx, public.comments_user_id_idx, public.files_post_id_idx, public.files_file_url_idx;
--
-- -- the old open policies on views and downloads
-- create policy "Service role can insert downloads"    on public.file_downloads for insert to public with check (true);
-- create policy "Service role can read all downloads"  on public.file_downloads for select to public using (true);
-- create policy "Service role can insert post views"   on public.post_views     for insert to public with check (true);
-- create policy "Service role can read all post views" on public.post_views     for select to public using (true);
--
-- -- AI tables
-- drop policy if exists "moderation_log: admins read" on public.moderation_log;
-- drop policy if exists "moderation_log: record decisions" on public.moderation_log;
-- drop policy if exists "post_embeddings: read for published posts" on public.post_embeddings;
-- drop policy if exists "post_embeddings: the post's owner or an admin writes" on public.post_embeddings;
-- revoke execute on function public.match_posts(vector, int, float) from anon, authenticated;
--
-- -- table policies
-- drop policy if exists "KeepAlive: everyone reads" on public."KeepAlive";
-- drop policy if exists "files: read while the post is visible" on public.files;
-- drop policy if exists "files: attach to your own post" on public.files;
-- drop policy if exists "files: owner or admin deletes" on public.files;
-- drop policy if exists "post_tags: everyone reads" on public.post_tags;
-- drop policy if exists "post_tags: the post's owner or an admin writes" on public.post_tags;
-- drop policy if exists "tags: everyone reads" on public.tags;
-- drop policy if exists "tags: signed-in users add a tag" on public.tags;
-- drop policy if exists "comments: read published, own or all as admin" on public.comments;
-- drop policy if exists "comments: create as yourself" on public.comments;
-- drop policy if exists "comments: owner or admin updates" on public.comments;
-- drop policy if exists "comments: owner or admin deletes" on public.comments;
-- drop policy if exists "posts: read published, own or all as admin" on public.posts;
-- drop policy if exists "posts: create as yourself" on public.posts;
-- drop policy if exists "posts: owner or admin updates" on public.posts;
-- drop policy if exists "posts: owner or admin deletes" on public.posts;
-- drop policy if exists "profiles: everyone reads" on public.profiles;
-- drop policy if exists "profiles: owner or admin updates" on public.profiles;
--
-- -- triggers and guards
-- drop trigger if exists on_auth_user_created on auth.users;
-- drop function if exists public.handle_new_user();
-- drop trigger if exists guard_moderation_update on public.posts;
-- drop trigger if exists guard_moderation_update on public.comments;
-- drop function if exists public.guard_moderation_update();
-- drop trigger if exists guard_profile_update on public.profiles;
-- drop function if exists public.guard_profile_update();
--
-- -- row level security and privileges, back to how they were
-- alter table public.profiles    disable row level security;
-- alter table public.posts       disable row level security;
-- alter table public.comments    disable row level security;
-- alter table public.files       disable row level security;
-- alter table public.tags        disable row level security;
-- alter table public.post_tags   disable row level security;
-- alter table public."KeepAlive" disable row level security;
-- grant all on table public.profiles, public.posts, public.comments, public.files, public.tags, public.post_tags,
--   public.post_likes, public.post_views, public.file_downloads, public."KeepAlive" to anon, authenticated;
-- revoke all on table public.post_embeddings, public.moderation_log from anon, authenticated;
-- drop function if exists public.is_admin();
