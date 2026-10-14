import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL!;
const anonKey = process.env.SUPABASE_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Data, storage and the auth admin API. With a service-role key configured this client bypasses row
// level security, which is what lets every table be locked to "backend only". It never signs a user
// in, so it never acts as one. Without the key it falls back to the anon key, as before, so a deploy
// that has not been given the new variable yet keeps working.
export const supabase = createClient(url, serviceKey || anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Acting for a user: sign-up, sign-in, token checks, password reset. Always the anon key.
export const supabaseAuth = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
