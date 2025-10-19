import Elysia, { t } from "elysia";
import {
  uploadPost,
  uploadComment,
  getPost,
  getPostAfter,
  getPostFilter,
  getComment,
  getPostById,
  getAllTags,
  editPost,
  deletePost
} from "../repositories/post-repo";
import { supabase } from "../supabase";

export const post = async ({ body, request }: any) => {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      throw new Error("No authorization token provided");
    }

    const { data: user, error } = await supabase.auth.getClaims(token);
    if (error || !user) {
      throw new Error("Invalid session");
    }
    const userId = user.claims.sub;

    if (!userId) {
      throw new Error("Invalid user ID from token");
    }

    const { title, body: postBody, tag } = body;

    const result = await uploadPost(userId, title, postBody, tag);
    return result;
  } catch (err: any) {
    return { status: 401, message: err.message };
  }
};

export const comment = async ({ body, request }: any) => {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      throw new Error("No authorization token provided");
    }

    const { data: user, error } = await supabase.auth.getClaims(token);
    if (error || !user) {
      throw new Error("Invalid session");
    }
    const userId = user.claims.sub;

    if (!userId) {
      throw new Error("Invalid user ID from token");
    }

    const { postId, body: commentBody } = body;

    const result = await uploadComment(userId, postId, commentBody);
    return result;
  } catch (err: any) {
    return { status: 401, message: err.message };
  }
};

export const getPostController = async ({ body }: any) => {
  try {
    const { count = 10 } = body;
    const result = await getPost(count);
    return result;
  } catch (err: any) {
    return { status: 500, message: err.message };
  }
};

export const getPostAfterController = async ({ body }: any) => {
  try {
    const { lastId, count = 10 } = body;
    if (!lastId) {
      throw new Error("lastId is required");
    }

    const result = await getPostAfter(lastId, count);
    return result;
  } catch (err: any) {
    return { status: 400, message: err.message };
  }
};

export const getPostFilterController = async ({ body }: any) => {
  try {
    const { tags, count = 10 } = body;
    if (!tags) {
      throw new Error("tags parameter is required");
    }

    const result = await getPostFilter(tags, count);
    return result;
  } catch (err: any) {
    return { status: 400, message: err.message };
  }
};

export const getCommentController = async ({ body }: any) => {
  try {
    const { postId } = body;
    if (!postId) {
      throw new Error("postId is required");
    }

    const result = await getComment(postId);
    return result;
  } catch (err: any) {
    return { status: 400, message: err.message };
  }
};

export const getTagsController = async () => {
  try {
    const result = await getAllTags();
    return result;
  } catch (err: any) {
    return { status: 500, message: err.message };
  }
};

export const editPostController = async ({ body, request, params }: any) => {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      throw new Error("No authorization token provided");
    }

    const { data: user, error } = await supabase.auth.getClaims(token);
    if (error || !user) {
      throw new Error("Invalid session");
    }
    const userId = user.claims.sub;

    if (!userId) {
      throw new Error("Invalid user ID from token");
    }

    const postId = parseInt(params.postId);
    if (isNaN(postId)) {
      throw new Error("Invalid post ID");
    }

    const { title, body: postBody, tag } = body;

    const result = await editPost(userId, postId, title, postBody, tag);
    return result;
  } catch (err: any) {
    return { status: 401, message: err.message };
  }
};

export const deletePostController = async ({ request, params }: any) => {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      throw new Error("No authorization token provided");
    }

    const { data: user, error } = await supabase.auth.getClaims(token);
    if (error || !user) {
      throw new Error("Invalid session");
    }
    const userId = user.claims.sub;

    if (!userId) {
      throw new Error("Invalid user ID from token");
    }

    const postId = parseInt(params.postId);
    if (isNaN(postId)) {
      throw new Error("Invalid post ID");
    }

    const result = await deletePost(userId, postId);
    return result;
  } catch (err: any) {
    return { status: 401, message: err.message };
  }
};

export const getPostByIdController = async ({ body }: any) => {
  try {
    const { postId } = body;
    if (!postId) {
      throw new Error("postId is required");
    }

    const result = await getPostById(postId);
    return result;
  } catch (err: any) {
    return { status: 400, message: err.message };
  }
};
