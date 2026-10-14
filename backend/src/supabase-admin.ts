import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// Service-role client: bypasses RLS. Server-side only, and only for the AI tables
// (post_embeddings and, later, moderation_log). Everything else keeps using ./supabase.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);
