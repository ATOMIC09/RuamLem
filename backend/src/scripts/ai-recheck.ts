import "dotenv/config";
import { recheckHeldItems } from "../services/ai/moderation-recheck";

// Re-runs moderation for items that were held only because a check could not finish
// (reason `check_failed`). Safe to run repeatedly. Usage: bun run ai:recheck

const summary = await recheckHeldItems();
console.log("Recheck done", summary);
process.exit(0);
