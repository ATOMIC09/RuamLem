import { describe, expect, it } from "bun:test";
import { classifyAiError } from "./errors";

describe("classifyAiError", () => {
  it("treats a 400 content_filter as a final content_filtered answer and reports the categories", () => {
    const err = {
      status: 400,
      code: "content_filter",
      error: {
        code: "content_filter",
        innererror: {
          code: "ResponsibleAIPolicyViolation",
          content_filter_result: {
            hate: { filtered: false, severity: "safe" },
            jailbreak: { filtered: true, detected: true },
            violence: { filtered: true, severity: "high" },
          },
        },
      },
    };
    expect(classifyAiError(err)).toEqual({ code: "content_filtered", categories: ["jailbreak", "violence"] });
  });

  it("still recognises it when the code is only on the nested body", () => {
    const err = { status: 400, error: { error: { code: "content_filter", innererror: { content_filter_result: {} } } } };
    expect(classifyAiError(err)).toEqual({ code: "content_filtered", categories: [] });
  });

  it.each([
    [{ status: 429 }],
    [{ status: 500 }],
    [{ status: 400, code: "invalid_request" }],
    [new Error("fetch failed")],
    [undefined],
    [null],
    ["boom"],
  ])("everything else is unavailable: %p", (err) => {
    expect(classifyAiError(err)).toEqual({ code: "unavailable", categories: [] });
  });
});
