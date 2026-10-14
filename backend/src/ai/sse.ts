export type AskErrorCode = "rate_limited" | "content_filtered" | "unavailable" | "ai_disabled";

const encoder = new TextEncoder();

// One event per frame. JSON.stringify never emits a raw newline, so one `data:` line is enough.
export function formatSse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function encodeSse(event: string, data: unknown): Uint8Array {
  return encoder.encode(formatSse(event, data));
}

export function errorStream(code: AskErrorCode): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encodeSse("error", { code }));
      controller.close();
    },
  });
}

export function sseResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      // Stops reverse proxies (nginx-style) from buffering the stream.
      "X-Accel-Buffering": "no",
    },
  });
}
