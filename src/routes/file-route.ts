import { Elysia, t } from "elysia";
import { uploadFile, downloadFile } from "../controllers/file-controller";

export const fileRoute = (app: Elysia) => {
    app.post("/upload/file", async (c) => {
        const authHeader = c.request.headers.get("authorization");
        if (!authHeader) return { status: 401, message: "No token" };
        const token = authHeader.split(" ")[1];


        const formData = await c.request.formData();
        const file = formData.get("pdf") as File;

        if (!file) {
            return { status: 400, message: "No file uploaded" };
        }

        return uploadFile(token, file);

    }, {
        detail: {
            tags: ['Files'],
            summary: 'Upload File',
            description: 'Upload a PDF file (requires authentication)',
            security: [{ bearerAuth: [] }]
        }
    });

    app.get("/download/file", async (c) => {
        const authHeader = c.request.headers.get("authorization");
        if (!authHeader) return { status: 401, message: "No token" };
        const token = authHeader.split(" ")[1];
        const name = ""

        return downloadFile(token, name);

    }, {
        detail: {
            tags: ['Files'],
            summary: 'Download File',
            description: 'Download a file (requires authentication)',
            security: [{ bearerAuth: [] }]
        }
    });

    return app;
}
