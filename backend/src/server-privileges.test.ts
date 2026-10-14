import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "bun:test";

// The production server must never hold, read or use a key that bypasses row level security. The service-role
// key exists for operator scripts on a developer machine only. These tests fail if that rule is broken.

const SRC = fileURLToPath(new URL(".", import.meta.url));

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

const rel = (path: string) => relative(SRC, path).split(sep).join("/");
const sources = listFiles(SRC).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
const serverSources = sources.filter((f) => !rel(f).startsWith("ops/") && !rel(f).startsWith("scripts/"));

describe("the server holds no bypass key", () => {
  it("finds the sources to check", () => {
    expect(serverSources.length).toBeGreaterThan(30);
    expect(serverSources.map(rel)).toContain("index.ts");
  });

  it("no server file reads or mentions SUPABASE_SERVICE_ROLE_KEY", () => {
    const offenders = serverSources.filter((f) => readFileSync(f, "utf8").includes("SUPABASE_SERVICE_ROLE_KEY")).map(rel);
    expect(offenders).toEqual([]);
  });

  it("no server file uses the auth admin API, which needs the bypass key", () => {
    const offenders = serverSources.filter((f) => /\.auth\.admin\b/.test(readFileSync(f, "utf8"))).map(rel);
    expect(offenders).toEqual([]);
  });

  it("only operator scripts import the privileged client", () => {
    const importers = sources
      .filter((f) => /from\s+["'][./]*ops\/privileged-client["']/.test(readFileSync(f, "utf8")))
      .map(rel);
    expect(importers.length).toBeGreaterThan(0);
    for (const file of importers) expect(file.startsWith("scripts/")).toBe(true);
  });

  it("the web server entry point does not import any script or the ops folder", () => {
    const entry = readFileSync(join(SRC, "index.ts"), "utf8");
    expect(entry).not.toMatch(/ops\//);
    expect(entry).not.toMatch(/scripts\//);
  });

  it("the privileged client is the only place that names the key, and it says so", () => {
    const text = readFileSync(join(SRC, "ops", "privileged-client.ts"), "utf8");
    expect(text).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(text).toMatch(/OPERATOR SCRIPTS ONLY/);
  });
});

describe("every request acts as its caller", () => {
  it("the main client is the request-scoped proxy, not a client built from a key", () => {
    const text = readFileSync(join(SRC, "supabase.ts"), "utf8");
    expect(text).toContain("currentClient");
    expect(text).toMatch(/new Proxy/);
    // the only createClient call is the anon-key auth client
    expect(text.match(/createClient\(/g)).toHaveLength(1);
  });

  it("the server registers the per-request identity before any route runs", () => {
    const entry = readFileSync(join(SRC, "index.ts"), "utf8");
    expect(entry).toContain("enterRequest(");
    expect(entry.indexOf("enterRequest(")).toBeLessThan(entry.indexOf(".use(authRoute)"));
  });
});
