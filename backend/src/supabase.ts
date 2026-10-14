import "dotenv/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { currentClient } from "./request-context";

// `supabase`: every table query and storage call. It is a thin stand-in that, on each use, picks the client of the
// CURRENT REQUEST, which carries the signed-in user's own access token. Row level security therefore applies to
// every call, and the server needs no key that bypasses it. See ./request-context.ts.
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    const client = currentClient() as unknown as Record<string | symbol, unknown>;
    const value = client[property];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
});

// `supabaseAuth`: acting on behalf of a person who may not be signed in yet: sign-up, sign-in, checking a token,
// password reset. Always the public anon key.
export const supabaseAuth = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
