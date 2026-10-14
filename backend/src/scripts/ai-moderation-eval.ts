import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getSupabaseAdmin } from "../supabase-admin";
import { percent, summarize, judge, type Label, type Scored } from "../eval/score";
import { decideModeration, DEFAULT_THRESHOLDS, type ModerationStatus, type Thresholds } from "../services/ai/moderation-decision";
import { detectPii } from "../ai/pii";
import { moderate, moderationText, type ModerationInput, type ModerationResult } from "../services/ai/moderation-service";

// Measures the moderation pipeline on a labelled set before anyone trusts it.
//   bun run ai:moderation-eval [--verbose] [--strict] [--rpm=12] [--out=results.json]
//
// Real posts and comments are read from the database by id (src/eval/labels.json holds only ids and
// labels), plus synthetic bad and tricky-but-normal examples. Real text is never printed or saved:
// the output has ids, labels, decisions, reason codes and timings only.

type Item = { id: string; real: boolean; label: Label; input: ModerationInput };

const args = process.argv.slice(2);
const verbose = args.includes("--verbose");
const strict = args.includes("--strict");
const outPath = args.find((a) => a.startsWith("--out="))?.slice("--out=".length);

const labels = JSON.parse(readFileSync(fileURLToPath(new URL("../eval/labels.json", import.meta.url)), "utf8"));

// ---- build the item list ------------------------------------------------------------------------
async function loadReal(): Promise<Item[]> {
  const db = getSupabaseAdmin();
  const wanted = (kind: "normal" | "either") => ({
    posts: labels.real[kind].posts as number[],
    comments: labels.real[kind].comments as number[],
  });
  const allPostIds = [...wanted("normal").posts, ...wanted("either").posts];
  const allCommentIds = [...wanted("normal").comments, ...wanted("either").comments];

  const [posts, comments] = await Promise.all([
    db.from("posts").select("id, title, body, post_tags(tags(subject_name)), files(file_name)").in("id", allPostIds),
    db.from("comments").select("id, body").in("id", allCommentIds),
  ]);
  if (posts.error) throw new Error(posts.error.message);
  if (comments.error) throw new Error(comments.error.message);

  const items: Item[] = [];
  for (const kind of ["normal", "either"] as const) {
    const label: Label = kind === "normal" ? { kind: "normal" } : { kind: "either" };
    for (const id of wanted(kind).posts) {
      const p: any = posts.data?.find((row: any) => row.id === id);
      if (!p) continue;
      items.push({
        id: `post#${id}`,
        real: true,
        label,
        input: {
          kind: "post",
          title: p.title,
          body: p.body,
          tags: (p.post_tags ?? []).map((pt: any) => pt.tags?.subject_name).filter(Boolean),
          // file_name can be a JSON column here, so only plain strings are used
          fileNames: (p.files ?? []).map((f: any) => f.file_name).filter((n: unknown) => typeof n === "string"),
        },
      });
    }
    for (const id of wanted(kind).comments) {
      const c = comments.data?.find((row) => row.id === id);
      if (c) items.push({ id: `comment#${id}`, real: true, label, input: { kind: "comment", body: c.body } });
    }
  }
  return items;
}

function loadCrafted(): Item[] {
  const bad: Item[] = labels.crafted.bad.map((c: any) => ({
    id: c.name,
    real: false,
    label: { kind: "bad", accept: c.accept } as Label,
    input: { kind: c.kind, title: c.title, body: c.body, tags: c.tags, fileNames: c.fileNames },
  }));
  const normal: Item[] = labels.crafted.normal.map((c: any) => ({
    id: c.name,
    real: false,
    label: { kind: "normal" } as Label,
    input: { kind: c.kind, title: c.title, body: c.body, tags: c.tags, fileNames: c.fileNames },
  }));
  return [...bad, ...normal];
}

// ---- run them, paced to the model's rate limit ------------------------------------------------
// The student-subscription chat deployment allows 15 requests per minute, so the default is 12.
// An item whose checks hit the limit comes back held as `check_failed` (the fail-safe working as
// designed); those are re-run after the window resets, so the numbers measure the model, not the quota.
const rpm = Number(args.find((a) => a.startsWith("--rpm="))?.slice("--rpm=".length)) || 12;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runAll(items: Item[]): Promise<ModerationResult[]> {
  const results: ModerationResult[] = new Array(items.length);
  const spacing = 60_000 / rpm;
  const needsModel = (i: number) => {
    const pii = detectPii(moderationText(items[i].input));
    return !(pii.nationalId || pii.phone); // personal-data hits are decided without any paid call
  };

  async function pass(indices: number[]) {
    let lastCall = 0;
    for (const index of indices) {
      if (needsModel(index)) {
        const wait = lastCall + spacing - Date.now();
        if (wait > 0) await sleep(wait);
        lastCall = Date.now();
      }
      results[index] = await moderate(items[index].input);
    }
  }

  await pass(items.map((_, i) => i));

  for (let attempt = 1; attempt <= 3; attempt++) {
    const failing = results.map((r, i) => (r.reason === "check_failed" ? i : -1)).filter((i) => i >= 0);
    if (failing.length === 0) break;
    console.log(`  ${failing.length} item(s) hit the rate limit; waiting 65s and re-running them (attempt ${attempt}/3)...`);
    await sleep(65_000);
    await pass(failing);
  }
  return results;
}

// ---- report -------------------------------------------------------------------------------------
const SWEEP: Thresholds[] = [
  { reject: 6, hold: 6 }, // Content Safety can only reject
  { reject: 6, hold: 4 }, // the starting thresholds
  { reject: 6, hold: 2 },
  { reject: 4, hold: 2 },
];
const label = (t: Thresholds) => `reject>=${t.reject}, hold>=${t.hold}`;

const items = [...(await loadReal()), ...loadCrafted()];
console.log(`Running ${items.length} items (${items.filter((i) => i.real).length} real, ${items.filter((i) => !i.real).length} crafted)...`);

const started = Date.now();
const results = await runAll(items);
console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)}s\n`);

const scoredWith = (t: Thresholds): Scored[] =>
  items.map((item, i) => ({
    id: item.id,
    label: item.label,
    outcome: decideModeration(results[i].decisionInput, t).status as ModerationStatus,
  }));

// per-item lines: mismatches under the default thresholds (all items with --verbose)
console.log(`Item results at the default thresholds (${label(DEFAULT_THRESHOLDS)}):`);
items.forEach((item, i) => {
  const r = results[i];
  const verdict = judge(item.label, r.status);
  if (!verbose && (verdict === "correct" || verdict === "ignored")) return;
  const expected = item.label.kind === "bad" ? `bad, accept ${item.label.accept.join("/")}` : item.label.kind;
  // The model's explanation is only shown for synthetic items; for real ones it could quote their text.
  const detail = !item.real && r.detail ? ` | ${r.detail}` : "";
  console.log(`  ${verdict.padEnd(18)} ${item.id.padEnd(42)} expected ${expected.padEnd(24)} got ${r.status}/${r.reason}${detail}`);
});

const sev = results
  .map((r) => (r.decisionInput.contentSafety.ok ? r.decisionInput.contentSafety.value : {}))
  .map((v) => Math.max(0, ...Object.values(v)));

console.log("\nThreshold sweep (same saved check results, no extra model calls):");
console.log("  thresholds              normal ok   false hold  false reject | bad caught  wrongly published  wrong severity");
for (const t of SWEEP) {
  const s = summarize(scoredWith(t));
  const marker = t.reject === DEFAULT_THRESHOLDS.reject && t.hold === DEFAULT_THRESHOLDS.hold ? "*" : " ";
  console.log(
    `${marker} ${label(t).padEnd(22)} ${`${s.normal.published}/${s.normal.total}`.padEnd(11)} ${String(s.normal.held).padEnd(11)} ${String(s.normal.rejected).padEnd(12)} | ` +
      `${`${s.bad.caught}/${s.bad.total}`.padEnd(11)} ${String(s.bad.wronglyPublished).padEnd(18)} ${s.bad.wrongSeverity}`
  );
}

const real = summarize(scoredWith(DEFAULT_THRESHOLDS).filter((s) => items.find((i) => i.id === s.id)!.real));
const crafted = summarize(scoredWith(DEFAULT_THRESHOLDS).filter((s) => !items.find((i) => i.id === s.id)!.real));
const all = summarize(scoredWith(DEFAULT_THRESHOLDS));

console.log("\nSummary at the default thresholds");
console.log(`  Normal content  (${all.normal.total}): published ${all.normal.published} (${percent(all.normal.published, all.normal.total)}), wrongly held ${all.normal.held}, wrongly rejected ${all.normal.rejected}`);
console.log(`    real posts and comments (${real.normal.total}): published ${real.normal.published}, wrongly held ${real.normal.held}, wrongly rejected ${real.normal.rejected}`);
console.log(`    crafted tricky-but-normal (${crafted.normal.total}): published ${crafted.normal.published}, wrongly held ${crafted.normal.held}, wrongly rejected ${crafted.normal.rejected}`);
console.log(`  Bad content     (${all.bad.total}): caught ${all.bad.caught} (${percent(all.bad.caught, all.bad.total)}), WRONGLY PUBLISHED ${all.bad.wronglyPublished}, wrong severity ${all.bad.wrongSeverity}`);
console.log(`  Junk (either outcome fine, not scored): ${all.ignored}`);

const outcomes = (kindFilter: (i: Item) => boolean) =>
  items.reduce((acc: Record<string, number>, item, i) => (kindFilter(item) ? ((acc[results[i].status] = (acc[results[i].status] ?? 0) + 1), acc) : acc), {});
console.log(`  Junk outcomes: ${JSON.stringify(outcomes((i) => i.label.kind === "either"))}`);

const failed = results.filter((r) => r.reason === "check_failed").length;
const times = results.map((r) => r.ms).sort((a, b) => a - b);
console.log(`  Checks that could not finish (held as check_failed): ${failed}`);
console.log(`  Latency: median ${times[Math.floor(times.length / 2)]} ms, p95 ${times[Math.floor(times.length * 0.95)]} ms, max ${times[times.length - 1]} ms`);
console.log(`  Items with Content Safety severity >= 4: ${sev.filter((v) => v >= 4).length}, == 2: ${sev.filter((v) => v === 2).length}`);

if (outPath) {
  writeFileSync(
    outPath,
    JSON.stringify(
      items.map((item, i) => ({ id: item.id, label: item.label, status: results[i].status, reason: results[i].reason, ms: results[i].ms, severity: sev[i] })),
      null,
      2
    )
  );
  console.log(`\nWrote ${outPath} (ids, decisions and reason codes only)`);
}

process.exit(strict && (all.bad.wronglyPublished > 0 || all.normal.rejected > 0) ? 1 : 0);
