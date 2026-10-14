import { chatDeployment, embedDeployment } from "../../ai/client";
import type { ChatUsage } from "../../ai/chat";
import { insertUsage, type UsageFeature, type UsageOutcome, type UsageRow, type UsageSummary } from "../../repositories/usage-repo";
import { logger } from "../../utils/logger";

// Thailand has no daylight saving, so a fixed +7h offset gives the local calendar day.
const THAI_OFFSET_MS = 7 * 60 * 60 * 1000;

// The start of the current Thai day, as an ISO instant. The daily limits count from here.
export function thaiDayStartIso(now: number = Date.now()): string {
  const local = now + THAI_OFFSET_MS;
  const dayStartLocal = local - (local % 86_400_000);
  return new Date(dayStartLocal - THAI_OFFSET_MS).toISOString();
}

export type UsageEntry = {
  userId: string;
  feature: UsageFeature;
  mode?: "posts" | "general" | null;
  outcome?: UsageOutcome;
  chat?: ChatUsage;
  embeddingTokens?: number;
  latencyMs?: number;
};

export type UsageDeps = { insert: (row: UsageRow) => Promise<void>; model: (feature: UsageFeature) => string | null };

const defaultDeps: UsageDeps = {
  insert: insertUsage,
  model: (feature) => {
    try {
      return feature === "embedding" ? embedDeployment() : chatDeployment();
    } catch {
      return null;
    }
  },
};

const whole = (n: number | undefined) => (Number.isFinite(n) && (n as number) > 0 ? Math.round(n as number) : 0);

export function toUsageRow(entry: UsageEntry, model: string | null): UsageRow {
  const prompt = whole(entry.chat?.promptTokens);
  const completion = whole(entry.chat?.completionTokens);
  const embedding = whole(entry.embeddingTokens);
  return {
    user_id: entry.userId,
    feature: entry.feature,
    mode: entry.mode ?? null,
    outcome: entry.outcome ?? "ok",
    model,
    prompt_tokens: prompt,
    completion_tokens: completion,
    embedding_tokens: embedding,
    // The chat total can include reasoning tokens that prompt + completion do not show.
    total_tokens: whole(entry.chat?.totalTokens) + embedding || prompt + completion + embedding,
    latency_ms: entry.latencyMs === undefined ? null : whole(entry.latencyMs),
  };
}

// Writes one usage row. It never throws and never waits for anything the user is waiting on:
// a tracking failure must not break the AI feature. Counts and ids only.
export async function recordUsage(entry: UsageEntry, deps: UsageDeps = defaultDeps): Promise<void> {
  try {
    await deps.insert(toUsageRow(entry, deps.model(entry.feature)));
  } catch (err: any) {
    logger.warn("ai usage not recorded", { feature: entry.feature, message: err?.message });
  }
}

// ---------------------------------------------------------------- cost

export type Prices = { currency: string; chatInputPerMTok: number | null; chatOutputPerMTok: number | null; embeddingPerMTok: number | null };

const price = (name: string): number | null => {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

// Prices are per million tokens and come from the environment, so they can be changed without a deploy of new code.
export function pricesFromEnv(): Prices {
  return {
    currency: process.env.AI_PRICE_CURRENCY?.trim() || "USD",
    chatInputPerMTok: price("AI_PRICE_CHAT_INPUT_PER_MTOK"),
    chatOutputPerMTok: price("AI_PRICE_CHAT_OUTPUT_PER_MTOK"),
    embeddingPerMTok: price("AI_PRICE_EMBEDDING_PER_MTOK"),
  };
}

type Tokens = { promptTokens: number; completionTokens: number; embeddingTokens: number };

// Null when no price is set at all, so the page shows tokens only instead of a misleading zero.
export function estimateCost(t: Tokens, p: Prices): number | null {
  if (p.chatInputPerMTok === null && p.chatOutputPerMTok === null && p.embeddingPerMTok === null) return null;
  return (
    (t.promptTokens * (p.chatInputPerMTok ?? 0) + t.completionTokens * (p.chatOutputPerMTok ?? 0) + t.embeddingTokens * (p.embeddingPerMTok ?? 0)) /
    1_000_000
  );
}

// Adds an estimated cost to the totals and to every row of the summary.
export function withCosts(summary: UsageSummary, p: Prices = pricesFromEnv()) {
  const cost = <T extends Tokens>(row: T) => ({ ...row, cost: estimateCost(row, p) });
  return {
    ...summary,
    currency: p.currency,
    pricesConfigured: estimateCost({ promptTokens: 1, completionTokens: 1, embeddingTokens: 1 }, p) !== null,
    totals: cost(summary.totals),
    byFeature: summary.byFeature.map(cost),
    byDay: summary.byDay.map(cost),
    topUsers: summary.topUsers.map(cost),
  };
}

// Records the model check of one moderation. Nothing is recorded when no model call was made (a personal-data
// hit skips both paid checks).
export function recordModerationUsage(
  userId: string,
  result: { usage?: ChatUsage; ms: number; checks: { model: "ok" | "invalid" | "blocked" | "failed" | "skipped" } },
  deps: UsageDeps = defaultDeps
): Promise<void> {
  if (result.checks.model === "skipped") return Promise.resolve();
  const outcome: UsageOutcome = result.checks.model === "blocked" ? "content_filtered" : result.checks.model === "failed" ? "error" : "ok";
  return recordUsage({ userId, feature: "moderation", outcome, chat: result.usage, latencyMs: result.ms }, deps);
}
