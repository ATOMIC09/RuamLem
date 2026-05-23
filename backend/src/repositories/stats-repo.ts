import { supabase } from "../supabase";

export async function getStatistics() {
  try {
    // Get total posts count
    const { count: totalPosts, error: postsError } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true });

    if (postsError) {
      console.error("Error fetching posts count:", postsError);
    }

    // Get total members count
    const { count: totalMembers, error: membersError } = await supabase
      .from("profiles")
      .select("uuid", { count: "exact", head: true });

    if (membersError) {
      console.error("Error fetching members count:", membersError);
    }

    // Get posts this month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    
    const { count: postsThisMonth, error: monthPostsError } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", firstDayOfMonth);

    if (monthPostsError) {
      console.error("Error fetching posts this month:", monthPostsError);
    }

    // Get total comments count
    const { count: totalComments, error: commentsError } = await supabase
      .from("comments")
      .select("id", { count: "exact", head: true });

    if (commentsError) {
      console.error("Error fetching comments count:", commentsError);
    }

    // Get total files count
    const { count: totalFiles, error: filesError } = await supabase
      .from("files")
      .select("id", { count: "exact", head: true });

    if (filesError) {
      console.error("Error fetching files count:", filesError);
    }

    // Get total likes count
    const { count: totalLikes, error: likesError } = await supabase
      .from("post_likes")
      .select("id", { count: "exact", head: true });

    if (likesError) {
      console.error("Error fetching likes count:", likesError);
    }

    // Get total views count
    const { count: totalViews, error: viewsError } = await supabase
      .from("post_views")
      .select("id", { count: "exact", head: true });

    if (viewsError) {
      console.error("Error fetching views count:", viewsError);
    }

    // Get total downloads count
    const { count: totalDownloads, error: downloadsError } = await supabase
      .from("file_downloads")
      .select("id", { count: "exact", head: true });

    if (downloadsError) {
      console.error("Error fetching downloads count:", downloadsError);
    }

    return {
      status: 200,
      data: {
        totalPosts: totalPosts || 0,
        totalMembers: totalMembers || 0,
        postsThisMonth: postsThisMonth || 0,
        totalComments: totalComments || 0,
        totalFiles: totalFiles || 0,
        totalLikes: totalLikes || 0,
        totalViews: totalViews || 0,
        totalDownloads: totalDownloads || 0,
      }
    };
  } catch (err: any) {
    console.error("getStatistics error:", err);
    return { status: 500, message: err.message };
  }
}
