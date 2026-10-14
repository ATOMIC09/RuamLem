// Shared moderation vocabulary for the front end. The backend sends status and a short reason code;
// everything the person reads (Thai labels, explanations, whether they may appeal) lives here.

export type ModerationStatus = "published" | "held" | "rejected";
export type ModerationInfo = { status: ModerationStatus; reason: string | null };

// Written by a human, not the AI. An admin's rejection is final and cannot be appealed.
export const ADMIN_REJECTED = "admin_rejected";

const REASONS: Record<string, string> = {
  spam: "ถูกจัดว่าเป็นสแปมหรือโฆษณา",
  off_topic: "เนื้อหาไม่เกี่ยวข้องกับการเรียนหรือข้อสอบ",
  personal_data: "พบข้อมูลส่วนบุคคล เช่น เบอร์โทรศัพท์หรือเลขบัตรประชาชน",
  abuse: "มีถ้อยคำก้าวร้าวหรือด่าทอ",
  "content_safety:hate": "มีเนื้อหาที่แสดงความเกลียดชัง",
  "content_safety:violence": "มีเนื้อหาที่รุนแรง",
  "content_safety:sexual": "มีเนื้อหาทางเพศ",
  "content_safety:self_harm": "มีเนื้อหาเกี่ยวกับการทำร้ายตนเอง",
  check_failed: "ระบบตรวจสอบอัตโนมัติขัดข้องชั่วคราว จึงรอผู้ดูแลตรวจสอบ",
  invalid_model_output: "ระบบตรวจสอบไม่แน่ใจ จึงส่งให้ผู้ดูแลตรวจสอบ",
  model_unsure: "ระบบตรวจสอบไม่แน่ใจ จึงส่งให้ผู้ดูแลตรวจสอบ",
  model_content_filter: "ระบบตรวจสอบไม่แน่ใจ จึงส่งให้ผู้ดูแลตรวจสอบ",
  [ADMIN_REJECTED]: "ผู้ดูแลระบบตรวจสอบแล้วและไม่อนุญาตให้เผยแพร่",
  admin_approved: "ผู้ดูแลระบบอนุมัติแล้ว",
};

export function reasonText(reason: string | null | undefined): string {
  if (!reason) return "ไม่ผ่านการตรวจสอบอัตโนมัติ";
  return REASONS[reason] ?? "ไม่ผ่านการตรวจสอบอัตโนมัติ";
}

const STATUS_LABELS: Record<ModerationStatus, string> = {
  published: "เผยแพร่แล้ว",
  held: "รอผู้ดูแลตรวจสอบ",
  rejected: "ถูกปฏิเสธ",
};

export function statusLabel(status: ModerationStatus): string {
  return STATUS_LABELS[status];
}

// Only an AI rejection can be appealed. Once an admin has decided, that decision stands.
export function canAppeal(status: ModerationStatus | undefined, reason: string | null | undefined): boolean {
  return status === "rejected" && reason !== ADMIN_REJECTED;
}

// Something the person should be told about (anything but a normal published item).
export function needsAttention(info: ModerationInfo | null | undefined): info is ModerationInfo {
  return !!info && info.status !== "published";
}

// Reads the moderation fields the backend puts on a post or comment row.
export function moderationOf(item: {
  moderation_status?: ModerationStatus | null;
  moderation_reason?: string | null;
}): ModerationInfo | null {
  if (!item.moderation_status || item.moderation_status === "published") return null;
  return { status: item.moderation_status, reason: item.moderation_reason ?? null };
}

// Orders worse outcomes first, so a post that was held by a file name wins over "published".
const SEVERITY: Record<ModerationStatus, number> = { published: 0, held: 1, rejected: 2 };
export function worstOf(a: ModerationInfo | undefined, b: ModerationInfo | undefined): ModerationInfo | undefined {
  if (!a) return b;
  if (!b) return a;
  return SEVERITY[b.status] > SEVERITY[a.status] ? b : a;
}
