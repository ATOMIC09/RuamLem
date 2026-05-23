// Like service

import { apiRequest } from '@/lib/api';

export interface LikeStatusResponse {
  isLiked: boolean;
  likeCount: number;
}

/**
 * Toggle like on a post (like if not liked, unlike if already liked)
 */
export async function togglePostLike(postId: number): Promise<{ data?: LikeStatusResponse; error?: string }> {
  try {
    const response = await apiRequest<{ status?: number; data?: LikeStatusResponse; error?: string }>('/like/toggle', {
      method: 'POST',
      data: { postId },
    });

    if (response.error) {
      return { error: response.error };
    }

    if (response.status === 200 && response.data) {
      return { data: response.data };
    }

    return { error: 'ไม่สามารถกดไลค์ได้' };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'ไม่สามารถกดไลค์ได้',
    };
  }
}

/**
 * Get like status for a post
 */
export async function getPostLikeStatus(postId: number): Promise<{ data?: LikeStatusResponse; error?: string }> {
  try {
    const response = await apiRequest<{ status?: number; data?: LikeStatusResponse; error?: string }>('/like/status', {
      method: 'POST',
      data: { postId },
    });

    if (response.error) {
      return { error: response.error };
    }

    if (response.status === 200 && response.data) {
      return { data: response.data };
    }

    return { error: 'ไม่สามารถดึงข้อมูลไลค์ได้' };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'ไม่สามารถดึงข้อมูลไลค์ได้',
    };
  }
}

/**
 * Get like counts for multiple posts
 */
export async function getMultiplePostLikes(postIds: number[]): Promise<{ 
  data?: Array<{ postId: number; likeCount: number }>; 
  error?: string 
}> {
  try {
    const response = await apiRequest<{ 
      status?: number; 
      data?: Array<{ postId: number; likeCount: number }>; 
      error?: string 
    }>('/like/multiple', {
      method: 'POST',
      data: { postIds },
    });

    if (response.error) {
      return { error: response.error };
    }

    if (response.status === 200 && response.data) {
      return { data: response.data };
    }

    return { error: 'ไม่สามารถดึงข้อมูลไลค์ได้' };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'ไม่สามารถดึงข้อมูลไลค์ได้',
    };
  }
}
