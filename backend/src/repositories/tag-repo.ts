import { supabase } from "../supabase";

// The tag ids a post is linked to. Read this BEFORE deleting the post or changing its tag.
export async function getPostTagIds(postId: number): Promise<number[]> {
  const { data, error } = await supabase.from("post_tags").select("tag_id").eq("post_id", postId);
  if (error) {
    console.error("Error reading post tags:", error.message);
    return [];
  }
  return (data ?? []).map((row: any) => row.tag_id);
}

// Removes the given tags if no post uses them any more (the database function checks that, so a tag that is
// still in use is never deleted). Housekeeping only: a failure is logged and never fails the caller.
export async function removeUnusedTags(tagIds: number[]): Promise<void> {
  if (tagIds.length === 0) return;
  const { error } = await supabase.rpc("delete_unused_tags", { p_tag_ids: tagIds });
  if (error) console.error("Error removing unused tags:", error.message);
}
