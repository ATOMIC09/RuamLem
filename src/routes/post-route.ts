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
        try {
            let count = 10; // default value
            
            // Check if request has a body
            const contentLength = c.request.headers.get("content-length");
            if (contentLength && parseInt(contentLength) > 0) {
                const body = await c.request.json();
                count = body.count || 10;
            }
            
            return getPostController(count);
        } catch (error) {
            // If JSON parsing fails, use default count
            return getPostController(10);
        }
    });

    app.post("/getPostFilter", async (c) => {
        try {
            const body = await c.request.json();
            const tags = body.tags;
            const count = body.count || 10;
            
            if (!tags) {
                return { status: 400, message: "tags parameter is required" };
            }
            
            return getPostFilterController(tags, count);
        } catch (error) {
            return { status: 400, message: "Invalid JSON in request body" };
        }
    });

    app.post("/getPostAfter", async (c) => {
        try {
            const body = await c.request.json();
            const lastId = body.lastId;
            const count = body.count || 10;
            
            if (!lastId) {
                return { status: 400, message: "lastId parameter is required" };
            }
            
            return getPostAfterController(lastId, count);
        } catch (error) {
            return { status: 400, message: "Invalid JSON in request body" };
        }
    });

    app.post("/getComment", async (c) => {
        try {
            const body = await c.request.json();
            const postId = body.postId;
            
            if (!postId) {
                return { status: 400, message: "postId parameter is required" };
            }
            
            return getCommentController(postId);
        } catch (error) {
            return { status: 400, message: "Invalid JSON in request body" };
        }
    });


    return app;
}
