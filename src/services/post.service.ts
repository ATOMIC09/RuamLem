// Post service

import { apiRequest } from '@/lib/api';

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
  tag: string;
  author: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  pdfUrl?: string;
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

    // Backend only accepts a single file
    if (data.files.length > 1) {
      return {
        error: 'กรุณาแนบไฟล์เพียงหนึ่งไฟล์เท่านั้น',
      };
    }

    const file = data.files[0];
    
    // Validate file size - max 50MB
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_FILE_SIZE) {
      return {
        error: 'ขนาดไฟล์ต้องไม่เกิน 50MB',
      };
    }

    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('body', data.body);
    formData.append('tag', data.tags.join(','));
    // Backend expects the field to be named "file"
    formData.append('file', file);

    const response = await apiRequest<{ post?: Post; error?: string; success?: boolean; message?: string }>('/post', {
      method: 'POST',
      data: formData,
      isFormData: true,
    });

    // Handle various response formats from backend
    if (response.error) {
      return { error: response.error };
    }

    if (!response.success && response.message) {
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
    const response = await apiRequest<{ posts?: Post[]; error?: string }>('/getPost', {
      method: 'POST',
      data: { count },
    });

    return response;
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
