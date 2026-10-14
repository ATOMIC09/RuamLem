import { isAiEnabled } from "../ai/client";
import { errorStream, sseResponse } from "../ai/sse";
import { askStream } from "../services/ai/ask-service";
import { createDailyLimiter } from "../services/ai/rate-limit";
import { supabaseAuth } from "../supabase";

const limiter = createDailyLimiter(Number(process.env.AI_DAILY_LIMIT_PER_USER) || 50);

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
  if (!limiter.tryConsume(userId)) return sseResponse(errorStream("rate_limited"));

  return sseResponse(askStream({ question: body.question.trim(), history: body.history, userId, signal: request.signal }));
};
