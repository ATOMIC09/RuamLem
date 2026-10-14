import "dotenv/config";
import { embedPost } from "../services/ai/embed-service";
import { listPostIds } from "../repositories/embedding-repo";

// Backfill / rebuild the post index. Idempotent: posts whose content hash is unchanged are skipped.
// Usage: bun run ai:reindex [--force]   (--force re-embeds everything)
// This is an operator command, so it does not depend on the AI_ENABLED kill switch.

const force = process.argv.includes("--force");
const counts = { embedded: 0, unchanged: 0, missing: 0, failed: 0 };

const ids = await listPostIds();
console.log(`Reindexing ${ids.length} posts${force ? " (force)" : ""}`);

for (const id of ids) {
  try {
    counts[await embedPost(id, { force })]++;
  } catch (err: any) {
    counts.failed++;
    console.error(`post ${id} failed: ${err?.message}`);
  }
}

console.log("Done", counts);
process.exit(counts.failed > 0 ? 1 : 0);
