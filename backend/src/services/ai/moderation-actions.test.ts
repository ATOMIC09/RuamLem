import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import type { ModerationItem, Status } from "../../repositories/moderation-repo";
import { logger } from "../../utils/logger";
import {
  ADMIN_REJECTED,
  appealItem,
  approveItem,
  holdPostForFileName,
  recordAiDecision,
  rejectItem,
  toColumns,
  type ActionDeps,
} from "./moderation-actions";

const AUTHOR = "author-1";
const ADMIN = "admin-1";

const item = (over: Partial<ModerationItem> = {}): ModerationItem => ({
  id: 7,
  userId: AUTHOR,
  status: "held",
  reason: "off_topic",
  appealed: false,
  ...over,
});

function makeDeps(current: ModerationItem | null) {
  const mocks = {
    getItem: mock(async () => current),
    setStatus: mock(async () => {}),
    writeLog: mock(async () => {}),
    syncIndex: mock((_postId: number, _status: Status) => {}),
  };
  return { deps: mocks as unknown as ActionDeps, ...mocks };
}

afterEach(() => mock.restore());

describe("admin approve (a human can always overturn the AI)", () => {
  it("publishes a held item, logs it under the admin's id, and indexes a post", async () => {
    const { deps, setStatus, writeLog, syncIndex } = makeDeps(item());
    const result = await approveItem(ADMIN, "post", 7, deps);

    expect(result).toEqual({ ok: true, status: "published", reason: null });
    expect(setStatus).toHaveBeenCalledWith("post", 7, { status: "published", reason: null, appealed: false });
    expect(writeLog).toHaveBeenCalledWith({
      targetType: "post",
      targetId: 7,
      decision: "published",
      actor: ADMIN,
      reason: "admin_approved",
    });
    expect(syncIndex).toHaveBeenCalledWith(7, "published", ADMIN);
  });

  it("can also overturn an AI rejection", async () => {
    const { deps } = makeDeps(item({ status: "rejected", reason: "spam" }));
    expect(await approveItem(ADMIN, "post", 7, deps)).toMatchObject({ ok: true, status: "published" });
  });

  it("does not touch the post index for a comment", async () => {
    const { deps, syncIndex } = makeDeps(item());
    await approveItem(ADMIN, "comment", 7, deps);
    expect(syncIndex).toHaveBeenCalledTimes(0);
  });

  it("an unknown item is a 404 and nothing is written", async () => {
    const { deps, setStatus, writeLog } = makeDeps(null);
    expect(await approveItem(ADMIN, "post", 99, deps)).toEqual({ ok: false, code: 404, message: "Item not found" });
    expect(setStatus).toHaveBeenCalledTimes(0);
    expect(writeLog).toHaveBeenCalledTimes(0);
  });
});

describe("admin reject", () => {
  it("rejects, logs the admin, removes the post from the index and clears the appeal", async () => {
    const { deps, setStatus, writeLog, syncIndex } = makeDeps(item({ appealed: true }));
    const result = await rejectItem(ADMIN, "post", 7, deps);

    expect(result).toEqual({ ok: true, status: "rejected", reason: ADMIN_REJECTED });
    expect(setStatus).toHaveBeenCalledWith("post", 7, { status: "rejected", reason: ADMIN_REJECTED, appealed: false });
    expect(writeLog).toHaveBeenCalledWith(expect.objectContaining({ decision: "rejected", actor: ADMIN, reason: ADMIN_REJECTED }));
    expect(syncIndex).toHaveBeenCalledWith(7, "rejected", ADMIN);
  });
});

describe("author appeal", () => {
  it("moves an AI-rejected item back to held, flagged as appealed, keeping the AI's reason", async () => {
    const { deps, setStatus, writeLog } = makeDeps(item({ status: "rejected", reason: "spam" }));
    const result = await appealItem(AUTHOR, "post", 7, deps);

    expect(result).toEqual({ ok: true, status: "held", reason: "spam" });
    expect(setStatus).toHaveBeenCalledWith("post", 7, { status: "held", reason: "spam", appealed: true });
    expect(writeLog).toHaveBeenCalledWith({
      targetType: "post",
      targetId: 7,
      decision: "held",
      actor: AUTHOR,
      reason: "appealed",
    });
  });

  it("works for comments too", async () => {
    const { deps } = makeDeps(item({ status: "rejected", reason: "content_safety:hate" }));
    expect(await appealItem(AUTHOR, "comment", 7, deps)).toMatchObject({ ok: true, status: "held" });
  });

  it("only the author can appeal", async () => {
    const { deps, setStatus } = makeDeps(item({ status: "rejected" }));
    expect(await appealItem("someone-else", "post", 7, deps)).toMatchObject({ ok: false, code: 403 });
    expect(setStatus).toHaveBeenCalledTimes(0);
  });

  it.each(["published", "held"] as const)("a %s item cannot be appealed", async (status) => {
    const { deps } = makeDeps(item({ status }));
    expect(await appealItem(AUTHOR, "post", 7, deps)).toMatchObject({ ok: false, code: 409 });
  });

  it("an admin's rejection is final: it cannot be appealed", async () => {
    const { deps, setStatus } = makeDeps(item({ status: "rejected", reason: ADMIN_REJECTED }));
    const result = await appealItem(AUTHOR, "post", 7, deps);
    expect(result).toMatchObject({ ok: false, code: 409 });
    expect(setStatus).toHaveBeenCalledTimes(0);
  });

  it("an unknown item is a 404", async () => {
    const { deps } = makeDeps(null);
    expect(await appealItem(AUTHOR, "post", 7, deps)).toMatchObject({ ok: false, code: 404 });
  });
});

describe("holdPostForFileName", () => {
  it("holds a published post and removes it from the index", async () => {
    const { deps, setStatus, writeLog, syncIndex } = makeDeps(item({ status: "published", reason: null }));
    const result = await holdPostForFileName(7, deps);

    expect(result).toEqual({ ok: true, status: "held", reason: "personal_data" });
    expect(setStatus).toHaveBeenCalledWith("post", 7, { status: "held", reason: "personal_data", appealed: false });
    expect(writeLog).toHaveBeenCalledWith(expect.objectContaining({ actor: "ai", reason: "personal_data", detail: "file_name" }));
    expect(syncIndex).toHaveBeenCalledWith(7, "held");
  });

  it("never overrides a post that is already held or rejected, including an admin's decision", async () => {
    const { deps, setStatus } = makeDeps(item({ status: "rejected", reason: ADMIN_REJECTED }));
    expect(await holdPostForFileName(7, deps)).toMatchObject({ ok: true, status: "rejected" });
    expect(setStatus).toHaveBeenCalledTimes(0);
  });
});

describe("recordAiDecision and toColumns", () => {
  const result = {
    status: "held" as const,
    reason: "off_topic",
    detail: "ไม่เกี่ยวกับการเรียน",
    ms: 1800,
    checks: { pii: { nationalId: false, phone: false }, contentSafety: "ok" as const, model: "ok" as const },
  };

  it("logs every AI decision to the audit table under the actor 'ai'", async () => {
    const writeLog = mock(async () => {});
    spyOn(logger, "info").mockImplementation(() => {});
    await recordAiDecision("comment", 12, result, { writeLog } as unknown as Pick<ActionDeps, "writeLog">);

    expect(writeLog).toHaveBeenCalledWith({
      targetType: "comment",
      targetId: 12,
      decision: "held",
      actor: "ai",
      reason: "off_topic",
      detail: "ไม่เกี่ยวกับการเรียน",
    });
  });

  it("a failing log write never throws into the request that created the post", async () => {
    spyOn(logger, "info").mockImplementation(() => {});
    spyOn(logger, "error").mockImplementation(() => {});
    const writeLog = mock(async () => {
      throw new Error("db down");
    });
    await expect(recordAiDecision("post", 1, result, { writeLog } as unknown as Pick<ActionDeps, "writeLog">)).resolves.toBeUndefined();
  });

  it("logs ids, decision and timings, but not the model's explanation or any text", async () => {
    const info = spyOn(logger, "info").mockImplementation(() => {});
    await recordAiDecision("post", 5, result, { writeLog: mock(async () => {}) } as unknown as Pick<ActionDeps, "writeLog">);
    const logged = JSON.stringify(info.mock.calls);
    expect(logged).toContain("moderation decision");
    expect(logged).toContain("off_topic");
    expect(logged).not.toContain("ไม่เกี่ยวกับการเรียน");
  });

  it("toColumns stores no reason for a published item", () => {
    expect(toColumns({ status: "published", reason: "clean" })).toEqual({ status: "published", reason: null });
    expect(toColumns({ status: "held", reason: "spam" })).toEqual({ status: "held", reason: "spam" });
  });
});
