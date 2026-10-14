import { supabase } from "../supabase";

// View and download rows hold IP addresses and user agents, so the tables are closed to the API. Everything here goes
// through small database functions that record one event, or return only counts. The caller's identity (for a
// signed-in user) comes from the request's own token, inside the function.

async function counts<T>(fn: string, args: Record<string, unknown>): Promise<T[]> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return (data ?? []) as T[];
}

/**
 * Record a post view (once per user, or per IP address when signed out, every 24 hours)
 * @param postId - ID of the post (integer)
 * @param _userId - not used: the database reads the signed-in user from the request's token
 * @param ipAddress - IP address for tracking unique views (optional)
 */
export const recordPostView = async (
  postId: number,
  _userId: string | null = null,
  ipAddress: string | null = null
) => {
  try {
    const { data, error } = await supabase.rpc("record_post_view", { p_post_id: postId, p_ip: ipAddress });
    if (error) throw error;

    return {
      status: 200,
      message: data === "already_recorded" ? "View already recorded recently" : "View recorded successfully",
    };
  } catch (err: any) {
    return { status: 500, error: err.message || "Failed to record view" };
  }
};

export const getPostViewCount = async (postId: number) => {
  try {
    const rows = await counts<{ post_id: number; view_count: number }>("post_view_counts", { p_post_ids: [postId] });
    return { status: 200, data: { viewCount: Number(rows[0]?.view_count ?? 0) } };
  } catch (err: any) {
    return { status: 500, error: err.message || "Failed to get view count" };
  }
};

/**
 * Get view counts for multiple posts
 * @returns Array of objects with postId and viewCount
 */
export const getMultiplePostViews = async (postIds: number[]) => {
  try {
    const rows = await counts<{ post_id: number; view_count: number }>("post_view_counts", { p_post_ids: postIds });
    const byPost = new Map(rows.map((r) => [r.post_id, Number(r.view_count)]));
    return { status: 200, data: postIds.map((postId) => ({ postId, viewCount: byPost.get(postId) ?? 0 })) };
  } catch (err: any) {
    return { status: 500, error: err.message || "Failed to get view counts" };
  }
};

/**
 * Record a file download
 * @param fileId - ID of the file (integer)
 * @param postId - ID of the post the file belongs to (integer)
 * @param _userId - not used: the database reads the signed-in user from the request's token
 * @param ipAddress - IP address for tracking (optional)
 */
export const recordFileDownload = async (
  fileId: number,
  postId: number,
  _userId: string | null = null,
  ipAddress: string | null = null
) => {
  try {
    const { error } = await supabase.rpc("record_file_download", { p_file_id: fileId, p_post_id: postId, p_ip: ipAddress });
    if (error) throw error;

    return { status: 200, message: "Download recorded successfully" };
  } catch (err: any) {
    return { status: 500, error: err.message || "Failed to record download" };
  }
};

export const getFileDownloadCount = async (fileId: number) => {
  try {
    const rows = await counts<{ file_id: number; download_count: number }>("file_download_counts", { p_file_ids: [fileId] });
    return { status: 200, data: { downloadCount: Number(rows[0]?.download_count ?? 0) } };
  } catch (err: any) {
    return { status: 500, error: err.message || "Failed to get download count" };
  }
};

/**
 * Get download counts for multiple files
 * @returns Array of objects with fileId and downloadCount
 */
export const getMultipleFileDownloads = async (fileIds: number[]) => {
  try {
    const rows = await counts<{ file_id: number; download_count: number }>("file_download_counts", { p_file_ids: fileIds });
    const byFile = new Map(rows.map((r) => [r.file_id, Number(r.download_count)]));
    return { status: 200, data: fileIds.map((fileId) => ({ fileId, downloadCount: byFile.get(fileId) ?? 0 })) };
  } catch (err: any) {
    return { status: 500, error: err.message || "Failed to get download counts" };
  }
};

async function totals() {
  const rows = await counts<{ total_views: number; total_downloads: number }>("engagement_totals", {});
  return { views: Number(rows[0]?.total_views ?? 0), downloads: Number(rows[0]?.total_downloads ?? 0) };
};

/** Get total views across all posts */
export const getTotalViews = async () => {
  try {
    return { status: 200, data: { totalViews: (await totals()).views } };
  } catch (err: any) {
    return { status: 500, error: err.message || "Failed to get total views" };
  }
};

/** Get total downloads across all files */
export const getTotalDownloads = async () => {
  try {
    return { status: 200, data: { totalDownloads: (await totals()).downloads } };
  } catch (err: any) {
    return { status: 500, error: err.message || "Failed to get total downloads" };
  }
};
