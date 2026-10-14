import Elysia, { t } from "elysia";
import { askController } from "../controllers/ai-controller";

export const aiRoute = new Elysia({ prefix: "/ai" }).post(
  "/ask",
  ({ body, request }) => askController({ body, request }),
  {
    // At least one non-space character, at most 500.
    body: t.Object({ question: t.String({ minLength: 1, maxLength: 500, pattern: "\\S" }) }),
    detail: { tags: ["AI"], summary: "Ask a question answered from RuamLem posts (SSE stream)" },
  }
);

export default aiRoute;
