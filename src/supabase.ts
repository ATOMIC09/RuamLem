import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// Create client with service role key for admin operations
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
