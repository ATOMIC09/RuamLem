import { supabase } from "../supabase";

/**
 * Record a post view
 * @param postId - ID of the post (integer)
 * @param userId - UUID of the user (optional for guest users)
 * @param ipAddress - IP address for tracking unique views (optional)
 * @returns Success status
 */
export const recordPostView = async (
  postId: number,
  userId: string | null = null,
  ipAddress: string | null = null
) => {
  try {
    // Check if this user/IP already viewed this post recently (within 24 hours)
    if (userId || ipAddress) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      let query = supabase
        .from("post_views")
        .select("id")
        .eq("post_id", postId)
        .gte("created_at", twentyFourHoursAgo);

      if (userId) {
        query = query.eq("user_id", userId);
      } else if (ipAddress) {
        query = query.eq("ip_address", ipAddress);
      }

      const { data: recentView } = await query.maybeSingle();

      // If recently viewed, don't record again
      if (recentView) {
        return {
          status: 200,
          message: "View already recorded recently",
        };
      }
    }

    // Record the view
    const { error: insertError } = await supabase
      .from("post_views")
      .insert({
        post_id: postId,
        user_id: userId,
        ip_address: ipAddress,
      });

    if (insertError) {
      throw insertError;
    }

    return {
      status: 200,
      message: "View recorded successfully",
    };
  } catch (err: any) {
    return {
      status: 500,
      error: err.message || "Failed to record view",
    };
  }
};

/**
 * Get view count for a post
 * @param postId - ID of the post (integer)
 * @returns View count
 */
export const getPostViewCount = async (postId: number) => {
  try {
    const { count, error } = await supabase
      .from("post_views")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    if (error) {
      throw error;
    }

    return {
      status: 200,
      data: { viewCount: count || 0 },
    };
  } catch (err: any) {
    return {
      status: 500,
      error: err.message || "Failed to get view count",
    };
  }
};

/**
 * Get view counts for multiple posts
 * @param postIds - Array of post IDs (integers)
 * @returns Array of objects with postId and viewCount
 */
export const getMultiplePostViews = async (postIds: number[]) => {
  try {
    const { data, error } = await supabase
      .from("post_views")
      .select("post_id")
      .in("post_id", postIds);

    if (error) {
      throw error;
    }

    // Count views for each post
    const viewCounts = postIds.map((postId) => ({
      postId,
      viewCount: data?.filter((view) => view.post_id === postId).length || 0,
    }));

    return {
      status: 200,
      data: viewCounts,
    };
  } catch (err: any) {
    return {
      status: 500,
      error: err.message || "Failed to get view counts",
    };
  }
};

/**
 * Record a file download
 * @param fileId - ID of the file (integer)
 * @param postId - ID of the post the file belongs to (integer)
 * @param userId - UUID of the user (optional for guest users)
 * @param ipAddress - IP address for tracking (optional)
 * @returns Success status
 */
export const recordFileDownload = async (
  fileId: number,
  postId: number,
  userId: string | null = null,
  ipAddress: string | null = null
) => {
  try {
    // Record the download
    const { error: insertError } = await supabase
      .from("file_downloads")
      .insert({
        file_id: fileId,
        post_id: postId,
        user_id: userId,
        ip_address: ipAddress,
      });

    if (insertError) {
      throw insertError;
    }

    return {
      status: 200,
      message: "Download recorded successfully",
    };
  } catch (err: any) {
    return {
      status: 500,
      error: err.message || "Failed to record download",
    };
  }
};

/**
 * Get download count for a file
 * @param fileId - ID of the file (integer)
 * @returns Download count
 */
export const getFileDownloadCount = async (fileId: number) => {
  try {
    const { count, error } = await supabase
      .from("file_downloads")
      .select("*", { count: "exact", head: true })
      .eq("file_id", fileId);

    if (error) {
      throw error;
    }

    return {
      status: 200,
      data: { downloadCount: count || 0 },
    };
  } catch (err: any) {
    return {
      status: 500,
      error: err.message || "Failed to get download count",
    };
  }
};

/**
 * Get download counts for multiple files
 * @param fileIds - Array of file IDs (integers)
 * @returns Array of objects with fileId and downloadCount
 */
export const getMultipleFileDownloads = async (fileIds: number[]) => {
  try {
    const { data, error } = await supabase
      .from("file_downloads")
      .select("file_id")
      .in("file_id", fileIds);

    if (error) {
      throw error;
    }

    // Count downloads for each file
    const downloadCounts = fileIds.map((fileId) => ({
      fileId,
      downloadCount: data?.filter((download) => download.file_id === fileId).length || 0,
    }));

    return {
      status: 200,
      data: downloadCounts,
    };
  } catch (err: any) {
    return {
      status: 500,
      error: err.message || "Failed to get download counts",
    };
  }
};

/**
 * Get total views across all posts
 * @returns Total number of views
 */
export const getTotalViews = async () => {
  try {
    const { count, error } = await supabase
      .from("post_views")
      .select("*", { count: "exact", head: true });

    if (error) {
      throw error;
    }

    return {
      status: 200,
      data: { totalViews: count || 0 },
    };
  } catch (err: any) {
    return {
      status: 500,
      error: err.message || "Failed to get total views",
    };
  }
};

/**
 * Get total downloads across all files
 * @returns Total number of downloads
 */
export const getTotalDownloads = async () => {
  try {
    const { count, error } = await supabase
      .from("file_downloads")
      .select("*", { count: "exact", head: true });

    if (error) {
      throw error;
    }

    return {
      status: 200,
      data: { totalDownloads: count || 0 },
    };
  } catch (err: any) {
    return {
      status: 500,
      error: err.message || "Failed to get total downloads",
    };
  }
};
