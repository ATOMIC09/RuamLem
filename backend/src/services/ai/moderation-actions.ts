import * as repo from "../../repositories/moderation-repo";
import type { Status, TargetType } from "../../repositories/moderation-repo";
import type { ModerationColumns } from "../../repositories/post-repo";
import { logger } from "../../utils/logger";
import { syncPostIndex } from "./embed-service";
import type { ModerationResult } from "./moderation-service";

// Reason codes written by people rather than by the AI.
export const ADMIN_APPROVED = "admin_approved";
export const ADMIN_REJECTED = "admin_rejected";

export type ActionDeps = {
  getItem: typeof repo.getItem;
  setStatus: typeof repo.setStatus;
  writeLog: typeof repo.writeLog;
  syncIndex: (postId: number, status: Status) => void;
};

const defaultDeps: ActionDeps = {
  getItem: repo.getItem,
  setStatus: repo.setStatus,
  writeLog: repo.writeLog,
  syncIndex: syncPostIndex,
};

export type ActionResult =
  | { ok: true; status: Status; reason: string | null }
  | { ok: false; code: 403 | 404 | 409; message: string };

// What gets stored next to a post or comment. A published item carries no reason.
export function toColumns(decision: { status: Status; reason: string }): ModerationColumns {
  return { status: decision.status, reason: decision.status === "published" ? null : decision.reason };
}

// Writes the AI's decision to the audit log. It never throws: a logging failure must not
// fail the request that created the post. Ids, decision, rule and timings only, never text.
export async function recordAiDecision(
  type: TargetType,
  id: number,
  result: Pick<ModerationResult, "status" | "reason" | "detail" | "ms" | "checks">,
  deps: Pick<ActionDeps, "writeLog"> = defaultDeps
): Promise<void> {
  try {
    await deps.writeLog({
      targetType: type,
      targetId: id,
      decision: result.status,
      actor: "ai",
      reason: result.reason,
      detail: result.detail ?? null,
    });
  } catch (err: any) {
    logger.error("moderation log write failed", { targetType: type, targetId: id, message: err?.message });
  }

  logger.info("moderation decision", {
    targetType: type,
    targetId: id,
    decision: result.status,
    reason: result.reason,
    actor: "ai",
    ms: result.ms,
    checks: result.checks,
  });
}

async function applyHumanDecision(
  actorId: string,
  type: TargetType,
  id: number,
  status: Status,
  reason: string,
  deps: ActionDeps
): Promise<ActionResult> {
  const item = await deps.getItem(type, id);
  if (!item) return { ok: false, code: 404, message: "Item not found" };

  const storedReason = status === "published" ? null : reason;
  await deps.setStatus(type, id, { status, reason: storedReason, appealed: false });
  await deps.writeLog({ targetType: type, targetId: id, decision: status, actor: actorId, reason });
  if (type === "post") deps.syncIndex(id, status);

  logger.info("moderation override", { targetType: type, targetId: id, decision: status, reason, actor: actorId });
  return { ok: true, status, reason: storedReason };
}

// A file name with a phone number or national ID in it makes the whole post a hold. File names are only
// known once the files are attached, which happens after the post exists, so this runs per upload.
export async function holdPostForFileName(postId: number, deps: ActionDeps = defaultDeps): Promise<ActionResult> {
  const item = await deps.getItem("post", postId);
  if (!item) return { ok: false, code: 404, message: "Item not found" };
  // Already held or rejected: nothing to change, and an admin's decision is never overridden.
  if (item.status !== "published") return { ok: true, status: item.status, reason: item.reason };

  await deps.setStatus("post", postId, { status: "held", reason: "personal_data", appealed: false });
  await deps.writeLog({ targetType: "post", targetId: postId, decision: "held", actor: "ai", reason: "personal_data", detail: "file_name" });
  deps.syncIndex(postId, "held");

  logger.info("moderation decision", { targetType: "post", targetId: postId, decision: "held", reason: "personal_data", actor: "ai" });
  return { ok: true, status: "held", reason: "personal_data" };
}

// An admin publishes the item: it becomes visible to everyone and, for a post, searchable.
export function approveItem(adminId: string, type: TargetType, id: number, deps: ActionDeps = defaultDeps) {
  return applyHumanDecision(adminId, type, id, "published", ADMIN_APPROVED, deps);
}

// An admin rejects the item. This is a human decision, so it is final: it cannot be appealed.
export function rejectItem(adminId: string, type: TargetType, id: number, deps: ActionDeps = defaultDeps) {
  return applyHumanDecision(adminId, type, id, "rejected", ADMIN_REJECTED, deps);
}

// The author asks an admin to look again at something the AI rejected. The item goes back to
// "held", flagged as appealed, and the AI's original reason stays so the admin can see it.
export async function appealItem(
  userId: string,
  type: TargetType,
  id: number,
  deps: ActionDeps = defaultDeps
): Promise<ActionResult> {
  const item = await deps.getItem(type, id);
  if (!item) return { ok: false, code: 404, message: "Item not found" };
  if (item.userId !== userId) return { ok: false, code: 403, message: "You can only appeal your own content" };
  if (item.status !== "rejected") return { ok: false, code: 409, message: "Only a rejected item can be appealed" };
  if (item.reason === ADMIN_REJECTED) {
    return { ok: false, code: 409, message: "An admin has already reviewed this, so it cannot be appealed" };
  }

  await deps.setStatus(type, id, { status: "held", reason: item.reason, appealed: true });
  await deps.writeLog({ targetType: type, targetId: id, decision: "held", actor: userId, reason: "appealed" });

  logger.info("moderation appeal", { targetType: type, targetId: id, actor: userId });
  return { ok: true, status: "held", reason: item.reason };
}
