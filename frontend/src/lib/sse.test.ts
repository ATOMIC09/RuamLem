import { describe, expect, it } from "vitest";
import { createSseParser } from "./sse";

describe("createSseParser", () => {
  it("returns complete frames", () => {
    const parser = createSseParser();
    const frames = parser.feed('event: delta\ndata: {"text":"hi"}\n\nevent: done\ndata: {}\n\n');
    expect(frames).toEqual([
      { event: "delta", data: '{"text":"hi"}' },
      { event: "done", data: "{}" },
    ]);
  });

  it("waits for the rest of a frame split across chunks", () => {
    const parser = createSseParser();
    expect(parser.feed("event: del")).toEqual([]);
    expect(parser.feed('ta\ndata: {"te')).toEqual([]);
    expect(parser.feed('xt":"hello"}\n')).toEqual([]);
    expect(parser.feed("\n")).toEqual([{ event: "delta", data: '{"text":"hello"}' }]);
  });

  it("handles a chunk boundary between the two newlines of a frame end", () => {
    const parser = createSseParser();
    expect(parser.feed("event: a\ndata: 1\n")).toEqual([]);
    expect(parser.feed("\nevent: b\ndata: 2\n\n")).toEqual([
      { event: "a", data: "1" },
      { event: "b", data: "2" },
    ]);
  });

  it("handles one character per chunk", () => {
    const parser = createSseParser();
    const text = 'event: delta\ndata: {"text":"ก"}\n\n';
    const frames = [...text].flatMap((ch) => parser.feed(ch));
    expect(frames).toEqual([{ event: "delta", data: '{"text":"ก"}' }]);
  });

  it("supports CRLF, including a split between \\r and \\n", () => {
    const parser = createSseParser();
    expect(parser.feed("event: a\r\ndata: 1\r")).toEqual([]);
    expect(parser.feed("\n\r")).toEqual([]);
    expect(parser.feed("\n")).toEqual([{ event: "a", data: "1" }]);
  });

  it("ignores comments and joins multi-line data", () => {
    const parser = createSseParser();
    expect(parser.feed(": keep-alive\n\nevent: x\ndata: one\ndata: two\n\n")).toEqual([
      { event: "x", data: "one\ntwo" },
    ]);
  });

  it("defaults the event name to message", () => {
    expect(createSseParser().feed("data: hi\n\n")).toEqual([{ event: "message", data: "hi" }]);
  });

  it("never emits an unfinished trailing frame", () => {
    const parser = createSseParser();
    expect(parser.feed("event: delta\ndata: partial")).toEqual([]);
  });
});
