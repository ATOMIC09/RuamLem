import { Elysia } from "elysia";
import { post, comment, getPostController, getPostAfterController, getCommentController, getPostFilterController } from "../controllers/post-controller";

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


        // console.log(postId, postBody);

        
        return comment(token, postId, postBody);
    });

     app.post("/getPost", async (c) => {
        const body = await c.request.json();
        const count = body.count;
        
        return getPostController(count);
    });

    app.post("/getPostFilter", async (c) => {
        const body = await c.request.json();
        const tags =  body.tags;
        const count = body.count;
        
        return getPostFilterController(tags, count);
    });

    app.post("/getPostAfter", async (c) => {
        const body = await c.request.json();
        const lastId = body.lastId;
        const count = body.count;
        
        return getPostAfterController(lastId, count);
    });

    app.post("/getComment", async (c) => {
        const body = await c.request.json();
        const postId = body.postId;
        
        return getCommentController(postId);
    });


    return app;
}
