import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { embedPost, type EmbedDeps } from "./embed-service";
import type { PostSource } from "../../repositories/embedding-repo";

const post = (over: Partial<PostSource> = {}): PostSource => ({
  id: 5,
  title: "ไฟนอล Database",
  body: "วิชา 010123121",
  tags: ["Database"],
  ...over,
});

function makeDeps(source: PostSource | null, storedHash: string | null = null) {
  const mocks = {
    getPostSource: mock(async () => source),
    getContentHash: mock(async () => storedHash),
    upsertEmbedding: mock(async () => {}),
    deleteEmbedding: mock(async () => {}),
    embedText: mock(async () => ({ vector: [0.1], tokens: 3 })),
  };
  return { deps: mocks as unknown as EmbedDeps, ...mocks };
}

const saved = process.env.AI_MODERATION_ENABLED;
beforeEach(() => {
  process.env.AI_MODERATION_ENABLED = "true";
});
afterEach(() => {
  if (saved === undefined) delete process.env.AI_MODERATION_ENABLED;
  else process.env.AI_MODERATION_ENABLED = saved;
});

describe("embedPost: only published posts are indexed", () => {
  it("indexes a published post", async () => {
    const { deps, embedText, upsertEmbedding } = makeDeps(post({ moderationStatus: "published" }));
    expect(await embedPost(5, {}, deps)).toBe("embedded");
    expect(embedText).toHaveBeenCalledTimes(1);
    expect(upsertEmbedding).toHaveBeenCalledTimes(1);
  });

  it.each(["held", "rejected"])("a %s post is not embedded, and is removed from the index", async (status) => {
    const { deps, embedText, upsertEmbedding, deleteEmbedding } = makeDeps(post({ moderationStatus: status }));
    expect(await embedPost(5, {}, deps)).toBe("skipped");
    expect(embedText).toHaveBeenCalledTimes(0); // no model cost for hidden content
    expect(upsertEmbedding).toHaveBeenCalledTimes(0);
    expect(deleteEmbedding).toHaveBeenCalledWith(5);
  });

  it("with moderation off, the status is ignored and posts are indexed as before", async () => {
    process.env.AI_MODERATION_ENABLED = "false";
    const { deps, embedText, deleteEmbedding } = makeDeps(post({ moderationStatus: "held" }));
    expect(await embedPost(5, {}, deps)).toBe("embedded");
    expect(embedText).toHaveBeenCalledTimes(1);
    expect(deleteEmbedding).toHaveBeenCalledTimes(0);
  });

  it("a deleted post is reported as missing", async () => {
    const { deps } = makeDeps(null);
    expect(await embedPost(5, {}, deps)).toBe("missing");
  });

  it("an unchanged published post is skipped without a model call", async () => {
    const first = makeDeps(post({ moderationStatus: "published" }));
    await embedPost(5, {}, first.deps);
    const storedHash = (first.upsertEmbedding.mock.calls[0] as any)[1] as string;

    const { deps, embedText } = makeDeps(post({ moderationStatus: "published" }), storedHash);
    expect(await embedPost(5, {}, deps)).toBe("unchanged");
    expect(embedText).toHaveBeenCalledTimes(0);
  });
});

describe("embedPost: usage recording", () => {
  it("records the embedding tokens against the user who caused the indexing", async () => {
    const { deps } = makeDeps(post({ moderationStatus: "published" }));
    const recordUsage = mock(async () => {});
    await embedPost(5, { userId: "u9" }, { ...deps, recordUsage } as EmbedDeps);
    expect(recordUsage).toHaveBeenCalledTimes(1);
    expect((recordUsage.mock.calls[0] as any[])[0]).toMatchObject({ userId: "u9", feature: "embedding", embeddingTokens: 3 });
  });

  it("records nothing for the operator script (no user) or when nothing was embedded", async () => {
    const recordUsage = mock(async () => {});
    const a = makeDeps(post({ moderationStatus: "published" }));
    await embedPost(5, {}, { ...a.deps, recordUsage } as EmbedDeps);
    const b = makeDeps(post({ moderationStatus: "held" }));
    await embedPost(5, { userId: "u9" }, { ...b.deps, recordUsage } as EmbedDeps);
    expect(recordUsage).toHaveBeenCalledTimes(0);
  });
});
