import { moderate, type ModerationInput, type ModerationResult } from "./moderation-service";
import { toColumns } from "./moderation-actions";
import * as repo from "../../repositories/moderation-repo";
import { syncPostIndex } from "./embed-service";
import { logger } from "../../utils/logger";

// While a check is down, new content is held with reason `check_failed` (it fails safe, so during an
// outage new posts wait). This re-runs those items once the checks work again.

export type RecheckDeps = {
  listHeld: (type: repo.TargetType) => Promise<{ id: number; title?: string; body: string }[]>;
  context: (postId: number) => Promise<{ tags: string[]; fileNames: string[] }>;
  moderate: (input: ModerationInput) => Promise<ModerationResult>;
  setStatus: typeof repo.setStatus;
  writeLog: typeof repo.writeLog;
  syncIndex: (postId: number, status: repo.Status) => void;
};

const defaultDeps: RecheckDeps = {
  listHeld: (type) => repo.listHeldByReason(type, "check_failed"),
  context: repo.getPostTagsAndFiles,
  moderate,
  setStatus: repo.setStatus,
  writeLog: repo.writeLog,
  syncIndex: syncPostIndex,
};

export type RecheckSummary = { checked: number; published: number; held: number; rejected: number; stillFailing: number };

export async function recheckHeldItems(deps: RecheckDeps = defaultDeps): Promise<RecheckSummary> {
  const summary: RecheckSummary = { checked: 0, published: 0, held: 0, rejected: 0, stillFailing: 0 };

  for (const type of ["post", "comment"] as const) {
    for (const item of await deps.listHeld(type)) {
      summary.checked++;

      const extra = type === "post" ? await deps.context(item.id) : { tags: [], fileNames: [] };
      const result = await deps.moderate({
        kind: type,
        title: item.title,
        body: item.body,
        tags: extra.tags,
        fileNames: extra.fileNames,
      });

      // Still no answer from a check: leave it held and try again next time.
      if (result.reason === "check_failed") {
        summary.stillFailing++;
        continue;
      }

      const columns = toColumns(result);
      await deps.setStatus(type, item.id, { status: columns.status, reason: columns.reason, appealed: false });
      await deps.writeLog({
        targetType: type,
        targetId: item.id,
        decision: result.status,
        actor: "ai",
        reason: result.reason,
        detail: "recheck",
      });
      if (type === "post") deps.syncIndex(item.id, result.status);

      summary[result.status === "published" ? "published" : result.status === "held" ? "held" : "rejected"]++;
      logger.info("moderation recheck", { targetType: type, targetId: item.id, decision: result.status, reason: result.reason });
    }
  }

  return summary;
}
