import { isModerationEnabled } from "../ai/client";
import { getSupabaseAdmin } from "../supabase-admin";

// `moderationStatus` is only filled in when moderation is on (the column is not read otherwise).
export type PostSource = { id: number; title: string; body: string; tags: string[]; moderationStatus?: string };

const BASE_COLUMNS = "id, title, body, post_tags(tags(subject_name))";

// With `publishedOnly`, a held or rejected post is never returned (when moderation is on).
// Ask RuamLem uses it so that even a stale index entry cannot leak a hidden post.
export async function getPostSources(
  postIds: number[],
  opts: { publishedOnly?: boolean } = {}
): Promise<PostSource[]> {
  if (postIds.length === 0) return [];

  const moderated = isModerationEnabled();
  let query = getSupabaseAdmin()
    .from("posts")
    .select(moderated ? `${BASE_COLUMNS}, moderation_status` : BASE_COLUMNS)
    .in("id", postIds);
  if (moderated && opts.publishedOnly) query = query.eq("moderation_status", "published");

  const { data, error } = await query;
  if (error) throw new Error(`getPostSources failed: ${error.message}`);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    tags: (row.post_tags ?? [])
      .map((pt: any) => pt.tags?.subject_name)
      .filter((name: unknown): name is string => typeof name === "string"),
    ...(row.moderation_status ? { moderationStatus: row.moderation_status as string } : {}),
  }));
}

export async function getPostSource(postId: number): Promise<PostSource | null> {
  return (await getPostSources([postId]))[0] ?? null;
}

export async function listPostIds(): Promise<number[]> {
  const ids: number[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await getSupabaseAdmin()
      .from("posts")
      .select("id")
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`listPostIds failed: ${error.message}`);
    ids.push(...(data ?? []).map((row) => row.id as number));
    if (!data || data.length < pageSize) break;
  }

  return ids;
}

export async function getContentHash(postId: number): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("post_embeddings")
    .select("content_hash")
    .eq("post_id", postId)
    .maybeSingle();

  if (error) throw new Error(`getContentHash failed: ${error.message}`);
  return data?.content_hash ?? null;
}

export async function upsertEmbedding(postId: number, contentHash: string, embedding: number[]) {
  const { error } = await getSupabaseAdmin().from("post_embeddings").upsert({
    post_id: postId,
    content_hash: contentHash,
    // pgvector accepts the "[0.1,0.2,...]" text form, which is what JSON.stringify produces.
    embedding: JSON.stringify(embedding),
    updated_at: new Date().toISOString(),
  });

  if (error) throw new Error(`upsertEmbedding failed: ${error.message}`);
}

// A post that is held, rejected or deleted must not stay searchable.
export async function deleteEmbedding(postId: number) {
  const { error } = await getSupabaseAdmin().from("post_embeddings").delete().eq("post_id", postId);
  if (error) throw new Error(`deleteEmbedding failed: ${error.message}`);
}

export type PostMatch = { postId: number; similarity: number };

export async function matchPosts(
  queryEmbedding: number[],
  matchCount: number,
  minSimilarity: number
): Promise<PostMatch[]> {
  const { data, error } = await getSupabaseAdmin().rpc("match_posts", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: matchCount,
    min_similarity: minSimilarity,
  });

  if (error) throw new Error(`match_posts failed: ${error.message}`);
  return (data ?? []).map((row: any) => ({ postId: row.post_id, similarity: row.similarity }));
}
