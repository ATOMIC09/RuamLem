import { status } from "elysia";
import { supabase } from "../supabase";
import { uploadPDF } from "../repositories/file-repo";
import { uploadPost, uploadComment, getComment, getPost, getPostAfter, getPostFilter, getAllTags } from "../repositories/post-repo";
import { asHookType } from "elysia/dist/utils";


export async function post(token: string, title: string, body: string, tag: string, file: File) {
    try {
        const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

        if (file.size > MAX_FILE_SIZE) {
            return { success: false, message: "File size must be under 50MB" };
        }

        const { data: user, error } = await supabase.auth.getClaims(token);
        if (error || !user) {
            return { success: false, message: "Invalid session" };
        }
        const userId = user.claims.sub;


        const postResult = await uploadPost(userId, title, body, tag);
        if (postResult.status !== 200) {
            throw new Error(postResult.message || "Upload post failed");
        }

        const fileResult = await uploadPDF(file, userId, postResult.postId);
        if (!fileResult.success) {
            console.log(fileResult.success)
            await supabase.from("post_tags").delete().eq("post_id", postResult.postId);
            await supabase.from("posts").delete().eq("id", postResult.postId);
            throw new Error("Upload PDF failed, rolled back post");
        }
        return {
            success: true,
            message: "Post and PDF uploaded successfully",
            postId: postResult.postId,
            filePath: fileResult.path
        };
        // console.log(userId);
    }
    catch (err: any) {
        return { status: 500, message: err.message };
    }
}

export async function comment(token: string, postId: string, body: string) {
    try {

        const { data: user, error } = await supabase.auth.getClaims(token);
        if (error || !user) {
            return { sccess: false, message: "Invalid session" };
        }
        const userId = user.claims.sub;

        return uploadComment(userId, postId, body);


    } catch (err: any) {
        return { status: 500, message: err.message };
    }

}

// no filter
export async function getPostController(count: number) {
    try {
        return getPost(count);
    }
    catch (err: any) {
        return { status: 500, message: err.message };
    }

}

export async function getPostAfterController(lastId: number, count: number = 10) {
    try {
        return getPostAfter(lastId, count);
    }
    catch (err: any) {
        return { status: 500, message: err.message };
    }
}


export async function getPostFilterController(tags: string, count: number = 10) {
    try {
        return getPostFilter(tags, count);
    }
    catch (err: any) {
        return { status: 500, message: err.message };
    }
}


export async function getCommentController(post_id: number) {
    try {
        return getComment(post_id);
    }
    catch (err: any) {
        return { status: 500, message: err.message };
    }
}

export async function getTagsController() {
    try {
        return getAllTags();
    }
    catch (err: any) {
        return { status: 500, message: err.message };
    }
}