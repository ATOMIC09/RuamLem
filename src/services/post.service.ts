// Post service

import { apiRequest } from '@/lib/api';

export interface Tag {
  id: number;
  name: string;
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
    avatarUrl?: string | null;
  };
  file?: {
    id: number;
    file_name: string;
    file_url: string;
    file_size: number;
  };
  attachments?: Array<{
    id: number;
    file_name: string;
    file_url: string;
    file_size: number;
  }>;
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
  body: string;
  post_id: number;
  user_id: string;
  created_at: string;
  updated_at: string;
  user_info?: {
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  };
  // For backward compatibility
  author?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt?: string;
}

export async function createPost(data: CreatePostData): Promise<{ post?: Post; error?: string }> {
  try {
    console.log('📝 Creating post with data:', {
      title: data.title,
      body: data.body,
      tags: data.tags,
      filesCount: data.files?.length || 0
    });

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

    // Step 1: Create post without files first
    console.log('📡 Step 1: Creating post without files');
    const postResponse = await apiRequest<{ post?: Post; data?: Post; postId?: number; tagId?: number; error?: string; success?: boolean; message?: string; status?: number }>('/post', {
      method: 'POST',
      data: {
        title: data.title,
        body: data.body,
        tag: data.tags.join(','),
      },
    });

    console.log('📡 Post creation response:', postResponse);

    // Handle errors from post creation
    if (postResponse.error) {
      console.error('❌ Error creating post:', postResponse.error);
      return { error: postResponse.error };
    }

    // Get the post ID from the response
    // Backend returns { status: 200, postId: 24, tagId: 11 }
    let postId: number | undefined;
    
    if (postResponse.postId) {
      postId = postResponse.postId;
    } else if (postResponse.post?.id) {
      postId = postResponse.post.id;
    } else if (postResponse.data?.id) {
      postId = postResponse.data.id;
    }

    if (!postId) {
      console.error('❌ No post ID returned from response:', postResponse);
      return { error: 'ไม่สามารถสร้างโพสต์ได้ - ไม่มี Post ID' };
    }

    console.log('✅ Post created with ID:', postId);

    // Step 2: Upload files one by one to the created post
    console.log('📡 Step 2: Uploading files');
    for (let i = 0; i < data.files.length; i++) {
      const file = data.files[i];
      console.log(`📎 Uploading file ${i + 1}/${data.files.length}:`, file.name);

      const uploadResult = await uploadFileToPost(file, postId);
      
      if (uploadResult.error) {
        console.error(`❌ Failed to upload file ${file.name}:`, uploadResult.error);
        // Return error but note that post was created
        return { 
          error: `โพสต์ถูกสร้างแล้ว แต่การอัปโหลดไฟล์ ${file.name} ล้มเหลว: ${uploadResult.error}` 
        };
      }

      console.log(`✅ File ${i + 1}/${data.files.length} uploaded successfully`);
    }

    console.log('✅ All files uploaded successfully');
    
    // Create a post object to return
    const createdPost: Post = {
      id: postId,
      title: data.title,
      body: data.body,
      tag: data.tags[0],
    };
    
    return { post: createdPost };
  } catch (error) {
    console.error('❌ Exception in createPost:', error);
    const errorMessage = error instanceof Error ? error.message : 'การสร้างโพสต์ล้มเหลว';
    return {
      error: errorMessage,
    };
  }
}

export async function getPosts(count: number = 10): Promise<{ posts?: Post[]; error?: string }> {
  try {
    const response = await apiRequest<{ status: number; data?: Post[]; error?: string }>('/post/getPost', {
      method: 'POST',
      data: { count },
    });

    // Backend returns { status: 200, data: [...] }
    if (response.data && Array.isArray(response.data)) {
      return { posts: response.data };
    }

    const errorMsg = response.error || 'การดึงข้อมูลโพสต์ล้มเหลว';
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
    const response = await apiRequest<{ posts?: Post[]; error?: string }>('/post/getPostFilter', {
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
    const response = await apiRequest<{ posts?: Post[]; error?: string }>('/post/getPostAfter', {
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

export async function getPost(postId: number): Promise<{ post?: Post; error?: string }> {
  try {
    const response = await apiRequest<{ status?: number; data?: Post; error?: string }>('/post/id', {
      method: 'POST',
      data: {
        postId,
      },
    });

    if (response.error) {
      return { error: response.error };
    }

    // Handle the nested data structure from the API response
    const postData = response.data;
    if (postData && postData.id) {
      // Map tags array to tag field if needed
      const post: Post = {
        ...postData,
        tag: postData.tags?.[0]?.name || postData.tag,
      };
      return { post };
    }

    return { error: 'ไม่พบโพสต์' };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'ไม่สามารถดึงข้อมูลโพสต์ได้',
    };
  }
}

export async function getComments(postId: number): Promise<{ comments?: Comment[]; error?: string }> {
  try {
    const response = await apiRequest<{ status?: number; data?: Comment[]; error?: string }>('/post/getComment', {
      method: 'POST',
      data: { postId },
    });

    // Backend returns { status: 200, data: [...] }
    if (response.data && Array.isArray(response.data)) {
      return { comments: response.data };
    }

    if (response.error) {
      return { error: response.error };
    }

    return {
      error: 'การดึงข้อมูลคอมเมนต์ล้มเหลว',
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'การดึงข้อมูลคอมเมนต์ล้มเหลว',
    };
  }
}

export async function createComment(data: CreateCommentData): Promise<{ comment?: Comment; error?: string }> {
  try {
    // Transform the data to match backend API expectations
    const requestData = {
      postId: data.post_id,
      body: data.post_body,
    };
    
    const response = await apiRequest<{ status?: number; message?: Comment | string; error?: string }>('/post/comment', {
      method: 'POST',
      data: requestData,
    });

    // Check for error status in response body (even if HTTP 200)
    if (response.status && response.status >= 400) {
      const errorMsg = typeof response.message === 'string' ? response.message : (response.error || 'การสร้างคอมเมนต์ล้มเหลว');
      return { error: errorMsg };
    }

    // Backend returns { status: 200, message: {...} } on success
    if (response.message && typeof response.message === 'object' && 'id' in response.message) {
      return { comment: response.message as Comment };
    }

    if (response.error) {
      return { error: response.error };
    }

    return {
      error: 'การสร้างคอมเมนต์ล้มเหลว',
    };
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
    const response = await apiRequest<{ status: number; data?: Tag[] }>('/post/tags', {
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

export async function updatePost(postId: number, title: string, body: string, tag: string): Promise<{ success?: boolean; message?: string; error?: string }> {
  try {
    const response = await apiRequest<{ success?: boolean; message?: string; error?: string }>(`/post/${postId}`, {
      method: 'PUT',
      data: {
        title,
        body,
        tag,
      },
    });

    // Check for error in response
    if (response.error) {
      return { error: response.error };
    }

    // Check if backend returned success flag
    if (response.success) {
      return { success: true, message: response.message || 'แก้ไขโพสต์สำเร็จ' };
    }

    return { success: true, message: response.message || 'แก้ไขโพสต์สำเร็จ' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'แก้ไขโพสต์ล้มเหลว';
    return {
      error: errorMessage,
    };
  }
}

export async function uploadFileToPost(file: File, postId: number): Promise<{ file?: { id: number; file_name: string; file_url: string; file_size: number }; error?: string }> {
  try {
    // Validate file size - max 50MB per file
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_FILE_SIZE) {
      return {
        error: `ไฟล์ ${file.name} มีขนาดเกิน 50MB`,
      };
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await apiRequest<{ success?: boolean; status?: number; file?: { id: number; file_name: string; file_url: string; file_size: number }; message?: string; error?: string }>(`/upload/file/post/${postId}`, {
      method: 'POST',
      data: formData,
      isFormData: true,
    });

    if (response.error) {
      return { error: response.error };
    }

    if (!response.success || response.status !== 200) {
      return { error: response.message || 'การอัปโหลดไฟล์ล้มเหลว' };
    }

    return {
      file: response.file,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'การอัปโหลดไฟล์ล้มเหลว',
    };
  }
}

export async function deleteFile(fileId: number, postId: number): Promise<{ success?: boolean; message?: string; error?: string }> {
  try {
    const response = await apiRequest<{ success?: boolean; message?: string; error?: string }>(`/file/${fileId}`, {
      method: 'DELETE',
      data: {
        postId,
      },
    });

    if (response.error) {
      return { error: response.error };
    }

    return {
      success: response.success || true,
      message: response.message || 'ลบไฟล์สำเร็จ',
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'ลบไฟล์ล้มเหลว',
    };
  }
}

export async function deleteMultipleFiles(fileIds: number[], postId: number): Promise<{ success?: boolean; message?: string; error?: string }> {
  try {
    const response = await apiRequest<{ success?: boolean; message?: string; error?: string }>('/files', {
      method: 'DELETE',
      data: {
        fileIds,
        postId,
      },
    });

    if (response.error) {
      return { error: response.error };
    }

    return {
      success: response.success || true,
      message: response.message || 'ลบไฟล์สำเร็จ',
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'ลบไฟล์ล้มเหลว',
    };
  }
}

export async function deletePost(postId: number): Promise<{ success?: boolean; message?: string; error?: string }> {
  try {
    const response = await apiRequest<{ status?: number; message?: string; error?: string }>(`/post/${postId}`, {
      method: 'DELETE',
    });

    if (response.error) {
      return { error: response.error };
    }

    if (response.status && response.status === 200) {
      return {
        success: true,
        message: response.message || 'ลบโพสต์สำเร็จ',
      };
    }

    return {
      success: true,
      message: response.message || 'ลบโพสต์สำเร็จ',
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'ลบโพสต์ล้มเหลว',
    };
  }
}
