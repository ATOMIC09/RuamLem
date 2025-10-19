import { supabase } from "../supabase";
import {
  recordPostView,
  getPostViewCount,
  getMultiplePostViews,
  recordFileDownload,
  getFileDownloadCount,
  getMultipleFileDownloads,
} from "../repositories/analytics-repo";

/**
 * Record a post view
 */
export const recordView = async ({ body, request }: any) => {
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

    // Get IP address (optional)
    const ipAddress = request.headers.get("x-forwarded-for") || 
                     request.headers.get("x-real-ip") || 
                     null;

    const result = await recordPostView(postId, userId, ipAddress);
    return result;
  } catch (err: any) {
    return { status: 400, error: err.message };
  }
};

/**
 * Get view count for a post
 */
export const getViewCount = async ({ body }: any) => {
  try {
    const { postId } = body;
    if (!postId) {
      throw new Error("postId is required");
    }

    const result = await getPostViewCount(postId);
    return result;
  } catch (err: any) {
    return { status: 400, error: err.message };
  }
};

/**
 * Get view counts for multiple posts
 */
export const getMultipleViews = async ({ body }: any) => {
  try {
    const { postIds } = body;
    if (!postIds || !Array.isArray(postIds)) {
      throw new Error("postIds array is required");
    }

    const result = await getMultiplePostViews(postIds);
    return result;
  } catch (err: any) {
    return { status: 400, error: err.message };
  }
};

/**
 * Record a file download
 */
export const recordDownload = async ({ body, request }: any) => {
  try {
    const { fileId } = body;
    if (!fileId) {
      throw new Error("fileId is required");
    }

    // Try to get userId from token (optional - for guest users)
    let userId = null;
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (token) {
      const { data: user } = await supabase.auth.getClaims(token);
      userId = user?.claims.sub || null;
    }

    // Get IP address (optional)
    const ipAddress = request.headers.get("x-forwarded-for") || 
                     request.headers.get("x-real-ip") || 
                     null;

    const result = await recordFileDownload(fileId, userId, ipAddress);
    return result;
  } catch (err: any) {
    return { status: 400, error: err.message };
  }
};

/**
 * Get download count for a file
 */
export const getDownloadCount = async ({ body }: any) => {
  try {
    const { fileId } = body;
    if (!fileId) {
      throw new Error("fileId is required");
    }

    const result = await getFileDownloadCount(fileId);
    return result;
  } catch (err: any) {
    return { status: 400, error: err.message };
  }
};

/**
 * Get download counts for multiple files
 */
export const getMultipleDownloads = async ({ body }: any) => {
  try {
    const { fileIds } = body;
    if (!fileIds || !Array.isArray(fileIds)) {
      throw new Error("fileIds array is required");
    }

    const result = await getMultipleFileDownloads(fileIds);
    return result;
  } catch (err: any) {
    return { status: 400, error: err.message };
  }
};
