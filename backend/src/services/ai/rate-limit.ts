// Per-user daily question counter, kept in memory.
// It is per server instance and resets when the instance restarts (Render restarts and
// free-tier spin-downs included), so it is a cost guard, not a strict quota.

// Thailand has no daylight saving, so a fixed +7h offset gives the local calendar day.
const THAI_OFFSET_MS = 7 * 60 * 60 * 1000;

export function createDailyLimiter(limit: number, now: () => number = Date.now) {
  const counts = new Map<string, { day: string; count: number }>();

  return {
    // Counts the attempt and returns false once the user is over the limit for today.
    tryConsume(userId: string): boolean {
      const day = new Date(now() + THAI_OFFSET_MS).toISOString().slice(0, 10);
      const entry = counts.get(userId);

      if (!entry || entry.day !== day) {
        counts.set(userId, { day, count: 1 });
        return limit >= 1;
      }

      if (entry.count >= limit) return false;
      entry.count++;
      return true;
    },
  };
}

export type AskLimits = { dailyMessages: number; dailyTokens: number };

// The daily limits, read from the environment. A token limit of 0 means no token limit.
export function limitsFromEnv(): AskLimits {
  return {
    dailyMessages: Number(process.env.AI_DAILY_LIMIT_PER_USER) || 50,
    dailyTokens: Number(process.env.AI_DAILY_TOKEN_LIMIT_PER_USER) || 0,
  };
}

// Decides from what the user has already used today (counted in the database, so it survives restarts).
export function isOverLimit(used: { asks: number; tokens: number }, limits: AskLimits): boolean {
  if (used.asks >= limits.dailyMessages) return true;
  return limits.dailyTokens > 0 && used.tokens >= limits.dailyTokens;
}
