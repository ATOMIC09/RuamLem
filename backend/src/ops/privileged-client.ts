import "dotenv/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { runWithClient } from "../request-context";

// FOR OPERATOR SCRIPTS ONLY (ai:reindex, ai:recheck, ai:moderation-eval), run by a developer on their own machine.
//
// These scripts have no signed-in user, so they need a key that can read every post. That key is the Supabase
// service-role key, which bypasses row level security. It is read ONLY here, and this file is imported ONLY by the
// scripts. The web server never imports it, never reads that variable, and must NOT be given the key in production
// (a test fails if any other source file mentions it).
export function createPrivilegedClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("This script needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env (never set it on the server)");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Runs a script's work with the privileged client, so repository code reads and writes as the operator.
export function runAsOperator<T>(work: () => Promise<T>): Promise<T> {
  return runWithClient(createPrivilegedClient(), work);
}
