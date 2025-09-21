import { supabase } from "../supabase";

export async function uploadPDF(file: File) {
    try {
        const filePath = `${file.name}`;
        const { data, error: uploadError } = await supabase.storage
            .from("exams")
            .upload(filePath, file);

        if (uploadError) {
            return { success: false, message: uploadError.message };
        }

        return { success: true, path: filePath };
    }
    catch (err: any) {
        return { status: 500, message: err.message };
    }

}
export async function downloadPDF(filename:string, expiresInSeconds = 60) {

    const filePath = `${filename}`;
    const { data, error } = await supabase.storage
        .from("exams")
        .createSignedUrl(filePath, expiresInSeconds);

    if (error) return { success: false, message: error.message };

    return { success: true, url: data.signedUrl };
}

