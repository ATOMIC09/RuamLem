import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import type { StructuredResult } from "../../ai/chat";
import type { Severities } from "../../ai/content-safety";
import { logger } from "../../utils/logger";
import { moderate, moderationText, type ModerationDeps, type ModerationInput } from "./moderation-service";

const verdict = (v: string, rule = "none", reason = "x"): StructuredResult => ({
  content: JSON.stringify({ verdict: v, rule, reason }),
  finishReason: "stop",
});

const SAFE: Severities = { Hate: 0, SelfHarm: 0, Sexual: 0, Violence: 0 };
const post: ModerationInput = { kind: "post", title: "ไฟนอล Database", body: "วิชา 010123121", tags: ["Database"] };

function makeDeps(opts: {
  severities?: Severities | Error;
  model?: StructuredResult | Error;
  timeoutMs?: number;
  hang?: "safety" | "model";
}) {
  const analyzeText = mock(async (_text: string, signal?: AbortSignal) => {
    if (opts.hang === "safety") await new Promise((_, reject) => signal?.addEventListener("abort", () => reject(signal.reason)));
    if (opts.severities instanceof Error) throw opts.severities;
    return opts.severities ?? SAFE;
  });
  const classify = mock(async (_messages: unknown, signal?: AbortSignal) => {
    if (opts.hang === "model") await new Promise((_, reject) => signal?.addEventListener("abort", () => reject(signal.reason)));
    if (opts.model instanceof Error) throw opts.model;
    return opts.model ?? verdict("ok");
  });
  return { deps: { analyzeText, classify, timeoutMs: opts.timeoutMs } as unknown as ModerationDeps, analyzeText, classify };
}

afterEach(() => mock.restore());

describe("moderate: the table", () => {
  it("clean -> published, with both checks run together", async () => {
    const { deps, analyzeText, classify } = makeDeps({});
    const result = await moderate(post, deps);
    expect(result.status).toBe("published");
    expect(result.checks).toMatchObject({ contentSafety: "ok", model: "ok" });
    expect(analyzeText).toHaveBeenCalledTimes(1);
    expect(classify).toHaveBeenCalledTimes(1);
  });

  it("clearly harmful (severity 6) -> rejected, even if the model said ok", async () => {
    const { deps } = makeDeps({ severities: { ...SAFE, Hate: 6 } });
    expect(await moderate(post, deps)).toMatchObject({ status: "rejected", reason: "content_safety:hate" });
  });

  it("obvious spam from the model -> rejected", async () => {
    const { deps } = makeDeps({ model: verdict("reject", "spam", "โฆษณา") });
    expect(await moderate(post, deps)).toMatchObject({ status: "rejected", reason: "spam" });
  });

  it("borderline (severity 4) -> held", async () => {
    const { deps } = makeDeps({ severities: { ...SAFE, Violence: 4 } });
    expect(await moderate(post, deps)).toMatchObject({ status: "held", reason: "content_safety:violence" });
  });

  it("off-topic from the model -> held", async () => {
    const { deps } = makeDeps({ model: verdict("hold", "off_topic") });
    expect(await moderate(post, deps)).toMatchObject({ status: "held", reason: "off_topic" });
  });
});

describe("moderate: deterministic checks come first and cost nothing", () => {
  it.each([
    ["a valid Thai national ID", "เลขบัตร 1-1017-00230-67-8", "thai_national_id"],
    ["a phone number", "โทร 081-234-5678", "phone_number"],
  ])("%s -> held without calling either paid check", async (_name, body, detail) => {
    const { deps, analyzeText, classify } = makeDeps({});
    const result = await moderate({ kind: "comment", body }, deps);
    expect(result).toMatchObject({ status: "held", reason: "personal_data", detail });
    expect(result.checks).toMatchObject({ contentSafety: "skipped", model: "skipped" });
    expect(analyzeText).toHaveBeenCalledTimes(0);
    expect(classify).toHaveBeenCalledTimes(0);
  });

  it("finds personal data in the title or in file names too", async () => {
    const { deps } = makeDeps({});
    expect((await moderate({ kind: "post", title: "081-234-5678", body: "x" }, deps)).status).toBe("held");
    expect((await moderate({ kind: "post", body: "x", fileNames: ["1101700230678.pdf"] }, deps)).status).toBe("held");
  });
});

describe("moderate: invalid model output counts as hold", () => {
  it.each([
    ["not JSON", { content: "I think this is fine", finishReason: "stop" }],
    ["empty content", { content: null, finishReason: "stop" }],
    ["unknown verdict", { content: '{"verdict":"approve","rule":"none","reason":"x"}', finishReason: "stop" }],
    ["extra field", { content: '{"verdict":"ok","rule":"none","reason":"x","z":1}', finishReason: "stop" }],
    ["cut off", { content: '{"verdict":"ok","ru', finishReason: "length" }],
  ])("%s -> held invalid_model_output", async (_name, model) => {
    const { deps } = makeDeps({ model: model as StructuredResult });
    const result = await moderate(post, deps);
    expect(result).toMatchObject({ status: "held", reason: "invalid_model_output" });
    expect(result.checks.model).toBe("invalid");
  });
});

describe("moderate: a failed check counts as hold", () => {
  it("model outage -> held check_failed", async () => {
    const { deps } = makeDeps({ model: Object.assign(new Error("503"), { status: 503 }) });
    const result = await moderate(post, deps);
    expect(result).toMatchObject({ status: "held", reason: "check_failed" });
    expect(result.checks).toMatchObject({ contentSafety: "ok", model: "failed" });
  });

  it("Content Safety outage -> held check_failed", async () => {
    const { deps } = makeDeps({ severities: Object.assign(new Error("429"), { status: 429 }) });
    const result = await moderate(post, deps);
    expect(result).toMatchObject({ status: "held", reason: "check_failed" });
    expect(result.checks).toMatchObject({ contentSafety: "failed", model: "ok" });
  });

  it("both down -> held, never published", async () => {
    const { deps } = makeDeps({ severities: new Error("down"), model: new Error("down") });
    expect((await moderate(post, deps)).status).toBe("held");
  });

  it("a slow check times out and holds", async () => {
    const { deps } = makeDeps({ hang: "model", timeoutMs: 30 });
    const started = Date.now();
    const result = await moderate(post, deps);
    expect(result).toMatchObject({ status: "held", reason: "check_failed" });
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it("a clear reject from one check still wins when the other fails", async () => {
    const { deps } = makeDeps({ severities: { ...SAFE, Sexual: 6 }, model: new Error("down") });
    expect((await moderate(post, deps)).status).toBe("rejected");
  });

  it("never throws", async () => {
    const { deps } = makeDeps({ severities: new Error("x"), model: new Error("y") });
    await expect(moderate(post, deps)).resolves.toBeDefined();
  });
});

describe("moderate: content-filter results are final", () => {
  it("a 400 content_filter on the prompt -> held model_content_filter, called once, no retry", async () => {
    const blocked = Object.assign(new Error("400 prompt blocked"), {
      status: 400,
      code: "content_filter",
      error: { innererror: { content_filter_result: { jailbreak: { filtered: true } } } },
    });
    const { deps, classify } = makeDeps({ model: blocked });
    const result = await moderate(post, deps);
    expect(result).toMatchObject({ status: "held", reason: "model_content_filter" });
    expect(result.checks.model).toBe("blocked");
    expect(classify).toHaveBeenCalledTimes(1);
  });

  it("a reply cut by the filter (finish_reason content_filter) -> held model_content_filter", async () => {
    const { deps } = makeDeps({ model: { content: null, finishReason: "content_filter" } });
    expect(await moderate(post, deps)).toMatchObject({ status: "held", reason: "model_content_filter" });
  });
});

describe("moderate: inputs", () => {
  it("builds the model prompt from the submission, as delimited data", async () => {
    const { deps, classify } = makeDeps({});
    await moderate({ kind: "post", title: "ชื่อโพสต์", body: "เนื้อหา", tags: ["Signals"], fileNames: ["a.pdf"] }, deps);
    const messages = classify.mock.calls[0][0] as { role: string; content: string }[];
    expect(messages[1].content).toContain("<title>ชื่อโพสต์</title>");
    expect(messages[1].content).toContain("<files>a.pdf</files>");
  });

  it("sends Content Safety the title, tags, body and file names", async () => {
    const { deps, analyzeText } = makeDeps({});
    await moderate({ kind: "post", title: "T", body: "B", tags: ["G"], fileNames: ["f.pdf"] }, deps);
    expect(analyzeText.mock.calls[0][0]).toBe("T\nG\nB\nf.pdf");
  });

  it("moderationText skips missing parts", () => {
    expect(moderationText({ kind: "comment", body: "แค่เนื้อหา" })).toBe("แค่เนื้อหา");
  });
});

describe("moderate: logging", () => {
  it("never logs the submission text, even when a check fails", async () => {
    const spies = [spyOn(logger, "info"), spyOn(logger, "warn"), spyOn(logger, "error"), spyOn(logger, "debug")];
    spies.forEach((s) => s.mockImplementation(() => {}));

    const secret = "SECRETTEXTMARKER";
    const { deps } = makeDeps({ model: Object.assign(new Error(`upstream echoed ${secret}`), { status: 500 }) });
    await moderate({ kind: "post", title: secret, body: secret }, deps);

    const logged = JSON.stringify(spies.flatMap((s) => s.mock.calls));
    expect(logged).toContain("moderation check failed");
    expect(logged).not.toContain(secret);
  });

  it("the result carries timings and check statuses for the caller to log", async () => {
    const { deps } = makeDeps({});
    const result = await moderate(post, deps);
    expect(result.ms).toBeGreaterThanOrEqual(0);
    expect(result.checks.pii).toEqual({ nationalId: false, phone: false });
  });
});
