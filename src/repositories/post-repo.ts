import { status } from "elysia";
import { supabase } from "../supabase";
import { post } from "../controllers/post-controller";

// Helper function to get user info
async function getUserInfo(userId: string) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("first_name, last_name, avatar_url")
      .eq("uuid", userId)
      .single();

    if (error) return null;
    return {
      firstName: data?.first_name || "Unknown",
      lastName: data?.last_name || "User",
      avatarUrl: data?.avatar_url || null
    };
  } catch (err) {
    return null;
  }
}

// Helper function to get all files for a post
async function getFileInfo(postId: number) {
  try {
    const { data, error } = await supabase
      .from("files")
      .select("id, file_name, file_url, file_size")
      .eq("post_id", postId);

    if (error || !data || data.length === 0) return [];
    return data; // Return all files
  } catch (err) {
    return [];
  }
}

// Helper function to get tags for a post
async function getPostTags(postId: number) {
  try {
    const { data: postTags, error } = await supabase
      .from("post_tags")
      .select("tags(id, subject_name)")
      .eq("post_id", postId);

    if (error || !postTags) return [];
    return postTags
      .map((pt: any) => pt.tags)
      .filter((tag: any) => tag !== null)
      .map((tag: any) => ({
        id: tag.id,
        name: tag.subject_name
      }));
  } catch (err) {
    return [];
  }
}

// Helper function to get comment count for a post
async function getCommentCount(postId: number) {
  try {
    const { count, error } = await supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("post_id", postId);

    if (error) return 0;
    return count || 0;
  } catch (err) {
    return 0;
  }
}

// Helper function to add file, tags, and comment count to posts
async function addPostDetails(posts: any[]) {
  return Promise.all(
    posts.map(async (post) => ({
      ...post,
      user_info: await getUserInfo(post.user_id),
      attachments: await getFileInfo(post.id),
      tags: await getPostTags(post.id),
      comment_count: await getCommentCount(post.id)
    }))
  );
}

// Helper function to add user info to posts (for comments)
async function addUserInfoToPosts(posts: any[]) {
  return Promise.all(
    posts.map(async (post) => ({
      ...post,
      user_info: await getUserInfo(post.user_id)
    }))
  );
}

export async function uploadPost(userId: string, title: string, body: string, tag: string) {
  try {
    const { data: postTable, error: errorPostTable } = await supabase
      .from("posts")
      .insert([{ user_id: userId, title, body }])
      .select("id")
      .single();

    if (errorPostTable || !postTable) {
      console.error("Post insert error:", errorPostTable);
      throw new Error("Failed to insert post");
    }

    const { data: existingTag, error: errorCheckTag } = await supabase
      .from("tags")
      .select("id")
      .eq("subject_name", tag)
      .maybeSingle();

    if (errorCheckTag) {
      console.log(errorCheckTag)
      throw new Error("Failed to check tag");
    }

    let tagId: number;

    if (!existingTag) {
      const { data: tagsTable, error: errorTagsTable } = await supabase
        .from("tags")
        .insert([{ subject_name: tag }])
        .select("id")
        .single();

      if (errorTagsTable || !tagsTable) {
        await supabase.from("posts").delete().eq("id", postTable.id);
        throw new Error("Failed to insert new tag");
      }

      tagId = tagsTable.id;
    } else {
      tagId = existingTag.id;
    }

    const { data: postTag, error: errorPostTag } = await supabase
      .from("post_tags")
      .insert([{ post_id: postTable.id, tag_id: tagId }]);

    // console.log(errorPostTag)

    if (errorPostTag) {
      await supabase.from("post_tags").delete().eq("post_id", postTable.id);
      await supabase.from("posts").delete().eq("id", postTable.id);
      throw new Error("Failed to link post and tag");
    }

    return { status: 200, postId: postTable.id, tagId };

  } catch (err: any) {
    console.error("uploadPost error:", err);
    return { status: 500, message: err.message };
  }
}

export async function uploadComment(userId: string, postId: string, body: string) {
  try {
    const { data: commentData, error: errorComment } = await supabase
      .from("comments")
      .insert([
        {
          user_id: userId,
          post_id: postId,
          body: body
        }
      ])
      .select("*")
      .single();

    if (errorComment) {
      return { status: 500, message: errorComment.message };
    }

    return { status: 200, message: commentData };

  } catch (err: any) {
    return { status: 500, message: err.message };
  }
}


export async function getPost(count: number = 10) {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .limit(count)
      .order("id", { ascending: false });

    if (error) throw error;

    const postsWithDetails = await addPostDetails(data || []);
    return { status: 200, data: postsWithDetails };
  } catch (err: any) {
    return { status: 500, message: err.message };
  }
}


export async function getPostAfter(lastId: number, count: number = 10) {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .lt("id", lastId) 
      .order("id", { ascending: false }) 
      .limit(count);

    if (error) throw error;

    const postsWithDetails = await addPostDetails(data || []);
    return { status: 200, data: postsWithDetails };
  } catch (err: any) {
    return { status: 500, message: err.message };
  }
}

export async function getPostFilter(tags: string, count: number = 10) {
  try {
    const { data: dataTags, error: errorTags } = await supabase
      .from("tags")
      .select("id")
      .eq("subject_name", tags)
      .limit(1); 

    if (errorTags) throw errorTags;
    if (!dataTags || dataTags.length === 0) {
      return { status: 404, message: "Tag not found" };
    }

    const tagId = dataTags[0].id;

    const { data: postTags, error: errorPostTags } = await supabase
      .from("post_tags")
      .select("post_id")
      .eq("tag_id", tagId)
      .limit(count);

    if (errorPostTags) throw errorPostTags;
    if (!postTags || postTags.length === 0) {
      return { status: 404, message: "No posts found for this tag" };
    }

    const postIds = postTags.map((p) => p.post_id);

    const { data: dataPost, error: errorPosts } = await supabase
      .from("posts")
      .select("*")
      .in("id", postIds)
      .limit(count);

    if (errorPosts) throw errorPosts;

    const postsWithDetails = await addPostDetails(dataPost || []);
    return { status: 200, data: postsWithDetails };
  } catch (err: any) {
    return { status: 500, message: err.message };
  }
}

export async function getComment(post_id: number) {
  try {
    const { data: dataComment, error: errorComment } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", post_id)
      .order("created_at", { ascending: false });

    if (errorComment) throw errorComment;

    const commentsWithUserInfo = await addUserInfoToPosts(dataComment || []);
    return { status: 200, data: commentsWithUserInfo };
  } catch (err: any) {
    return { status: 500, message: err.message };
  }
}

export async function getPostById(postId: number) {
  try {
    const { data: post, error } = await supabase
      .from("posts")
      .select("*")
      .eq("id", postId)
      .single();

    if (error || !post) {
      return { status: 404, message: "Post not found" };
    }

    const postsWithDetails = await addPostDetails([post]);
    return { status: 200, data: postsWithDetails[0] };
  } catch (err: any) {
    console.error("getPostById error:", err);
    return { status: 500, message: err.message };
  }
}

export async function getAllTags() {
  try {
    const { data, error } = await supabase
      .from("tags")
      .select("id, subject_name")
      .order("subject_name", { ascending: true });

    if (error) throw error;

    const formattedTags = data?.map((tag: any) => ({
      id: tag.id,
      name: tag.subject_name
    })) || [];

    return { status: 200, data: formattedTags };
  } catch (err: any) {
    return { status: 500, message: err.message };
  }
}

export async function editPost(userId: string, postId: number, title: string, body: string, tag: string) {
  try {
    // Verify that the user owns this post
    const { data: postData, error: getPostError } = await supabase
      .from("posts")
      .select("user_id")
      .eq("id", postId)
      .single();

    if (getPostError || !postData) {
      throw new Error("Post not found");
    }

    if (postData.user_id !== userId) {
      throw new Error("Unauthorized: You can only edit your own posts");
    }

    // Update post title and body
    const { data: updatedPost, error: updateError } = await supabase
      .from("posts")
      .update({ title, body, updated_at: new Date().toISOString() })
      .eq("id", postId)
      .select()
      .single();

    if (updateError) {
      throw new Error("Failed to update post");
    }

    // Handle tag update
    if (tag) {
      // Get existing tag for this post
      const { data: existingPostTag, error: getTagError } = await supabase
        .from("post_tags")
        .select("tag_id")
        .eq("post_id", postId)
        .single();

      if (getTagError && getTagError.code !== "PGRST116") { // PGRST116 = no rows
        throw getTagError;
      }

      // Check if new tag exists
      const { data: newTag, error: checkTagError } = await supabase
        .from("tags")
        .select("id")
        .eq("subject_name", tag)
        .maybeSingle();

      if (checkTagError) {
        throw checkTagError;
      }

      let tagId: number;

      if (!newTag) {
        // Create new tag
        const { data: createdTag, error: createTagError } = await supabase
          .from("tags")
          .insert([{ subject_name: tag }])
          .select("id")
          .single();

        if (createTagError || !createdTag) {
          throw new Error("Failed to create new tag");
        }

        tagId = createdTag.id;
      } else {
        tagId = newTag.id;
      }

      // Update post_tags relationship
      if (existingPostTag) {
        const { error: updateTagError } = await supabase
          .from("post_tags")
          .update({ tag_id: tagId })
          .eq("post_id", postId);

        if (updateTagError) {
          throw updateTagError;
        }
      } else {
        const { error: insertTagError } = await supabase
          .from("post_tags")
          .insert([{ post_id: postId, tag_id: tagId }]);

        if (insertTagError) {
          throw insertTagError;
        }
      }
    }

    return { 
      status: 200, 
      message: "Post updated successfully",
      postId
    };

  } catch (err: any) {
    console.error("editPost error:", err);
    return { status: 500, message: err.message };
  }
}

export async function deletePost(userId: string, postId: number) {
  try {
    // Verify that the user owns this post
    const { data: postData, error: getPostError } = await supabase
      .from("posts")
      .select("user_id")
      .eq("id", postId)
      .single();

    if (getPostError || !postData) {
      throw new Error("Post not found");
    }

    if (postData.user_id !== userId) {
      throw new Error("Unauthorized: You can only delete your own posts");
    }

    // Get all files associated with this post
    const { data: files, error: filesError } = await supabase
      .from("files")
      .select("file_url")
      .eq("post_id", postId);

    if (filesError) {
      console.error("Error fetching files:", filesError);
    }

    // Delete files from storage
    if (files && files.length > 0) {
      const fileUrls = files.map((f: any) => f.file_url);
      const { error: storageError } = await supabase.storage
        .from("exams")
        .remove(fileUrls);

      if (storageError) {
        console.error("Storage deletion error:", storageError);
        // Continue with deletion even if storage fails
      }
    }

    // Delete file records from database
    const { error: deleteFilesError } = await supabase
      .from("files")
      .delete()
      .eq("post_id", postId);

    if (deleteFilesError) {
      console.error("Error deleting file records:", deleteFilesError);
    }

    // Delete comments
    const { error: deleteCommentsError } = await supabase
      .from("comments")
      .delete()
      .eq("post_id", postId);

    if (deleteCommentsError) {
      console.error("Error deleting comments:", deleteCommentsError);
    }

    // Delete post_tags relationship
    const { error: deletePostTagsError } = await supabase
      .from("post_tags")
      .delete()
      .eq("post_id", postId);

    if (deletePostTagsError) {
      throw new Error("Failed to delete post tags");
    }

    // Finally, delete the post itself
    const { error: deletePostError } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId);

    if (deletePostError) {
      throw new Error("Failed to delete post");
    }

    return {
      status: 200,
      message: "Post deleted successfully"
    };

  } catch (err: any) {
    console.error("deletePost error:", err);
    return { status: 500, message: err.message };
  }
}
