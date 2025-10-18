// Types for the post system
export interface PostAuthor {
  name: string;
  avatar?: string;
}

export interface PostAttachment {
  // Backend response format
  file_name?: string;
  file_url?: string;
  file_size?: number;
  // Legacy format (for backward compatibility)
  name?: string;
  size?: string;
  type?: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  author: PostAuthor;
  createdAt: string;
  category: string;
  attachments?: PostAttachment[];
  views: number;
  likes: number;
}

export interface PostPreview {
  id: string;
  title: string;
  description?: string;
  author: PostAuthor;
  createdAt: string;
  category: string;
  attachments?: PostAttachment[];
  commentCount?: number;
}