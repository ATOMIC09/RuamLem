import { supabase } from "../supabase";
import {
  togglePostLike,
  getPostLikeStatus,
  getMultiplePostLikes,
} from "../repositories/like-repo";

/**
 * Toggle like on a post
 */
export const toggleLike = async ({ body, request }: any) => {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      throw new Error("No authorization token provided");
    }

    const { data: user, error } = await supabase.auth.getClaims(token);
    if (error || !user) {
      throw new Error("Invalid session");
    }
    const userId = user.claims.sub;

    if (!userId) {
      throw new Error("Invalid user ID from token");
    }

    const { postId } = body;
    if (!postId) {
      throw new Error("postId is required");
    }

    const result = await togglePostLike(userId, postId);
    return result;
  } catch (err: any) {
    return { status: 401, error: err.message };
  }
};

/**
 * Get like status for a post
 */
export const getLikeStatus = async ({ body, request }: any) => {
  try {
    const { postId } = body;
    if (!postId) {
      throw new Error("postId is required");
    }

    // Try to get userId from token (optional - for guest users)
    let userId = null;
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (token) {
      const { data: user } = await supabase.auth.getClaims(token);
      userId = user?.claims.sub || null;
    }

    const result = await getPostLikeStatus(userId, postId);
    return result;
  } catch (err: any) {
    return { status: 400, error: err.message };
  }
};

/**
 * Get like counts for multiple posts
 */
export const getMultipleLikes = async ({ body }: any) => {
  try {
    const { postIds } = body;
    if (!postIds || !Array.isArray(postIds)) {
      throw new Error("postIds array is required");
    }

    const result = await getMultiplePostLikes(postIds);
    return result;
  } catch (err: any) {
    return { status: 400, error: err.message };
  }
};
