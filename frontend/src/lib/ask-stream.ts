import { API_URL, getAuthToken } from "@/lib/api";
import type { HistoryMessage } from "@/lib/conversation";
import { createSseParser } from "@/lib/sse";
import type { AskErrorCode, AskEvent, AskSource, AskUsage } from "@/types/ai";

const ERROR_CODES: AskErrorCode[] = ["rate_limited", "content_filtered", "unavailable", "ai_disabled"];

export class AskHttpError extends Error {
  constructor(public status: number) {
    super(`Ask request failed with HTTP ${status}`);
    this.name = "AskHttpError";
  }
}

// The stream closed before a `done` or `error` event: the connection dropped mid-answer.
export class AskStreamEndedError extends Error {
  constructor() {
    super("Answer stream ended unexpectedly");
    this.name = "AskStreamEndedError";
  }
}

// Turns a raw SSE frame into a typed event. Anything malformed is ignored, never thrown.
export function toAskEvent(event: string, rawData: string): AskEvent | null {
  let data: unknown;
  try {
    data = JSON.parse(rawData);
  } catch {
    return null;
  }

  if (event === "sources" && Array.isArray(data)) {
    const sources = data.filter(
      (s): s is AskSource =>
        !!s && typeof s.n === "number" && typeof s.postId === "number" && typeof s.title === "string"
    );
    return { type: "sources", sources };
  }
  if (event === "delta" && typeof (data as { text?: unknown })?.text === "string") {
    return { type: "delta", text: (data as { text: string }).text };
  }
  if (event === "done") {
    const d = data as { usage?: AskUsage; ms?: number };
    return { type: "done", usage: d.usage as AskUsage, ms: Number(d.ms) || 0 };
  }
  if (event === "error") {
    const code = (data as { code?: AskErrorCode })?.code;
    return { type: "error", code: code && ERROR_CODES.includes(code) ? code : "unavailable" };
  }
  return null;
}

// fetch + stream reader, not EventSource: EventSource can't send POST or an Authorization header.
export async function streamAsk(
  question: string,
  history: HistoryMessage[],
  signal: AbortSignal,
  onEvent: (event: AskEvent) => void
): Promise<void> {
  const token = getAuthToken();
  const res = await fetch(`${API_URL}/ai/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    // The earlier messages let a follow-up such as "และปี 66 ล่ะ" make sense.
    body: JSON.stringify(history.length > 0 ? { question, history } : { question }),
    signal,
  });

  if (!res.ok || !res.body) throw new AskHttpError(res.status);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const parser = createSseParser();
  let finished = false;

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;

    for (const frame of parser.feed(decoder.decode(value, { stream: true }))) {
      const event = toAskEvent(frame.event, frame.data);
      if (!event) continue;
      if (event.type === "done" || event.type === "error") finished = true;
      onEvent(event);
    }
  }

  if (!finished && !signal.aborted) throw new AskStreamEndedError();
}
