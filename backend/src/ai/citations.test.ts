import { describe, expect, it } from "bun:test";
import { CitationFilter } from "./citations";

function run(chunks: string[], sourceCount: number): string {
  const filter = new CitationFilter(sourceCount);
  return chunks.map((c) => filter.push(c)).join("") + filter.flush();
}

describe("CitationFilter", () => {
  it("keeps citations that point at a real source", () => {
    expect(run(["มีข้อสอบ [1] และ [2]"], 2)).toBe("มีข้อสอบ [1] และ [2]");
  });

  it("drops citations to sources that were never sent", () => {
    expect(run(["ตาม [3] และ [9]"], 2)).toBe("ตาม  และ ");
    expect(run(["ตาม [0]"], 2)).toBe("ตาม ");
  });

  it("works when a citation is split across chunks", () => {
    expect(run(["ตาม [", "1", "] จบ"], 2)).toBe("ตาม [1] จบ");
    expect(run(["ตาม [", "9", "] จบ"], 2)).toBe("ตาม  จบ");
    expect(run(["ตาม [1", "] จบ [", "2]"], 2)).toBe("ตาม [1] จบ [2]");
  });

  it("works one character at a time", () => {
    const text = "ก [1] ข [5] ค [2]";
    expect(run([...text], 2)).toBe("ก [1] ข  ค [2]");
  });

  it("does not touch brackets that are not citations", () => {
    expect(run(["a [b] c [x", "yz] d"], 2)).toBe("a [b] c [xyz] d");
    expect(run(["[link](http://x) [ข้อความ]"], 2)).toBe("[link](http://x) [ข้อความ]");
  });

  it("emits a dangling '[' or '[1' at the end as plain text on flush", () => {
    expect(run(["จบด้วย ["], 2)).toBe("จบด้วย [");
    expect(run(["จบด้วย [1"], 2)).toBe("จบด้วย [1");
  });

  it("holds a partial citation back until it knows what it is", () => {
    const filter = new CitationFilter(2);
    expect(filter.push("ข้อความ [")).toBe("ข้อความ ");
    expect(filter.push("1")).toBe("");
    expect(filter.push("] ต่อ")).toBe("[1] ต่อ");
  });

  it("with no sources, removes every citation", () => {
    expect(run(["a [1] b [2]"], 0)).toBe("a  b ");
  });
});
