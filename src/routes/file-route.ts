import { Elysia } from "elysia";
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

    });

    app.get("/download/file", async (c) => {
        const authHeader = c.request.headers.get("authorization");
        if (!authHeader) return { status: 401, message: "No token" };
        const token = authHeader.split(" ")[1];

        console.log("run")

        return downloadFile(token);

    });

    return app;
}
