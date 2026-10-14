import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { createClient } from "@supabase/supabase-js";
import { currentClient, currentToken, enterRequest, runWithClient, usableToken } from "./request-context";

// A JWT-shaped token with a given expiry (the signature is not checked by this code).
const b64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString("base64url");
const jwt = (label: string, expSecondsFromNow = 3600) =>
  `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({ sub: label, exp: Math.floor(Date.now() / 1000) + expSecondsFromNow })}.sig-${label}`;

describe("usableToken", () => {
  it("accepts a Bearer token that looks like a JWT and has not expired", () => {
    const token = jwt("a");
    expect(usableToken(`Bearer ${token}`)).toBe(token);
    expect(usableToken(`bearer   ${token}`)).toBe(token);
  });

  it("treats an expired token as not signed in, so public pages never fail on a stale token", () => {
    expect(usableToken(`Bearer ${jwt("a", -10)}`)).toBeNull();
  });

  it.each([
    ["no header", null],
    ["empty header", ""],
    ["a different scheme", "Basic abc"],
    ["not a JWT", "Bearer not-a-jwt"],
    ["two parts only", "Bearer aaa.bbb"],
    ["a payload that is not JSON", "Bearer aaa.bbb.ccc"],
    ["a payload without an expiry", `Bearer x.${b64url({ sub: "a" })}.y`],
    ["an expiry that is not a number", `Bearer x.${b64url({ exp: "tomorrow" })}.y`],
    ["extra words after the token", `Bearer ${jwt("a")} extra`],
  ])("ignores %s", (_name, header) => {
    expect(usableToken(header as string | null)).toBeNull();
  });

  it("uses the supplied clock", () => {
    const token = jwt("a", 100);
    expect(usableToken(`Bearer ${token}`, Date.now() + 200_000)).toBeNull();
    expect(usableToken(`Bearer ${token}`, Date.now())).toBe(token);
  });
});

describe("request context", () => {
  const seen: { marker: string; authorization: string | null; apikey: string | null }[] = [];
  let server: ReturnType<typeof Bun.serve>;
  const saved = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_KEY };

  beforeAll(() => {
    // A stand-in for Supabase's REST API that records which token each call carried.
    server = Bun.serve({
      port: 0,
      fetch(req) {
        const url = new URL(req.url);
        seen.push({
          marker: url.searchParams.get("marker") ?? "",
          authorization: req.headers.get("authorization"),
          apikey: req.headers.get("apikey"),
        });
        return Response.json([]);
      },
    });
    process.env.SUPABASE_URL = `http://localhost:${server.port}`;
    process.env.SUPABASE_KEY = "anon-key-for-tests";
  });

  afterAll(() => {
    server.stop(true);
    if (saved.url === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = saved.url;
    if (saved.key === undefined) delete process.env.SUPABASE_KEY;
    else process.env.SUPABASE_KEY = saved.key;
  });

  it("outside a request, the client is anonymous and is reused", () => {
    expect(currentToken()).toBeNull();
    expect(currentClient()).toBe(currentClient());
  });

  it("every call in a request carries that request's own token, even with many requests in flight", async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { supabase } = await import("./supabase");
    seen.length = 0;

    const app = new Elysia()
      .onRequest(({ request }) => enterRequest(request.headers.get("authorization")))
      .get("/who/:id", async ({ params }) => {
        // Several awaits and a random delay, so the requests interleave.
        await new Promise((r) => setTimeout(r, Math.random() * 25));
        await supabase.from("posts").select("id").eq("marker", `${params.id}-a`).then((r) => r);
        await new Promise((r) => setTimeout(r, Math.random() * 25));
        await supabase.from("posts").select("id").eq("marker", `${params.id}-b`).then((r) => r);
        return { token: currentToken() };
      });

    const ids = Array.from({ length: 40 }, (_, i) => i);
    const tokenFor = (i: number) => (i % 4 === 0 ? null : i % 4 === 1 ? jwt(`user-${i}`, -60) : jwt(`user-${i}`));
    const responses = await Promise.all(
      ids.map(async (i) => {
        const token = tokenFor(i);
        const res = await app.handle(new Request(`http://localhost/who/${i}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }));
        return { i, body: (await res.json()) as { token: string | null } };
      })
    );

    for (const { i, body } of responses) {
      const token = tokenFor(i);
      const expectedToken = token && usableToken(`Bearer ${token}`) ? token : null;
      expect(body.token).toBe(expectedToken);

    }

    // Each call is matched to its request by an exact marker (PostgREST turns .eq("marker", "7-a") into marker=eq.7-a).
    const byMarker = (id: number, part: string) => seen.find((s) => s.marker === `eq.${id}-${part}`);

    for (const i of ids) {
      const token = tokenFor(i);
      const expected = token && usableToken(`Bearer ${token}`) ? `Bearer ${token}` : null;
      for (const part of ["a", "b"]) {
        const call = byMarker(i, part);
        expect(call).toBeDefined();
        if (expected) {
          expect(call!.authorization).toBe(expected);
        } else {
          // anonymous, or an expired token that was dropped: only the public anon key is sent
          expect(call!.authorization).toBe("Bearer anon-key-for-tests");
        }
      }
    }
  });

  it("a user's token is never used by a different request", async () => {
    const { supabase } = await import("./supabase");
    seen.length = 0;
    const secret = jwt("the-secret-user");

    const app = new Elysia()
      .onRequest(({ request }) => enterRequest(request.headers.get("authorization")))
      .get("/slow", async () => {
        await new Promise((r) => setTimeout(r, 40));
        await supabase.from("posts").select("id").eq("marker", "slow-signed-in");
        return "ok";
      })
      .get("/fast", async () => {
        await supabase.from("posts").select("id").eq("marker", "fast-anonymous");
        return "ok";
      });

    await Promise.all([
      app.handle(new Request("http://localhost/slow", { headers: { Authorization: `Bearer ${secret}` } })),
      app.handle(new Request("http://localhost/fast")),
    ]);

    const fast = seen.find((s) => s.marker === "eq.fast-anonymous");
    const slow = seen.find((s) => s.marker === "eq.slow-signed-in");
    expect(slow!.authorization).toBe(`Bearer ${secret}`);
    expect(fast!.authorization).toBe("Bearer anon-key-for-tests");
    expect(JSON.stringify(fast)).not.toContain("the-secret-user");
  });

  it("runWithClient substitutes a specific client (used by operator scripts and tests)", () => {
    const other = createClient("http://localhost:1", "other-key");
    expect(runWithClient(other, () => currentClient())).toBe(other);
  });
});
