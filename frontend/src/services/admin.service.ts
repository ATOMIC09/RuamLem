// Admin service - functions for admin users only

import { apiRequest } from '@/lib/api';

export interface User {
  uuid: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  userRole: string;
  createdAt: string;
  updatedAt: string;
  postCount?: number;
  commentCount?: number;
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers(): Promise<{ users?: User[]; error?: string }> {
  try {
    const response = await apiRequest<{ 
      status?: number;
      data?: User[];
      users?: User[];
      error?: string 
    }>('/admin/users', {
      method: 'GET',
    });

    if (response.error) {
      return { error: response.error };
    }

    if (response.data) {
      return { users: response.data };
    }

    if (response.users) {
      return { users: response.users };
    }

    return { error: 'ไม่สามารถดึงข้อมูลสมาชิกได้' };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'ไม่สามารถดึงข้อมูลสมาชิกได้',
    };
  }
}

/**
 * Delete a user (admin only)
 */
export async function deleteUser(userId: string): Promise<{ success?: boolean; message?: string; error?: string }> {
  try {
    const response = await apiRequest<{ 
      status?: number;
      success?: boolean;
      message?: string;
      error?: string 
    }>(`/admin/users/${userId}`, {
      method: 'DELETE',
    });

    if (response.error) {
      return { error: response.error };
    }

    if (response.status === 200 || response.success) {
      return {
        success: true,
        message: response.message || 'ลบสมาชิกสำเร็จ',
      };
    }

    return { error: 'ไม่สามารถลบสมาชิกได้' };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'ไม่สามารถลบสมาชิกได้',
    };
  }
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(
  userId: string, 
  role: 'user' | 'admin'
): Promise<{ success?: boolean; message?: string; error?: string }> {
  try {
    const response = await apiRequest<{ 
      status?: number;
      success?: boolean;
      message?: string;
      error?: string 
    }>(`/admin/users/${userId}/role`, {
      method: 'PUT',
      data: { role },
    });

    if (response.error) {
      return { error: response.error };
    }

    if (response.status === 200 || response.success) {
      return {
        success: true,
        message: response.message || 'อัปเดตสิทธิ์สำเร็จ',
      };
    }

    return { error: 'ไม่สามารถอัปเดตสิทธิ์ได้' };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'ไม่สามารถอัปเดตสิทธิ์ได้',
    };
  }
}

/**
 * Delete any post (admin only)
 * Falls back to regular post delete endpoint if admin endpoint not available
 */
export async function deletePostAsAdmin(postId: number): Promise<{ success?: boolean; message?: string; error?: string }> {
  try {
    // Try admin endpoint first
    let response = await apiRequest<{ 
      status?: number;
      success?: boolean;
      message?: string;
      error?: string 
    }>(`/admin/posts/${postId}`, {
      method: 'DELETE',
    });

    // If admin endpoint not available, try regular post delete endpoint
    if (response.error && response.error.includes('404')) {
      response = await apiRequest<{ 
        status?: number;
        success?: boolean;
        message?: string;
        error?: string 
      }>(`/post/${postId}`, {
        method: 'DELETE',
      });
    }

    if (response.error) {
      return { error: response.error };
    }

    if (response.status === 200 || response.success) {
      return {
        success: true,
        message: response.message || 'ลบโพสต์สำเร็จ',
      };
    }

    return { error: 'ไม่สามารถลบโพสต์ได้' };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'ไม่สามารถลบโพสต์ได้',
    };
  }
}

export interface ModerationQueueItem {
  type: 'post' | 'comment';
  id: number;
  postId: number | null;
  title: string | null;
  body: string;
  tags: string[];
  files: Array<{ name: string; size: number }>;
  reason: string | null;
  detail: string | null;
  appealed: boolean;
  author: { id: string; name: string };
  createdAt: string;
}

/**
 * Held posts and comments waiting for an admin, appealed ones first (admin only).
 * `enabled` is false while AI moderation is switched off.
 */
export async function getModerationQueue(): Promise<{ enabled?: boolean; items?: ModerationQueueItem[]; error?: string }> {
  try {
    const response = await apiRequest<{ success?: boolean; enabled?: boolean; data?: ModerationQueueItem[]; error?: string }>('/admin/moderation', {
      method: 'GET',
    });

    if (response.error) {
      return { error: response.error };
    }
    return { enabled: response.enabled, items: response.data ?? [] };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'ไม่สามารถดึงรายการรอตรวจสอบได้',
    };
  }
}

/**
 * Approve (publish) or reject one held item. Both are recorded in the audit log under the admin.
 */
export async function decideModeration(
  type: 'post' | 'comment',
  id: number,
  decision: 'approve' | 'reject'
): Promise<{ success?: boolean; error?: string }> {
  try {
    const response = await apiRequest<{ success?: boolean; status?: number | string; error?: string }>(
      `/admin/moderation/${type}/${id}/${decision}`,
      { method: 'POST' }
    );

    if (response.error) {
      return { error: response.error };
    }
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'ไม่สามารถบันทึกการตัดสินใจได้',
    };
  }
}

export interface TokenBreakdown {
  requests: number;
  promptTokens: number;
  completionTokens: number;
  embeddingTokens: number;
  totalTokens: number;
  /** Estimated cost in `currency`; null when no price is configured on the server. */
  cost: number | null;
}

export type AiFeature = 'ask' | 'moderation' | 'embedding';

export interface AiUsageSummary {
  since: string;
  days: number;
  rowsStored: number;
  oldestRow: string | null;
  currency: string;
  pricesConfigured: boolean;
  totals: TokenBreakdown & { problems: number; avgLatencyMs: number; activeUsers: number };
  byFeature: Array<TokenBreakdown & { feature: AiFeature }>;
  byDay: Array<TokenBreakdown & { day: string }>;
  topUsers: Array<TokenBreakdown & { userId: string; name: string | null; email: string | null; lastUsed: string }>;
}

/**
 * AI usage for the last `days` Thai calendar days: tokens, requests and an estimated cost (admin only).
 */
export async function getAiUsage(days: number): Promise<{ summary?: AiUsageSummary; error?: string }> {
  try {
    const response = await apiRequest<{ success?: boolean; data?: AiUsageSummary; error?: string }>('/admin/ai-usage', {
      method: 'GET',
      params: { days },
    });

    if (response.error) {
      return { error: response.error };
    }
    if (!response.data) {
      return { error: 'ไม่สามารถดึงข้อมูลการใช้งาน AI ได้' };
    }
    return { summary: response.data };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'ไม่สามารถดึงข้อมูลการใช้งาน AI ได้',
    };
  }
}
