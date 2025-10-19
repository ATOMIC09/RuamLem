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

export async function deleteFileFromPost(userId: string, fileId: number, postId: number) {
    try {
        // Verify file belongs to the post and user owns the post
        const { data: file, error: fileError } = await supabase
            .from("files")
            .select("file_url, post_id, user_id")
            .eq("id", fileId)
            .single();

        if (fileError || !file) {
            throw new Error("File not found");
        }

        if (file.post_id !== postId) {
            throw new Error("File does not belong to this post");
        }

        // Verify user owns the post
        const { data: post, error: postError } = await supabase
            .from("posts")
            .select("user_id")
            .eq("id", postId)
            .single();

        if (postError || !post) {
            throw new Error("Post not found");
        }

        if (post.user_id !== userId) {
            throw new Error("Unauthorized: You can only delete files from your own posts");
        }

        // Delete from storage
        const { error: storageError } = await supabase.storage
            .from("exams")
            .remove([file.file_url]);

        if (storageError) {
            console.error("Storage deletion error:", storageError);
            throw new Error("Failed to delete file from storage");
        }

        // Delete from database
        const { error: dbError } = await supabase
            .from("files")
            .delete()
            .eq("id", fileId);

        if (dbError) {
            throw new Error("Failed to delete file record from database");
        }

        return {
            status: 200,
            message: "File deleted successfully"
        };

    } catch (err: any) {
        console.error("deleteFileFromPost error:", err);
        return { status: 500, message: err.message };
    }
}

export async function deleteMultipleFilesFromPost(userId: string, fileIds: number[], postId: number) {
    try {
        // Verify user owns the post
        const { data: post, error: postError } = await supabase
            .from("posts")
            .select("user_id")
            .eq("id", postId)
            .single();

        if (postError || !post) {
            throw new Error("Post not found");
        }

        if (post.user_id !== userId) {
            throw new Error("Unauthorized: You can only delete files from your own posts");
        }

        // Get all files to verify they belong to this post
        const { data: files, error: filesError } = await supabase
            .from("files")
            .select("id, file_url")
            .in("id", fileIds)
            .eq("post_id", postId);

        if (filesError) {
            throw filesError;
        }

        if (!files || files.length === 0) {
            throw new Error("No valid files found for deletion");
        }

        if (files.length !== fileIds.length) {
            throw new Error("Some files do not belong to this post");
        }

        const fileUrls = files.map((f: any) => f.file_url);

        // Delete from storage
        if (fileUrls.length > 0) {
            const { error: storageError } = await supabase.storage
                .from("exams")
                .remove(fileUrls);

            if (storageError) {
                console.error("Storage deletion error:", storageError);
                throw new Error("Failed to delete files from storage");
            }
        }

        // Delete from database
        const { error: dbError } = await supabase
            .from("files")
            .delete()
            .in("id", fileIds);

        if (dbError) {
            throw new Error("Failed to delete file records from database");
        }

        return {
            status: 200,
            message: `${files.length} file(s) deleted successfully`
        };

    } catch (err: any) {
        console.error("deleteMultipleFilesFromPost error:", err);
        return { status: 500, message: err.message };
    }
}
