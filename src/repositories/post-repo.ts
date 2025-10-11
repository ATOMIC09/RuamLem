import { status } from "elysia";
import { supabase } from "../supabase";

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
