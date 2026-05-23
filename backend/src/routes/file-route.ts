import { Elysia, t } from "elysia";
import { uploadFile, downloadFile, deleteFileController, deleteMultipleFilesController, uploadFileToPostController } from "../controllers/file-controller";

export const fileRoute = (app: Elysia) => {
    app.post("/upload/file", async (c) => {
        const authHeader = c.request.headers.get("authorization");
        if (!authHeader) return { status: 401, message: "No token" };
        const token = authHeader.split(" ")[1];

        console.log("🔑 Token received:", token.substring(0, 20) + "...");

        const formData = await c.request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return { status: 400, message: "No file uploaded" };
        }

        console.log("📁 File received:", file.name, "Size:", file.size, "Type:", file.type);

        const result = await uploadFile(token, file);
        console.log("📤 Upload result:", result);
        
        return result;

    }, {
        detail: {
            tags: ['Files'],
            summary: 'Upload File',
            description: 'Upload any file up to 50MB (requires authentication)',
            security: [{ bearerAuth: [] }]
        }
    });

    app.post("/upload/file/post/:postId", async (c) => {
        const authHeader = c.request.headers.get("authorization");
        if (!authHeader) return { status: 401, message: "No token" };
        const token = authHeader.split(" ")[1];

        const postId = parseInt(c.params.postId);
        if (isNaN(postId)) {
            return { status: 400, message: "Invalid post ID" };
        }

        const formData = await c.request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return { status: 400, message: "No file uploaded" };
        }

        console.log("📁 Uploading file to post:", postId, "File:", file.name);

        return uploadFileToPostController(token, file, postId);

    }, {
        detail: {
            tags: ['Files'],
            summary: 'Upload File to Post',
            description: 'Upload a file and associate it with an existing post. You can only add files to your own posts.',
            security: [{ bearerAuth: [] }]
        }
    });

    app.get("/download/file", async (c) => {
        // Extract filename from query parameters
        const url = new URL(c.request.url);
        const filename = url.searchParams.get("filename");
        
        if (!filename) {
            return { success: false, message: "Filename parameter is required" };
        }

        return downloadFile(filename);

    }, {
        detail: {
            tags: ['Files'],
            summary: 'Download File',
            description: 'Download a file (no authentication required)'
        }
    });

    app.delete("/file/:fileId", async (c) => {
        const authHeader = c.request.headers.get("authorization");
        if (!authHeader) return { status: 401, message: "No token provided" };
        const token = authHeader.split(" ")[1];

        const fileId = parseInt(c.params.fileId);
        const body = c.body as any;

        if (!body.postId) {
            return { status: 400, message: "postId is required" };
        }

        console.log("🗑️ Deleting file:", fileId, "from post:", body.postId);

        return deleteFileController(token, fileId, body.postId);

    }, {
        body: t.Object({
            postId: t.Number({ description: "ID of the post containing the file" })
        }),
        detail: {
            tags: ['Files'],
            summary: 'Delete File from Post',
            description: 'Delete a single file from a post. You can only delete files from your own posts.',
            security: [{ bearerAuth: [] }]
        }
    });

    app.delete("/files", async (c) => {
        const authHeader = c.request.headers.get("authorization");
        if (!authHeader) return { status: 401, message: "No token provided" };
        const token = authHeader.split(" ")[1];

        const body = c.body as any;

        if (!body.fileIds || !Array.isArray(body.fileIds) || body.fileIds.length === 0) {
            return { status: 400, message: "fileIds array is required" };
        }

        if (!body.postId) {
            return { status: 400, message: "postId is required" };
        }

        console.log("🗑️ Deleting multiple files:", body.fileIds, "from post:", body.postId);

        return deleteMultipleFilesController(token, body.fileIds, body.postId);

    }, {
        body: t.Object({
            fileIds: t.Array(t.Number(), { description: "Array of file IDs to delete" }),
            postId: t.Number({ description: "ID of the post containing the files" })
        }),
        detail: {
            tags: ['Files'],
            summary: 'Delete Multiple Files from Post',
            description: 'Delete multiple files from a post in a single request. You can only delete files from your own posts.',
            security: [{ bearerAuth: [] }]
        }
    });

    return app;
}
