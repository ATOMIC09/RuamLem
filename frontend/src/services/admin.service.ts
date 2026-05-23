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
