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
} from "../controllers/post-controller";

const postRoute = new Elysia({ prefix: "/post" })
  .post(
    "/",
    ({ body, request }) => post({ body, request }),
    {
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
    ({ body }) => getPostController({ body }),
    {
      body: t.Object({
        count: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
      }),
    }
  )
  .post(
    "/id",
    ({ body }) => getPostByIdController({ body }),
    {
      body: t.Object({
        postId: t.Number({ minimum: 1 }),
      }),
    }
  )
  .post(
    "/getPostFilter",
    ({ body }) => getPostFilterController({ body }),
    {
      body: t.Object({
        tags: t.String({ minLength: 1, maxLength: 50 }),
        count: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
      }),
    }
  )
  .post(
    "/getPostAfter",
    ({ body }) => getPostAfterController({ body }),
    {
      body: t.Object({
        lastId: t.Number({ minimum: 1 }),
        count: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
      }),
    }
  )
  .post(
    "/getComment",
    ({ body }) => getCommentController({ body }),
    {
      body: t.Object({
        postId: t.Number({ minimum: 1 }),
      }),
    }
  )
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
