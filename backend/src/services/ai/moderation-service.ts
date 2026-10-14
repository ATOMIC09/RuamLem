import { completeStructured, type StructuredResult } from "../../ai/chat";
import { analyzeText, type Severities } from "../../ai/content-safety";
import { classifyAiError } from "../../ai/errors";
import { MODEL_VERDICT_JSON_SCHEMA, parseModelVerdict } from "../../ai/moderation-schema";
import { detectPii, type PiiFlags } from "../../ai/pii";
import { buildModerationMessages, type ModerationPromptInput } from "../../ai/prompts";
import type { ChatMessage, ChatUsage } from "../../ai/chat";
import { logger } from "../../utils/logger";
import { decideModeration, type CheckOutcome, type DecisionInput, type ModerationDecision } from "./moderation-decision";

export type ModerationInput = ModerationPromptInput;

export type ModerationResult = ModerationDecision & {
  // The raw check results the decision was made from. For the eval's threshold sweep; never logged.
  decisionInput: DecisionInput;
  // Tokens the model check used, for the usage dashboard (absent when no model call finished).
  usage?: ChatUsage;
  ms: number;
  checks: { pii: PiiFlags; contentSafety: "ok" | "failed" | "skipped"; model: "ok" | "invalid" | "blocked" | "failed" | "skipped" };
};

export type ModerationDeps = {
  analyzeText: (text: string, signal?: AbortSignal) => Promise<Severities>;
  classify: (messages: ChatMessage[], signal?: AbortSignal) => Promise<StructuredResult>;
  timeoutMs?: number;
};

const defaultDeps: ModerationDeps = {
  analyzeText,
  classify: (messages, signal) =>
    completeStructured(messages, { name: "moderation_verdict", schema: MODEL_VERDICT_JSON_SCHEMA, signal }),
};

// Each check gets its own time limit. A slow check is a failed check, which holds the item.
const CHECK_TIMEOUT_MS = 20_000;

export function moderationText(input: ModerationInput): string {
  return [input.title, input.tags?.join(", "), input.body, input.fileNames?.join(", ")].filter(Boolean).join("\n");
}

// Runs the deterministic checks first, then Content Safety and the model together.
// It never throws: any failure becomes a decision (held, `check_failed`).
// It never logs the text. Callers log ids, the decision and the timings.
export async function moderate(input: ModerationInput, deps: ModerationDeps = defaultDeps): Promise<ModerationResult> {
  const started = Date.now();
  const text = moderationText(input);
  const pii = detectPii(text);

  // A national ID or phone number is a hold already, so skip both paid checks.
  if (pii.nationalId || pii.phone) {
    const decision = decideModeration({
      pii,
      contentSafety: { ok: false, why: "failed" },
      model: { ok: false, why: "failed" },
    });
    return {
      ...decision,
      decisionInput: { pii, contentSafety: { ok: false, why: "failed" }, model: { ok: false, why: "failed" } },
      ms: Date.now() - started,
      checks: { pii, contentSafety: "skipped", model: "skipped" },
    };
  }

  const [safety, model] = await Promise.all([
    runCheck("content_safety", deps.timeoutMs, (signal) => deps.analyzeText(text, signal)),
    runCheck("model", deps.timeoutMs, (signal) => deps.classify(buildModerationMessages(input), signal)),
  ]);

  let modelOutcome: CheckOutcome<ReturnType<typeof parseModelVerdict>>;
  let modelStatus: ModerationResult["checks"]["model"];

  if (!model.ok) {
    modelOutcome = model;
    modelStatus = model.why === "content_filter" ? "blocked" : "failed";
  } else if (model.value.finishReason === "content_filter") {
    // The reply, not the prompt, was cut by Azure's filter: same final answer.
    modelOutcome = { ok: false, why: "content_filter" };
    modelStatus = "blocked";
  } else {
    const verdict = parseModelVerdict(model.value.content);
    modelOutcome = { ok: true, value: verdict };
    modelStatus = verdict ? "ok" : "invalid";
  }

  const decisionInput: DecisionInput = { pii, contentSafety: safety, model: modelOutcome };
  const decision = decideModeration(decisionInput);

  return {
    ...decision,
    decisionInput,
    usage: model.ok ? model.value.usage : undefined,
    ms: Date.now() - started,
    checks: { pii, contentSafety: safety.ok ? "ok" : "failed", model: modelStatus },
  };
}

async function runCheck<T>(
  name: "content_safety" | "model",
  timeoutMs: number | undefined,
  run: (signal: AbortSignal) => Promise<T>
): Promise<CheckOutcome<T>> {
  // An explicit timer, cleared when the check ends, so nothing lingers after a fast check.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("moderation check timed out")), timeoutMs ?? CHECK_TIMEOUT_MS);

  try {
    return { ok: true, value: await run(controller.signal) };
  } catch (err: any) {
    const failure = classifyAiError(err);
    // Status and category names only. Never the message body, which could echo the text.
    logger.warn("moderation check failed", { check: name, code: failure.code, categories: failure.categories, status: err?.status });
    return { ok: false, why: failure.code === "content_filtered" ? "content_filter" : "failed" };
  } finally {
    clearTimeout(timer);
  }
}
