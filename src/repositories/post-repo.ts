import { status } from "elysia";
import { supabase } from "../supabase";
import { post } from "../controllers/post-controller";

// Helper function to get user info
async function getUserInfo(userId: string) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("first_name, last_name, avatar_url")
      .eq("uuid", userId)
      .single();

    if (error) return null;
    return {
      firstName: data?.first_name || "Unknown",
      lastName: data?.last_name || "User",
      avatarUrl: data?.avatar_url || null
    };
  } catch (err) {
    return null;
  }
}