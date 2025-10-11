import { status } from "elysia";
import { supabase } from "../supabase";
import { uploadPDF } from "../repositories/file-repo";
import { uploadPost, uploadComment } from "../repositories/post-repo";


export async function post(token: string, title: string, body: string, tag: string, file: File) {
    try {

        if (file.type !== "application/pdf") {
            return { success: false, message: "Only PDF allowed" };
        }

        const { data: user, error } = await supabase.auth.getClaims(token);
        if (error || !user) {
            return { sccess: false, message: "Invalid session" };
        }
        const userId = user.claims.sub;


        const postResult = await uploadPost(userId, title, body, tag);
        if (postResult.status !== 200) {
            throw new Error(postResult.message || "Upload post failed");
        }

        const fileResult = await uploadPDF(file, userId, postResult.postId);
        if (!fileResult.success) {
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