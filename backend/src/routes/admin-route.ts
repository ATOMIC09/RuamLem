import { Elysia, t } from "elysia";
import { supabase } from "../supabase";
import {
  getAllUsersController,
  deleteUserController,
  updateUserRoleController,
  deletePostAsAdminController
} from "../controllers/admin-controller";

/**
 * Middleware to check if user is admin
 */
async function checkAdminRole(token: string): Promise<{ isAdmin: boolean; userId?: string; error?: string }> {
  try {
    const { data: user, error } = await supabase.auth.getClaims(token);
    
    if (error || !user) {
      return { isAdmin: false, error: "Invalid token" };
    }

    const userId = user.claims.sub;

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_role")
      .eq("uuid", userId)
      .single();

    if (profileError || !profile) {
      return { isAdmin: false, error: "Profile not found" };
    }

    if (profile.user_role !== 'admin') {
      return { isAdmin: false, error: "Access denied. Admin role required." };
    }

    return { isAdmin: true, userId };
  } catch (err: any) {
    return { isAdmin: false, error: err.message };
  }
}

export const adminRoute = (app: Elysia) => {
  
  /**
   * Get all users (admin only)
   */
  app.get("/admin/users", async (c) => {
    const authHeader = c.request.headers.get("authorization");
    if (!authHeader) return { status: 401, message: "No token provided" };
    
    const token = authHeader.split(" ")[1];
    const authCheck = await checkAdminRole(token);

    if (!authCheck.isAdmin) {
      return { status: 403, error: authCheck.error || "Access denied" };
    }

    try {
      return getAllUsersController();
    } catch (err: any) {
      return { status: 500, error: err.message };
    }
  }, {
    detail: {
      tags: ['Admin'],
      summary: 'Get All Users',
      description: 'Get all users with their details (admin only)',
      security: [{ bearerAuth: [] }]
    }
  });

  /**
   * Delete a user (admin only)
   */
  app.delete("/admin/users/:userId", async (c) => {
    const authHeader = c.request.headers.get("authorization");
    if (!authHeader) return { status: 401, message: "No token provided" };
    
    const token = authHeader.split(" ")[1];
    const authCheck = await checkAdminRole(token);

    if (!authCheck.isAdmin) {
      return { status: 403, error: authCheck.error || "Access denied" };
    }

    try {
      const { userId } = c.params;
      return deleteUserController(userId);
    } catch (err: any) {
      return { status: 500, error: err.message };
    }
  }, {
    params: t.Object({
      userId: t.String({ description: "User UUID to delete" })
    }),
    detail: {
      tags: ['Admin'],
      summary: 'Delete User',
      description: 'Delete a user and all their data (admin only)',
      security: [{ bearerAuth: [] }]
    }
  });

  /**
   * Update user role (admin only)
   */
  app.put("/admin/users/:userId/role", async (c) => {
    const authHeader = c.request.headers.get("authorization");
    if (!authHeader) return { status: 401, message: "No token provided" };
    
    const token = authHeader.split(" ")[1];
    const authCheck = await checkAdminRole(token);

    if (!authCheck.isAdmin) {
      return { status: 403, error: authCheck.error || "Access denied" };
    }

    try {
      const { userId } = c.params;
      const body = c.body as any;
      
      if (!body.role) {
        return { status: 400, error: "Role is required" };
      }

      return updateUserRoleController(userId, body.role);
    } catch (err: any) {
      return { status: 500, error: err.message };
    }
  }, {
    params: t.Object({
      userId: t.String({ description: "User UUID" })
    }),
    body: t.Object({
      role: t.Union([t.Literal('user'), t.Literal('admin')], { 
        description: "User role (user or admin)" 
      })
    }),
    detail: {
      tags: ['Admin'],
      summary: 'Update User Role',
      description: 'Update user role to admin or regular user (admin only)',
      security: [{ bearerAuth: [] }]
    }
  });

  /**
   * Delete any post (admin only)
   */
  app.delete("/admin/posts/:postId", async (c) => {
    const authHeader = c.request.headers.get("authorization");
    if (!authHeader) return { status: 401, message: "No token provided" };
    
    const token = authHeader.split(" ")[1];
    const authCheck = await checkAdminRole(token);

    if (!authCheck.isAdmin) {
      return { status: 403, error: authCheck.error || "Access denied" };
    }

    try {
      const { postId } = c.params;
      const postIdNum = parseInt(postId);
      
      if (isNaN(postIdNum)) {
        return { status: 400, error: "Invalid post ID" };
      }

      return deletePostAsAdminController(postIdNum);
    } catch (err: any) {
      return { status: 500, error: err.message };
    }
  }, {
    params: t.Object({
      postId: t.String({ description: "Post ID to delete" })
    }),
    detail: {
      tags: ['Admin'],
      summary: 'Delete Post (Admin)',
      description: 'Delete any post regardless of ownership (admin only)',
      security: [{ bearerAuth: [] }]
    }
  });

  return app;
};
