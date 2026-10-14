import { describe, expect, it } from "bun:test";
import { createDailyLimiter } from "./rate-limit";

const HOUR = 60 * 60 * 1000;
// 2026-01-10 10:00 UTC is 17:00 in Thailand on the same day.
const noonish = Date.UTC(2026, 0, 10, 10, 0, 0);

describe("createDailyLimiter", () => {
  it("allows up to the limit, then refuses", () => {
    const limiter = createDailyLimiter(3, () => noonish);
    expect([1, 2, 3, 4, 5].map(() => limiter.tryConsume("u1"))).toEqual([true, true, true, false, false]);
  });

  it("counts each user separately", () => {
    const limiter = createDailyLimiter(1, () => noonish);
    expect(limiter.tryConsume("a")).toBe(true);
    expect(limiter.tryConsume("a")).toBe(false);
    expect(limiter.tryConsume("b")).toBe(true);
  });

  it("starts again on the next calendar day in Thailand", () => {
    let now = noonish;
    const limiter = createDailyLimiter(1, () => now);
    expect(limiter.tryConsume("u")).toBe(true);
    expect(limiter.tryConsume("u")).toBe(false);

    now = noonish + 6 * HOUR; // 23:00 Thailand, still the same day
    expect(limiter.tryConsume("u")).toBe(false);

    now = noonish + 8 * HOUR; // 01:00 Thailand the next day
    expect(limiter.tryConsume("u")).toBe(true);
  });

  it("a limit of 0 refuses everyone", () => {
    const limiter = createDailyLimiter(0, () => noonish);
    expect(limiter.tryConsume("u")).toBe(false);
    expect(limiter.tryConsume("u")).toBe(false);
  });
});
