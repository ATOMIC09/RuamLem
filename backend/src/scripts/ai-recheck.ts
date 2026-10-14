import "dotenv/config";
import { recheckHeldItems } from "../services/ai/moderation-recheck";
import { runAsOperator } from "../ops/privileged-client";

// Re-runs moderation for items that were held only because a check could not finish
// (reason `check_failed`). Safe to run repeatedly. Usage: bun run ai:recheck
// Runs with the service-role key from backend/.env on YOUR machine; the web server never has it.

const summary = await runAsOperator(() => recheckHeldItems());
console.log("Recheck done", summary);
process.exit(0);
