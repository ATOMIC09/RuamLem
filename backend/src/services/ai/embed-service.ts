import { createHash } from "node:crypto";
import { embedDeployment, isAiEnabled, isModerationEnabled } from "../../ai/client";
import { embedText } from "../../ai/embeddings";
import {
  deleteEmbedding,
  getContentHash,
  getPostSource,
  upsertEmbedding,
  type PostSource,
} from "../../repositories/embedding-repo";
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

export type EmbedResult = "embedded" | "unchanged" | "missing" | "skipped";

export type EmbedDeps = {
  getPostSource: typeof getPostSource;
  getContentHash: typeof getContentHash;
  upsertEmbedding: typeof upsertEmbedding;
  deleteEmbedding: typeof deleteEmbedding;
  embedText: typeof embedText;
};

const defaultDeps: EmbedDeps = { getPostSource, getContentHash, upsertEmbedding, deleteEmbedding, embedText };

export async function embedPost(
  postId: number,
  opts: { force?: boolean } = {},
  deps: EmbedDeps = defaultDeps
): Promise<EmbedResult> {
  const post = await deps.getPostSource(postId);
  if (!post) return "missing";

  // Only published posts are searchable. A held or rejected post is removed from the index.
  if (isModerationEnabled() && post.moderationStatus && post.moderationStatus !== "published") {
    await deps.deleteEmbedding(postId);
    return "skipped";
  }

  const text = buildEmbeddingText(post);
  const hash = contentHash(text, embedDeployment());

  if (!opts.force && (await deps.getContentHash(postId)) === hash) return "unchanged";

  const started = Date.now();
  const { vector, tokens } = await deps.embedText(text);
  await deps.upsertEmbedding(postId, hash, vector);

  logger.info("post embedded", { postId, tokens, ms: Date.now() - started });
  return "embedded";
}

// Brings the index in line with a post's moderation status: published posts are (re)indexed,
// anything else is removed. Fire and forget, like queueEmbedPost.
export function syncPostIndex(postId: number, status: string): void {
  if (status === "published") return queueEmbedPost(postId);

  deleteEmbedding(postId).catch((err: any) => {
    logger.error("post unindex failed", { postId, message: err?.message });
  });
}

// Fire and forget: the HTTP request that created or edited the post must never fail
// or wait because of the index. Failures are logged with the id only.
export function queueEmbedPost(postId: number): void {
  if (!isAiEnabled()) return;

  embedPost(postId).catch((err: any) => {
    logger.error("post embedding failed", { postId, message: err?.message });
  });
}
