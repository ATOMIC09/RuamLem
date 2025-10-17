// Post service

import { apiRequest, getAuthHeaders } from '@/lib/api';

export interface CreatePostData {
  title: string;
  body: string;
  tag: string;
  pdf: File;
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
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('body', data.body);
    formData.append('tag', data.tag);
    formData.append('pdf', data.pdf);

    const response = await apiRequest<{ post?: Post; error?: string }>('/post', {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
      },
      body: formData,
    });

    return response;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'การสร้างโพสต์ล้มเหลว',
    };
  }
}

export async function getPosts(count: number = 10): Promise<{ posts?: Post[]; error?: string }> {
  try {
    const response = await apiRequest<{ posts?: Post[]; error?: string }>('/getPost', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ count }),
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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tags, count }),
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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lastId, count }),
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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ postId }),
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
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });

    return response;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'การสร้างคอมเมนต์ล้มเหลว',
    };
  }
}
