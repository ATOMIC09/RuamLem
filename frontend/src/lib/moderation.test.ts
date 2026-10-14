import { describe, expect, it } from "vitest";
import {
  ADMIN_REJECTED,
  canAppeal,
  moderationOf,
  needsAttention,
  reasonText,
  statusLabel,
  worstOf,
} from "./moderation";

describe("canAppeal", () => {
  it("an AI rejection can be appealed", () => {
    expect(canAppeal("rejected", "spam")).toBe(true);
    expect(canAppeal("rejected", "content_safety:hate")).toBe(true);
    expect(canAppeal("rejected", null)).toBe(true);
  });

  it("an admin's rejection is final", () => {
    expect(canAppeal("rejected", ADMIN_REJECTED)).toBe(false);
  });

  it("only rejected items can be appealed", () => {
    expect(canAppeal("held", "spam")).toBe(false);
    expect(canAppeal("published", null)).toBe(false);
    expect(canAppeal(undefined, null)).toBe(false);
  });
});

describe("reasonText", () => {
  it("has a Thai explanation for every code the backend can send", () => {
    const codes = [
      "spam", "off_topic", "personal_data", "abuse",
      "content_safety:hate", "content_safety:violence", "content_safety:sexual", "content_safety:self_harm",
      "check_failed", "invalid_model_output", "model_unsure", "model_content_filter",
      "admin_rejected", "admin_approved",
    ];
    for (const code of codes) {
      expect(reasonText(code)).toMatch(/[ก-๙]/); // Thai text
      expect(reasonText(code)).not.toBe(reasonText("totally_unknown_code"));
    }
  });

  it("falls back to a generic message for an unknown or missing code", () => {
    expect(reasonText("something_new")).toBe("ไม่ผ่านการตรวจสอบอัตโนมัติ");
    expect(reasonText(null)).toBe("ไม่ผ่านการตรวจสอบอัตโนมัติ");
    expect(reasonText(undefined)).toBe("ไม่ผ่านการตรวจสอบอัตโนมัติ");
  });
});

describe("statusLabel / needsAttention / moderationOf", () => {
  it("labels the three states", () => {
    expect(statusLabel("published")).toBe("เผยแพร่แล้ว");
    expect(statusLabel("held")).toBe("รอผู้ดูแลตรวจสอบ");
    expect(statusLabel("rejected")).toBe("ถูกปฏิเสธ");
  });

  it("only held and rejected need attention", () => {
    expect(needsAttention({ status: "held", reason: "spam" })).toBe(true);
    expect(needsAttention({ status: "rejected", reason: null })).toBe(true);
    expect(needsAttention({ status: "published", reason: null })).toBe(false);
    expect(needsAttention(undefined)).toBe(false);
    expect(needsAttention(null)).toBe(false);
  });

  it("reads the fields of a post row, and ignores published and unmoderated rows", () => {
    expect(moderationOf({ moderation_status: "held", moderation_reason: "off_topic" })).toEqual({ status: "held", reason: "off_topic" });
    expect(moderationOf({ moderation_status: "published", moderation_reason: null })).toBeNull();
    expect(moderationOf({})).toBeNull(); // moderation off: the fields are absent
  });
});

describe("worstOf", () => {
  const published = { status: "published" as const, reason: null };
  const held = { status: "held" as const, reason: "personal_data" };
  const rejected = { status: "rejected" as const, reason: "spam" };

  it("keeps the more serious outcome, so a held file name beats a published text", () => {
    expect(worstOf(published, held)).toEqual(held);
    expect(worstOf(held, published)).toEqual(held);
    expect(worstOf(held, rejected)).toEqual(rejected);
    expect(worstOf(rejected, held)).toEqual(rejected);
  });

  it("handles missing values", () => {
    expect(worstOf(undefined, held)).toEqual(held);
    expect(worstOf(held, undefined)).toEqual(held);
    expect(worstOf(undefined, undefined)).toBeUndefined();
  });
});
