// Keyword side of Ask RuamLem's search.
//
// Embeddings find posts that MEAN the same thing, but they are weak on names: a question that is only a teacher's
// name scores about 0.30 against a post that mentions the teacher, well under the 0.43 cutoff. So the question
// is also matched by plain text. Thai has no spaces, so instead of splitting into words (which splits names badly)
// the question is cut into overlapping 4-character pieces and the database counts how many of them a post contains.

export const GRAM_SIZE = 4;
// Enough for a long question; keeps the database call small.
const MAX_GRAMS = 80;

// Words that appear in almost every question about exams. They say nothing about WHICH post is meant,
// so they are removed before cutting. Longest first, so "แนวข้อสอบ" is removed as a whole.
const GENERIC_WORDS = [
  "แนวข้อสอบ", "ข้อสอบ", "หรือเปล่า", "เกี่ยวกับ", "อยากได้", "อาจารย์", "ช่วยหา", "วิชา", "ช่วย", "หน่อย", "ครับ", "ค่ะ",
  "มั้ย", "ไหม", "ของ", "มี", "ขอ", "ปี", "นะ", "คะ", "หา", "อ.",
  "midterm", "final", "exam", "have", "with", "any", "the", "for",
].sort((a, b) => b.length - a.length);

// The distinct lowercase pieces of `text` to look for. Empty when nothing specific is left (for example
// "มีข้อสอบไหม"), in which case only the meaning-based search is used.
export function queryGrams(text: string, size: number = GRAM_SIZE): string[] {
  let s = text.toLowerCase();
  for (const word of GENERIC_WORDS) s = s.split(word).join(" ");

  const grams = new Set<string>();
  // Pieces never run across a space, a punctuation mark or a removed word.
  for (const chunk of s.split(/[^\p{L}\p{N}\p{M}]+/u).filter(Boolean)) {
    for (let i = 0; i + size <= chunk.length && grams.size < MAX_GRAMS; i++) grams.add(chunk.slice(i, i + size));
  }
  return [...grams];
}
