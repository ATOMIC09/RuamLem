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
import { supabaseAuth } from "../supabase";
import { isModerationEnabled } from "../ai/client";
import { getItem, getPostTagsAndFiles, type TargetType } from "../repositories/moderation-repo";
import { queueEmbedPost, syncPostIndex } from "../services/ai/embed-service";
import { ADMIN_REJECTED, appealItem, recordAiDecision, toColumns } from "../services/ai/moderation-actions";
import { moderate } from "../services/ai/moderation-service";
import { recordModerationUsage } from "../services/ai/usage-service";
import { getOptionalViewerId } from "../utils/viewer";

// Verifies the bearer token and returns the user id (throws like the original inline checks did).
async function requireUserId(request: Request): Promise<string> {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    throw new Error("No authorization token provided");
  }

  const { data: user, error } = await supabaseAuth.auth.getClaims(token);
  if (error || !user) {
    throw new Error("Invalid session");
  }
  const userId = user.claims.sub;

  if (!userId) {
    throw new Error("Invalid user ID from token");
  }
  return userId;
}

// File names the author says are attached (they are checked again, for real, when each file is uploaded).
function cleanFileNames(names: unknown): string[] {
  if (!Array.isArray(names)) return [];
  return names.filter((n): n is string => typeof n === "string").slice(0, 10).map((n) => n.slice(0, 255));
}

export const post = async ({ body, request }: any) => {
  try {
    const userId = await requireUserId(request);

    const { title, body: postBody, tag, fileNames } = body;

    // With moderation on, the post is checked before anyone else can see it.
    const screening = isModerationEnabled()
      ? await moderate({ kind: "post", title, body: postBody, tags: [tag], fileNames: cleanFileNames(fileNames) })
      : null;

    if (screening) void recordModerationUsage(userId, screening);

    const result = await uploadPost(userId, title, postBody, tag, screening ? toColumns(screening) : undefined);

    if (result.status === 200 && "postId" in result) {
      if (screening) {
        await recordAiDecision("post", result.postId, screening);
        syncPostIndex(result.postId, screening.status, userId);
        return { ...result, moderation: { status: screening.status, reason: screening.status === "published" ? null : screening.reason } };
      }
      queueEmbedPost(result.postId, userId);
    }
    return result;
  } catch (err: any) {
    return { status: 401, message: err.message };
  }
};

export const comment = async ({ body, request }: any) => {
  try {
    const userId = await requireUserId(request);

    const { postId, body: commentBody } = body;

    const screening = isModerationEnabled() ? await moderate({ kind: "comment", body: commentBody }) : null;
    if (screening) void recordModerationUsage(userId, screening);

    const result = await uploadComment(userId, postId, commentBody, screening ? toColumns(screening) : undefined);

    if (screening && result.status === 200 && typeof result.message === "object" && result.message?.id) {
      await recordAiDecision("comment", result.message.id, screening);
      return { ...result, moderation: { status: screening.status, reason: screening.status === "published" ? null : screening.reason } };
    }
    return result;
  } catch (err: any) {
    return { status: 401, message: err.message };
  }
};

export const getPostController = async ({ body, request }: any) => {
  try {
    const { count = 10 } = body;
    const result = await getPost(count, await getOptionalViewerId(request));
    return result;
  } catch (err: any) {
    return { status: 500, message: err.message };
  }
};

export const getPostAfterController = async ({ body, request }: any) => {
  try {
    const { lastId, count = 10 } = body;
    if (!lastId) {
      throw new Error("lastId is required");
    }

    const result = await getPostAfter(lastId, count, await getOptionalViewerId(request));
    return result;
  } catch (err: any) {
    return { status: 400, message: err.message };
  }
};

export const getPostFilterController = async ({ body, request }: any) => {
  try {
    const { tags, count = 10 } = body;
    if (!tags) {
      throw new Error("tags parameter is required");
    }

    const result = await getPostFilter(tags, count, await getOptionalViewerId(request));
    return result;
  } catch (err: any) {
    return { status: 400, message: err.message };
  }
};

export const getCommentController = async ({ body, request }: any) => {
  try {
    const { postId } = body;
    if (!postId) {
      throw new Error("postId is required");
    }

    const result = await getComment(postId, await getOptionalViewerId(request));
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
    const userId = await requireUserId(request);

    const postId = parseInt(params.postId);
    if (isNaN(postId)) {
      throw new Error("Invalid post ID");
    }

    const { title, body: postBody, tag } = body;

    // An edit is moderated again, otherwise a clean post could be edited into spam.
    let screening = null;
    if (isModerationEnabled()) {
      const current = await getItem("post", postId);
      if (current && current.userId === userId) {
        // A human decision is final: the author cannot edit their way around an admin's rejection.
        if (current.status === "rejected" && current.reason === ADMIN_REJECTED) {
          return { status: 403, message: "An admin rejected this post, so it cannot be edited" };
        }
        const { fileNames } = await getPostTagsAndFiles(postId);
        screening = await moderate({ kind: "post", title, body: postBody, tags: [tag], fileNames });
        void recordModerationUsage(userId, screening);
      }
    }

    const result = await editPost(userId, postId, title, postBody, tag, screening ? toColumns(screening) : undefined);

    if (result.status === 200) {
      if (screening) {
        await recordAiDecision("post", postId, screening);
        syncPostIndex(postId, screening.status, userId);
        return { ...result, moderation: { status: screening.status, reason: screening.status === "published" ? null : screening.reason } };
      }
      queueEmbedPost(postId, userId);
    }
    return result;
  } catch (err: any) {
    return { status: 401, message: err.message };
  }
};

export const deletePostController = async ({ request, params }: any) => {
  try {
    const userId = await requireUserId(request);

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

export const getPostByIdController = async ({ body, request }: any) => {
  try {
    const { postId } = body;
    if (!postId) {
      throw new Error("postId is required");
    }

    const result = await getPostById(postId, await getOptionalViewerId(request));
    return result;
  } catch (err: any) {
    return { status: 400, message: err.message };
  }
};

// The author asks an admin to look again at something the AI rejected.
export const appealController = (type: TargetType) => async ({ request, params }: any) => {
  try {
    const userId = await requireUserId(request);
    const id = parseInt(params.id);
    if (isNaN(id)) throw new Error("Invalid id");

    if (!isModerationEnabled()) return { status: 404, message: "Moderation is not enabled" };

    const result = await appealItem(userId, type, id);
    if (!result.ok) return { status: result.code, message: result.message };
    return { status: 200, message: "Sent for review", moderation: { status: result.status, reason: result.reason } };
  } catch (err: any) {
    return { status: 401, message: err.message };
  }
};
