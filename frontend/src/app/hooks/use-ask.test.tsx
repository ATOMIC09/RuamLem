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

describe("useAsk: saved chats", () => {
  beforeEach(() => localStorage.clear());
  const key = (u: string) => `ruamlem.chats.v1.${u}`;
  const answer = (text: string) => reply([{ type: "sources", sources: [] }, { type: "delta", text }, doneEvent]);

  it("saves a finished chat in this browser, titled by its first question", async () => {
    answer("คำตอบแรก");
    const { result } = renderHook(() => useAsk("user-1"));
    await act(() => result.current.ask("มีข้อสอบ Database ไหม"));

    await waitFor(() => expect(result.current.chats).toHaveLength(1));
    expect(result.current.chats[0]).toMatchObject({ title: "มีข้อสอบ Database ไหม" });
    expect(result.current.chats[0].turns).toEqual([{ question: "มีข้อสอบ Database ไหม", text: "คำตอบแรก", sources: [], status: "done" }]);
    expect(result.current.activeId).toBe(result.current.chats[0].id);
    expect(JSON.parse(localStorage.getItem(key("user-1"))!)).toHaveLength(1);
  });

  it("keeps adding to the same saved chat as the conversation goes on", async () => {
    answer("หนึ่ง");
    answer("สอง");
    const { result } = renderHook(() => useAsk("user-1"));
    await act(() => result.current.ask("ข้อหนึ่ง"));
    await act(() => result.current.ask("ข้อสอง"));

    await waitFor(() => expect(result.current.chats[0].turns).toHaveLength(2));
    expect(result.current.chats).toHaveLength(1);
  });

  it("opens an old chat and continues it, sending its earlier answers as context", async () => {
    answer("คำตอบเรื่อง JWT");
    const first = renderHook(() => useAsk("user-1"));
    await act(() => first.result.current.ask("JWT คืออะไร"));
    await waitFor(() => expect(first.result.current.chats).toHaveLength(1));
    first.unmount();

    // a later visit: a new hook instance loads the saved list
    const { result } = renderHook(() => useAsk("user-1"));
    await waitFor(() => expect(result.current.chats).toHaveLength(1));
    expect(result.current.turns).toEqual([]); // the page opens on a fresh chat

    act(() => result.current.openChat(result.current.chats[0].id));
    expect(result.current.turns.map((t) => t.question)).toEqual(["JWT คืออะไร"]);

    answer("ใช้กับ cookie ได้");
    await act(() => result.current.ask("แล้วเก็บใน cookie ได้ไหม"));
    expect(streamAsk.mock.calls.at(-1)![1]).toEqual([
      { role: "user", content: "JWT คืออะไร" },
      { role: "assistant", content: "คำตอบเรื่อง JWT" },
    ]);
    await waitFor(() => expect(result.current.chats[0].turns).toHaveLength(2));
    expect(result.current.chats).toHaveLength(1); // continued, not copied
  });

  it("merely opening a chat does not move it to the top of the list", async () => {
    answer("a");
    answer("b");
    const { result } = renderHook(() => useAsk("user-1"));
    await act(() => result.current.ask("แรก"));
    act(() => result.current.reset());
    await act(() => result.current.ask("สอง"));
    await waitFor(() => expect(result.current.chats).toHaveLength(2));

    const before = result.current.chats.map((c) => [c.id, c.updatedAt]);
    const older = result.current.chats[1].id;
    act(() => result.current.openChat(older));
    await new Promise((r) => setTimeout(r, 5));
    expect(result.current.chats.map((c) => [c.id, c.updatedAt])).toEqual(before);
  });

  it("a new chat starts empty and leaves the old one saved", async () => {
    answer("a");
    const { result } = renderHook(() => useAsk("user-1"));
    await act(() => result.current.ask("แรก"));
    act(() => result.current.reset());
    expect(result.current.turns).toEqual([]);
    expect(result.current.activeId).toBeNull();
    expect(result.current.chats).toHaveLength(1);
  });

  it("a failed or unfinished question is not saved", async () => {
    streamAsk.mockImplementationOnce(async (_q, _h, _s, onEvent) => onEvent({ type: "error", code: "unavailable" }));
    const { result } = renderHook(() => useAsk("user-1"));
    await act(() => result.current.ask("จะพัง"));
    expect(result.current.chats).toEqual([]);
    expect(localStorage.getItem(key("user-1"))).toBeNull();
  });

  it("deletes one chat, or all of them", async () => {
    answer("a");
    answer("b");
    const { result } = renderHook(() => useAsk("user-1"));
    await act(() => result.current.ask("แรก"));
    act(() => result.current.reset());
    await act(() => result.current.ask("สอง"));
    await waitFor(() => expect(result.current.chats).toHaveLength(2));

    act(() => result.current.deleteChat(result.current.chats[0].id)); // the open one
    expect(result.current.chats).toHaveLength(1);
    expect(result.current.turns).toEqual([]); // deleting the open chat closes it

    act(() => result.current.deleteAllChats());
    expect(result.current.chats).toEqual([]);
    expect(localStorage.getItem(key("user-1"))).toBeNull();
  });

  it("each user has their own list on the same browser", async () => {
    answer("a");
    const a = renderHook(() => useAsk("user-a"));
    await act(() => a.result.current.ask("ของ A"));
    await waitFor(() => expect(a.result.current.chats).toHaveLength(1));

    const b = renderHook(() => useAsk("user-b"));
    expect(b.result.current.chats).toEqual([]);
  });

  it("without a user nothing is saved", async () => {
    answer("a");
    const { result } = renderHook(() => useAsk(null));
    await act(() => result.current.ask("ไม่มีบัญชี"));
    expect(result.current.chats).toEqual([]);
    expect(localStorage.length).toBe(0);
  });
});
