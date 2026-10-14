import { describe, expect, it } from "bun:test";
import { buildEmbeddingText, contentHash } from "./embed-service";

describe("buildEmbeddingText", () => {
  it("joins title, tags and body", () => {
    expect(buildEmbeddingText({ title: "มิดเทอม Signal", tags: ["Signals", "Midterm"], body: "วิชา 010123106" })).toBe(
      "มิดเทอม Signal\nSignals, Midterm\nวิชา 010123106"
    );
  });

  it("skips an empty tag list", () => {
    expect(buildEmbeddingText({ title: "a", tags: [], body: "b" })).toBe("a\nb");
  });

  it("cuts long posts at 6000 characters", () => {
    expect(buildEmbeddingText({ title: "t", tags: [], body: "x".repeat(10000) })).toHaveLength(6000);
  });
});

describe("contentHash", () => {
  it("is stable for the same text and model", () => {
    expect(contentHash("abc", "ruamlem-embed")).toBe(contentHash("abc", "ruamlem-embed"));
    expect(contentHash("abc", "ruamlem-embed")).toHaveLength(64);
  });

  it("changes when the text changes", () => {
    expect(contentHash("abc", "m")).not.toBe(contentHash("abd", "m"));
  });

  it("changes when the embedding deployment changes, so a model switch re-embeds everything", () => {
    expect(contentHash("abc", "small")).not.toBe(contentHash("abc", "large"));
  });
});
