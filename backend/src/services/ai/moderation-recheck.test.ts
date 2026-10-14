import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import { logger } from "../../utils/logger";
import type { ModerationResult } from "./moderation-service";
import { recheckHeldItems, type RecheckDeps } from "./moderation-recheck";

const noChecks = {
  pii: { nationalId: false, phone: false },
  contentSafety: "ok" as const,
  model: "ok" as const,
};

const verdict = (status: ModerationResult["status"], reason: string): ModerationResult => ({
  status,
  reason,
  ms: 5,
  checks: noChecks,
});

function makeDeps(opts: { posts?: any[]; comments?: any[]; results: ModerationResult[] }) {
  const queue = [...opts.results];
  const mocks = {
    listHeld: mock(async (type: string) => (type === "post" ? (opts.posts ?? []) : (opts.comments ?? []))),
    context: mock(async () => ({ tags: ["Database"], fileNames: ["a.pdf"] })),
    moderate: mock(async () => queue.shift()!),
    setStatus: mock(async () => {}),
    writeLog: mock(async () => {}),
    syncIndex: mock(() => {}),
  };
  return { deps: mocks as unknown as RecheckDeps, ...mocks };
}

afterEach(() => mock.restore());

describe("recheckHeldItems (ai:recheck)", () => {
  it("re-runs items held for check_failed and applies the new decision", async () => {
    spyOn(logger, "info").mockImplementation(() => {});
    const { deps, setStatus, writeLog, syncIndex, moderate } = makeDeps({
      posts: [{ id: 1, title: "ไฟนอล", body: "x" }],
      comments: [{ id: 9, body: "ขอบคุณ" }],
      results: [verdict("published", "clean"), verdict("rejected", "spam")],
    });
    const summary = await recheckHeldItems(deps);

    expect(summary).toEqual({ checked: 2, published: 1, held: 0, rejected: 1, stillFailing: 0 });
    expect(moderate).toHaveBeenCalledTimes(2);
    // the post is re-checked with its tags and file names, the comment with just its body
    expect((moderate.mock.calls[0] as any)[0]).toMatchObject({ kind: "post", title: "ไฟนอล", tags: ["Database"], fileNames: ["a.pdf"] });
    expect((moderate.mock.calls[1] as any)[0]).toMatchObject({ kind: "comment", body: "ขอบคุณ" });

    expect(setStatus).toHaveBeenCalledWith("post", 1, { status: "published", reason: null, appealed: false });
    expect(setStatus).toHaveBeenCalledWith("comment", 9, { status: "rejected", reason: "spam", appealed: false });
    expect(writeLog).toHaveBeenCalledWith(expect.objectContaining({ targetType: "post", targetId: 1, actor: "ai", detail: "recheck" }));
    expect(syncIndex).toHaveBeenCalledTimes(1); // posts only
    expect(syncIndex).toHaveBeenCalledWith(1, "published");
  });

  it("leaves an item held when the checks still cannot decide", async () => {
    const { deps, setStatus, writeLog } = makeDeps({
      posts: [{ id: 1, title: "t", body: "b" }],
      results: [verdict("held", "check_failed")],
    });
    const summary = await recheckHeldItems(deps);

    expect(summary).toEqual({ checked: 1, published: 0, held: 0, rejected: 0, stillFailing: 1 });
    expect(setStatus).toHaveBeenCalledTimes(0);
    expect(writeLog).toHaveBeenCalledTimes(0);
  });

  it("a real hold replaces check_failed with the actual reason", async () => {
    spyOn(logger, "info").mockImplementation(() => {});
    const { deps, setStatus } = makeDeps({
      posts: [{ id: 3, title: "t", body: "b" }],
      results: [verdict("held", "off_topic")],
    });
    const summary = await recheckHeldItems(deps);

    expect(summary.held).toBe(1);
    expect(setStatus).toHaveBeenCalledWith("post", 3, { status: "held", reason: "off_topic", appealed: false });
  });

  it("does nothing when nothing is waiting", async () => {
    const { deps, moderate } = makeDeps({ results: [] });
    expect(await recheckHeldItems(deps)).toEqual({ checked: 0, published: 0, held: 0, rejected: 0, stillFailing: 0 });
    expect(moderate).toHaveBeenCalledTimes(0);
  });
});
