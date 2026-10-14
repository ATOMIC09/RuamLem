import { AsyncLocalStorage } from "node:async_hooks";
import "dotenv/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Every database call in a request runs AS THE SIGNED-IN USER. The request's access token is kept here, and
// the `supabase` client (see ./supabase.ts) sends it to Supabase, so row level security decides what that
// person may read and change. The server never holds a key that bypasses RLS.
//
// Each request has its own store, so two people's requests can never see each other's token.

type Store = { token: string | null; client?: SupabaseClient };

const storage = new AsyncLocalStorage<Store>();

const AUTH_OPTIONS = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } as const;

function newClient(token: string | null): SupabaseClient {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!, {
    auth: AUTH_OPTIONS,
    ...(token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}),
  });
}

// Used for requests with no usable token and for anything outside a request: the role `anon`.
let anonymousClient: SupabaseClient | null = null;
function anonymous(): SupabaseClient {
  return (anonymousClient ??= newClient(null));
}

function decodeBase64Url(part: string): string {
  return Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

// A token worth forwarding: shaped like a JWT and not yet expired. The signature is NOT checked here (Supabase
// checks it on every call); this only stops a stale browser token from turning public pages into errors.
export function usableToken(authorization: string | null | undefined, now: number = Date.now()): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(authorization ?? "");
  if (!match) return null;

  const token = match[1];
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const payload = JSON.parse(decodeBase64Url(parts[1]));
    if (typeof payload.exp !== "number" || payload.exp * 1000 <= now) return null;
  } catch {
    return null;
  }
  return token;
}

// Call once at the start of each HTTP request.
export function enterRequest(authorization: string | null | undefined): void {
  storage.enterWith({ token: usableToken(authorization) });
}

// The client for the current request: the caller's own, or anonymous.
export function currentClient(): SupabaseClient {
  const store = storage.getStore();
  if (!store) return anonymous();
  if (store.client) return store.client;
  return (store.client = store.token ? newClient(store.token) : anonymous());
}

// The token of the current request, if there is one (used by tests and by sign-out).
export function currentToken(): string | null {
  return storage.getStore()?.token ?? null;
}

// Runs a function with a specific client. Used by operator scripts (reindex, recheck, eval) on a developer
// machine, and by tests. The server itself never calls this with a privileged client.
export function runWithClient<T>(client: SupabaseClient, fn: () => T): T {
  return storage.run({ token: null, client }, fn);
}
