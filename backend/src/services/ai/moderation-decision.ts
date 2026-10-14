import type { Severities } from "../../ai/content-safety";
import type { ModelVerdict } from "../../ai/moderation-schema";
import type { PiiFlags } from "../../ai/pii";

// The decision is a pure function: no I/O, so every row of the moderation table is easy to test.
//
//   Clean                       -> published at once
//   Clearly harmful / spam      -> rejected (the author sees the reason and can appeal)
//   Borderline / unsure / error -> held for an admin
//
// Precedence when several checks disagree: rejected beats held beats published.

export type ModerationStatus = "published" | "held" | "rejected";
export type ModerationDecision = { status: ModerationStatus; reason: string; detail?: string };

export type CheckOutcome<T> = { ok: true; value: T } | { ok: false; why: "failed" | "content_filter" };

export type DecisionInput = {
  pii: PiiFlags;
  contentSafety: CheckOutcome<Severities>;
  // `null` inside a successful check means the model answered but not in the schema.
  model: CheckOutcome<ModelVerdict | null>;
};

// Starting thresholds, to be tuned on real data (see the moderation eval).
export const REJECT_SEVERITY = 6;
export const HOLD_SEVERITY = 4;

const CATEGORY_CODE: Record<string, string> = {
  Hate: "hate",
  SelfHarm: "self_harm",
  Sexual: "sexual",
  Violence: "violence",
};

type Finding = { status: "rejected" | "held"; reason: string; detail?: string; rank: number };

// Lower rank wins within the same status, so a specific reason is preferred over a generic one.
const RANK = { contentSafety: 0, modelRule: 1, modelUnsure: 2, invalid: 3, blocked: 4, failed: 5 };

export function decideModeration(input: DecisionInput): ModerationDecision {
  // Deterministic personal-data hit: hold without waiting for any other check.
  if (input.pii.nationalId) return { status: "held", reason: "personal_data", detail: "thai_national_id" };
  if (input.pii.phone) return { status: "held", reason: "personal_data", detail: "phone_number" };

  const findings: Finding[] = [];

  // Azure AI Content Safety: severity 6 rejects, 4 holds, 0 and 2 pass.
  if (input.contentSafety.ok) {
    for (const [category, severity] of Object.entries(input.contentSafety.value)) {
      const code = `content_safety:${CATEGORY_CODE[category] ?? category.toLowerCase()}`;
      if (severity >= REJECT_SEVERITY) findings.push({ status: "rejected", reason: code, rank: RANK.contentSafety });
      else if (severity >= HOLD_SEVERITY) findings.push({ status: "held", reason: code, rank: RANK.contentSafety });
    }
  } else {
    findings.push({ status: "held", reason: "check_failed", detail: "content_safety", rank: RANK.failed });
  }

  // The chat model, answering in the validated schema.
  if (input.model.ok) {
    const verdict = input.model.value;
    if (verdict === null) {
      findings.push({ status: "held", reason: "invalid_model_output", rank: RANK.invalid });
    } else if (verdict.verdict === "reject" && verdict.rule === "spam") {
      findings.push({ status: "rejected", reason: "spam", detail: verdict.reason, rank: RANK.modelRule });
    } else if (verdict.verdict !== "ok") {
      // Any other hold or reject from the model is held, never rejected outright.
      const known = verdict.rule !== "none";
      findings.push({
        status: "held",
        reason: known ? verdict.rule : "model_unsure",
        detail: verdict.reason,
        rank: known ? RANK.modelRule : RANK.modelUnsure,
      });
    }
  } else if (input.model.why === "content_filter") {
    // Azure blocked the text itself: treat as a final answer and let a human look. Never retried elsewhere.
    findings.push({ status: "held", reason: "model_content_filter", rank: RANK.blocked });
  } else {
    findings.push({ status: "held", reason: "check_failed", detail: "model", rank: RANK.failed });
  }

  const pick = (status: Finding["status"]) =>
    findings.filter((f) => f.status === status).sort((a, b) => a.rank - b.rank)[0];

  const winner = pick("rejected") ?? pick("held");
  if (!winner) return { status: "published", reason: "clean" };

  return { status: winner.status, reason: winner.reason, ...(winner.detail ? { detail: winner.detail } : {}) };
}
