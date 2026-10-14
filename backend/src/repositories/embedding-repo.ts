import { supabaseAdmin } from "../supabase-admin";

export type PostSource = { id: number; title: string; body: string; tags: string[] };

export async function getPostSources(postIds: number[]): Promise<PostSource[]> {
  if (postIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from("posts")
    .select("id, title, body, post_tags(tags(subject_name))")
    .in("id", postIds);

  if (error) throw new Error(`getPostSources failed: ${error.message}`);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    tags: (row.post_tags ?? [])
      .map((pt: any) => pt.tags?.subject_name)
      .filter((name: unknown): name is string => typeof name === "string"),
  }));
}

export async function getPostSource(postId: number): Promise<PostSource | null> {
  return (await getPostSources([postId]))[0] ?? null;
}

export async function listPostIds(): Promise<number[]> {
  const ids: number[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseAdmin
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
  const { data, error } = await supabaseAdmin
    .from("post_embeddings")
    .select("content_hash")
    .eq("post_id", postId)
    .maybeSingle();

  if (error) throw new Error(`getContentHash failed: ${error.message}`);
  return data?.content_hash ?? null;
}

export async function upsertEmbedding(postId: number, contentHash: string, embedding: number[]) {
  const { error } = await supabaseAdmin.from("post_embeddings").upsert({
    post_id: postId,
    content_hash: contentHash,
    // pgvector accepts the "[0.1,0.2,...]" text form, which is what JSON.stringify produces.
    embedding: JSON.stringify(embedding),
    updated_at: new Date().toISOString(),
  });

  if (error) throw new Error(`upsertEmbedding failed: ${error.message}`);
}

export type PostMatch = { postId: number; similarity: number };

export async function matchPosts(
  queryEmbedding: number[],
  matchCount: number,
  minSimilarity: number
): Promise<PostMatch[]> {
  const { data, error } = await supabaseAdmin.rpc("match_posts", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: matchCount,
    min_similarity: minSimilarity,
  });

  if (error) throw new Error(`match_posts failed: ${error.message}`);
  return (data ?? []).map((row: any) => ({ postId: row.post_id, similarity: row.similarity }));
}
