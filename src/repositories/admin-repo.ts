import { supabase } from "../supabase";

/**
 * Get all users with their post and comment counts
 */
export async function getAllUsers() {
  try {
    const { data: users, error } = await supabase
      .from("profiles")
      .select(`
        uuid,
        first_name,
        last_name,
        bio,
        avatar_url,
        user_role,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get user emails from auth.users (requires service role)
    const usersWithEmails = await Promise.all(
      (users || []).map(async (user) => {
        try {
          const { data: authUser } = await supabase.auth.admin.getUserById(user.uuid);
          
          // Get post count
          const { count: postCount } = await supabase
            .from("posts")
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.uuid);

          // Get comment count
          const { count: commentCount } = await supabase
            .from("comments")
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.uuid);

          return {
            uuid: user.uuid,
            firstName: user.first_name,
            lastName: user.last_name,
            email: authUser?.user?.email || null,
            avatarUrl: user.avatar_url,
            bio: user.bio,
            userRole: user.user_role,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
            postCount: postCount || 0,
            commentCount: commentCount || 0
          };
        } catch (err) {
          console.error(`Error fetching data for user ${user.uuid}:`, err);
          return {
            uuid: user.uuid,
            firstName: user.first_name,
            lastName: user.last_name,
            email: null,
            avatarUrl: user.avatar_url,
            bio: user.bio,
            userRole: user.user_role,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
            postCount: 0,
            commentCount: 0
          };
        }
      })
    );

    return usersWithEmails;
  } catch (err) {
    console.error("Error getting all users:", err);
    throw err;
  }
}

/**
 * Delete a user (admin only)
 * This will cascade delete all user's posts, comments, likes, etc.
 */
export async function deleteUser(userId: string) {
  try {
    // First delete from auth.users (this will cascade to profile via RLS)
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    
    if (authError) throw authError;

    // Profile, posts, comments, likes, analytics, etc. should be cascade deleted by database constraints
    return { success: true };
  } catch (err) {
    console.error("Error deleting user:", err);
    throw err;
  }
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(userId: string, role: 'user' | 'admin') {
  try {
    // Map frontend role to backend role enum
    const backendRole = role === 'admin' ? 'admin' : 'member';
    
    const { error } = await supabase
      .from("profiles")
      .update({ user_role: backendRole })
      .eq('uuid', userId);

    if (error) throw error;

    return { success: true };
  } catch (err) {
    console.error("Error updating user role:", err);
    throw err;
  }
}

/**
 * Delete any post as admin
 */
export async function deletePostAsAdmin(postId: number) {
  try {
    // Delete post (this should cascade delete comments, likes, analytics, files, etc.)
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq('id', postId);

    if (error) throw error;

    return { success: true };
  } catch (err) {
    console.error("Error deleting post as admin:", err);
    throw err;
  }
}
