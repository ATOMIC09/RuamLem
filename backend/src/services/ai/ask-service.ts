import { CitationFilter } from "../../ai/citations";
import { streamChat, type ChatChunk, type ChatMessage, type ChatUsage } from "../../ai/chat";
import { embedText } from "../../ai/embeddings";
import { classifyAiError } from "../../ai/errors";
import { buildAskMessages, buildGeneralMessages, retrievalQuery, type ChatTurn } from "../../ai/prompts";
import { encodeSse } from "../../ai/sse";
import { getPostSources, keywordMatchPosts, matchPosts, type PostSource } from "../../repositories/embedding-repo";
import { queryGrams } from "../../ai/keywords";
import { logger } from "../../utils/logger";
import { recordUsage, type UsageEntry } from "./usage-service";

export const TOP_K = 5;
// Cosine similarity cutoff, tuned on 13 provisional Thai questions against the real index:
// unrelated questions topped out at 0.407 and the weakest correct hit was 0.464.
export const MIN_SIMILARITY = 0.43;

export type AskDeps = {
  embedQuestion: (question: string, signal?: AbortSignal) => Promise<{ vector: number[]; tokens: number }>;
  matchPosts: typeof matchPosts;
  loadSources: (postIds: number[]) => Promise<PostSource[]>;
  // Plain-text search for names and rare words, which embeddings handle badly. Optional so a test can leave it out.
  keywordPosts?: (grams: string[], limit: number) => Promise<number[]>;
  streamChat: (messages: ChatMessage[], signal?: AbortSignal) => AsyncIterable<ChatChunk>;
  // Writes the token counts for the usage dashboard. Optional so a test can leave it out.
  recordUsage?: (entry: UsageEntry) => Promise<void>;
};

const defaultDeps: AskDeps = {
  embedQuestion: embedText,
  matchPosts,
  // Published posts only: even a stale index entry can never surface a held or rejected post.
  loadSources: (postIds) => getPostSources(postIds, { publishedOnly: true }),
  keywordPosts: keywordMatchPosts,
  streamChat,
  recordUsage,
};

export type AskInput = { question: string; userId: string; history?: ChatTurn[]; signal?: AbortSignal };

// SSE events: sources, delta, done, error. Nothing here logs the question, the answer or post text.
//
// Two modes, chosen by whether any published post matched:
//   posts   -> answer only from the matching posts, with [n] citations
//   general -> `sources` is empty and the model answers from its own knowledge (greetings, concepts,
//              study advice); it is told never to pretend the answer came from the site
export function askStream(input: AskInput, deps: AskDeps = defaultDeps): ReadableStream<Uint8Array> {
  const abort = new AbortController();
  input.signal?.addEventListener("abort", () => abort.abort(), { once: true });

  return new ReadableStream<Uint8Array>({
    start(controller) {
      void run(controller);
    },
    // The client disconnected or pressed Stop: cancel the upstream model call too.
    cancel() {
      abort.abort();
    },
  });

  async function run(controller: ReadableStreamDefaultController<Uint8Array>) {
    const started = Date.now();
    const send = (event: string, data: unknown) => {
      if (!abort.signal.aborted) controller.enqueue(encodeSse(event, data));
    };
    const log = { userId: input.userId, sources: [] as number[], topSimilarity: 0, keywordHits: 0, embeddingTokens: 0 };
    // What the usage row says about this call; filled in as the call goes.
    const spent: { outcome: UsageEntry["outcome"]; chat?: ChatUsage; mode: UsageEntry["mode"] } = { outcome: "ok", mode: null };

    try {
      const history = input.history ?? [];
      const { vector, tokens: embeddingTokens } = await deps.embedQuestion(retrievalQuery(input.question, history), abort.signal);
      log.embeddingTokens = embeddingTokens;

      const matches = await deps.matchPosts(vector, TOP_K, MIN_SIMILARITY);
      // Names and rare words: the question's own text, falling back to the text with the previous question
      // when the new one has almost nothing specific left ("แล้วปี 66 ล่ะ"). One piece alone never matches.
      const own = queryGrams(input.question);
      const grams = own.length >= 2 ? own : queryGrams(retrievalQuery(input.question, history));
      const keywordIds = (await deps.keywordPosts?.(grams, TOP_K)) ?? [];
      log.keywordHits = keywordIds.length;

      // Meaning-based matches first (best first), then the ones only the keywords found.
      const orderedIds = [...matches.map((m) => m.postId), ...keywordIds.filter((id) => !matches.some((m) => m.postId === id))];
      const byId = new Map((await deps.loadSources(orderedIds)).map((p) => [p.id, p]));
      // A post deleted since indexing simply drops out.
      const found = orderedIds
        .filter((id) => byId.has(id))
        .slice(0, TOP_K)
        .map((id) => ({ postId: id, similarity: matches.find((m) => m.postId === id)?.similarity ?? 0 }));
      log.topSimilarity = found[0]?.similarity ?? 0;

      const sources = found.map((m, i) => ({ n: i + 1, post: byId.get(m.postId)! }));
      log.sources = sources.map((s) => s.post.id);
      spent.mode = sources.length > 0 ? "posts" : "general";
      send("sources", sources.map((s) => ({ n: s.n, postId: s.post.id, title: s.post.title })));

      const messages =
        sources.length > 0
          ? buildAskMessages(
              input.question,
              sources.map((s) => ({ n: s.n, title: s.post.title, tags: s.post.tags, body: s.post.body })),
              history
            )
          : buildGeneralMessages(input.question, history);

      const citations = new CitationFilter(sources.length);
      let usage: ChatUsage | undefined;
      let filtered = false;

      for await (const chunk of deps.streamChat(messages, abort.signal)) {
        if (chunk.delta) {
          const safe = citations.push(chunk.delta);
          if (safe) send("delta", { text: safe });
        }
        if (chunk.usage) {
          usage = chunk.usage;
          spent.chat = usage;
        }
        // Azure cut the reply: treat as a final answer, never retry elsewhere.
        if (chunk.finishReason === "content_filter") filtered = true;
      }

      const tail = citations.flush();
      if (tail) send("delta", { text: tail });

      if (filtered) {
        spent.outcome = "content_filtered";
        send("error", { code: "content_filtered" });
        logger.warn("ask reply filtered", { ...log, ms: Date.now() - started });
      } else {
        send("done", { usage: usageOf(embeddingTokens, usage), ms: Date.now() - started });
        logger.info("ask finished", {
          ...log,
          outcome: sources.length > 0 ? "answered_from_posts" : "answered_general",
          promptTokens: usage?.promptTokens,
          completionTokens: usage?.completionTokens,
          ms: Date.now() - started,
        });
      }
    } catch (err: any) {
      if (abort.signal.aborted) {
        spent.outcome = "aborted";
        logger.info("ask aborted", { ...log, ms: Date.now() - started });
      } else {
        const failure = classifyAiError(err);
        spent.outcome = failure.code === "content_filtered" ? "content_filtered" : "error";
        send("error", { code: failure.code });
        logger.error("ask failed", {
          ...log,
          code: failure.code,
          categories: failure.categories,
          status: err?.status,
          message: err?.message,
        });
      }
    } finally {
      try {
        controller.close();
      } catch {
        // Already closed or cancelled by the client.
      }
      // The tokens were spent even if the user stopped or the call failed, so every call is counted.
      // Fire and forget: nothing waits for it, and a failure to record must never reach the user.
      try {
        void Promise.resolve(
          deps.recordUsage?.({
            userId: input.userId,
            feature: "ask",
            mode: spent.mode,
            outcome: spent.outcome,
            chat: spent.chat,
            embeddingTokens: log.embeddingTokens,
            latencyMs: Date.now() - started,
          })
        ).catch(() => {});
      } catch {
        // ignored on purpose
      }
    }
  }
}

function usageOf(embeddingTokens: number, chat?: ChatUsage) {
  return {
    embeddingTokens,
    promptTokens: chat?.promptTokens ?? 0,
    completionTokens: chat?.completionTokens ?? 0,
    totalTokens: embeddingTokens + (chat?.totalTokens ?? 0),
  };
}
