// A cheap first line of defence for Ask RuamLem, run BEFORE any paid call.
//
// It catches the well-known ways of hijacking a chatbot: "I want you to act as ...", "ignore your previous
// instructions", "developer mode", "show your system prompt". A message like that is answered with a fixed
// refusal, so it costs no tokens and the model never sees it.
//
// This is not the real protection: a determined user can phrase it differently. The real protections are the
// scope rules in the system prompts and the fact that the model has no tools and no secrets to leak. The patterns
// are kept narrow on purpose, so ordinary study questions ("how does a transistor act as a switch?",
// "สมมติว่า x = 5") are never blocked.
const ROLE_HIJACK_PATTERNS: RegExp[] = [
  // English: asking the assistant to become something else
  /\b(?:want|need|would like|'d like|ask|tell|have|make)\s+you\s+to\s+(?:act|behave|respond|answer|play|pretend|roleplay|role-play)\b/i,
  /\byou\s+(?:will|must|should|shall|are\s+going\s+to|are\s+to)\s+(?:act|behave|pretend|play|roleplay|role-play)\b/i,
  /\b(?:act|behave|respond|answer)\s+as\s+(?:if|though)\s+you\b/i,
  /\bpretend\s+(?:to\s+be|that\s+you|you\s*(?:are|'re))\b/i,
  /\byou\s+are\s+now\s+(?:a|an|the|in|my)\b/i,
  /\bfrom\s+now\s+on,?\s+you\b/i,
  /\brole-?\s?play\b/i,
  // English: overriding or extracting the rules
  /\b(?:ignore|disregard|forget|override)\b.{0,40}\b(?:instructions?|rules|prompts?|guidelines|restrictions)\b/i,
  /\b(?:developer|jailbreak|dan|god|sudo|admin)\s+mode\b/i,
  /\bdo\s+anything\s+now\b/i,
  /\bsystem\s+prompt\b/i,
  /\b(?:reveal|show|print|repeat|output|tell\s+me)\b.{0,30}\byour\s+(?:instructions|rules|prompt|guidelines)\b/i,
  // Thai
  /สมมติ(?:ว่า)?\s*(?:ให้)?\s*(?:คุณ|เธอ|ตัวคุณ)\s*(?:เป็น|คือ)/,
  /(?:ทำตัวเป็น|แกล้งทำเป็น|แสร้งทำเป็น|จงเป็น|ให้คุณเป็น|ต่อไปนี้คุณ(?:คือ|เป็น)|คุณคือ.{0,40}ต่อไปนี้)/,
  /(?:ลืม|เพิกเฉย|ไม่ต้องสนใจ|ไม่สนใจ|ละเลย|ยกเลิก).{0,15}(?:คำสั่ง|กฎ|ข้อกำหนด)/,
  /(?:เปิดเผย|บอก|แสดง|ขอดู).{0,12}(?:system prompt|คำสั่งระบบ|พรอมต์ระบบ|คำสั่งของคุณ|กฎของคุณ)/i,
];

export function isRoleHijack(message: string): boolean {
  return ROLE_HIJACK_PATTERNS.some((pattern) => pattern.test(message));
}
