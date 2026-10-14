import { createHash } from "node:crypto";
import { embedDeployment, isAiEnabled } from "../../ai/client";
import { embedText } from "../../ai/embeddings";
import { getContentHash, getPostSource, upsertEmbedding, type PostSource } from "../../repositories/embedding-repo";
import { logger } from "../../utils/logger";

// About 6000 characters keeps a post well under the embedding model's input limit.
const MAX_EMBED_CHARS = 6000;

export function buildEmbeddingText(post: Pick<PostSource, "title" | "tags" | "body">): string {
  const text = [post.title, post.tags.join(", "), post.body].filter(Boolean).join("\n");
  return text.slice(0, MAX_EMBED_CHARS);
}

// The model name is part of the hash, so switching embedding deployments
// makes every post count as changed on the next reindex.
export function contentHash(text: string, model: string): string {
  return createHash("sha256").update(`${model}\n${text}`).digest("hex");
}

export type EmbedResult = "embedded" | "unchanged" | "missing";

export async function embedPost(postId: number, opts: { force?: boolean } = {}): Promise<EmbedResult> {
  const post = await getPostSource(postId);
  if (!post) return "missing";

  const text = buildEmbeddingText(post);
  const hash = contentHash(text, embedDeployment());

  if (!opts.force && (await getContentHash(postId)) === hash) return "unchanged";

  const started = Date.now();
  const { vector, tokens } = await embedText(text);
  await upsertEmbedding(postId, hash, vector);

  logger.info("post embedded", { postId, tokens, ms: Date.now() - started });
  return "embedded";
}

// Fire and forget: the HTTP request that created or edited the post must never fail
// or wait because of the index. Failures are logged with the id only.
export function queueEmbedPost(postId: number): void {
  if (!isAiEnabled()) return;

  embedPost(postId).catch((err: any) => {
    logger.error("post embedding failed", { postId, message: err?.message });
  });
}
