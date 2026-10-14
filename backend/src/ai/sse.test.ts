import { describe, expect, it } from "bun:test";
import { encodeSse, errorStream, formatSse, sseResponse } from "./sse";

describe("formatSse", () => {
  it("writes an event line, one data line and a blank line", () => {
    expect(formatSse("delta", { text: "สวัสดี" })).toBe('event: delta\ndata: {"text":"สวัสดี"}\n\n');
  });

  it("never lets a newline in the payload break the frame", () => {
    const frame = formatSse("delta", { text: "บรรทัด1\nบรรทัด2\r\n\n\nevent: evil" });
    expect(frame.match(/\n\n/g)).toHaveLength(1);
    expect(frame.endsWith("\n\n")).toBe(true);
    expect(frame.split("\n")).toHaveLength(4); // event, data, "", ""
  });

  it("encodes to UTF-8 bytes", () => {
    const bytes = encodeSse("delta", { text: "ก" });
    expect(new TextDecoder().decode(bytes)).toBe('event: delta\ndata: {"text":"ก"}\n\n');
  });
});

describe("sseResponse / errorStream", () => {
  it("sets the streaming headers", () => {
    const res = sseResponse(errorStream("unavailable"));
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(res.headers.get("Cache-Control")).toBe("no-cache");
    expect(res.headers.get("X-Accel-Buffering")).toBe("no");
  });

  it("errorStream emits exactly one error event and closes", async () => {
    const text = await new Response(errorStream("rate_limited")).text();
    expect(text).toBe('event: error\ndata: {"code":"rate_limited"}\n\n');
  });
});
