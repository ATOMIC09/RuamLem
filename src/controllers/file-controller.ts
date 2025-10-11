import { status } from "elysia";
import { supabase } from "../supabase";
import { uploadPDF, downloadPDF } from "../repositories/file-repo";

export async function uploadFile(token: string, file: File) {
    try {

        if (file.type !== "application/pdf") {
            return { success: false, message: "Only PDF allowed" };
        }

        //    console.log(token, file.name, file.type, file.size)
        const { data: user, error } = await supabase.auth.getClaims(token);
        if (error || !user) {
            return { sccess: false, message: "Invalid session" };
        } else {
            return uploadPDF(file, "0", "0");
        }
    }
    catch (err: any) {
        return { status: 500, message: err.message };
    }
}

export async function downloadFile(token: string, realnameFile:string) {
    try {

        const { data: user, error } = await supabase.auth.getClaims(token);
        if (error || !user) {
            return { sccess: false, message: "Invalid session" };
        } else {
            return downloadPDF(realnameFile);
        }
    }
    catch (err: any) {
        return { status: 500, message: err.message };
    }
}
