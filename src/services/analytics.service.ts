// Analytics service for views and downloads tracking

import { apiRequest } from '@/lib/api';

/**
 * Record a post view
 */
export async function recordPostView(postId: string | number): Promise<{ success?: boolean; error?: string }> {
  try {
    // Convert to number if string
    const numericPostId = typeof postId === 'string' ? parseInt(postId, 10) : postId;
    console.log('📡 Calling API: POST /analytics/view with postId:', numericPostId);
    
    const response = await apiRequest<{ status?: number; message?: string; error?: string }>('/analytics/view', {
      method: 'POST',
      data: { postId: numericPostId },
    });

    console.log('📡 API Response:', response);

    if (response.error) {
      console.error('❌ API Error:', response.error);
      return { error: response.error };
    }

    if (response.status === 200) {
      console.log('✅ View recorded successfully');
      return { success: true };
    }

    return { error: 'ไม่สามารถบันทึกการดูโพสต์ได้' };
  } catch (error) {
    console.error('❌ Exception in recordPostView:', error);
    return {
      error: error instanceof Error ? error.message : 'ไม่สามารถบันทึกการดูโพสต์ได้',
    };
  }
}

/**
 * Get view count for a post
 */
export async function getPostViewCount(postId: string | number): Promise<{ viewCount?: number; error?: string }> {
  try {
    const numericPostId = typeof postId === 'string' ? parseInt(postId, 10) : postId;
    const response = await apiRequest<{ 
      status?: number; 
      data?: { viewCount: number }; 
      error?: string 
    }>('/analytics/view/count', {
      method: 'POST',
      data: { postId: numericPostId },
    });

    if (response.error) {
      return { error: response.error };
    }

    if (response.status === 200 && response.data) {
      return { viewCount: response.data.viewCount };
    }

    return { error: 'ไม่สามารถดึงข้อมูลจำนวนการดูได้' };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'ไม่สามารถดึงข้อมูลจำนวนการดูได้',
    };
  }
}

/**
 * Get view counts for multiple posts
 */
export async function getMultiplePostViews(postIds: (string | number)[]): Promise<{ 
  data?: Array<{ postId: number; viewCount: number }>; 
  error?: string 
}> {
  try {
    const numericPostIds = postIds.map(id => typeof id === 'string' ? parseInt(id, 10) : id);
    const response = await apiRequest<{ 
      status?: number; 
      data?: Array<{ postId: number; viewCount: number }>; 
      error?: string 
    }>('/analytics/view/multiple', {
      method: 'POST',
      data: { postIds: numericPostIds },
    });

    if (response.error) {
      return { error: response.error };
    }

    if (response.status === 200 && response.data) {
      return { data: response.data };
    }

    return { error: 'ไม่สามารถดึงข้อมูลจำนวนการดูได้' };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'ไม่สามารถดึงข้อมูลจำนวนการดูได้',
    };
  }
}

/**
 * Record a file download
 */
export async function recordFileDownload(
  fileId: string | number,
  postId: string | number
): Promise<{ success?: boolean; error?: string }> {
  try {
    const numericFileId = typeof fileId === 'string' ? parseInt(fileId, 10) : fileId;
    const numericPostId = typeof postId === 'string' ? parseInt(postId, 10) : postId;
    const response = await apiRequest<{ status?: number; message?: string; error?: string }>('/analytics/download', {
      method: 'POST',
      data: { fileId: numericFileId, postId: numericPostId },
    });

    if (response.error) {
      return { error: response.error };
    }

    if (response.status === 200) {
      return { success: true };
    }

    return { error: 'ไม่สามารถบันทึกการดาวน์โหลดได้' };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'ไม่สามารถบันทึกการดาวน์โหลดได้',
    };
  }
}

/**
 * Get download count for a file
 */
export async function getFileDownloadCount(fileId: string | number): Promise<{ downloadCount?: number; error?: string }> {
  try {
    const numericFileId = typeof fileId === 'string' ? parseInt(fileId, 10) : fileId;
    const response = await apiRequest<{ 
      status?: number; 
      data?: { downloadCount: number }; 
      error?: string 
    }>('/analytics/download/count', {
      method: 'POST',
      data: { fileId: numericFileId },
    });

    if (response.error) {
      return { error: response.error };
    }

    if (response.status === 200 && response.data) {
      return { downloadCount: response.data.downloadCount };
    }

    return { error: 'ไม่สามารถดึงข้อมูลจำนวนการดาวน์โหลดได้' };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'ไม่สามารถดึงข้อมูลจำนวนการดาวน์โหลดได้',
    };
  }
}

/**
 * Get download counts for multiple files
 */
export async function getMultipleFileDownloads(fileIds: (string | number)[]): Promise<{ 
  data?: Array<{ fileId: number; downloadCount: number }>; 
  error?: string 
}> {
  try {
    const numericFileIds = fileIds.map(id => typeof id === 'string' ? parseInt(id, 10) : id);
    const response = await apiRequest<{ 
      status?: number; 
      data?: Array<{ fileId: number; downloadCount: number }>; 
      error?: string 
    }>('/analytics/download/multiple', {
      method: 'POST',
      data: { fileIds: numericFileIds },
    });

    if (response.error) {
      return { error: response.error };
    }

    if (response.status === 200 && response.data) {
      return { data: response.data };
    }

    return { error: 'ไม่สามารถดึงข้อมูลจำนวนการดาวน์โหลดได้' };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'ไม่สามารถดึงข้อมูลจำนวนการดาวน์โหลดได้',
    };
  }
}
