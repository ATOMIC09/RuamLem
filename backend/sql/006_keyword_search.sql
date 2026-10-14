-- 006: keyword search for Ask RuamLem, next to the meaning-based (embedding) search.
--
-- Why: embeddings are weak on names. A question that is only a teacher's name scores about 0.30 against a post that
-- mentions the teacher, under the 0.43 cutoff, so Ask answered "no post found". The backend now cuts the question
-- into overlapping 4-character pieces (Thai has no spaces) and this function returns the published posts whose
-- text contains most of them.
--
-- A post is returned when it contains at least 2 of the pieces AND at least p_min_share (default 60%) of all pieces.
-- Only published posts are searched. It runs as the caller, so row level security applies on top.
--
-- Safe to run more than once.

create or replace function public.keyword_match_posts(
  p_grams text[],
  p_min_share double precision default 0.6,
  p_limit integer default 5
)
returns table (post_id bigint, matched integer, share double precision)
language sql
stable
set search_path = public
as $$
  with g as (
    select distinct lower(x) as gram from unnest(p_grams) as x where length(x) >= 2
  ),
  total as (
    select count(*)::double precision as n from g
  ),
  docs as (
    select p.id,
           lower(concat_ws(' ', p.title, p.body, (
             select string_agg(t.subject_name, ' ')
             from public.post_tags pt join public.tags t on t.id = pt.tag_id
             where pt.post_id = p.id
           ))) as txt
    from public.posts p
    where p.moderation_status = 'published'
  ),
  scored as (
    select d.id, count(*)::integer as hits
    from docs d join g on position(g.gram in d.txt) > 0
    group by d.id
  )
  select s.id::bigint, s.hits, s.hits / t.n
  from scored s, total t
  where t.n > 0 and s.hits >= 2 and s.hits / t.n >= p_min_share
  order by 3 desc, 2 desc, 1 desc
  limit least(greatest(p_limit, 1), 20)
$$;

revoke all on function public.keyword_match_posts(text[], double precision, integer) from public, anon;
grant execute on function public.keyword_match_posts(text[], double precision, integer) to authenticated;

-- ============ DOWN ============
-- drop function if exists public.keyword_match_posts(text[], double precision, integer);
