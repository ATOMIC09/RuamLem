import { CitationFilter } from "../../ai/citations";
import { streamChat, type ChatChunk, type ChatMessage, type ChatUsage } from "../../ai/chat";
import { embedText } from "../../ai/embeddings";
import { classifyAiError } from "../../ai/errors";
import { buildAskMessages, buildGeneralMessages, retrievalQuery, type ChatTurn } from "../../ai/prompts";
import { encodeSse } from "../../ai/sse";
import { getPostSources, matchPosts, type PostSource } from "../../repositories/embedding-repo";
import { logger } from "../../utils/logger";

export const TOP_K = 5;
// Cosine similarity cutoff, tuned on 13 provisional Thai questions against the real index:
// unrelated questions topped out at 0.407 and the weakest correct hit was 0.464.
export const MIN_SIMILARITY = 0.43;

export type AskDeps = {
  embedQuestion: (question: string, signal?: AbortSignal) => Promise<{ vector: number[]; tokens: number }>;
  matchPosts: typeof matchPosts;
  loadSources: (postIds: number[]) => Promise<PostSource[]>;
  streamChat: (messages: ChatMessage[], signal?: AbortSignal) => AsyncIterable<ChatChunk>;
};

const defaultDeps: AskDeps = {
  embedQuestion: embedText,
  matchPosts,
  // Published posts only: even a stale index entry can never surface a held or rejected post.
  loadSources: (postIds) => getPostSources(postIds, { publishedOnly: true }),
  streamChat,
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
    const log = { userId: input.userId, sources: [] as number[], topSimilarity: 0, embeddingTokens: 0 };

    try {
      const history = input.history ?? [];
      const { vector, tokens: embeddingTokens } = await deps.embedQuestion(retrievalQuery(input.question, history), abort.signal);
      log.embeddingTokens = embeddingTokens;

      const matches = await deps.matchPosts(vector, TOP_K, MIN_SIMILARITY);
      const byId = new Map((await deps.loadSources(matches.map((m) => m.postId))).map((p) => [p.id, p]));
      // Keep best-first order; a post deleted since indexing simply drops out.
      const found = matches.filter((m) => byId.has(m.postId));
      log.topSimilarity = found[0]?.similarity ?? 0;

      const sources = found.map((m, i) => ({ n: i + 1, post: byId.get(m.postId)! }));
      log.sources = sources.map((s) => s.post.id);
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
        if (chunk.usage) usage = chunk.usage;
        // Azure cut the reply: treat as a final answer, never retry elsewhere.
        if (chunk.finishReason === "content_filter") filtered = true;
      }

      const tail = citations.flush();
      if (tail) send("delta", { text: tail });

      if (filtered) {
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
        logger.info("ask aborted", { ...log, ms: Date.now() - started });
      } else {
        const failure = classifyAiError(err);
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
