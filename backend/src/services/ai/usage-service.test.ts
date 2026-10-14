import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import { logger } from "../../utils/logger";
import type { UsageRow, UsageSummary } from "../../repositories/usage-repo";
import {
  estimateCost,
  pricesFromEnv,
  recordModerationUsage,
  recordUsage,
  thaiDayStartIso,
  toUsageRow,
  withCosts,
  type UsageDeps,
} from "./usage-service";

afterEach(() => mock.restore());

function fakeDeps(insert?: (row: UsageRow) => Promise<void>) {
  const inserted: UsageRow[] = [];
  const deps: UsageDeps = {
    insert: insert ?? (async (row) => void inserted.push(row)),
    model: (feature) => (feature === "embedding" ? "ruamlem-embed" : "ruamlem-chat"),
  };
  return { deps, inserted };
}

describe("thaiDayStartIso", () => {
  it("is midnight in Thailand, expressed in UTC (17:00 the evening before)", () => {
    // 2026-01-10 10:00 UTC is 17:00 on 10 January in Thailand
    expect(thaiDayStartIso(Date.UTC(2026, 0, 10, 10, 0, 0))).toBe("2026-01-09T17:00:00.000Z");
  });

  it("rolls over at Thai midnight, not UTC midnight", () => {
    // 2026-01-10 16:59 UTC is still 10 January in Thailand; one minute later it is 11 January
    expect(thaiDayStartIso(Date.UTC(2026, 0, 10, 16, 59, 0))).toBe("2026-01-09T17:00:00.000Z");
    expect(thaiDayStartIso(Date.UTC(2026, 0, 10, 17, 0, 0))).toBe("2026-01-10T17:00:00.000Z");
  });
});

describe("toUsageRow", () => {
  it("keeps the counts, the feature and the model, and nothing else", () => {
    const row = toUsageRow(
      { userId: "u1", feature: "ask", mode: "posts", chat: { promptTokens: 300, completionTokens: 40, totalTokens: 340 }, embeddingTokens: 12, latencyMs: 1800 },
      "ruamlem-chat"
    );
    expect(row).toEqual({
      user_id: "u1",
      feature: "ask",
      mode: "posts",
      outcome: "ok",
      model: "ruamlem-chat",
      prompt_tokens: 300,
      completion_tokens: 40,
      embedding_tokens: 12,
      total_tokens: 352,
      latency_ms: 1800,
    });
  });

  it("uses the model's own total, which can include hidden reasoning tokens", () => {
    const row = toUsageRow({ userId: "u1", feature: "ask", chat: { promptTokens: 100, completionTokens: 10, totalTokens: 400 } }, null);
    expect(row.total_tokens).toBe(400);
  });

  it("an aborted call with no usage still produces a valid row with zero tokens", () => {
    const row = toUsageRow({ userId: "u1", feature: "ask", outcome: "aborted", embeddingTokens: 9 }, null);
    expect(row).toMatchObject({ outcome: "aborted", prompt_tokens: 0, completion_tokens: 0, embedding_tokens: 9, total_tokens: 9, latency_ms: null });
  });

  it("never writes negative, fractional or NaN numbers", () => {
    const row = toUsageRow({ userId: "u1", feature: "embedding", embeddingTokens: Number.NaN, chat: { promptTokens: -5, completionTokens: 2.6, totalTokens: 3 } }, null);
    expect(row).toMatchObject({ prompt_tokens: 0, completion_tokens: 3, embedding_tokens: 0, total_tokens: 3 });
  });
});

describe("recordUsage", () => {
  it("inserts one row with the model name filled in", async () => {
    const { deps, inserted } = fakeDeps();
    await recordUsage({ userId: "u1", feature: "embedding", embeddingTokens: 30 }, deps);
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({ user_id: "u1", feature: "embedding", model: "ruamlem-embed", embedding_tokens: 30 });
  });

  it("never throws when the database refuses, and logs only the feature and the message", async () => {
    const warn = spyOn(logger, "warn");
    const { deps } = fakeDeps(async () => {
      throw new Error('relation "ai_usage" does not exist');
    });
    await expect(recordUsage({ userId: "u1", feature: "ask" }, deps)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).toContain("does not exist");
    expect(logged).not.toContain("u1");
  });
});

describe("recordModerationUsage", () => {
  const model = (m: "ok" | "invalid" | "blocked" | "failed" | "skipped") => ({ ms: 1900, checks: { model: m }, usage: { promptTokens: 500, completionTokens: 30, totalTokens: 530 } });

  it("records the model check's tokens", async () => {
    const { deps, inserted } = fakeDeps();
    await recordModerationUsage("u1", model("ok"), deps);
    expect(inserted[0]).toMatchObject({ feature: "moderation", outcome: "ok", prompt_tokens: 500, completion_tokens: 30, total_tokens: 530, latency_ms: 1900 });
  });

  it("records nothing when no model call was made (a personal-data hit skips the paid checks)", async () => {
    const { deps, inserted } = fakeDeps();
    await recordModerationUsage("u1", { ms: 1, checks: { model: "skipped" } }, deps);
    expect(inserted).toEqual([]);
  });

  it.each([
    ["blocked", "content_filtered"],
    ["failed", "error"],
    ["invalid", "ok"],
  ] as const)("a %s model check is recorded as %s", async (check, outcome) => {
    const { deps, inserted } = fakeDeps();
    await recordModerationUsage("u1", model(check), deps);
    expect(inserted[0].outcome).toBe(outcome);
  });
});

describe("prices and cost", () => {
  const saved = { ...process.env };
  const clear = () => {
    for (const k of ["AI_PRICE_CURRENCY", "AI_PRICE_CHAT_INPUT_PER_MTOK", "AI_PRICE_CHAT_OUTPUT_PER_MTOK", "AI_PRICE_EMBEDDING_PER_MTOK"]) delete process.env[k];
  };
  afterEach(() => {
    clear();
    Object.assign(process.env, saved);
  });

  it("reads per-million-token prices from the environment, in USD unless told otherwise", () => {
    clear();
    process.env.AI_PRICE_CHAT_INPUT_PER_MTOK = "0.5";
    process.env.AI_PRICE_CHAT_OUTPUT_PER_MTOK = "2";
    expect(pricesFromEnv()).toEqual({ currency: "USD", chatInputPerMTok: 0.5, chatOutputPerMTok: 2, embeddingPerMTok: null });
    process.env.AI_PRICE_CURRENCY = "THB";
    expect(pricesFromEnv().currency).toBe("THB");
  });

  it("ignores blank and invalid prices", () => {
    clear();
    process.env.AI_PRICE_CHAT_INPUT_PER_MTOK = "";
    process.env.AI_PRICE_CHAT_OUTPUT_PER_MTOK = "abc";
    process.env.AI_PRICE_EMBEDDING_PER_MTOK = "-1";
    expect(pricesFromEnv()).toMatchObject({ chatInputPerMTok: null, chatOutputPerMTok: null, embeddingPerMTok: null });
  });

  it("estimates the cost from tokens and prices per million", () => {
    const p = { currency: "USD", chatInputPerMTok: 2, chatOutputPerMTok: 8, embeddingPerMTok: 0.1 };
    expect(estimateCost({ promptTokens: 1_000_000, completionTokens: 500_000, embeddingTokens: 2_000_000 }, p)).toBeCloseTo(2 + 4 + 0.2, 6);
  });

  it("says 'unknown' (null) rather than 0 when no price is set", () => {
    expect(estimateCost({ promptTokens: 1000, completionTokens: 1000, embeddingTokens: 1000 }, { currency: "USD", chatInputPerMTok: null, chatOutputPerMTok: null, embeddingPerMTok: null })).toBeNull();
  });

  it("adds a cost to the totals and to every row, so a price change re-prices all history", () => {
    const tokens = { requests: 1, promptTokens: 1_000_000, completionTokens: 0, embeddingTokens: 0, totalTokens: 1_000_000 };
    const summary = {
      since: "2026-01-01T00:00:00Z",
      days: 7,
      rowsStored: 3,
      oldestRow: null,
      totals: { ...tokens, problems: 0, avgLatencyMs: 100, activeUsers: 1 },
      byFeature: [{ feature: "ask", ...tokens }],
      byDay: [{ day: "2026-01-01", ...tokens }],
      topUsers: [{ userId: "u1", name: "A", email: "a@x.th", lastUsed: "2026-01-01T00:00:00Z", ...tokens }],
    } as UsageSummary;

    const priced = withCosts(summary, { currency: "THB", chatInputPerMTok: 10, chatOutputPerMTok: null, embeddingPerMTok: null });
    expect(priced.currency).toBe("THB");
    expect(priced.pricesConfigured).toBe(true);
    expect(priced.totals.cost).toBe(10);
    expect(priced.byFeature[0].cost).toBe(10);
    expect(priced.byDay[0].cost).toBe(10);
    expect(priced.topUsers[0].cost).toBe(10);

    const unpriced = withCosts(summary, { currency: "USD", chatInputPerMTok: null, chatOutputPerMTok: null, embeddingPerMTok: null });
    expect(unpriced.pricesConfigured).toBe(false);
    expect(unpriced.totals.cost).toBeNull();
  });
});
