"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AskHttpError, streamAsk } from "@/lib/ask-stream";
import type { AskFailure } from "@/lib/ask-messages";
import { buildHistory, type AskStatus, type Turn } from "@/lib/conversation";
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
export function useAsk() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const turnsRef = useRef<Turn[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const nextId = useRef(1);

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

  // Start a new conversation.
  const reset = useCallback(() => {
    abortRef.current?.abort();
    update(() => []);
  }, [update]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const last = turns[turns.length - 1];
  const busy = last?.status === "searching" || last?.status === "streaming";

  return { turns, busy, ask, stop, reset };
}
