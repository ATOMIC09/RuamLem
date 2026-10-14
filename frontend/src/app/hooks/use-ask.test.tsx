import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as askStream from "@/lib/ask-stream";
import type { AskEvent } from "@/types/ai";
import { useAsk } from "./use-ask";

vi.mock("@/lib/ask-stream", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/ask-stream")>();
  return { ...original, streamAsk: vi.fn() };
});
const streamAsk = vi.mocked(askStream.streamAsk);

// Plays a scripted answer into the hook, the way the network would.
function reply(events: AskEvent[]) {
  streamAsk.mockImplementationOnce(async (_q, _h, _signal, onEvent) => {
    for (const e of events) onEvent(e);
  });
}
const doneEvent: AskEvent = { type: "done", usage: { embeddingTokens: 1, promptTokens: 1, completionTokens: 1, totalTokens: 3 }, ms: 1 };

beforeEach(() => streamAsk.mockReset());

describe("useAsk", () => {
  it("answers a question and keeps it in the conversation", async () => {
    reply([
      { type: "sources", sources: [{ n: 1, postId: 33, title: "มิดเทอม Signal" }] },
      { type: "delta", text: "มีครับ " },
      { type: "delta", text: "[1]" },
      doneEvent,
    ]);
    const { result } = renderHook(() => useAsk());

    await act(() => result.current.ask("มีข้อสอบ Signals ไหม"));

    expect(result.current.turns).toHaveLength(1);
    expect(result.current.turns[0]).toMatchObject({ question: "มีข้อสอบ Signals ไหม", text: "มีครับ [1]", status: "done" });
    expect(result.current.turns[0].sources).toHaveLength(1);
    expect(result.current.busy).toBe(false);
  });

  it("sends earlier answers with the next question, so a follow-up has context", async () => {
    reply([{ type: "sources", sources: [] }, { type: "delta", text: "มีข้อสอบ Database ปี 65 และ 66" }, doneEvent]);
    reply([{ type: "sources", sources: [] }, { type: "delta", text: "ปี 66 มีครับ" }, doneEvent]);
    const { result } = renderHook(() => useAsk());

    await act(() => result.current.ask("มีข้อสอบ Database ไหม"));
    await act(() => result.current.ask("แล้วปี 66 ล่ะ"));

    expect(streamAsk.mock.calls[0][1]).toEqual([]); // the first question has no history
    expect(streamAsk.mock.calls[1][1]).toEqual([
      { role: "user", content: "มีข้อสอบ Database ไหม" },
      { role: "assistant", content: "มีข้อสอบ Database ปี 65 และ 66" },
    ]);
    expect(result.current.turns.map((t) => t.question)).toEqual(["มีข้อสอบ Database ไหม", "แล้วปี 66 ล่ะ"]);
  });

  it("a general answer (no sources) is a normal finished answer", async () => {
    reply([{ type: "sources", sources: [] }, { type: "delta", text: "สวัสดีครับ" }, doneEvent]);
    const { result } = renderHook(() => useAsk());
    await act(() => result.current.ask("สวัสดี"));
    expect(result.current.turns[0]).toMatchObject({ status: "done", text: "สวัสดีครับ", sources: [] });
  });

  it("a failed question shows its error and is left out of the next question's history", async () => {
    streamAsk.mockImplementationOnce(async () => {
      throw new askStream.AskHttpError(500);
    });
    reply([{ type: "sources", sources: [] }, { type: "delta", text: "โอเค" }, doneEvent]);
    const { result } = renderHook(() => useAsk());

    await act(() => result.current.ask("คำถามแรก"));
    expect(result.current.turns[0]).toMatchObject({ status: "error", error: "unavailable" });

    await act(() => result.current.ask("คำถามสอง"));
    expect(streamAsk.mock.calls[1][1]).toEqual([]);
  });

  it("a stream error event is shown on that turn", async () => {
    reply([{ type: "error", code: "rate_limited" }]);
    const { result } = renderHook(() => useAsk());
    await act(() => result.current.ask("x"));
    expect(result.current.turns[0]).toMatchObject({ status: "error", error: "rate_limited" });
  });

  it("maps 401 and 422 to their own messages", async () => {
    streamAsk.mockImplementationOnce(async () => {
      throw new askStream.AskHttpError(401);
    });
    streamAsk.mockImplementationOnce(async () => {
      throw new askStream.AskHttpError(422);
    });
    const { result } = renderHook(() => useAsk());
    await act(() => result.current.ask("a"));
    await act(() => result.current.ask("b"));
    expect(result.current.turns.map((t) => t.error)).toEqual(["unauthorized", "invalid"]);
  });

  it("Stop keeps the partial answer and marks the turn stopped", async () => {
    let release!: () => void;
    streamAsk.mockImplementationOnce(async (_q, _h, signal, onEvent) => {
      onEvent({ type: "sources", sources: [] });
      onEvent({ type: "delta", text: "ครึ่งทาง" });
      await new Promise<void>((resolve) => {
        release = resolve;
        signal.addEventListener("abort", () => resolve());
      });
    });
    const { result } = renderHook(() => useAsk());

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.ask("คำถามยาว");
    });
    await waitFor(() => expect(result.current.busy).toBe(true));

    act(() => result.current.stop());
    release?.();
    await act(() => pending);

    expect(result.current.turns[0]).toMatchObject({ status: "stopped", text: "ครึ่งทาง" });
    expect(result.current.busy).toBe(false);
  });

  it("reset starts a new conversation with no history", async () => {
    reply([{ type: "sources", sources: [] }, { type: "delta", text: "ตอบ" }, doneEvent]);
    reply([{ type: "sources", sources: [] }, { type: "delta", text: "ตอบใหม่" }, doneEvent]);
    const { result } = renderHook(() => useAsk());

    await act(() => result.current.ask("คำถามเก่า"));
    act(() => result.current.reset());
    expect(result.current.turns).toEqual([]);

    await act(() => result.current.ask("คำถามใหม่"));
    expect(streamAsk.mock.calls[1][1]).toEqual([]);
    expect(result.current.turns).toHaveLength(1);
  });
});
