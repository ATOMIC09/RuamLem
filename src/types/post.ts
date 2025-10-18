// Types for the post system
export interface PostAuthor {
  name: string;
  avatar?: string;
}

export interface PostAttachment {
  name: string;
  size: string;
  type: string;
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