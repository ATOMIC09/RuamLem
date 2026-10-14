-- Feature A1: post embeddings for "Ask RuamLem" (RAG).
-- Adds a new table and function only; no existing table is changed.
-- Run in the Supabase SQL editor. The DOWN section at the bottom reverses it.

-- ============ UP ============

create extension if not exists vector;

-- One embedding per post (posts are short, so no chunking).
-- posts.id is bigint, so post_id is bigint too.
create table if not exists public.post_embeddings (
  post_id      bigint primary key references public.posts (id) on delete cascade,
  content_hash text not null,
  embedding    vector(1536) not null,
  updated_at   timestamptz not null default now()
);

-- RLS on with no policies: anon and authenticated users can read or write nothing.
-- The backend uses the service_role key, which bypasses RLS.
alter table public.post_embeddings enable row level security;
revoke all on public.post_embeddings from anon, authenticated;

-- Cosine similarity search, best first. With ~30 posts an exact scan is fast;
-- add an hnsw index later only if the table grows to thousands of rows.
create or replace function public.match_posts (
  query_embedding vector(1536),
  match_count     int,
  min_similarity  float
)
returns table (post_id bigint, similarity float)
language sql
stable
set search_path = public, extensions
as $$
  select
    pe.post_id,
    (1 - (pe.embedding <=> query_embedding))::float as similarity
  from public.post_embeddings pe
  where 1 - (pe.embedding <=> query_embedding) >= min_similarity
  order by pe.embedding <=> query_embedding
  limit match_count;
$$;

-- Functions are executable by everyone by default; restrict to the backend.
revoke execute on function public.match_posts (vector, int, float) from public, anon, authenticated;
grant  execute on function public.match_posts (vector, int, float) to service_role;

-- ============ DOWN (run to undo) ============
-- drop function if exists public.match_posts (vector, int, float);
-- drop table if exists public.post_embeddings;
-- drop extension if exists vector;  -- only if nothing else uses it
