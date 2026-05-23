import { supabase } from "../supabase";

/**
 * Toggle like on a post (like if not liked, unlike if already liked)
 * @param userId - UUID of the user
 * @param postId - ID of the post
 * @returns Object with success status and like count
 */
export const togglePostLike = async (userId: string, postId: number) => {
  try {
    // Check if user already liked this post
    const { data: existingLike, error: checkError } = await supabase
      .from("post_likes")
      .select("*")
      .eq("user_id", userId)
      .eq("post_id", postId)
      .maybeSingle();

    if (checkError) {
      throw checkError;
    }

    let isLiked: boolean;

    if (existingLike) {
      // Unlike - remove the like
      const { error: deleteError } = await supabase
        .from("post_likes")
        .delete()
        .eq("user_id", userId)
        .eq("post_id", postId);

      if (deleteError) {
        throw deleteError;
      }
      isLiked = false;
    } else {
      // Like - add new like
      const { error: insertError } = await supabase
        .from("post_likes")
        .insert({
          user_id: userId,
          post_id: postId,
        });

      if (insertError) {
        throw insertError;
      }
      isLiked = true;
    }

    // Get updated like count
    const { count, error: countError } = await supabase
      .from("post_likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    if (countError) {
      throw countError;
    }

    return {
      status: 200,
      data: {
        isLiked,
        likeCount: count || 0,
      },
    };
  } catch (err: any) {
    return {
      status: 500,
      error: err.message || "Failed to toggle like",
    };
  }
};

/**
 * Get like status and count for a post
 * @param userId - UUID of the user (optional)
 * @param postId - ID of the post
 * @returns Object with like status and count
 */
export const getPostLikeStatus = async (userId: string | null, postId: number) => {
  try {
    // Get like count
    const { count, error: countError } = await supabase
      .from("post_likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    if (countError) {
      throw countError;
    }

    let isLiked = false;

    // Check if user has liked (if userId provided)
    if (userId) {
      const { data: userLike, error: likeError } = await supabase
        .from("post_likes")
        .select("*")
        .eq("user_id", userId)
        .eq("post_id", postId)
        .maybeSingle();

      if (likeError) {
        throw likeError;
      }

      isLiked = !!userLike;
    }

    return {
      status: 200,
      data: {
        isLiked,
        likeCount: count || 0,
      },
    };
  } catch (err: any) {
    return {
      status: 500,
      error: err.message || "Failed to get like status",
    };
  }
};

/**
 * Get like counts for multiple posts
 * @param postIds - Array of post IDs
 * @returns Array of objects with postId and likeCount
 */
export const getMultiplePostLikes = async (postIds: number[]) => {
  try {
    const { data, error } = await supabase
      .from("post_likes")
      .select("post_id")
      .in("post_id", postIds);

    if (error) {
      throw error;
    }

    // Count likes for each post
    const likeCounts = postIds.map((postId) => ({
      postId,
      likeCount: data?.filter((like) => like.post_id === postId).length || 0,
    }));

    return {
      status: 200,
      data: likeCounts,
    };
  } catch (err: any) {
    return {
      status: 500,
      error: err.message || "Failed to get like counts",
    };
  }
};

/**
 * Get total likes across all posts
 * @returns Total number of likes
 */
export const getTotalLikes = async () => {
  try {
    const { count, error } = await supabase
      .from("post_likes")
      .select("*", { count: "exact", head: true });

    if (error) {
      throw error;
    }

    return {
      status: 200,
      data: { totalLikes: count || 0 },
    };
  } catch (err: any) {
    return {
      status: 500,
      error: err.message || "Failed to get total likes",
    };
  }
};
