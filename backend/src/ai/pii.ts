// Deterministic personal-data checks. They run before any model call, cost nothing, and
// return only yes/no flags: the matched digits are never kept, returned or logged.

const THAI_DIGITS = "๐๑๒๓๔๕๖๗๘๙";

// Thai numerals (๐-๙) count as digits, so "๐๘๑๒๓๔๕๖๗๘" is caught like "0812345678".
export function normalizeDigits(text: string): string {
  return text.replace(/[๐-๙]/g, (d) => String(THAI_DIGITS.indexOf(d)));
}

// Thai national ID: 13 digits, the first is 1-8, and the last is a check digit:
// (11 - (sum of digit[i] * (13 - i) for i in 0..11) mod 11) mod 10.
export function isValidThaiNationalId(digits: string): boolean {
  if (!/^[1-8]\d{12}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(digits[i]) * (13 - i);
  return (11 - (sum % 11)) % 10 === Number(digits[12]);
}

// 13 digits, either contiguous or grouped like 1-2345-67890-12-3 (hyphens or spaces).
const ID_CANDIDATE = /(?<!\d)\d[ -]?\d{4}[ -]?\d{5}[ -]?\d{2}[ -]?\d(?!\d)/g;

// Mobile: 0[689]x-xxx-xxxx or +66 [689]x-xxx-xxxx, with optional hyphens or spaces.
const MOBILE = /(?<!\d)(?:\+66[ -]?|0)[689]\d[ -]?\d{3}[ -]?\d{4}(?!\d)/;

// Landline: needs separators (02-123-4567, 038-123-456). Bare 9-digit runs are not phone numbers:
// course codes such as 010123106 look like that.
const LANDLINE = /(?<!\d)0\d{1,2}[ -]\d{3}[ -]\d{3,4}(?!\d)/;

export type PiiFlags = { nationalId: boolean; phone: boolean };

export function detectPii(text: string): PiiFlags {
  const normalized = normalizeDigits(text);

  const nationalId = [...normalized.matchAll(ID_CANDIDATE)].some((m) =>
    isValidThaiNationalId(m[0].replace(/[ -]/g, ""))
  );
  const phone = MOBILE.test(normalized) || LANDLINE.test(normalized);

  return { nationalId, phone };
}
