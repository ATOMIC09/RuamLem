import { supabase } from "../supabase";

export type UsageFeature = "ask" | "moderation" | "embedding";
export type UsageOutcome = "ok" | "content_filtered" | "error" | "aborted";

// Counts and ids only. A question, an answer or a post's text never goes in here.
export type UsageRow = {
  user_id: string;
  feature: UsageFeature;
  mode: "posts" | "general" | null;
  outcome: UsageOutcome;
  model: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  embedding_tokens: number;
  total_tokens: number;
  latency_ms: number | null;
};

// Runs as the caller: the database only accepts a row whose user_id is the signed-in user.
export async function insertUsage(row: UsageRow): Promise<void> {
  const { error } = await supabase.from("ai_usage").insert([row]);
  if (error) throw new Error(error.message);
}

// What the caller used with Ask RuamLem since `sinceIso`. Null when it cannot be read (for example the
// table does not exist yet), so the caller can fall back to the in-memory limit.
export async function getMyAskUsageSince(sinceIso: string): Promise<{ asks: number; tokens: number } | null> {
  const { data, error } = await supabase.rpc("my_ask_usage_since", { p_since: sinceIso });
  if (error) {
    console.error("Error reading AI usage:", error.message);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { asks: 0, tokens: 0 };
  return { asks: Number(row.asks) || 0, tokens: Number(row.tokens) || 0 };
}

export type UsageSummary = {
  since: string;
  days: number;
  rowsStored: number;
  oldestRow: string | null;
  totals: {
    requests: number;
    promptTokens: number;
    completionTokens: number;
    embeddingTokens: number;
    totalTokens: number;
    problems: number;
    avgLatencyMs: number;
    activeUsers: number;
  };
  byFeature: (TokenBreakdown & { feature: UsageFeature })[];
  byDay: (TokenBreakdown & { day: string })[];
  topUsers: (TokenBreakdown & { userId: string; name: string | null; email: string | null; lastUsed: string })[];
};

export type TokenBreakdown = {
  requests: number;
  promptTokens: number;
  completionTokens: number;
  embeddingTokens: number;
  totalTokens: number;
};

// Admin only (the database function refuses everyone else).
export async function getUsageSummary(days: number): Promise<UsageSummary> {
  const { data, error } = await supabase.rpc("admin_ai_usage_summary", { p_days: days });
  if (error) throw new Error(error.message);
  return data as UsageSummary;
}
