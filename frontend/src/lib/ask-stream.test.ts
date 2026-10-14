import { afterEach, describe, expect, it, vi } from "vitest";
import { AskHttpError, AskStreamEndedError, streamAsk, toAskEvent } from "./ask-stream";
import type { AskEvent } from "@/types/ai";

const encoder = new TextEncoder();

// A fetch response whose body arrives in the given chunks, to mimic network splits.
function sseResponse(chunks: string[], status = 200): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(body, { status, headers: { "Content-Type": "text/event-stream" } });
}

async function collect(response: Response, signal = new AbortController().signal) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
  const events: AskEvent[] = [];
  await streamAsk("คำถาม", [], signal, (e) => events.push(e));
  return events;
}

afterEach(() => vi.unstubAllGlobals());

describe("streamAsk", () => {
  it("delivers typed events even when the network splits them", async () => {
    const full =
      'event: sources\ndata: [{"n":1,"postId":33,"title":"มิดเทอม"}]\n\n' +
      'event: delta\ndata: {"text":"มี"}\n\n' +
      'event: delta\ndata: {"text":"ครับ [1]"}\n\n' +
      'event: done\ndata: {"usage":{"embeddingTokens":1,"promptTokens":2,"completionTokens":3,"totalTokens":6},"ms":5}\n\n';
    // Split at awkward places, including inside a Thai character's bytes (one byte per chunk below).
    const events = await collect(sseResponse([full.slice(0, 20), full.slice(20, 90), full.slice(90)]));

    expect(events.map((e) => e.type)).toEqual(["sources", "delta", "delta", "done"]);
    expect(events[0]).toEqual({ type: "sources", sources: [{ n: 1, postId: 33, title: "มิดเทอม" }] });
    expect(events[2]).toEqual({ type: "delta", text: "ครับ [1]" });
  });

  it("decodes multi-byte characters split across chunk boundaries", async () => {
    const bytes = encoder.encode('event: delta\ndata: {"text":"ไทย"}\n\nevent: done\ndata: {"ms":1}\n\n');
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
        controller.close();
      },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body)));
    const events: AskEvent[] = [];
    await streamAsk("q", [], new AbortController().signal, (e) => events.push(e));
    expect(events[0]).toEqual({ type: "delta", text: "ไทย" });
  });

  it("sends the question as JSON with the bearer token", async () => {
    localStorage.setItem("authToken", "tok-123");
    const fetchMock = vi.fn().mockResolvedValue(sseResponse(['event: done\ndata: {"ms":1}\n\n']));
    vi.stubGlobal("fetch", fetchMock);
    await streamAsk("มีข้อสอบไหม", [], new AbortController().signal, () => {});

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/ai\/ask$/);
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer tok-123");
    expect(JSON.parse(init.body)).toEqual({ question: "มีข้อสอบไหม" });
    localStorage.removeItem("authToken");
  });

  it("sends the earlier messages with the question, and leaves the field out when there are none", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => sseResponse(['event: done\ndata: {"ms":1}\n\n']));
    vi.stubGlobal("fetch", fetchMock);
    const history = [
      { role: "user" as const, content: "มีข้อสอบ Database ไหม" },
      { role: "assistant" as const, content: "มีครับ [1]" },
    ];
    await streamAsk("แล้วปี 66 ล่ะ", history, new AbortController().signal, () => {});
    await streamAsk("สวัสดี", [], new AbortController().signal, () => {});

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ question: "แล้วปี 66 ล่ะ", history });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ question: "สวัสดี" });
  });

  it("throws AskHttpError for a non-200 response", async () => {
    await expect(collect(new Response("{}", { status: 401 }))).rejects.toMatchObject({
      name: "AskHttpError",
      status: 401,
    });
    expect(new AskHttpError(422).status).toBe(422);
  });

  it("throws when the stream ends without done or error", async () => {
    await expect(collect(sseResponse(['event: delta\ndata: {"text":"x"}\n\n']))).rejects.toBeInstanceOf(
      AskStreamEndedError
    );
  });

  it("treats an error event as a clean end", async () => {
    const events = await collect(sseResponse(['event: error\ndata: {"code":"rate_limited"}\n\n']));
    expect(events).toEqual([{ type: "error", code: "rate_limited" }]);
  });
});

describe("toAskEvent", () => {
  it("ignores malformed or unknown frames instead of throwing", () => {
    expect(toAskEvent("delta", "not json")).toBeNull();
    expect(toAskEvent("delta", '{"text":5}')).toBeNull();
    expect(toAskEvent("mystery", "{}")).toBeNull();
  });

  it("drops malformed sources and maps an unknown error code to unavailable", () => {
    expect(toAskEvent("sources", '[{"n":1,"postId":2,"title":"ok"},{"n":"x"}]')).toEqual({
      type: "sources",
      sources: [{ n: 1, postId: 2, title: "ok" }],
    });
    expect(toAskEvent("error", '{"code":"weird"}')).toEqual({ type: "error", code: "unavailable" });
  });
});
