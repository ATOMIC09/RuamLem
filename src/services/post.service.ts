// Post service

import { apiRequest } from '@/lib/api';
import { removeAuthToken } from '@/lib/api';

export interface Tag {
  id: number;
  name: string;
}

// Helper function to check if error is JWT expiration
function isJWTExpired(message: string): boolean {
  return message.toLowerCase().includes('jwt') && message.toLowerCase().includes('expired');
}

// Helper function to handle JWT expiration - clear localStorage
function handleJWTExpiration(message: string): void {
  if (isJWTExpired(message)) {
    removeAuthToken();
    localStorage.removeItem('user');
  }
}

export interface CreatePostData {
  title: string;
  body: string;
  tags: string[];
  files?: File[];
}

export interface CreateCommentData {
  post_id: string;
  post_body: string;
}

export interface Post {
  id: number;
  title: string;
  body: string;
  tag?: string;
  user_id?: string;
  created_at?: string;
  createdAt?: string;
  pdfUrl?: string;
  filePath?: string;
  user_info?: {
    firstName: string;
    lastName: string;
  };
  file?: {
    id: number;
    file_name: string;
    file_url: string;
    file_size: number;
  };
  tags?: Array<{
    id: number;
    name: string;
  }>;
  comment_count?: number;
  author?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  comments?: Comment[];
}

export interface Comment {
  id: number;
  post_id: number;
  body: string;
  author: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
}

export async function createPost(data: CreatePostData): Promise<{ post?: Post; error?: string }> {
  try {
    // Validate that files are provided
    if (!data.files || data.files.length === 0) {
      return {
        error: 'กรุณาแนบไฟล์อย่างน้อยหนึ่งไฟล์',
      };
    }

    // Maximum 10 files allowed
    if (data.files.length > 10) {
      return {
        error: 'จำนวนไฟล์ต้องไม่เกิน 10 ไฟล์',
      };
    }

    // Validate each file size - max 50MB per file
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    for (const file of data.files) {
      if (file.size > MAX_FILE_SIZE) {
        return {
          error: `ไฟล์ ${file.name} มีขนาดเกิน 50MB`,
        };
      }
    }

    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('body', data.body);
    formData.append('tag', data.tags.join(','));
    
    // Backend expects the field to be named "files" and accepts multiple files
    for (const file of data.files) {
      formData.append('files', file);
    }

    const response = await apiRequest<{ post?: Post; error?: string; success?: boolean; message?: string }>('/post', {
      method: 'POST',
      data: formData,
      isFormData: true,
    });

    // Handle various response formats from backend
    if (response.error) {
      handleJWTExpiration(response.error);
      return { error: response.error };
    }

    if (!response.success && response.message) {
      handleJWTExpiration(response.message);
      return { error: response.message };
    }

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'การสร้างโพสต์ล้มเหลว';
    return {
      error: errorMessage,
    };
  }
}

export async function getPosts(count: number = 10): Promise<{ posts?: Post[]; error?: string }> {
  try {
    const response = await apiRequest<{ status: number; data?: Post[]; error?: string }>('/getPost', {
      method: 'POST',
      data: { count },
    });

    // Backend returns { status: 200, data: [...] }
    if (response.data && Array.isArray(response.data)) {
      return { posts: response.data };
    }

    const errorMsg = response.error || 'การดึงข้อมูลโพสต์ล้มเหลว';
    handleJWTExpiration(errorMsg);
    return {
      error: errorMsg,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'การดึงข้อมูลโพสต์ล้มเหลว',
    };
  }
}

export async function getPostsByTag(tags: string, count: number = 10): Promise<{ posts?: Post[]; error?: string }> {
  try {
    const response = await apiRequest<{ posts?: Post[]; error?: string }>('/getPostFilter', {
      method: 'POST',
      data: { tags, count },
    });

    return response;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'การดึงข้อมูลโพสต์ล้มเหลว',
    };
  }
}

export async function getPostsAfter(lastId: number, count: number = 10): Promise<{ posts?: Post[]; error?: string }> {
  try {
    const response = await apiRequest<{ posts?: Post[]; error?: string }>('/getPostAfter', {
      method: 'POST',
      data: { lastId, count },
    });

    return response;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'การดึงข้อมูลโพสต์ล้มเหลว',
    };
  }
}

export async function getComments(postId: number): Promise<{ comments?: Comment[]; error?: string }> {
  try {
    const response = await apiRequest<{ comments?: Comment[]; error?: string }>('/getComment', {
      method: 'POST',
      data: { postId },
    });

    return response;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'การดึงข้อมูลคอมเมนต์ล้มเหลว',
    };
  }
}

export async function createComment(data: CreateCommentData): Promise<{ comment?: Comment; error?: string }> {
  try {
    const response = await apiRequest<{ comment?: Comment; error?: string }>('/comment', {
      method: 'POST',
      data: data,
    });

    return response;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'การสร้างคอมเมนต์ล้มเหลว',
    };
  }
}

export async function getFileDownloadUrl(filename: string): Promise<{ url?: string; error?: string }> {
  try {
    const response = await apiRequest<{ success?: boolean; url?: string; error?: string }>('/download/file', {
      method: 'GET',
      params: { filename },
    });

    if (response.success && response.url) {
      return { url: response.url };
    }

    return {
      error: response.error || 'ไม่สามารถดึงลิงค์ดาวน์โหลดได้',
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'ไม่สามารถดึงลิงค์ดาวน์โหลดได้',
    };
  }
}

export async function getTags(): Promise<{ tags?: Tag[]; error?: string }> {
  try {
    const response = await apiRequest<{ status: number; data?: Tag[] }>('/tags', {
      method: 'GET',
    });

    if (response.data && Array.isArray(response.data)) {
      return { tags: response.data };
    }

    return {
      error: 'ไม่สามารถดึงข้อมูลแท็กได้',
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'ไม่สามารถดึงข้อมูลแท็กได้',
    };
  }
}
