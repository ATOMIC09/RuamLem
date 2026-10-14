import type { AskErrorCode } from "@/types/ai";

export type AskFailure = AskErrorCode | "unauthorized" | "invalid";

export const ASK_ERROR_MESSAGES: Record<AskFailure, string> = {
  rate_limited: "วันนี้คุณถามครบจำนวนที่กำหนดแล้ว ลองใหม่อีกครั้งพรุ่งนี้",
  content_filtered: "ไม่สามารถตอบคำถามนี้ได้ เพราะเนื้อหาไม่ผ่านตัวกรองความปลอดภัย",
  unavailable: "ระบบถามตอบไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่อีกครั้ง",
  ai_disabled: "ฟีเจอร์ถามตอบยังไม่เปิดใช้งาน",
  unauthorized: "กรุณาเข้าสู่ระบบก่อนถามคำถาม",
  invalid: "คำถามไม่ถูกต้อง ลองพิมพ์ใหม่ไม่เกิน 500 ตัวอักษร",
};

export const NO_MATCH_MESSAGE = "ไม่พบโพสต์ที่เกี่ยวข้องใน RuamLem";
