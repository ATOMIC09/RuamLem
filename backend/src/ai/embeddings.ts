import { embedDeployment, getAiClient } from "./client";

// Must match vector(1536) in sql/001_ai_embeddings.sql. text-embedding-3-large can also
// produce 1536 dimensions, so switching models later needs no schema change.
export const EMBEDDING_DIMENSIONS = 1536;

export async function embedText(text: string): Promise<{ vector: number[]; tokens: number }> {
  const res = await getAiClient().embeddings.create({
    model: embedDeployment(),
    input: text,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  const vector = res.data[0]?.embedding;
  if (!vector || vector.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Unexpected embedding size: ${vector?.length ?? 0}`);
  }

  return { vector, tokens: res.usage?.total_tokens ?? 0 };
}
