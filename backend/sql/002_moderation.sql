-- Feature B3: AI moderation with a human override.
-- ALTERS the existing posts and comments tables (approved by the project owner) and adds
-- moderation_log. Existing rows stay published: every new column has a safe default.
-- Run in the Supabase SQL editor (or via the Supabase MCP). The DOWN section reverses it.

-- ============ UP ============

-- Status of every post and comment. 'published' is visible to everyone; 'held' waits for an
-- admin; 'rejected' is hidden. The author always sees their own, with the status.
alter table public.posts
  add column if not exists moderation_status   text    not null default 'published',
  add column if not exists moderation_reason   text,
  add column if not exists moderation_appealed boolean not null default false;

alter table public.comments
  add column if not exists moderation_status   text    not null default 'published',
  add column if not exists moderation_reason   text,
  add column if not exists moderation_appealed boolean not null default false;

alter table public.posts    drop constraint if exists posts_moderation_status_check;
alter table public.posts    add  constraint posts_moderation_status_check
  check (moderation_status in ('published', 'held', 'rejected'));

alter table public.comments drop constraint if exists comments_moderation_status_check;
alter table public.comments add  constraint comments_moderation_status_check
  check (moderation_status in ('published', 'held', 'rejected'));

-- The admin queue only looks at items that are not published, so index just those.
create index if not exists posts_moderation_status_idx
  on public.posts (moderation_status) where moderation_status <> 'published';
create index if not exists comments_moderation_status_idx
  on public.comments (moderation_status) where moderation_status <> 'published';

-- Audit trail: every AI decision and every admin override. Answers "who removed what".
create table if not exists public.moderation_log (
  id          bigint generated always as identity primary key,
  target_type text   not null check (target_type in ('post', 'comment')),
  target_id   bigint not null,
  decision    text   not null check (decision in ('published', 'held', 'rejected')),
  actor       text   not null,        -- 'ai', or the admin's / author's user id
  reason      text,                   -- a short code such as 'spam' or 'content_safety:hate'
  detail      text,                   -- the model's one-line explanation, for admins
  created_at  timestamptz not null default now()
);

create index if not exists moderation_log_target_idx
  on public.moderation_log (target_type, target_id, created_at desc);

-- RLS on with no policies: only the backend's service_role key can read or write it.
alter table public.moderation_log enable row level security;
revoke all on public.moderation_log from anon, authenticated;

-- ============ DOWN (run to undo) ============
-- drop table if exists public.moderation_log;
-- drop index if exists public.posts_moderation_status_idx;
-- drop index if exists public.comments_moderation_status_idx;
-- alter table public.posts    drop constraint if exists posts_moderation_status_check;
-- alter table public.comments drop constraint if exists comments_moderation_status_check;
-- alter table public.posts    drop column if exists moderation_status, drop column if exists moderation_reason, drop column if exists moderation_appealed;
-- alter table public.comments drop column if exists moderation_status, drop column if exists moderation_reason, drop column if exists moderation_appealed;
