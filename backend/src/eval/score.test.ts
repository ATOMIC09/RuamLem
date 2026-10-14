import { describe, expect, it } from "bun:test";
import { judge, percent, summarize, type Scored } from "./score";

describe("judge", () => {
  it("a normal item is correct only when published", () => {
    expect(judge({ kind: "normal" }, "published")).toBe("correct");
    expect(judge({ kind: "normal" }, "held")).toBe("wrongly_held");
    expect(judge({ kind: "normal" }, "rejected")).toBe("wrongly_rejected");
  });

  it("a bad item published is the serious miss", () => {
    expect(judge({ kind: "bad", accept: ["held", "rejected"] }, "published")).toBe("wrongly_published");
  });

  it("a bad item is correct when its outcome is acceptable", () => {
    expect(judge({ kind: "bad", accept: ["rejected"] }, "rejected")).toBe("correct");
    expect(judge({ kind: "bad", accept: ["held", "rejected"] }, "held")).toBe("correct");
    expect(judge({ kind: "bad", accept: ["held", "rejected"] }, "rejected")).toBe("correct");
  });

  it("a bad item caught with the wrong severity is reported separately", () => {
    expect(judge({ kind: "bad", accept: ["rejected"] }, "held")).toBe("wrong_severity");
    expect(judge({ kind: "bad", accept: ["held"] }, "rejected")).toBe("wrong_severity");
  });

  it("junk items are never an error", () => {
    for (const outcome of ["published", "held", "rejected"] as const) {
      expect(judge({ kind: "either" }, outcome)).toBe("ignored");
    }
  });
});

describe("summarize", () => {
  const items: Scored[] = [
    { id: "n1", label: { kind: "normal" }, outcome: "published" },
    { id: "n2", label: { kind: "normal" }, outcome: "published" },
    { id: "n3", label: { kind: "normal" }, outcome: "held" },
    { id: "n4", label: { kind: "normal" }, outcome: "rejected" },
    { id: "b1", label: { kind: "bad", accept: ["rejected"] }, outcome: "rejected" },
    { id: "b2", label: { kind: "bad", accept: ["held", "rejected"] }, outcome: "held" },
    { id: "b3", label: { kind: "bad", accept: ["held", "rejected"] }, outcome: "published" },
    { id: "b4", label: { kind: "bad", accept: ["rejected"] }, outcome: "held" },
    { id: "j1", label: { kind: "either" }, outcome: "published" },
    { id: "j2", label: { kind: "either" }, outcome: "held" },
  ];

  it("counts normal, bad and ignored items and every kind of error", () => {
    const s = summarize(items);
    expect(s.normal).toEqual({ total: 4, published: 2, held: 1, rejected: 1 });
    expect(s.bad).toEqual({ total: 4, caught: 3, wronglyPublished: 1, wrongSeverity: 1 });
    expect(s.ignored).toBe(2);
    expect(s.counts).toEqual({
      correct: 4,
      wrongly_published: 1,
      wrongly_held: 1,
      wrongly_rejected: 1,
      wrong_severity: 1,
      ignored: 2,
    });
  });

  it("handles an empty set", () => {
    expect(summarize([]).normal.total).toBe(0);
  });
});

describe("percent", () => {
  it("formats a share and survives a zero denominator", () => {
    expect(percent(1, 4)).toBe("25.0%");
    expect(percent(0, 0)).toBe("n/a");
  });
});
