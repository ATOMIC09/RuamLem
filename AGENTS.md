# RuamLem: guide for AI coding agents

RuamLem is a **production** website where university students share course materials and past exam papers. It has two AI features: **Ask RuamLem** (a study chatbot that answers from the site's posts, or from general knowledge when no post matches) and **AI moderation** (new posts and comments are screened, with a human always able to override).

Read this file first, then the page in `docs/` for the area you will touch. Do not start from the code.

## Stack

| Part | Tech | Folder |
|---|---|---|
| Frontend | Next.js 15, React 19, Tailwind 4 (Vercel) | `frontend/` |
| Backend | Bun + ElysiaJS, TypeScript (Render, Docker) | `backend/` |
| Data, auth, files | Supabase: Postgres + pgvector, Auth, Storage | `backend/sql/` |
| AI | Azure OpenAI (chat + embeddings) and Azure AI Content Safety | `backend/src/ai/` |

## Where to read

| To learn about | Read |
|---|---|
| Overview, non-technical | `README.md` |
| Components, request flow, sign-in, frontend pages | `docs/architecture.md` |
| Tables, columns, RLS, SQL files and their status | `docs/database.md` |
| Every endpoint | `docs/api.md` |
| Ask RuamLem (RAG, two modes, streaming, chat UI) | `docs/ask-ruamlem.md` |
| Moderation (decision rules, appeals, admin queue, accuracy) | `docs/moderation.md` |
| AI usage tracking, daily limits, cost estimate, dashboard | `docs/ai-usage.md` |
| Protections, audit results, known gaps | `docs/security.md` |
| Setup, environment variables, scripts, tests, deploy, troubleshooting | `docs/development.md` |

## Layout

```
backend/src/
  index.ts            app setup, CORS, per-request token capture
  request-context.ts  keeps each request's token (AsyncLocalStorage)
  supabase.ts         per-request data client + auth client
  routes/ controllers/ services/ repositories/   the four layers
  ai/                 building blocks: Azure clients, prompts, citations, SSE, PII rules, moderation schema
  services/ai/        feature logic: ask-service, moderation-service, decision, rate limit
  ops/                privileged client, imported ONLY by scripts/
  scripts/            operator scripts (ai:reindex, ai:recheck, ai:moderation-eval)
backend/sql/          numbered migrations, each with a DOWN section
frontend/src/app/     pages (App Router), components/, hooks/
frontend/src/lib/     API client, SSE parser, ask-stream, moderation labels, SafeMarkdown helpers
frontend/src/services/ axios calls to the backend
```

## Rules that must not be broken

1. **This is production. Never put `SUPABASE_SERVICE_ROLE_KEY` on the server or in server code.** The server holds only the anon key and runs every request as its caller (the caller's token is forwarded, so row level security applies). The service-role key is read in one file, `backend/src/ops/privileged-client.ts`, used only by the three operator scripts on a developer machine. A test (`server-privileges.test.ts`) fails if a server file mentions it. When something needs more power than a user has, add a narrow `SECURITY DEFINER` function that checks the caller, not a bypass.
2. **Only repositories talk to Supabase.** Keep the layers: routes, controllers, services, repositories.
3. **Every database change is a new numbered file in `backend/sql/`** with a DOWN section, safe to run twice. Check `docs/database.md` for which files are applied. Do not change the production database yourself: the tools may be denied, and destructive statements (drop policy, revoke, delete) need the owner to run them.
4. **Never log a question, an answer or a post's text.** Log ids, decisions, rule names and timings.
5. **Never render model output as HTML.** Use `SafeMarkdown` (no raw HTML, no images, only links to `/post/<id>`).
6. **Untrusted text is data.** Posts, questions and chat history are escaped and wrapped in delimiters in prompts (`backend/src/ai/prompts.ts`). Do not weaken that.
7. **Moderation fails safe.** A failed or unsure check holds the item, never publishes it. An admin's rejection is final (the database enforces it).
8. **Every new environment variable goes into the matching `.env.example`** with a comment. Never commit a `.env`, a password or a key.
9. **Update the docs in the same change.** If behaviour, an endpoint, a table or a script changes, update the matching page in `docs/` (and test counts in `docs/development.md`).

## Commands

```bash
# backend (cd backend)
bun install
bun run dev                  # http://localhost:3030, API docs at /openapi
bun test src                 # all backend tests, no network or secrets needed
bunx tsc --noEmit            # typecheck
bun run ai:reindex           # operator: embed posts (needs the service-role key in LOCAL .env)

# frontend (cd frontend)
bun install
bun run dev                  # http://localhost:3000
bun run test                 # vitest
bunx tsc --noEmit && bun run lint
```

CI (`.github/workflows/ci.yml`) runs typecheck, tests and build for both parts on every push.

## Working conventions

- **Commit messages are short and plain:** `type(scope): summary`, optionally one or two body lines. Never add `Co-Authored-By` or any attribution line.
- **Never push or deploy** unless the owner asks.
- Every new AI call must be recorded in `ai_usage` (counts and ids only, via `recordUsage` in `backend/src/services/ai/usage-service.ts`).
- Add or update tests with every change. Tests must not call real models or the real database; use fakes.
- The chat model deployment is limited to **15 requests per minute**, shared by Ask RuamLem and moderation. Do not add test loops that call it.
- Testing against a real account: ask the owner. Pass credentials inline in a command and never write them to a file, a commit or memory.
- Thai is the main user language. Keep user-facing text in Thai unless the surrounding text is English.

## Things to know before you guess

- Most endpoints answer HTTP 200 with the error in the body (`{ status, message }`). `/ai/ask` is the exception: real status codes and an SSE stream.
- The two kill switches are `AI_ENABLED` and `AI_MODERATION_ENABLED` (backend) and `NEXT_PUBLIC_AI_ENABLED` (frontend, shows `/ask`). With moderation off, items already held or rejected stay hidden because the database enforces it.
- The original tables (profiles, posts, comments, files, tags, post_tags, post_likes) were created by hand in the Supabase dashboard and are not scripted; their columns are in `docs/database.md`. The AI tables and all policies are in `backend/sql/`.
- A post's category is its first tag. Tags are created on demand and removed when unused (`delete_unused_tags`).
- Known gaps and the reasoning behind choices are in `docs/security.md`; check it before "fixing" something that looks odd.
