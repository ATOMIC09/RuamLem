import { describe, expect, it } from "bun:test";
import { createDailyLimiter, isOverLimit, limitsFromEnv } from "./rate-limit";

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

describe("isOverLimit (the quota counted in the database)", () => {
  const limits = { dailyMessages: 50, dailyTokens: 0 };

  it("allows a user below the message limit and refuses one at it", () => {
    expect(isOverLimit({ asks: 49, tokens: 1_000_000 }, limits)).toBe(false);
    expect(isOverLimit({ asks: 50, tokens: 0 }, limits)).toBe(true);
  });

  it("a token limit of 0 means there is none", () => {
    expect(isOverLimit({ asks: 1, tokens: 99_999_999 }, limits)).toBe(false);
  });

  it("a token limit refuses once the day's tokens reach it, even below the message limit", () => {
    const withTokens = { dailyMessages: 50, dailyTokens: 20_000 };
    expect(isOverLimit({ asks: 3, tokens: 19_999 }, withTokens)).toBe(false);
    expect(isOverLimit({ asks: 3, tokens: 20_000 }, withTokens)).toBe(true);
  });
});

describe("limitsFromEnv", () => {
  const saved = { m: process.env.AI_DAILY_LIMIT_PER_USER, t: process.env.AI_DAILY_TOKEN_LIMIT_PER_USER };
  const restore = (k: string, v: string | undefined) => (v === undefined ? delete process.env[k] : (process.env[k] = v));

  it("defaults to 50 messages and no token limit, and reads both from the environment", () => {
    delete process.env.AI_DAILY_LIMIT_PER_USER;
    delete process.env.AI_DAILY_TOKEN_LIMIT_PER_USER;
    expect(limitsFromEnv()).toEqual({ dailyMessages: 50, dailyTokens: 0 });
    process.env.AI_DAILY_LIMIT_PER_USER = "10";
    process.env.AI_DAILY_TOKEN_LIMIT_PER_USER = "30000";
    expect(limitsFromEnv()).toEqual({ dailyMessages: 10, dailyTokens: 30000 });
    restore("AI_DAILY_LIMIT_PER_USER", saved.m);
    restore("AI_DAILY_TOKEN_LIMIT_PER_USER", saved.t);
  });
});
