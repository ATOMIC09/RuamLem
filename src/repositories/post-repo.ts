import { status } from "elysia";
import { supabase } from "../supabase";
import { post } from "../controllers/post-controller";

export async function uploadPost(userId: string, title: string, body: string, tag: string) {
  try {
    const { data: postTable, error: errorPostTable } = await supabase
      .from("posts")
      .insert([{ user_id: userId, title, body }])
      .select("id")
      .single();

    if (errorPostTable || !postTable) {
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

    return { status: 200, data };
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

    return { status: 200, data };
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

    return { status: 200, data: dataPost };
  } catch (err: any) {
    return { status: 500, message: err.message };
  }
}

export async function getComment(post_id: number) {
  try {
    const { data: dataComment, error: errorComment } = await supabase
      .from("comment")
      .select("*")
      .eq("post_id", post_id)
      .order("created_at", { ascending: false });;

    if (errorComment) throw errorComment;

    return { status: 200, data: dataComment };
  } catch (err: any) {
    return { status: 500, message: err.message };
  }
}
