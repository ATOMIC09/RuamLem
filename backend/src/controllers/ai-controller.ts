import { isAiEnabled } from "../ai/client";
import { errorStream, sseResponse } from "../ai/sse";
import { askStream } from "../services/ai/ask-service";
import { createDailyLimiter, isOverLimit, limitsFromEnv } from "../services/ai/rate-limit";
import { thaiDayStartIso } from "../services/ai/usage-service";
import { getMyAskUsageSince } from "../repositories/usage-repo";
import { supabaseAuth } from "../supabase";

// Two guards. The in-memory counter stops a burst of parallel requests (usage is recorded only when a call ends)
// and is the fallback if the database cannot be read. The database count is the real daily quota: it survives
// restarts and works across several server instances.
const limiter = createDailyLimiter(limitsFromEnv().dailyMessages);

async function withinDailyLimits(userId: string): Promise<boolean> {
  if (!limiter.tryConsume(userId)) return false;
  const used = await getMyAskUsageSince(thaiDayStartIso());
  return used ? !isOverLimit(used, limitsFromEnv()) : true;
}

async function getUserId(request: Request): Promise<string | null> {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;

  const { data, error } = await supabaseAuth.auth.getClaims(token);
  if (error || !data) return null;
  return data.claims.sub ?? null;
}

export const askController = async ({ body, request }: { body: { question: string; history?: { role: "user" | "assistant"; content: string }[] }; request: Request }) => {
  const userId = await getUserId(request);
  if (!userId) {
    return new Response(JSON.stringify({ message: "Sign in to ask RuamLem" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Both of these answer with a normal SSE stream holding one error event,
  // so the browser handles every failure the same way.
  if (!isAiEnabled()) return sseResponse(errorStream("ai_disabled"));
  if (!(await withinDailyLimits(userId))) return sseResponse(errorStream("rate_limited"));

  return sseResponse(askStream({ question: body.question.trim(), history: body.history, userId, signal: request.signal }));
};
