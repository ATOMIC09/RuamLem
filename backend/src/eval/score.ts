import type { ModerationStatus } from "../services/ai/moderation-decision";

// Scoring for `bun run ai:moderation-eval`. Pure, so it is tested without calling any model.
//
// Each labelled item says which outcomes are acceptable:
//   normal   -> must be published (anything else is a false hold or a false reject)
//   bad      -> must NOT be published; `accept` lists the outcomes that count as right
//   either   -> junk that a person may or may not want (test posts): never counted as an error

export type Label =
  | { kind: "normal" }
  | { kind: "bad"; accept: ModerationStatus[] }
  | { kind: "either" };

export type Scored = { id: string; label: Label; outcome: ModerationStatus };

export type Verdict =
  | "correct"
  | "wrongly_published" // bad content went live: the serious miss
  | "wrongly_held" // normal content waits for an admin: extra admin work
  | "wrongly_rejected" // normal content was rejected: the author is told no (and may appeal)
  | "wrong_severity" // bad content was caught, but rejected where only a hold was wanted, or the reverse
  | "ignored";

export function judge(label: Label, outcome: ModerationStatus): Verdict {
  if (label.kind === "either") return "ignored";

  if (label.kind === "normal") {
    if (outcome === "published") return "correct";
    return outcome === "held" ? "wrongly_held" : "wrongly_rejected";
  }

  if (outcome === "published") return "wrongly_published";
  return label.accept.includes(outcome) ? "correct" : "wrong_severity";
}

export type Summary = {
  normal: { total: number; published: number; held: number; rejected: number };
  bad: { total: number; caught: number; wronglyPublished: number; wrongSeverity: number };
  ignored: number;
  counts: Record<Verdict, number>;
};

export function summarize(items: Scored[]): Summary {
  const counts: Record<Verdict, number> = {
    correct: 0,
    wrongly_published: 0,
    wrongly_held: 0,
    wrongly_rejected: 0,
    wrong_severity: 0,
    ignored: 0,
  };
  const summary: Summary = {
    normal: { total: 0, published: 0, held: 0, rejected: 0 },
    bad: { total: 0, caught: 0, wronglyPublished: 0, wrongSeverity: 0 },
    ignored: 0,
    counts,
  };

  for (const item of items) {
    const verdict = judge(item.label, item.outcome);
    counts[verdict]++;

    if (item.label.kind === "normal") {
      summary.normal.total++;
      summary.normal[item.outcome]++;
    } else if (item.label.kind === "bad") {
      summary.bad.total++;
      if (item.outcome !== "published") summary.bad.caught++;
      if (verdict === "wrongly_published") summary.bad.wronglyPublished++;
      if (verdict === "wrong_severity") summary.bad.wrongSeverity++;
    } else {
      summary.ignored++;
    }
  }
  return summary;
}

export function percent(part: number, whole: number): string {
  return whole === 0 ? "n/a" : `${((part / whole) * 100).toFixed(1)}%`;
}
