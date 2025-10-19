import { status } from "elysia";
import { supabase } from "../supabase";
import { uploadFiles, downloadPDF, deleteFileFromPost, deleteMultipleFilesFromPost } from "../repositories/file-repo";

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
            return uploadFiles(file, userId, null); // null for standalone file upload
        }
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
