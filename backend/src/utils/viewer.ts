import { isModerationEnabled } from "../ai/client";
import { supabase } from "../supabase";

// Public read endpoints don't require a login, but when one is present the author must be able
// to see their own held or rejected items. A missing, malformed or expired token just means
// "anonymous": it never turns a read into an error.
// With moderation off this returns null without touching the token, so nothing changes.
export async function getOptionalViewerId(request: Request): Promise<string | null> {
  if (!isModerationEnabled()) return null;

  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;

  try {
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data) return null;
    return data.claims.sub ?? null;
  } catch {
    return null;
  }
}
