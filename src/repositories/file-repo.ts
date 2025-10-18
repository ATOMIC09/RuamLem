import { supabase } from "../supabase";

export async function uploadFiles(files: File[], user_id: string, post_id: string | null) {
    try {
        const filePaths: string[] = [];

        for (const file of files) {
            const timestamp = Date.now();
            const uniqueId = Math.random().toString(36).substr(2, 9);
            const fileName = `${timestamp}_${uniqueId}`;
            console.log(fileName)
            const filePath = fileName;

            const { data, error: uploadError } = await supabase.storage
                .from("exams")
                .upload(filePath, file);

            if (uploadError) {
                console.log("❌ Storage upload error:", uploadError);
                return { success: false, message: uploadError.message };
            }

            console.log("✅ File uploaded to storage:", filePath);

            const insertData = {
                file_name: file.name,
                file_url: filePath,
                file_size: file.size,
                post_id: post_id, // Can be null for standalone files
                user_id: user_id
            };

            console.log("💾 Inserting file record:", insertData);

            const { data: fileTable, error: errorFileTable } = await supabase
                .from("files")
                .insert([insertData])
                .select("id")
                .single();

            if (errorFileTable) {
                console.log("❌ Database insert error:", errorFileTable);
                return { success: false, message: errorFileTable.message };
            }

            console.log("✅ File record inserted:", fileTable);
            filePaths.push(filePath);
        }

        return { success: true, paths: filePaths };
    }
    catch (err: any) {
        console.log("❌ Upload error:", err);
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
