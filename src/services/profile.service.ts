// Profile service

import { apiRequest } from '@/lib/api';

export interface UserProfileData {
  uuid: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  bio: string | null;
  userRole: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatarUrl?: string | null;
}

// Get user profile information
export async function getProfile(): Promise<{ profile?: UserProfileData; error?: string }> {
  try {
    const response = await apiRequest<{
      success?: boolean;
      profile?: UserProfileData;
      error?: string;
    }>('/profile', {
      method: 'GET',
    });

    if (response.error) {
      return { error: response.error };
    }

    if (response.success && response.profile) {
      return { profile: response.profile };
    }

    return {
      error: 'ไม่สามารถดึงข้อมูลโปรไฟล์ได้',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'ไม่สามารถดึงข้อมูลโปรไฟล์ได้';
    return {
      error: errorMessage,
    };
  }
}

// Update user profile
export async function updateProfile(
  data: UpdateProfileData
): Promise<{ profile?: UserProfileData; error?: string; message?: string }> {
  try {
    const response = await apiRequest<{
      success?: boolean;
      profile?: UserProfileData;
      error?: string;
      message?: string;
    }>('/profile', {
      method: 'PUT',
      data,
    });

    if (response.error) {
      return { error: response.error };
    }

    if (response.success && response.profile) {
      return { 
        profile: response.profile,
        message: response.message || 'อัปเดตโปรไฟล์สำเร็จ'
      };
    }

    return {
      error: 'ไม่สามารถอัปเดตโปรไฟล์ได้',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'ไม่สามารถอัปเดตโปรไฟล์ได้';
    return {
      error: errorMessage,
    };
  }
}

// Upload avatar image
export async function uploadAvatar(
  file: File
): Promise<{ profile?: UserProfileData; error?: string; message?: string }> {
  try {
    // Validate file
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    if (file.size > MAX_FILE_SIZE) {
      return {
        error: 'ขนาดไฟล์ต้องไม่เกิน 10MB',
      };
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        error: 'รองรับเฉพาะไฟล์ JPEG, PNG, WebP และ GIF เท่านั้น',
      };
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await apiRequest<{
      success?: boolean;
      profile?: UserProfileData;
      error?: string;
      message?: string;
    }>('/profile/avatar/upload', {
      method: 'POST',
      data: formData,
      isFormData: true,
    });

    if (response.error) {
      return { error: response.error };
    }

    if (response.success && response.profile) {
      return {
        profile: response.profile,
        message: response.message || 'อัปโหลดรูปโปรไฟล์สำเร็จ',
      };
    }

    return {
      error: 'ไม่สามารถอัปโหลดรูปโปรไฟล์ได้',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'ไม่สามารถอัปโหลดรูปโปรไฟล์ได้';
    return {
      error: errorMessage,
    };
  }
}
