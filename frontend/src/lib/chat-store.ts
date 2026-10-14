import type { AskSource } from "@/types/ai";

// Saved chats live in THIS browser only (localStorage), one list per signed-in user. Nothing is sent to the
// server or stored in the database, so there is no server-side chat log to grow, protect or delete.
//
// The store is bounded, like a CCTV loop: when it gets too big, the oldest chats are dropped first.

export type StoredTurn = {
  question: string;
  text: string;
  sources: AskSource[];
  status: "done" | "stopped";
};

export type StoredChat = {
  id: string;
  title: string;
  updatedAt: number;
  turns: StoredTurn[];
};

export type ChatLimits = {
  chats: number; // most chats kept
  turnsPerChat: number; // most question-and-answer pairs kept in one chat (the oldest go first)
  textChars: number; // one answer is cut to this length
  totalChars: number; // the whole saved list, as JSON, stays under this (localStorage allows about 5 MB)
};

export const CHAT_LIMITS: ChatLimits = { chats: 30, turnsPerChat: 40, textChars: 8000, totalChars: 1_500_000 };

const keyOf = (userId: string) => `ruamlem.chats.v1.${userId}`;

export function titleOf(question: string): string {
  const flat = question.replace(/\s+/g, " ").trim();
  return flat.length > 60 ? `${flat.slice(0, 57)}…` : flat || "บทสนทนาใหม่";
}

export function newChatId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const sizeOf = (value: unknown) => JSON.stringify(value).length;

// Applies every limit. Newest chats win, and inside a chat the newest turns win.
export function trimChats(chats: StoredChat[], limits: ChatLimits = CHAT_LIMITS): StoredChat[] {
  const out = chats
    .map((chat) => ({
      ...chat,
      turns: chat.turns.slice(-limits.turnsPerChat).map((t) => ({ ...t, text: t.text.slice(0, limits.textChars) })),
    }))
    .filter((chat) => chat.turns.length > 0)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limits.chats);

  while (out.length > 1 && sizeOf(out) > limits.totalChars) out.pop();
  // One enormous chat: drop its oldest turns until it fits.
  while (out.length === 1 && out[0].turns.length > 1 && sizeOf(out) > limits.totalChars) {
    out[0] = { ...out[0], turns: out[0].turns.slice(1) };
  }
  return out;
}

const isSource = (s: unknown): s is AskSource =>
  !!s && typeof s === "object" && typeof (s as AskSource).n === "number" && typeof (s as AskSource).postId === "number" && typeof (s as AskSource).title === "string";

// What was saved is read back defensively: it is outside data, and an old version may have written another shape.
function clean(raw: unknown): StoredChat[] {
  if (!Array.isArray(raw)) return [];
  const chats: StoredChat[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const c = item as Partial<StoredChat>;
    if (typeof c.id !== "string" || typeof c.updatedAt !== "number" || !Array.isArray(c.turns)) continue;
    const turns: StoredTurn[] = [];
    for (const t of c.turns) {
      if (!t || typeof t !== "object" || typeof t.question !== "string" || typeof t.text !== "string" || !t.text.trim()) continue;
      turns.push({
        question: t.question,
        text: t.text,
        sources: Array.isArray(t.sources) ? t.sources.filter(isSource) : [],
        status: t.status === "stopped" ? "stopped" : "done",
      });
    }
    if (turns.length > 0) chats.push({ id: c.id, title: typeof c.title === "string" && c.title ? c.title : titleOf(turns[0].question), updatedAt: c.updatedAt, turns });
  }
  return trimChats(chats);
}

// Storage can be missing, blocked or full (private windows, site settings). None of that may break the page.
function store(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function loadChats(userId: string, storage: Storage | null = store()): StoredChat[] {
  try {
    const text = storage?.getItem(keyOf(userId));
    return text ? clean(JSON.parse(text)) : [];
  } catch {
    return [];
  }
}

// Saves the list (after trimming) and returns what was really kept. If the browser says it is full,
// the oldest chat is dropped and it tries again, until it fits or nothing is left to drop.
export function saveChats(userId: string, chats: StoredChat[], storage: Storage | null = store()): StoredChat[] {
  let kept = trimChats(chats);
  if (!storage) return kept;

  for (;;) {
    try {
      if (kept.length === 0) storage.removeItem(keyOf(userId));
      else storage.setItem(keyOf(userId), JSON.stringify(kept));
      return kept;
    } catch {
      if (kept.length === 0) return kept;
      kept = kept.length > 1 ? kept.slice(0, -1) : [];
    }
  }
}

export function clearChats(userId: string, storage: Storage | null = store()): void {
  try {
    storage?.removeItem(keyOf(userId));
  } catch {
    // nothing to do
  }
}
