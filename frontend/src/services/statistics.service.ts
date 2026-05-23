// Statistics service

import { apiRequest } from '@/lib/api';

export interface Statistics {
  totalPosts: number;
  totalMembers: number;
  postsThisMonth: number;
  totalComments: number;
  totalFiles: number;
  totalLikes: number;
  totalViews: number;
  totalDownloads: number;
}

export async function getStatistics(): Promise<{ stats?: Statistics; error?: string }> {
  try {
    const response = await apiRequest<{ status: number; data?: Statistics; error?: string }>('/stats', {
      method: 'GET',
    });

    if (response.error) {
      return { error: response.error };
    }

    if (response.data) {
      return { stats: response.data };
    }

    return {
      error: 'ไม่สามารถดึงข้อมูลสถิติได้',
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'ไม่สามารถดึงข้อมูลสถิติได้',
    };
  }
}
