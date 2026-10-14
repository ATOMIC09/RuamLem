-- 004: remove a tag when the last post using it is deleted or moved to another tag.
--
-- Why: tags are created on demand when a post uses a new subject, but nothing removed them again, so deleting
-- the only post with a tag left an empty tag in the list. Regular members cannot delete from `tags` (and should
-- not be able to, because other people's posts use them), so the backend calls this narrow function with the tag
-- ids a post just stopped using. It deletes only tags that no post links to any more, so it cannot remove a tag
-- that is still in use.
--
-- Safe to run more than once.

create or replace function public.delete_unused_tags(p_tag_ids bigint[])
returns integer
language sql
security definer
set search_path = public
as $$
  with gone as (
    delete from public.tags t
    where t.id = any (p_tag_ids)
      and not exists (select 1 from public.post_tags pt where pt.tag_id = t.id)
    returning 1
  )
  select count(*)::integer from gone
$$;

revoke all on function public.delete_unused_tags(bigint[]) from public, anon;
grant execute on function public.delete_unused_tags(bigint[]) to authenticated;

-- One-time cleanup of tags that are already empty (run by hand if you want them gone; review the list first):
--   select id, subject_name from public.tags t where not exists (select 1 from public.post_tags pt where pt.tag_id = t.id);
--   select public.delete_unused_tags(array(select id from public.tags t where not exists (select 1 from public.post_tags pt where pt.tag_id = t.id)));

-- ============ DOWN ============
-- drop function if exists public.delete_unused_tags(bigint[]);
