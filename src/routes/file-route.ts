import { Elysia, t } from "elysia";
import { uploadFile, downloadFile } from "../controllers/file-controller";

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

    return app;
}
