import { describe, expect, it } from "bun:test";
import { queryGrams } from "./keywords";

describe("queryGrams", () => {
  it("cuts a name into overlapping 4-character pieces", () => {
    expect(queryGrams("เรวัต")).toEqual(["เรวั", "รวัต"]);
  });

  it("drops generic exam words, so a question about a teacher keeps only the name", () => {
    // มี / ข้อสอบ / อาจารย์ / มั้ย are removed; เรวัต is what is left
    expect(queryGrams("มีข้อสอบอาจารย์เรวัตมั้ย")).toEqual(["เรวั", "รวัต"]);
    expect(queryGrams("อาจารย์ศิริโภคาภิรมย์")).toEqual(queryGrams("ศิริโภคาภิรมย์"));
  });

  it("a greeting or thanks is not a search (a post titled 'สวัสดีชาวโลก' must not answer 'สวัสดี')", () => {
    expect(queryGrams("สวัสดี")).toEqual([]);
    expect(queryGrams("สวัสดีครับ ขอบคุณ")).toEqual([]);
  });

  it("has nothing to search for when the question is only generic words", () => {
    expect(queryGrams("มีข้อสอบไหม")).toEqual([]);
    expect(queryGrams("ขอข้อสอบหน่อยครับ")).toEqual([]);
  });

  it("lowercases and keeps Latin words, dropping 'midterm', 'final' and 'exam'", () => {
    expect(queryGrams("Database FINAL exam")).toEqual(["data", "atab", "taba", "abas", "base"]);
  });

  it("never lets a piece run across a space, a punctuation mark or a removed word", () => {
    const grams = queryGrams("เรวัต, ศิริ");
    expect(grams).toContain("เรวั");
    expect(grams.some((g) => g.includes(" ") || g.includes(","))).toBe(false);
    expect(grams).not.toContain("ต ศิ");
  });

  it("ignores words shorter than a piece and returns each piece once", () => {
    expect(queryGrams("AI OS")).toEqual([]);
    expect(queryGrams("เรวัต เรวัต")).toEqual(["เรวั", "รวัต"]);
  });

  it("caps the number of pieces for a very long question", () => {
    expect(queryGrams("ก".repeat(1) + "ขคงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ".repeat(5)).length).toBeLessThanOrEqual(80);
  });
});
