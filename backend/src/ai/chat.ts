import { chatDeployment, getAiClient } from "./client";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type ChatUsage = { promptTokens: number; completionTokens: number; totalTokens: number };
export type ChatChunk = { delta?: string; finishReason?: string | null; usage?: ChatUsage };

// Reply length cap. Some models count hidden reasoning tokens against it, so keep it generous.
const MAX_COMPLETION_TOKENS = 1500;

// Our own small chunk shape keeps the rest of the code (and its tests) independent of the SDK.
export async function* streamChat(messages: ChatMessage[], signal?: AbortSignal): AsyncGenerator<ChatChunk> {
  const stream = await getAiClient().chat.completions.create(
    {
      model: chatDeployment(),
      messages,
      stream: true,
      stream_options: { include_usage: true },
      max_completion_tokens: MAX_COMPLETION_TOKENS,
    },
    { signal }
  );

  for await (const chunk of stream) {
    // Azure sends some chunks with no choices (prompt filter results, final usage).
    const choice = chunk.choices[0];
    yield {
      delta: choice?.delta?.content ?? undefined,
      finishReason: choice?.finish_reason,
      usage: chunk.usage
        ? {
            promptTokens: chunk.usage.prompt_tokens,
            completionTokens: chunk.usage.completion_tokens,
            totalTokens: chunk.usage.total_tokens,
          }
        : undefined,
    };
  }
}

export type StructuredResult = { content: string | null; finishReason: string | null; usage?: ChatUsage };

// One non-streaming call that must answer in JSON matching `schema` (strict structured output).
// The caller still validates the content: a model can be cut off or refuse.
export async function completeStructured(
  messages: ChatMessage[],
  opts: { name: string; schema: Record<string, unknown>; signal?: AbortSignal; timeoutMs?: number }
): Promise<StructuredResult> {
  const res = await getAiClient().chat.completions.create(
    {
      model: chatDeployment(),
      messages,
      max_completion_tokens: MAX_COMPLETION_TOKENS,
      response_format: { type: "json_schema", json_schema: { name: opts.name, strict: true, schema: opts.schema } },
    },
    { signal: opts.signal, timeout: opts.timeoutMs ?? 20_000 }
  );

  const choice = res.choices[0];
  return {
    content: choice?.message?.content ?? null,
    finishReason: choice?.finish_reason ?? null,
    usage: res.usage
      ? {
          promptTokens: res.usage.prompt_tokens,
          completionTokens: res.usage.completion_tokens,
          totalTokens: res.usage.total_tokens,
        }
      : undefined,
  };
}
