-- 005: AI usage tracking. One row per AI call: who, which feature, how many tokens, how long, how it ended.
--
-- Privacy: this table holds counts and ids only. It never stores a question, an answer or a post's text.
--
-- Access (row level security):
--   * a signed-in user inserts rows only for themselves (the backend writes each row as the user who made the
--     request, so no bypass key is needed) and reads only their own rows;
--   * an admin reads every row;
--   * nobody updates or deletes through the API.
--
-- Retention, "like CCTV": rows are kept for ever, but only the newest ~200,000 are kept. A trigger drops the
-- oldest ones as new ones arrive. To change the cap, edit the number in ai_usage_trim() and run this file again.
--
-- Safe to run more than once.

create table if not exists public.ai_usage (
  id                bigint generated always as identity primary key,
  created_at        timestamptz not null default now(),
  user_id           uuid not null,
  feature           text not null check (feature in ('ask', 'moderation', 'embedding')),
  mode              text check (mode in ('posts', 'general')),
  outcome           text not null default 'ok' check (outcome in ('ok', 'content_filtered', 'error', 'aborted')),
  model             text,
  prompt_tokens     integer not null default 0 check (prompt_tokens between 0 and 1000000),
  completion_tokens integer not null default 0 check (completion_tokens between 0 and 1000000),
  embedding_tokens  integer not null default 0 check (embedding_tokens between 0 and 1000000),
  total_tokens      integer not null default 0 check (total_tokens between 0 and 3000000),
  latency_ms        integer check (latency_ms is null or latency_ms >= 0)
);

create index if not exists ai_usage_user_created_idx on public.ai_usage (user_id, created_at desc);
create index if not exists ai_usage_created_idx on public.ai_usage (created_at desc);

alter table public.ai_usage enable row level security;

revoke all on table public.ai_usage from anon, authenticated;
grant select, insert on table public.ai_usage to authenticated;

drop policy if exists "ai_usage: read own or admin" on public.ai_usage;
create policy "ai_usage: read own or admin" on public.ai_usage for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "ai_usage: insert own" on public.ai_usage;
create policy "ai_usage: insert own" on public.ai_usage for insert to authenticated
  with check (user_id = (select auth.uid()));

-- The loop: every 1,000th row, delete everything older than the newest 200,000 ids.
create or replace function public.ai_usage_trim()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.ai_usage where id <= new.id - 200000;
  return null;
end
$$;

revoke all on function public.ai_usage_trim() from public, anon, authenticated;

drop trigger if exists ai_usage_trim on public.ai_usage;
create trigger ai_usage_trim after insert on public.ai_usage
  for each row when (new.id % 1000 = 0) execute function public.ai_usage_trim();

-- What the signed-in caller has used with Ask RuamLem since a moment (the start of their Thai day), for the
-- daily message and token limits. Explicitly their own rows, even for an admin.
create or replace function public.my_ask_usage_since(p_since timestamptz)
returns table (asks bigint, tokens bigint)
language sql
stable
set search_path = public
as $$
  select count(*)::bigint, coalesce(sum(total_tokens), 0)::bigint
  from public.ai_usage
  where user_id = (select auth.uid()) and feature = 'ask' and created_at >= p_since
$$;

revoke all on function public.my_ask_usage_since(timestamptz) from public, anon;
grant execute on function public.my_ask_usage_since(timestamptz) to authenticated;

-- Admin only: the numbers for the dashboard, bucketed by Thai calendar day, covering the last p_days days
-- (1 = today only). Returns one JSON document.
create or replace function public.admin_ai_usage_summary(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_days  integer := least(greatest(coalesce(p_days, 30), 1), 365);
  v_since timestamptz := (date_trunc('day', now() at time zone 'Asia/Bangkok') - make_interval(days => v_days - 1)) at time zone 'Asia/Bangkok';
  v_out   jsonb;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'since', v_since,
    'days', v_days,
    'rowsStored', (select count(*) from public.ai_usage),
    'oldestRow', (select min(created_at) from public.ai_usage),
    'totals', (
      select jsonb_build_object(
        'requests', count(*),
        'promptTokens', coalesce(sum(prompt_tokens), 0),
        'completionTokens', coalesce(sum(completion_tokens), 0),
        'embeddingTokens', coalesce(sum(embedding_tokens), 0),
        'totalTokens', coalesce(sum(total_tokens), 0),
        'problems', count(*) filter (where outcome in ('error', 'content_filtered')),
        'avgLatencyMs', coalesce(round(avg(latency_ms)), 0),
        'activeUsers', count(distinct user_id)
      ) from public.ai_usage where created_at >= v_since
    ),
    'byFeature', coalesce((
      select jsonb_agg(to_jsonb(f) order by f."totalTokens" desc) from (
        select feature,
               count(*) as requests,
               coalesce(sum(prompt_tokens), 0) as "promptTokens",
               coalesce(sum(completion_tokens), 0) as "completionTokens",
               coalesce(sum(embedding_tokens), 0) as "embeddingTokens",
               coalesce(sum(total_tokens), 0) as "totalTokens"
        from public.ai_usage where created_at >= v_since group by feature
      ) f
    ), '[]'::jsonb),
    'byDay', coalesce((
      select jsonb_agg(to_jsonb(d) order by d.day) from (
        select to_char(created_at at time zone 'Asia/Bangkok', 'YYYY-MM-DD') as day,
               count(*) as requests,
               coalesce(sum(prompt_tokens), 0) as "promptTokens",
               coalesce(sum(completion_tokens), 0) as "completionTokens",
               coalesce(sum(embedding_tokens), 0) as "embeddingTokens",
               coalesce(sum(total_tokens), 0) as "totalTokens"
        from public.ai_usage where created_at >= v_since group by 1
      ) d
    ), '[]'::jsonb),
    'topUsers', coalesce((
      select jsonb_agg(to_jsonb(u) order by u."totalTokens" desc) from (
        select x.user_id as "userId",
               nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '') as name,
               au.email::text as email,
               count(*) as requests,
               coalesce(sum(x.prompt_tokens), 0) as "promptTokens",
               coalesce(sum(x.completion_tokens), 0) as "completionTokens",
               coalesce(sum(x.embedding_tokens), 0) as "embeddingTokens",
               coalesce(sum(x.total_tokens), 0) as "totalTokens",
               max(x.created_at) as "lastUsed"
        from public.ai_usage x
        left join public.profiles p on p.uuid = x.user_id
        left join auth.users au on au.id = x.user_id
        where x.created_at >= v_since
        group by x.user_id, p.first_name, p.last_name, au.email
        order by sum(x.total_tokens) desc
        limit 20
      ) u
    ), '[]'::jsonb)
  ) into v_out;

  return v_out;
end
$$;

revoke all on function public.admin_ai_usage_summary(integer) from public, anon;
grant execute on function public.admin_ai_usage_summary(integer) to authenticated;

-- ============ DOWN ============
-- drop function if exists public.admin_ai_usage_summary(integer);
-- drop function if exists public.my_ask_usage_since(timestamptz);
-- drop trigger if exists ai_usage_trim on public.ai_usage;
-- drop function if exists public.ai_usage_trim();
-- drop table if exists public.ai_usage;
