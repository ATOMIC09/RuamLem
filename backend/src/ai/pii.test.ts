import { describe, expect, it } from "bun:test";
import { detectPii, isValidThaiNationalId, normalizeDigits } from "./pii";

// Builds a valid ID from the first 12 digits, using the official check-digit rule.
function withCheckDigit(first12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(first12[i]) * (13 - i);
  return first12 + String((11 - (sum % 11)) % 10);
}

const VALID_ID = "1101700230678"; // worked out by hand: sum 157, 157 mod 11 = 3, (11 - 3) mod 10 = 8

describe("isValidThaiNationalId", () => {
  it("accepts a number with a correct check digit", () => {
    expect(isValidThaiNationalId(VALID_ID)).toBe(true);
    expect(isValidThaiNationalId(withCheckDigit("310120045678"))).toBe(true);
    expect(isValidThaiNationalId(withCheckDigit("512340067890"))).toBe(true);
  });

  it("rejects a wrong check digit", () => {
    expect(isValidThaiNationalId("1101700230673")).toBe(false);
    for (let d = 0; d <= 9; d++) {
      const candidate = "110170023067" + d;
      expect(isValidThaiNationalId(candidate)).toBe(candidate === VALID_ID);
    }
  });

  it("rejects the wrong length or non-digits", () => {
    expect(isValidThaiNationalId("110170023067")).toBe(false);
    expect(isValidThaiNationalId("11017002306788")).toBe(false);
    expect(isValidThaiNationalId("11017002306a8")).toBe(false);
  });

  it("rejects a first digit of 0 or 9, which no real ID starts with", () => {
    expect(isValidThaiNationalId(withCheckDigit("010170023067"))).toBe(false);
    expect(isValidThaiNationalId(withCheckDigit("910170023067"))).toBe(false);
  });
});

describe("detectPii: Thai national ID", () => {
  it.each([
    [VALID_ID],
    ["1-1017-00230-67-8"],
    ["1 1017 00230 67 8"],
    ["1-1017 00230-67 8"],
    ["เลขบัตร 1101700230678 ครับ"],
    ["ชื่อ สมชาย ใจดี (1-1017-00230-67-8)"],
    ["๑๑๐๑๗๐๐๒๓๐๖๗๘"], // Thai numerals
    ["๑-๑๐๑๗-๐๐๒๓๐-๖๗-๘"],
  ])("finds %s", (text) => {
    expect(detectPii(text).nationalId).toBe(true);
  });

  it.each([
    ["1101700230673"], // wrong check digit
    ["1-1017-00230-67-3"],
    ["12345678901234"], // 14 digits, longer than an ID
    ["110170023067"], // 12 digits
    ["0101700230670"], // starts with 0
    ["เลขที่ 010123106 และปี 2566"], // course code and year
  ])("ignores %s", (text) => {
    expect(detectPii(text).nationalId).toBe(false);
  });

  it("does not match a valid ID that is part of a longer digit run", () => {
    expect(detectPii("9" + VALID_ID).nationalId).toBe(false);
    expect(detectPii(VALID_ID + "9").nationalId).toBe(false);
  });
});

describe("detectPii: phone numbers", () => {
  it.each([
    ["0812345678"],
    ["081-234-5678"],
    ["081 234 5678"],
    ["081-2345678"],
    ["+66 81 234 5678"],
    ["+66812345678"],
    ["+66-81-234-5678"],
    ["0912345678"],
    ["0612345678"],
    ["โทร 0812345678 ได้เลย"],
    ["๐๘๑-๒๓๔-๕๖๗๘"], // Thai numerals
    ["02-123-4567"], // landline with separators
    ["038-123-456"],
    ["02 123 4567"],
  ])("finds %s", (text) => {
    expect(detectPii(text).phone).toBe(true);
  });

  it.each([
    ["010123106"], // 9-digit course code
    ["วิชา 010123121 Database Systems"],
    ["ปี 2566 ภาคเรียนที่ 1"],
    ["เวลา 09:00-12:00"],
    ["ราคา 1,200 บาท"],
    ["08123456789"], // 11 digits
    ["8123456789"], // no leading 0
    ["0212345678"], // contiguous landline-looking run, not treated as a phone
    ["64010001"], // 8-digit student ID
    ["วันที่ 12-05-2566"],
  ])("ignores %s", (text) => {
    expect(detectPii(text).phone).toBe(false);
  });
});

describe("detectPii: combinations and output", () => {
  it("returns only flags, never the matched digits", () => {
    const flags = detectPii(`id ${VALID_ID} phone 0812345678`);
    expect(flags).toEqual({ nationalId: true, phone: true });
    expect(JSON.stringify(flags)).not.toContain("0812345678");
    expect(JSON.stringify(flags)).not.toContain(VALID_ID);
  });

  it("is clean for ordinary study text", () => {
    expect(detectPii("ไฟนอล Database ปี 2565 วิชา 010123121 สอนโดยอาจารย์โสภณ")).toEqual({
      nationalId: false,
      phone: false,
    });
  });
});

describe("normalizeDigits", () => {
  it("turns Thai numerals into ASCII digits and leaves the rest alone", () => {
    expect(normalizeDigits("๐๑๒๓๔๕๖๗๘๙ abc ก")).toBe("0123456789 abc ก");
  });
});
