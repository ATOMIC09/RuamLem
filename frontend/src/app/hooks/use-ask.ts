"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AskHttpError, streamAsk } from "@/lib/ask-stream";
import type { AskFailure } from "@/lib/ask-messages";
import type { AskEvent, AskSource } from "@/types/ai";

export type AskStatus = "idle" | "searching" | "streaming" | "done" | "no_match" | "stopped" | "error";

export type AskState = {
  status: AskStatus;
  question: string;
  text: string;
  sources: AskSource[];
  error: AskFailure | null;
};

const IDLE: AskState = { status: "idle", question: "", text: "", sources: [], error: null };

function failureOf(err: unknown): AskFailure {
  if (err instanceof AskHttpError) {
    if (err.status === 401) return "unauthorized";
    if (err.status === 422) return "invalid";
  }
  return "unavailable";
}

export function useAsk() {
  const [state, setState] = useState<AskState>(IDLE);
  const abortRef = useRef<AbortController | null>(null);

  const apply = useCallback((event: AskEvent) => {
    setState((s) => {
      switch (event.type) {
        case "sources":
          return { ...s, sources: event.sources };
        case "delta":
          return { ...s, status: "streaming", text: s.text + event.text };
        case "done":
          return { ...s, status: s.sources.length === 0 ? "no_match" : "done" };
        case "error":
          return { ...s, status: "error", error: event.code };
      }
    });
  }, []);

  const ask = useCallback(
    async (question: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({ ...IDLE, status: "searching", question });

      try {
        await streamAsk(question, controller.signal, apply);
      } catch (err) {
        if (controller.signal.aborted) return;
        setState((s) => ({ ...s, status: "error", error: failureOf(err) }));
      }
    },
    [apply]
  );

  // Stop keeps the partial answer on screen.
  const stop = useCallback(() => {
    abortRef.current?.abort();
    setState((s) => (s.status === "searching" || s.status === "streaming" ? { ...s, status: "stopped" } : s));
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { state, ask, stop };
}
