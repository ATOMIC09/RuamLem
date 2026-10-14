import { describe, expect, it } from "bun:test";
import type { ModelVerdict } from "../../ai/moderation-schema";
import { decideModeration, HOLD_SEVERITY, REJECT_SEVERITY, type DecisionInput } from "./moderation-decision";

const clean: DecisionInput = {
  pii: { nationalId: false, phone: false },
  contentSafety: { ok: true, value: { Hate: 0, SelfHarm: 0, Sexual: 0, Violence: 0 } },
  model: { ok: true, value: { verdict: "ok", rule: "none", reason: "ปกติ" } },
};

const withSeverity = (category: string, severity: number): DecisionInput => ({
  ...clean,
  contentSafety: { ok: true, value: { Hate: 0, SelfHarm: 0, Sexual: 0, Violence: 0, [category]: severity } },
});

const withModel = (value: ModelVerdict | null): DecisionInput => ({ ...clean, model: { ok: true, value } });

describe("decideModeration: the table", () => {
  it("clean -> published at once", () => {
    expect(decideModeration(clean)).toEqual({ status: "published", reason: "clean" });
  });

  it("severity 2 still passes", () => {
    expect(decideModeration(withSeverity("Hate", 2)).status).toBe("published");
  });

  it("clearly harmful: severity 6 in any category -> rejected", () => {
    for (const category of ["Hate", "SelfHarm", "Sexual", "Violence"]) {
      expect(decideModeration(withSeverity(category, 6))).toEqual({
        status: "rejected",
        reason: `content_safety:${{ Hate: "hate", SelfHarm: "self_harm", Sexual: "sexual", Violence: "violence" }[category]}`,
      });
    }
  });

  it("borderline: severity 4 -> held", () => {
    expect(decideModeration(withSeverity("Violence", 4))).toEqual({
      status: "held",
      reason: "content_safety:violence",
    });
  });

  it("obvious spam from the model -> rejected", () => {
    const decision = decideModeration(withModel({ verdict: "reject", rule: "spam", reason: "โฆษณา" }));
    expect(decision).toEqual({ status: "rejected", reason: "spam", detail: "โฆษณา" });
  });

  it("any other model hold -> held, with the rule as the reason", () => {
    for (const rule of ["off_topic", "personal_data", "abuse", "spam"] as const) {
      expect(decideModeration(withModel({ verdict: "hold", rule, reason: "x" }))).toEqual({
        status: "held",
        reason: rule,
        detail: "x",
      });
    }
  });

  it("a model reject that is not spam is held, never rejected", () => {
    for (const rule of ["off_topic", "personal_data", "abuse"] as const) {
      expect(decideModeration(withModel({ verdict: "reject", rule, reason: "x" })).status).toBe("held");
    }
  });

  it("a model hold with no rule is held as model_unsure", () => {
    expect(decideModeration(withModel({ verdict: "hold", rule: "none", reason: "ไม่แน่ใจ" }))).toEqual({
      status: "held",
      reason: "model_unsure",
      detail: "ไม่แน่ใจ",
    });
  });

  it("thresholds are 6 and 4", () => {
    expect(REJECT_SEVERITY).toBe(6);
    expect(HOLD_SEVERITY).toBe(4);
  });
});

describe("decideModeration: deterministic checks", () => {
  it("a valid Thai national ID holds the item", () => {
    expect(decideModeration({ ...clean, pii: { nationalId: true, phone: false } })).toEqual({
      status: "held",
      reason: "personal_data",
      detail: "thai_national_id",
    });
  });

  it("a phone number holds the item", () => {
    expect(decideModeration({ ...clean, pii: { nationalId: false, phone: true } })).toEqual({
      status: "held",
      reason: "personal_data",
      detail: "phone_number",
    });
  });

  it("wins over other results, so it needs no paid check", () => {
    const decision = decideModeration({
      pii: { nationalId: true, phone: false },
      contentSafety: { ok: false, why: "failed" },
      model: { ok: false, why: "failed" },
    });
    expect(decision.reason).toBe("personal_data");
  });
});

describe("decideModeration: invalid model output counts as hold", () => {
  it("null (not matching the schema) -> held invalid_model_output", () => {
    expect(decideModeration(withModel(null))).toEqual({ status: "held", reason: "invalid_model_output" });
  });
});

describe("decideModeration: a failed check counts as hold", () => {
  it("Content Safety failure -> held check_failed", () => {
    expect(decideModeration({ ...clean, contentSafety: { ok: false, why: "failed" } })).toEqual({
      status: "held",
      reason: "check_failed",
      detail: "content_safety",
    });
  });

  it("model failure (timeout, outage, quota) -> held check_failed", () => {
    expect(decideModeration({ ...clean, model: { ok: false, why: "failed" } })).toEqual({
      status: "held",
      reason: "check_failed",
      detail: "model",
    });
  });

  it("both failing -> held", () => {
    const decision = decideModeration({
      ...clean,
      contentSafety: { ok: false, why: "failed" },
      model: { ok: false, why: "failed" },
    });
    expect(decision.status).toBe("held");
    expect(decision.reason).toBe("check_failed");
  });

  it("a content-filter block on the model is held as model_content_filter", () => {
    expect(decideModeration({ ...clean, model: { ok: false, why: "content_filter" } })).toEqual({
      status: "held",
      reason: "model_content_filter",
    });
  });
});

describe("decideModeration: precedence", () => {
  it("rejected beats held beats published", () => {
    const rejected = decideModeration({
      ...withSeverity("Hate", 6),
      model: { ok: true, value: { verdict: "hold", rule: "off_topic", reason: "x" } },
    });
    expect(rejected.status).toBe("rejected");

    const held = decideModeration({
      ...withSeverity("Hate", 4),
      model: { ok: true, value: { verdict: "ok", rule: "none", reason: "x" } },
    });
    expect(held.status).toBe("held");
  });

  it("a clear reject still wins even if the other check failed", () => {
    expect(decideModeration({ ...withSeverity("Sexual", 6), model: { ok: false, why: "failed" } }).status).toBe(
      "rejected"
    );
    expect(
      decideModeration({
        ...clean,
        contentSafety: { ok: false, why: "failed" },
        model: { ok: true, value: { verdict: "reject", rule: "spam", reason: "x" } },
      }).status
    ).toBe("rejected");
  });

  it("prefers a specific reason over a generic check_failed", () => {
    const decision = decideModeration({
      ...clean,
      contentSafety: { ok: false, why: "failed" },
      model: { ok: true, value: { verdict: "hold", rule: "abuse", reason: "ด่า" } },
    });
    expect(decision.reason).toBe("abuse");
  });

  it("an item is never published when any check could not decide", () => {
    expect(decideModeration({ ...clean, contentSafety: { ok: false, why: "failed" } }).status).not.toBe("published");
    expect(decideModeration({ ...clean, model: { ok: false, why: "failed" } }).status).not.toBe("published");
    expect(decideModeration(withModel(null)).status).not.toBe("published");
  });
});
