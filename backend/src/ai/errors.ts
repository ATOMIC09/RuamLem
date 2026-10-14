export type AiFailure = { code: "content_filtered" | "unavailable"; categories: string[] };

// Azure blocks a prompt with a 400 coded `content_filter`. That is a final answer:
// never retry it, on this model or any other. Everything else counts as unavailable.
// `categories` lists which filters fired (hate, jailbreak, ...), never the text.
export function classifyAiError(err: unknown): AiFailure {
  const e = err as any;
  const body = e?.error?.error ?? e?.error;
  const code = e?.code ?? body?.code;

  if (e?.status === 400 && code === "content_filter") {
    const result = body?.innererror?.content_filter_result ?? {};
    const categories = Object.entries<any>(result)
      .filter(([, value]) => value?.filtered === true)
      .map(([name]) => name);
    return { code: "content_filtered", categories };
  }

  return { code: "unavailable", categories: [] };
}
