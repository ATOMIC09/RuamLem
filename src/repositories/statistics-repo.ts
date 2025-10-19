import { supabase } from "../supabase";

export async function getStatistics() {
  try {
    // Get total number of posts
    const { count: totalPosts, error: postsError } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true });

    if (postsError) {
      console.error("Error counting posts:", postsError);
    }

    // Get total number of members/users
    const { count: totalMembers, error: membersError } = await supabase
      .from("profiles")
      .select("uuid", { count: "exact", head: true });

    if (membersError) {
      console.error("Error counting members:", membersError);
    }

    // Get total number of files uploaded
    const { count: totalFiles, error: filesError } = await supabase
      .from("files")
      .select("id", { count: "exact", head: true });

    if (filesError) {
      console.error("Error counting files:", filesError);
    }

    // Get total number of comments
    const { count: totalComments, error: commentsError } = await supabase
      .from("comments")
      .select("id", { count: "exact", head: true });

    if (commentsError) {
      console.error("Error counting comments:", commentsError);
    }

    // Get posts this month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    
    const { count: postsThisMonth, error: monthPostsError } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", firstDayOfMonth);

    if (monthPostsError) {
      console.error("Error counting posts this month:", monthPostsError);
    }

    // Get total number of tags
    const { count: totalTags, error: tagsError } = await supabase
      .from("tags")
      .select("id", { count: "exact", head: true });

    if (tagsError) {
      console.error("Error counting tags:", tagsError);
    }

    return {
      status: 200,
      data: {
        totalPosts: totalPosts || 0,
        totalMembers: totalMembers || 0,
        totalFiles: totalFiles || 0,
        totalComments: totalComments || 0,
        postsThisMonth: postsThisMonth || 0,
        totalTags: totalTags || 0,
      },
    };
  } catch (err: any) {
    console.error("getStatistics error:", err);
    return { status: 500, message: err.message };
  }
}
