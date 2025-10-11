import { Elysia } from "elysia";
import { post, comment } from "../controllers/post-controller";

export const postRoute = (app: Elysia) => {
    app.post("/post", async (c) => {
        const authHeader = c.request.headers.get("authorization");
        if (!authHeader) return { status: 401, message: "No token" };
        const token = authHeader.split(" ")[1];


        const formData = await c.request.formData();
        const file = formData.get("pdf") as File;
        const title = formData.get("title") as string;
        const body = formData.get("body") as string;
        const tag = formData.get("tag") as string


        if (!file) {
            return { status: 400, message: "No file uploaded" };
        }


        return post(token, title, body, tag, file);

    });

    app.post("/comment", async (c) => {
        const authHeader = c.request.headers.get("authorization");
        if (!authHeader) return { status: 401, message: "No token" };
        const token = authHeader.split(" ")[1];

        const body = await c.request.json();
        const postId = body.post_id;
        const postBody = body.post_body;

        
        return comment(token, postId, postBody);
    });


    return app;
}
