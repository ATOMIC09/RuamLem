import { describe, expect, it } from "vitest";
import { CHAT_LIMITS, clearChats, loadChats, saveChats, titleOf, trimChats, type StoredChat } from "./chat-store";

// A tiny in-memory Storage, optionally with a size cap that behaves like a full browser quota.
function fakeStorage(maxChars = Infinity) {
  const data = new Map<string, string>();
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (v.length > maxChars) throw new DOMException("full", "QuotaExceededError");
      data.set(k, v);
    },
    removeItem: (k: string) => void data.delete(k),
  } as unknown as Storage;
  return { storage, data };
}

const chat = (id: string, updatedAt: number, turns = 1, text = "คำตอบ"): StoredChat => ({
  id,
  title: `chat ${id}`,
  updatedAt,
  turns: Array.from({ length: turns }, (_, i) => ({ question: `q${i}`, text: `${text} ${i}`, sources: [], status: "done" as const })),
});

describe("titleOf", () => {
  it("uses the first question, on one line, cut at 60 characters", () => {
    expect(titleOf("  มีข้อสอบ\nDatabase   ไหม ")).toBe("มีข้อสอบ Database ไหม");
    expect(titleOf("x".repeat(100))).toHaveLength(58);
    expect(titleOf("   ")).toBe("บทสนทนาใหม่");
  });
});

describe("trimChats (the CCTV loop)", () => {
  it("keeps the newest 30 chats and drops the oldest", () => {
    const many = Array.from({ length: 35 }, (_, i) => chat(`c${i}`, i));
    const kept = trimChats(many);
    expect(kept).toHaveLength(CHAT_LIMITS.chats);
    expect(kept[0].id).toBe("c34"); // newest first
    expect(kept.some((c) => c.id === "c0")).toBe(false);
  });

  it("keeps the newest 40 turns of a long chat", () => {
    const [kept] = trimChats([chat("a", 1, 55)]);
    expect(kept.turns).toHaveLength(40);
    expect(kept.turns[0].question).toBe("q15");
    expect(kept.turns[39].question).toBe("q54");
  });

  it("cuts one very long answer", () => {
    const [kept] = trimChats([chat("a", 1, 1, "ก".repeat(20000))]);
    expect(kept.turns[0].text.length).toBe(CHAT_LIMITS.textChars);
  });

  it("drops the oldest chats until the whole list fits the size budget", () => {
    const limits = { ...CHAT_LIMITS, totalChars: 1500 };
    const chats = [chat("old", 1, 3, "x".repeat(400)), chat("mid", 2, 3, "x".repeat(400)), chat("new", 3, 3, "x".repeat(400))];
    const kept = trimChats(chats, limits);
    expect(kept.map((c) => c.id)).toEqual(["new"]);
  });

  it("if even one chat is too big, drops its oldest turns instead of everything", () => {
    const limits = { ...CHAT_LIMITS, totalChars: 600 };
    const [kept] = trimChats([chat("a", 1, 10, "x".repeat(200))], limits);
    expect(kept.turns.length).toBeGreaterThan(0);
    expect(kept.turns.length).toBeLessThan(10);
    expect(kept.turns[kept.turns.length - 1].question).toBe("q9"); // the newest turn survives
  });

  it("removes chats with no turns", () => {
    expect(trimChats([{ id: "e", title: "t", updatedAt: 1, turns: [] }])).toEqual([]);
  });
});

describe("saveChats and loadChats", () => {
  it("round-trips, newest first, under a key per user", () => {
    const { storage, data } = fakeStorage();
    saveChats("user-a", [chat("1", 1), chat("2", 2)], storage);
    expect(loadChats("user-a", storage).map((c) => c.id)).toEqual(["2", "1"]);
    expect(loadChats("user-b", storage)).toEqual([]); // another user on the same browser sees nothing
    expect([...data.keys()]).toEqual(["ruamlem.chats.v1.user-a"]);
  });

  it("when the browser is full it drops the oldest chats until the rest fits", () => {
    const { storage } = fakeStorage(900);
    const chats = [chat("old", 1, 2, "x".repeat(300)), chat("new", 2, 2, "x".repeat(300))];
    const kept = saveChats("u", chats, storage);
    expect(kept.map((c) => c.id)).toEqual(["new"]);
    expect(loadChats("u", storage).map((c) => c.id)).toEqual(["new"]);
  });

  it("gives up quietly when nothing fits, and never throws", () => {
    const { storage } = fakeStorage(10);
    expect(saveChats("u", [chat("a", 1)], storage)).toEqual([]);
  });

  it("works with no storage at all (private window, blocked site data)", () => {
    expect(saveChats("u", [chat("a", 1)], null)).toHaveLength(1);
    expect(loadChats("u", null)).toEqual([]);
    expect(() => clearChats("u", null)).not.toThrow();
  });

  it("ignores saved data that is broken or from another version", () => {
    const { storage } = fakeStorage();
    storage.setItem("ruamlem.chats.v1.u", "{not json");
    expect(loadChats("u", storage)).toEqual([]);

    storage.setItem(
      "ruamlem.chats.v1.u",
      JSON.stringify([
        { id: 1 },
        null,
        { id: "ok", updatedAt: 5, turns: [{ question: "q", text: "a", sources: [{ n: 1, postId: 2, title: "t" }, { bad: true }], status: "weird" }, { question: "q", text: "  " }] },
      ])
    );
    const [only] = loadChats("u", storage);
    expect(only.id).toBe("ok");
    expect(only.turns).toEqual([{ question: "q", text: "a", sources: [{ n: 1, postId: 2, title: "t" }], status: "done" }]);
    expect(only.title).toBe("q");
  });

  it("clearChats removes the user's list", () => {
    const { storage } = fakeStorage();
    saveChats("u", [chat("a", 1)], storage);
    clearChats("u", storage);
    expect(loadChats("u", storage)).toEqual([]);
  });
});
