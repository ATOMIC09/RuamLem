import {
  getAllUsers,
  deleteUser,
  updateUserRole,
  deletePostAsAdmin
} from "../repositories/admin-repo";
import { isModerationEnabled } from "../ai/client";
import { listQueue } from "../repositories/moderation-repo";
import { approveItem, rejectItem } from "../services/ai/moderation-actions";

/**
 * Get all users (admin only)
 */
export async function getAllUsersController() {
  try {
    const users = await getAllUsers();
    return { success: true, data: users };
  } catch (err: any) {
    console.error("Error in getAllUsersController:", err);
    return { error: err.message || "Failed to get users" };
  }
}

/**
 * Delete a user (admin only)
 */
export async function deleteUserController(userId: string) {
  try {
    if (!userId) {
      return { error: "User ID is required" };
    }

    await deleteUser(userId);
    return { success: true, message: "User deleted successfully" };
  } catch (err: any) {
    console.error("Error in deleteUserController:", err);
    return { error: err.message || "Failed to delete user" };
  }
}

/**
 * Update user role (admin only)
 */
export async function updateUserRoleController(userId: string, role: 'user' | 'admin') {
  try {
    if (!userId) {
      return { error: "User ID is required" };
    }

    if (!role || (role !== 'user' && role !== 'admin')) {
      return { error: "Valid role (user or admin) is required" };
    }

    await updateUserRole(userId, role);
    return { success: true, message: "User role updated successfully" };
  } catch (err: any) {
    console.error("Error in updateUserRoleController:", err);
    return { error: err.message || "Failed to update user role" };
  }
}

/**
 * Delete any post as admin
 */
export async function deletePostAsAdminController(postId: number) {
  try {
    if (!postId) {
      return { error: "Post ID is required" };
    }

    await deletePostAsAdmin(postId);
    return { success: true, message: "Post deleted successfully" };
  } catch (err: any) {
    console.error("Error in deletePostAsAdminController:", err);
    return { error: err.message || "Failed to delete post" };
  }
}

/**
 * Moderation queue: held items (appealed ones first) with the AI's reason (admin only)
 */
export async function getModerationQueueController() {
  try {
    // With moderation off nothing is ever held, so the queue is simply reported as off.
    if (!isModerationEnabled()) return { success: true, enabled: false, data: [] };

    return { success: true, enabled: true, data: await listQueue() };
  } catch (err: any) {
    console.error("Error in getModerationQueueController:", err);
    return { error: err.message || "Failed to load the moderation queue" };
  }
}

/**
 * Approve or reject one held item. Both are written to the audit log under the admin's id.
 */
export async function moderationDecisionController(
  adminId: string,
  type: string,
  idText: string,
  decision: "approve" | "reject"
) {
  try {
    const id = parseInt(idText);
    if ((type !== "post" && type !== "comment") || isNaN(id)) {
      return { status: 400, error: "Invalid item" };
    }

    const result =
      decision === "approve" ? await approveItem(adminId, type, id) : await rejectItem(adminId, type, id);
    if (!result.ok) return { status: result.code, error: result.message };

    return { success: true, status: result.status };
  } catch (err: any) {
    console.error("Error in moderationDecisionController:", err);
    return { error: err.message || "Failed to save the decision" };
  }
}
