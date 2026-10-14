import { supabase } from "../supabase";

/**
 * Get all users with their email address and post and comment counts.
 * The emails live in auth.users, so this goes through a database function that only admins may call.
 */
export async function getAllUsers() {
  try {
    const { data, error } = await supabase.rpc("admin_list_users");
    if (error) throw error;

    return ((data ?? []) as any[]).map((user) => ({
      uuid: user.uuid,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email ?? null,
      avatarUrl: user.avatar_url,
      bio: user.bio,
      userRole: user.user_role,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      postCount: Number(user.post_count ?? 0),
      commentCount: Number(user.comment_count ?? 0),
    }));
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
    // A database function (admin only) deletes the account, and the database cascades from there.
    const { error: authError } = await supabase.rpc("admin_delete_user", { p_user_id: userId });
    
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
    // Remove the post's files from storage first (a plain delete only removes the database rows).
    const { data: files } = await supabase.from("files").select("file_url").eq("post_id", postId);
    const objectNames = (files ?? []).map((f: any) => f.file_url).filter(Boolean);
    if (objectNames.length > 0) {
      const { error: storageError } = await supabase.storage.from("exams").remove(objectNames);
      if (storageError) console.error("Storage deletion error:", storageError);
    }

    // The database then cascades to comments, likes, files rows, tag links and the search index.
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
