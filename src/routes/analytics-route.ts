import Elysia, { t } from "elysia";
import {
  recordView,
  getViewCount,
  getMultipleViews,
  recordDownload,
  getDownloadCount,
  getMultipleDownloads,
} from "../controllers/analytics-controller";

export const analyticsRoute = new Elysia({ prefix: "/analytics" })
  // Post Views
  .post(
    "/view",
    ({ body, request }) => recordView({ body, request }),
    {
      body: t.Object({
        postId: t.String({ minLength: 1 }),
      }),
    }
  )
  .post(
    "/view/count",
    ({ body }) => getViewCount({ body }),
    {
      body: t.Object({
        postId: t.String({ minLength: 1 }),
      }),
    }
  )
  .post(
    "/view/multiple",
    ({ body }) => getMultipleViews({ body }),
    {
      body: t.Object({
        postIds: t.Array(t.String({ minLength: 1 })),
      }),
    }
  )
  
  // File Downloads
  .post(
    "/download",
    ({ body, request }) => recordDownload({ body, request }),
    {
      body: t.Object({
        fileId: t.String({ minLength: 1 }),
      }),
    }
  )
  .post(
    "/download/count",
    ({ body }) => getDownloadCount({ body }),
    {
      body: t.Object({
        fileId: t.String({ minLength: 1 }),
      }),
    }
  )
  .post(
    "/download/multiple",
    ({ body }) => getMultipleDownloads({ body }),
    {
      body: t.Object({
        fileIds: t.Array(t.String({ minLength: 1 })),
      }),
    }
  );

export default analyticsRoute;
