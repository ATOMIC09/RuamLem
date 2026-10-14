import { status } from "elysia";
import { supabase } from "../supabase";
import { uploadFiles, uploadFileToPost, downloadPDF, deleteFileFromPost, deleteMultipleFilesFromPost } from "../repositories/file-repo";
import { checkUpload } from "../utils/file-validation";

export async function uploadFile(token: string, file: File) {
    try {
        const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

        if (file.size > MAX_FILE_SIZE) {
            return { success: false, message: "File size must be under 50MB" };
        }

        //    console.log(token, file.name, file.type, file.size)
        const { data: user, error } = await supabase.auth.getClaims(token);
        if (error || !user) {
            return { success: false, message: "Invalid session" };
        } else {
            const userId = user.claims.sub; // Get actual user ID
            console.log("👤 User ID from token:", userId);

            const checked = await checkUpload(file);
            if (!checked.ok) return { success: false, message: checked.message };

            return uploadFiles([checked.file], userId, null); // Pass as array, null for standalone file upload
        }
    }
    catch (err: any) {
        return { status: 500, message: err.message };
    }
}

export async function uploadFileToPostController(token: string, file: File, postId: number) {
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
        console.log("👤 User ID from token:", userId);
        console.log("📤 Uploading file to post:", postId);

        const checked = await checkUpload(file);
        if (!checked.ok) return { success: false, message: checked.message };

        return uploadFileToPost(checked.file, userId, postId);
    }
    catch (err: any) {
        return { status: 500, message: err.message };
    }
}

export async function downloadFile(realnameFile:string) {
    try {
        return downloadPDF(realnameFile);
    }
    catch (err: any) {
        return { status: 500, message: err.message };
    }
}

export async function deleteFileController(token: string, fileId: number, postId: number) {
    try {
        const { data: user, error } = await supabase.auth.getClaims(token);
        if (error || !user) {
            return { success: false, message: "Invalid session" };
        }
        const userId = user.claims.sub;
        return deleteFileFromPost(userId, fileId, postId);
    }
    catch (err: any) {
        return { status: 500, message: err.message };
    }
}

export async function deleteMultipleFilesController(token: string, fileIds: number[], postId: number) {
    try {
        const { data: user, error } = await supabase.auth.getClaims(token);
        if (error || !user) {
            return { success: false, message: "Invalid session" };
        }
        const userId = user.claims.sub;
        return deleteMultipleFilesFromPost(userId, fileIds, postId);
    }
    catch (err: any) {
        return { status: 500, message: err.message };
    }
}
