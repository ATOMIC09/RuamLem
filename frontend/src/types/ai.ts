export type AskSource = { n: number; postId: number; title: string };

export type AskUsage = {
  embeddingTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type AskErrorCode = "rate_limited" | "content_filtered" | "unavailable" | "ai_disabled";

export type AskEvent =
  | { type: "sources"; sources: AskSource[] }
  | { type: "delta"; text: string }
  | { type: "done"; usage: AskUsage; ms: number }
  | { type: "error"; code: AskErrorCode };
