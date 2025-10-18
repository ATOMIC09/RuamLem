import { Elysia, t } from "elysia";
import { post, comment, getPostController, getPostAfterController, getCommentController, getPostFilterController, getTagsController } from "../controllers/post-controller";

export const postRoute = (app: Elysia) => {
    app.post("/post", async (c) => {
        const authHeader = c.request.headers.get("authorization");
        if (!authHeader) return { status: 401, message: "No token" };
        const token = authHeader.split(" ")[1];


        const formData = await c.request.formData();
        const file = formData.get("file") as File;
        const title = formData.get("title") as string;
        const body = formData.get("body") as string;
        const tag = formData.get("tag") as string


        if (!file) {
            return { status: 400, message: "No file uploaded" };
        }


        return post(token, title, body, tag, file);

    }, {
        detail: {
            tags: ['Posts'],
            summary: 'Create Post',
            description: 'Create a new post with file attachment (supports any file up to 50MB)',
            security: [{ bearerAuth: [] }]
        }
    });

    app.post("/comment", async ({ request, body }) => {
        const authHeader = request.headers.get("authorization");
        if (!authHeader) return { status: 401, message: "No token" };
        const token = authHeader.split(" ")[1];

        const postId = body.post_id;
        const postBody = body.post_body;

        // console.log(postId, postBody);
        
        return comment(token, postId, postBody);
    }, {
        body: t.Object({
            post_id: t.String({ description: "ID of the post to comment on" }),
            post_body: t.String({ description: "Comment content" })
        }),
        detail: {
            tags: ['Posts'],
            summary: 'Add Comment',
            description: 'Add a comment to a post',
            security: [{ bearerAuth: [] }]
        }
    });

     app.post("/getPost", async ({ body }) => {
        try {
            const count = body?.count || 10;
            return getPostController(count);
        } catch (error: any) {
            console.log("Error in getPost:", error);
            return { status: 500, message: "Internal server error", error: error.message };
        }
    }, {
        body: t.Optional(t.Object({
            count: t.Optional(t.Number({ description: "Number of posts to retrieve (default: 10)" }))
        })),
        detail: {
            tags: ['Posts'],
            summary: 'Get Posts',
            description: 'Retrieve a list of posts'
        }
    });

    app.post("/getPostFilter", async ({ body }) => {
        try {
            const tags = body.tags;
            const count = body.count || 10;
            
            if (!tags) {
                return { status: 400, message: "tags parameter is required" };
            }
            
            return getPostFilterController(tags, count);
        } catch (error: any) {
            console.log("Error in getPostFilter:", error);
            return { status: 500, message: "Internal server error", error: error.message };
        }
    }, {
        body: t.Object({
            tags: t.String({ description: "Tag to filter posts by" }),
            count: t.Optional(t.Number({ description: "Number of posts to retrieve (default: 10)" }))
        }),
        detail: {
            tags: ['Posts'],
            summary: 'Get Posts by Tag',
            description: 'Retrieve posts filtered by specific tag'
        }
    });

    app.post("/getPostAfter", async ({ body }) => {
        try {
            const lastId = body.lastId;
            const count = body.count || 10;
            
            if (!lastId) {
                return { status: 400, message: "lastId parameter is required" };
            }
            
            return getPostAfterController(lastId, count);
        } catch (error: any) {
            console.log("Error in getPostAfter:", error);
            return { status: 500, message: "Internal server error", error: error.message };
        }
    }, {
        body: t.Object({
            lastId: t.Number({ description: "ID of the last post from previous request (for pagination)" }),
            count: t.Optional(t.Number({ description: "Number of posts to retrieve (default: 10)" }))
        }),
        detail: {
            tags: ['Posts'],
            summary: 'Get Posts After ID',
            description: 'Retrieve posts after a specific post ID (pagination)'
        }
    });

    app.post("/getComment", async ({ body }) => {
        try {
            const postId = body.postId;
            
            if (!postId) {
                return { status: 400, message: "postId parameter is required" };
            }
            
            return getCommentController(postId);
        } catch (error: any) {
            console.log("Error in getComment:", error);
            return { status: 500, message: "Internal server error", error: error.message };
        }
    }, {
        body: t.Object({
            postId: t.Number({ description: "ID of the post to get comments for" })
        }),
        detail: {
            tags: ['Posts'],
            summary: 'Get Comments',
            description: 'Retrieve comments for a specific post'
        }
    });

    app.get("/tags", async () => {
        try {
            return getTagsController();
        } catch (error: any) {
            console.log("Error in getTags:", error);
            return { status: 500, message: "Internal server error", error: error.message };
        }
    }, {
        detail: {
            tags: ['Posts'],
            summary: 'Get All Tags',
            description: 'Retrieve all available tags'
        }
    });

    return app;
}
