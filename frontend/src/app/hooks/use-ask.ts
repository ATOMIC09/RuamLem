"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AskHttpError, streamAsk } from "@/lib/ask-stream";
import type { AskFailure } from "@/lib/ask-messages";
import { buildHistory, type AskStatus, type Turn } from "@/lib/conversation";
import { clearChats, loadChats, newChatId, saveChats, titleOf, type StoredChat } from "@/lib/chat-store";
import type { AskEvent } from "@/types/ai";

export type { AskStatus, Turn };
// A single turn is what the answer component shows.
export type AskState = Turn;

function failureOf(err: unknown): AskFailure {
  if (err instanceof AskHttpError) {
    if (err.status === 401) return "unauthorized";
    if (err.status === 422) return "invalid";
  }
  return "unavailable";
}

// A chat: a list of turns, each one question and its streamed answer. Earlier answers are sent back with
// every new question so follow-ups make sense.
//
// With a `userId`, finished chats are also saved in this browser (see lib/chat-store.ts) so they can be opened
// later and continued. They are never sent to the server except as the last few messages of the open chat.
export function useAsk(userId?: string | null) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const turnsRef = useRef<Turn[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const nextId = useRef(1);

  const [chats, setChats] = useState<StoredChat[]>([]);
  const chatsRef = useRef<StoredChat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeIdRef = useRef<string | null>(null);

  const setSaved = useCallback((next: StoredChat[]) => {
    chatsRef.current = next;
    setChats(next);
  }, []);

  const update = useCallback((updater: (turns: Turn[]) => Turn[]) => {
    turnsRef.current = updater(turnsRef.current);
    setTurns(turnsRef.current);
  }, []);

  const patchTurn = useCallback(
    (id: number, patch: (turn: Turn) => Turn) => update((all) => all.map((t) => (t.id === id ? patch(t) : t))),
    [update]
  );

  const apply = useCallback(
    (id: number, event: AskEvent) => {
      patchTurn(id, (t) => {
        switch (event.type) {
          case "sources":
            return { ...t, sources: event.sources };
          case "delta":
            return { ...t, status: "streaming", text: t.text + event.text };
          case "done":
            return { ...t, status: "done" };
          case "error":
            return { ...t, status: "error", error: event.code };
        }
      });
    },
    [patchTurn]
  );

  const ask = useCallback(
    async (question: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // Taken before the new turn is added, so the history is exactly what came before it.
      const history = buildHistory(turnsRef.current);
      const id = nextId.current++;
      update((all) => [...all, { id, question, text: "", sources: [], status: "searching", error: null }]);

      try {
        await streamAsk(question, history, controller.signal, (event) => apply(id, event));
      } catch (err) {
        if (controller.signal.aborted) return;
        patchTurn(id, (t) => ({ ...t, status: "error", error: failureOf(err) }));
      }
    },
    [apply, patchTurn, update]
  );

  // Stop keeps the partial answer on screen.
  const stop = useCallback(() => {
    abortRef.current?.abort();
    update((all) =>
      all.map((t, i) => (i === all.length - 1 && (t.status === "searching" || t.status === "streaming") ? { ...t, status: "stopped" } : t))
    );
  }, [update]);

  // Start a new conversation. The old one stays in the saved list.
  const reset = useCallback(() => {
    abortRef.current?.abort();
    activeIdRef.current = null;
    setActiveId(null);
    update(() => []);
  }, [update]);

  // Open a saved chat to read it or to keep asking in it.
  const openChat = useCallback(
    (id: string) => {
      const chat = chatsRef.current.find((c) => c.id === id);
      if (!chat) return;
      abortRef.current?.abort();
      activeIdRef.current = id;
      setActiveId(id);
      nextId.current = 1;
      update(() =>
        chat.turns.map((t) => ({ id: nextId.current++, question: t.question, text: t.text, sources: t.sources, status: t.status, error: null }))
      );
    },
    [update]
  );

  const deleteChat = useCallback(
    (id: string) => {
      if (!userId) return;
      setSaved(saveChats(userId, chatsRef.current.filter((c) => c.id !== id)));
      if (activeIdRef.current === id) reset();
    },
    [userId, setSaved, reset]
  );

  const deleteAllChats = useCallback(() => {
    if (!userId) return;
    clearChats(userId);
    setSaved([]);
    reset();
  }, [userId, setSaved, reset]);

  // The saved list belongs to the signed-in user: load it when the user is known, drop it when they change.
  useEffect(() => {
    setSaved(userId ? loadChats(userId) : []);
    activeIdRef.current = null;
    setActiveId(null);
    abortRef.current?.abort();
    update(() => []);
  }, [userId, setSaved, update]);

  // Save the open chat whenever it settles (no answer is still coming in). Only finished answers are kept.
  useEffect(() => {
    if (!userId || turns.length === 0) return;
    const last = turns[turns.length - 1];
    if (last.status === "searching" || last.status === "streaming") return;

    const finished = turns.filter((t) => (t.status === "done" || t.status === "stopped") && t.text.trim());
    if (finished.length === 0) return;

    const id = activeIdRef.current ?? newChatId();
    const existing = chatsRef.current.find((c) => c.id === id);
    const latest = finished[finished.length - 1];
    // Opening a saved chat must not count as activity (it would jump to the top of the list).
    if (existing && existing.turns.length === finished.length && existing.turns[existing.turns.length - 1].text === latest.text) return;

    const chat: StoredChat = {
      id,
      title: existing?.title ?? titleOf(finished[0].question),
      updatedAt: Date.now(),
      turns: finished.map((t) => ({ question: t.question, text: t.text, sources: t.sources, status: t.status as "done" | "stopped" })),
    };
    activeIdRef.current = id;
    setActiveId(id);
    setSaved(saveChats(userId, [chat, ...chatsRef.current.filter((c) => c.id !== id)]));
  }, [turns, userId, setSaved]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const last = turns[turns.length - 1];
  const busy = last?.status === "searching" || last?.status === "streaming";

  return { turns, busy, ask, stop, reset, chats, activeId, openChat, deleteChat, deleteAllChats };
}
