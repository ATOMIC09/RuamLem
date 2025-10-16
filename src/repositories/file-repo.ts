import { supabase } from "../supabase";

export async function uploadPDF(file: File, user_id:string, post_id:string) {
    try {
        const timestamp = Date.now();
        const fileName = `${timestamp}_${user_id}`;
        console.log(fileName)
        const filePath = fileName;
        // const filePath = `${file.name}`;
        const { data, error: uploadError } = await supabase.storage
            .from("exams")
            .upload(filePath, file);

        if (uploadError) {

            // console.log(uploadError)
            return { success: false, message: uploadError.message };
        }


        const {data: fileTable, error: errorFileTable} = await supabase
        .from("files")
        .insert([{
            file_name:file.name,
            file_url:filePath,
            file_size:file.size,
            post_id:post_id,
            user_id:user_id
        }])
        .select("id")
        .single();

        return { success: true, path: filePath };
    }
    catch (err: any) {
        return { status: 500, message: err.message };
    }

}

export async function downloadPDF(filename: string, expiresInSeconds = 60) {

    const filePath = `${filename}`;
    const { data, error } = await supabase.storage
        .from("exams")
        .createSignedUrl(filePath, expiresInSeconds);

    if (error) return { success: false, message: error.message };

    return { success: true, url: data.signedUrl };
}

