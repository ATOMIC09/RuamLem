import Elysia, { t } from "elysia";
import { askController } from "../controllers/ai-controller";

export const aiRoute = new Elysia({ prefix: "/ai" }).post(
  "/ask",
  ({ body, request }) => askController({ body, request }),
  {
    // At least one non-space character, at most 500.
    body: t.Object({
      question: t.String({ minLength: 1, maxLength: 500, pattern: "\\S" }),
      // The last few messages of the conversation, so a follow-up question makes sense.
      history: t.Optional(
        t.Array(
          t.Object({ role: t.Union([t.Literal("user"), t.Literal("assistant")]), content: t.String({ maxLength: 1500 }) }),
          { maxItems: 8 }
        )
      ),
    }),
    detail: { tags: ["AI"], summary: "Chat with Ask RuamLem: answers from matching posts, or from general knowledge when none match (SSE stream)" },
  }
);

export default aiRoute;
