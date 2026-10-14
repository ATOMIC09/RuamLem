import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import type { ChatChunk, ChatMessage } from "../../ai/chat";
import type { PostSource } from "../../repositories/embedding-repo";
import { logger } from "../../utils/logger";
import { MIN_SIMILARITY, NO_MATCH_TEXT, TOP_K, askStream, type AskDeps } from "./ask-service";

type Frame = { event: string; data: any };

async function readAll(stream: ReadableStream<Uint8Array>): Promise<Frame[]> {
  const text = await new Response(stream).text();
  return text
    .split("\n\n")
    .filter(Boolean)
    .map((raw) => ({
      event: /^event: (.*)$/m.exec(raw)![1],
      data: JSON.parse(/^data: (.*)$/m.exec(raw)![1]),
    }));
}

const post = (id: number, title: string, body = "เนื้อหาโพสต์"): PostSource => ({ id, title, body, tags: ["Signals"] });

const POSTS = [post(33, "มิดเทอม Signal ปี 2566", "วิชา 010123106 BODYMARKER"), post(48, "final Signals")];

// Fake dependencies. `chat` decides what the model "says".
function makeDeps(opts: {
  matches?: { postId: number; similarity: number }[];
  chat?: (messages: ChatMessage[], signal?: AbortSignal) => AsyncIterable<ChatChunk>;
  loaded?: PostSource[];
  embed?: () => Promise<{ vector: number[]; tokens: number }>;
}) {
  const matches = opts.matches ?? [
    { postId: 33, similarity: 0.6 },
    { postId: 48, similarity: 0.5 },
  ];
  const deps = {
    embedQuestion: mock(opts.embed ?? (async () => ({ vector: [0.1], tokens: 7 }))),
    matchPosts: mock(async () => matches),
    loadSources: mock(async (ids: number[]) => (opts.loaded ?? POSTS).filter((p) => ids.includes(p.id))),
    streamChat: mock(
      opts.chat ??
        async function* () {
          yield { delta: "มีครับ [1]" };
        }
    ),
  };
  return { deps: deps as unknown as AskDeps, mocks: deps };
}

const input = { question: "มีข้อสอบ midterm Signals ไหม", userId: "user-1" };

afterEach(() => mock.restore());

describe("askStream: no match", () => {
  it("answers with the fixed message and never calls the chat model", async () => {
    const { deps, mocks } = makeDeps({ matches: [] });
    const frames = await readAll(askStream(input, deps));

    expect(frames.map((f) => f.event)).toEqual(["sources", "delta", "done"]);
    expect(frames[0].data).toEqual([]);
    expect(frames[1].data).toEqual({ text: NO_MATCH_TEXT });
    expect(frames[2].data.usage).toMatchObject({ embeddingTokens: 7, promptTokens: 0, completionTokens: 0 });
    expect(mocks.streamChat).toHaveBeenCalledTimes(0);
  });

  it("searches the top 5 with the tuned cutoff", async () => {
    const { deps, mocks } = makeDeps({ matches: [] });
    await readAll(askStream(input, deps));
    expect(mocks.matchPosts).toHaveBeenCalledWith([0.1], TOP_K, MIN_SIMILARITY);
    expect(TOP_K).toBe(5);
    expect(MIN_SIMILARITY).toBeGreaterThan(0.4);
  });

  it("also counts as no match when every matched post was deleted since indexing", async () => {
    const { deps, mocks } = makeDeps({ loaded: [] });
    const frames = await readAll(askStream(input, deps));
    expect(frames[1].data).toEqual({ text: NO_MATCH_TEXT });
    expect(mocks.streamChat).toHaveBeenCalledTimes(0);
  });
});

describe("askStream: answer", () => {
  it("sends sources first, numbered best-first, then deltas, then done with usage", async () => {
    const { deps } = makeDeps({
      chat: async function* () {
        yield { delta: "มีข้อสอบ" };
        yield { delta: " [1]" };
        yield { finishReason: "stop" };
        yield { usage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 } };
      },
    });
    const frames = await readAll(askStream(input, deps));

    expect(frames.map((f) => f.event)).toEqual(["sources", "delta", "delta", "done"]);
    expect(frames[0].data).toEqual([
      { n: 1, postId: 33, title: "มิดเทอม Signal ปี 2566" },
      { n: 2, postId: 48, title: "final Signals" },
    ]);
    expect(frames.filter((f) => f.event === "delta").map((f) => f.data.text).join("")).toBe("มีข้อสอบ [1]");
    expect(frames[3].data.usage).toEqual({
      embeddingTokens: 7,
      promptTokens: 100,
      completionTokens: 20,
      totalTokens: 127,
    });
    expect(frames[3].data.ms).toBeGreaterThanOrEqual(0);
  });

  it("builds the prompt from the matched posts only", async () => {
    const { deps, mocks } = makeDeps({});
    await readAll(askStream(input, deps));

    const messages = mocks.streamChat.mock.calls[0][0] as ChatMessage[];
    expect(messages[1].content).toContain('<source n="1" title="มิดเทอม Signal ปี 2566"');
    expect(messages[1].content).toContain("BODYMARKER");
    expect(messages[1].content).toContain('<source n="2"');
    expect(messages[1].content).toContain(input.question);
  });

  it("drops citations that point at a source that was not sent, even when split across chunks", async () => {
    const { deps } = makeDeps({
      chat: async function* () {
        yield { delta: "ตาม [" };
        yield { delta: "9] และ [" };
        yield { delta: "2" };
        yield { delta: "] จบ [7]" };
      },
    });
    const frames = await readAll(askStream(input, deps));
    const text = frames.filter((f) => f.event === "delta").map((f) => f.data.text).join("");
    expect(text).toBe("ตาม  และ [2] จบ ");
  });

  it("flushes a held-back tail at the end of the stream", async () => {
    const { deps } = makeDeps({
      chat: async function* () {
        yield { delta: "จบด้วย [1" };
      },
    });
    const frames = await readAll(askStream(input, deps));
    const text = frames.filter((f) => f.event === "delta").map((f) => f.data.text).join("");
    expect(text).toBe("จบด้วย [1");
  });
});

describe("askStream: failures", () => {
  it("a reply cut by the content filter ends with content_filtered and no done event", async () => {
    const { deps } = makeDeps({
      chat: async function* () {
        yield { delta: "เริ่มตอบ" };
        yield { finishReason: "content_filter" };
      },
    });
    const frames = await readAll(askStream(input, deps));
    expect(frames.map((f) => f.event)).toEqual(["sources", "delta", "error"]);
    expect(frames[frames.length - 1].data).toEqual({ code: "content_filtered" });
  });

  it("a prompt blocked with a 400 content_filter is final: one call, no retry", async () => {
    const { deps, mocks } = makeDeps({
      chat: () => {
        throw { status: 400, code: "content_filter", error: { innererror: { content_filter_result: { jailbreak: { filtered: true } } } } };
      },
    });
    const frames = await readAll(askStream(input, deps));
    expect(frames[frames.length - 1]).toEqual({ event: "error", data: { code: "content_filtered" } });
    expect(mocks.streamChat).toHaveBeenCalledTimes(1);
  });

  it("any other model failure is unavailable", async () => {
    const { deps } = makeDeps({
      chat: () => {
        throw Object.assign(new Error("upstream 503"), { status: 503 });
      },
    });
    const frames = await readAll(askStream(input, deps));
    expect(frames[frames.length - 1]).toEqual({ event: "error", data: { code: "unavailable" } });
  });

  it("a failure to embed the question is unavailable and calls nothing else", async () => {
    const { deps, mocks } = makeDeps({
      embed: async () => {
        throw new Error("embedding down");
      },
    });
    const frames = await readAll(askStream(input, deps));
    expect(frames).toEqual([{ event: "error", data: { code: "unavailable" } }]);
    expect(mocks.matchPosts).toHaveBeenCalledTimes(0);
    expect(mocks.streamChat).toHaveBeenCalledTimes(0);
  });

  it("a failure partway through keeps what was sent and then reports an error", async () => {
    const { deps } = makeDeps({
      chat: async function* () {
        yield { delta: "ครึ่งทาง" };
        throw new Error("connection reset");
      },
    });
    const frames = await readAll(askStream(input, deps));
    expect(frames.map((f) => f.event)).toEqual(["sources", "delta", "error"]);
  });
});

describe("askStream: client disconnect", () => {
  it("cancelling the stream aborts the upstream model call", async () => {
    let upstreamSignal: AbortSignal | undefined;
    const started = Promise.withResolvers<void>();
    const { deps } = makeDeps({
      chat: async function* (_messages, signal) {
        upstreamSignal = signal;
        started.resolve();
        await new Promise((resolve) => signal?.addEventListener("abort", resolve));
        throw new DOMException("aborted", "AbortError");
      },
    });

    const reader = askStream(input, deps).getReader();
    await started.promise;
    expect(upstreamSignal?.aborted).toBe(false);

    await reader.cancel();
    expect(upstreamSignal?.aborted).toBe(true);
  });

  it("an abort signal from the request aborts it too", async () => {
    const request = new AbortController();
    let upstreamSignal: AbortSignal | undefined;
    const started = Promise.withResolvers<void>();
    const { deps } = makeDeps({
      chat: async function* (_messages, signal) {
        upstreamSignal = signal;
        started.resolve();
        await new Promise((resolve) => signal?.addEventListener("abort", resolve));
      },
    });

    const done = readAll(askStream({ ...input, signal: request.signal }, deps));
    await started.promise;
    request.abort();
    await done;
    expect(upstreamSignal?.aborted).toBe(true);
  });
});

describe("askStream: logging", () => {
  it("logs ids, outcome and timings but never the question, the answer or post text", async () => {
    const spies = [spyOn(logger, "info"), spyOn(logger, "warn"), spyOn(logger, "error"), spyOn(logger, "debug")];
    spies.forEach((s) => s.mockImplementation(() => {}));

    const { deps } = makeDeps({
      chat: async function* () {
        yield { delta: "ANSWERMARKER [1]" };
      },
    });
    await readAll(askStream({ question: "QUESTIONMARKER", userId: "user-1" }, deps));

    const logged = JSON.stringify(spies.flatMap((s) => s.mock.calls));
    expect(logged).toContain("ask finished");
    expect(logged).toContain("user-1");
    expect(logged).not.toContain("QUESTIONMARKER");
    expect(logged).not.toContain("ANSWERMARKER");
    expect(logged).not.toContain("BODYMARKER");
    expect(logged).not.toContain("มิดเทอม Signal");
  });

  it("failures are logged without the question either", async () => {
    const errorSpy = spyOn(logger, "error").mockImplementation(() => {});
    const { deps } = makeDeps({
      chat: () => {
        throw Object.assign(new Error("boom"), { status: 500 });
      },
    });
    await readAll(askStream({ question: "QUESTIONMARKER", userId: "user-1" }, deps));

    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("QUESTIONMARKER");
    expect(JSON.stringify(errorSpy.mock.calls)).toContain("unavailable");
  });
});
