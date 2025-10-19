import Elysia, { t } from "elysia";
import {
  toggleLike,
  getLikeStatus,
  getMultipleLikes,
} from "../controllers/like-controller";

export const likeRoute = new Elysia({ prefix: "/like" })
  .post(
    "/toggle",
    ({ body, request }) => toggleLike({ body, request }),
    {
      body: t.Object({
        postId: t.Number({ minimum: 1 }),
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
    "/status",
    ({ body, request }) => getLikeStatus({ body, request }),
    {
      body: t.Object({
        postId: t.Number({ minimum: 1 }),
      }),
    }
  )
  .post(
    "/multiple",
    ({ body }) => getMultipleLikes({ body }),
    {
      body: t.Object({
        postIds: t.Array(t.Number({ minimum: 1 })),
      }),
    }
  );

export default likeRoute;
