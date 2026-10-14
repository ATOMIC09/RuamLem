import Elysia, { t } from "elysia";
import {
  post,
  comment,
  getPostController,
  getPostAfterController,
  getPostFilterController,
  getCommentController,
  getTagsController,
  editPostController,
  deletePostController,
  getPostByIdController,
  appealController,
} from "../controllers/post-controller";

export const postRoute = new Elysia({ prefix: "/post" })
  .post(
    "/",
    ({ body, request }) => post({ body, request }),
    {
      body: t.Object({
        title: t.String({ minLength: 1, maxLength: 255 }),
        body: t.String({ minLength: 1 }),
        tag: t.String({ minLength: 1, maxLength: 50 }),
        // Names of the files about to be attached, so they are moderated together with the text.
        fileNames: t.Optional(t.Array(t.String({ maxLength: 255 }), { maxItems: 10 })),
      }),
      beforeHandle: ({ request }) => {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader) {
          throw new Error("Authorization header is required");
        }
      },
    }
  )
  .post(
    "/comment",
    ({ body, request }) => comment({ body, request }),
    {
      body: t.Object({
        postId: t.String({ minLength: 1 }),
        body: t.String({ minLength: 1 }),
      }),
      beforeHandle: ({ request }) => {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader) {
          throw new Error("Authorization header is required");
        }
      },
    }
  )
  .post(
    "/getPost",
    ({ body, request }) => getPostController({ body, request }),
    {
      body: t.Object({
        count: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
      }),
    }
  )
  .post(
    "/id",
    ({ body, request }) => getPostByIdController({ body, request }),
    {
      body: t.Object({
        postId: t.Number({ minimum: 1 }),
      }),
    }
  )
  .post(
    "/getPostFilter",
    ({ body, request }) => getPostFilterController({ body, request }),
    {
      body: t.Object({
        tags: t.String({ minLength: 1, maxLength: 50 }),
        count: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
      }),
    }
  )
  .post(
    "/getPostAfter",
    ({ body, request }) => getPostAfterController({ body, request }),
    {
      body: t.Object({
        lastId: t.Number({ minimum: 1 }),
        count: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
      }),
    }
  )
  .post(
    "/getComment",
    ({ body, request }) => getCommentController({ body, request }),
    {
      body: t.Object({
        postId: t.Number({ minimum: 1 }),
      }),
    }
  )
  .post("/comment/:id/appeal", appealController("comment"), {
    params: t.Object({ id: t.String() }),
    beforeHandle: ({ request }) => {
      if (!request.headers.get("Authorization")) throw new Error("Authorization header is required");
    },
    detail: { tags: ["Posts"], summary: "Appeal a rejected comment", security: [{ bearerAuth: [] }] },
  })
  .post("/:id/appeal", appealController("post"), {
    params: t.Object({ id: t.String() }),
    beforeHandle: ({ request }) => {
      if (!request.headers.get("Authorization")) throw new Error("Authorization header is required");
    },
    detail: { tags: ["Posts"], summary: "Appeal a rejected post", security: [{ bearerAuth: [] }] },
  })
  .get("/tags", () => getTagsController())
  .put(
    "/:postId",
    ({ body, request, params }) => editPostController({ body, request, params }),
    {
      params: t.Object({
        postId: t.String(),
      }),
      body: t.Object({
        title: t.String({ minLength: 1, maxLength: 255 }),
        body: t.String({ minLength: 1 }),
        tag: t.String({ minLength: 1, maxLength: 50 }),
      }),
      beforeHandle: ({ request }) => {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader) {
          throw new Error("Authorization header is required");
        }
      },
    }
  )
  .delete(
    "/:postId",
    ({ request, params }) => deletePostController({ request, params }),
    {
      params: t.Object({
        postId: t.String(),
      }),
      beforeHandle: ({ request }) => {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader) {
          throw new Error("Authorization header is required");
        }
      },
    }
  );

export default postRoute;
