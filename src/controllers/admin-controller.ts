import {
  getAllUsers,
  deleteUser,
  updateUserRole,
  deletePostAsAdmin
} from "../repositories/admin-repo";

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
