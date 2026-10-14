import { describe, expect, it } from "vitest";
import { MAX_HISTORY_MESSAGES, buildHistory, isGeneralAnswer, type Turn } from "./conversation";

const turn = (over: Partial<Turn>): Turn => ({
  id: 1,
  question: "คำถาม",
  text: "คำตอบ",
  sources: [],
  status: "done",
  error: null,
  ...over,
});

describe("buildHistory", () => {
  it("is empty for a new conversation", () => {
    expect(buildHistory([])).toEqual([]);
  });

  it("turns each answered question into a user message and an assistant message, in order", () => {
    const history = buildHistory([
      turn({ id: 1, question: "มีข้อสอบ Database ไหม", text: "มีครับ [1]" }),
      turn({ id: 2, question: "แล้วปี 66 ล่ะ", text: "มีครับ [2]" }),
    ]);
    expect(history).toEqual([
      { role: "user", content: "มีข้อสอบ Database ไหม" },
      { role: "assistant", content: "มีครับ [1]" },
      { role: "user", content: "แล้วปี 66 ล่ะ" },
      { role: "assistant", content: "มีครับ [2]" },
    ]);
  });

  it("includes a stopped answer that already has text, but not a failed or empty one", () => {
    const history = buildHistory([
      turn({ id: 1, question: "a", text: "ครึ่งคำตอบ", status: "stopped" }),
      turn({ id: 2, question: "b", text: "", status: "error", error: "unavailable" }),
      turn({ id: 3, question: "c", text: "", status: "stopped" }),
      turn({ id: 4, question: "d", text: "กำลังตอบ", status: "streaming" }),
      turn({ id: 5, question: "e", text: "   ", status: "done" }),
    ]);
    expect(history).toEqual([
      { role: "user", content: "a" },
      { role: "assistant", content: "ครึ่งคำตอบ" },
    ]);
  });

  it("keeps only the most recent messages, matching what the backend accepts", () => {
    const turns = Array.from({ length: 10 }, (_, i) => turn({ id: i, question: `q${i}`, text: `a${i}` }));
    const history = buildHistory(turns);
    expect(history).toHaveLength(MAX_HISTORY_MESSAGES);
    expect(history[history.length - 1]).toEqual({ role: "assistant", content: "a9" });
    expect(history[0]).toEqual({ role: "user", content: "q6" });
  });
});

describe("isGeneralAnswer", () => {
  it("is true for a finished answer with text and no sources", () => {
    expect(isGeneralAnswer({ status: "done", sources: [], text: "สวัสดี" })).toBe(true);
    expect(isGeneralAnswer({ status: "stopped", sources: [], text: "สวัสดี" })).toBe(true);
  });

  it("is false while it is still coming, when there is no text, or when posts were used", () => {
    expect(isGeneralAnswer({ status: "streaming", sources: [], text: "สวัสดี" })).toBe(false);
    expect(isGeneralAnswer({ status: "searching", sources: [], text: "" })).toBe(false);
    expect(isGeneralAnswer({ status: "done", sources: [], text: "" })).toBe(false);
    expect(isGeneralAnswer({ status: "done", sources: [{ n: 1, postId: 1, title: "t" }], text: "x" })).toBe(false);
  });
});
