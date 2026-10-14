// Azure AI Content Safety, text analysis. Web-standard fetch only (runs on Node and Bun).
// Harm categories come back with a severity of 0, 2, 4 or 6. The service cannot be instructed
// by the text it analyses, which is why it runs next to the model check and not instead of it.

export const HARM_CATEGORIES = ["Hate", "SelfHarm", "Sexual", "Violence"] as const;
export type HarmCategory = (typeof HARM_CATEGORIES)[number];
export type Severities = Partial<Record<HarmCategory, number>>;

// The API accepts at most 10,000 characters per request.
const MAX_CHARS = 10_000;
const API_VERSION = "2024-09-01";

export async function analyzeText(text: string, signal?: AbortSignal): Promise<Severities> {
  const endpoint = process.env.AZURE_CONTENT_SAFETY_ENDPOINT?.replace(/\/+$/, "");
  const key = process.env.AZURE_CONTENT_SAFETY_KEY;
  if (!endpoint || !key) throw new Error("Azure Content Safety is not configured");

  const res = await fetch(`${endpoint}/contentsafety/text:analyze?api-version=${API_VERSION}`, {
    method: "POST",
    headers: { "Ocp-Apim-Subscription-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      text: text.slice(0, MAX_CHARS),
      categories: HARM_CATEGORIES,
      outputType: "FourSeverityLevels",
    }),
    signal,
  });

  if (!res.ok) {
    // Status only: the body is not needed and the request text must not leak into logs.
    throw Object.assign(new Error(`Content Safety returned HTTP ${res.status}`), { status: res.status });
  }

  const body = (await res.json()) as { categoriesAnalysis?: { category: string; severity: number }[] };
  const severities: Severities = {};
  for (const item of body.categoriesAnalysis ?? []) {
    if ((HARM_CATEGORIES as readonly string[]).includes(item.category)) {
      severities[item.category as HarmCategory] = item.severity;
    }
  }
  return severities;
}
