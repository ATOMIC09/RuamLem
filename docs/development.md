# Development and operations

How to run RuamLem on your own machine, test it, deploy it, and fix the problems you are most likely to meet.

## What you need

- [Bun](https://bun.sh/) 1.3 or newer, used for both the frontend and the backend
- A [Supabase](https://supabase.com/) project
- For the AI features only: an Azure subscription with an Azure OpenAI resource (one chat deployment and one `text-embedding-3-small` deployment) and an Azure AI Content Safety resource
- `openssl`, to make the RSA key pair used to encrypt sign-in data

## First-time setup

### 1. Install

```bash
git clone https://github.com/ATOMIC09/RuamLem.git
cd RuamLem/backend && bun install
cd ../frontend && bun install
```

### 2. Prepare the database

The original tables (profiles, posts, comments, files, tags, post_tags, post_likes) were created by hand in the Supabase dashboard and are not scripted in this repository. Their columns are listed in [database.md](database.md#every-table). The analytics tables are scripted in [frontend/docs/SUPABASE_SETUP_ANALYTICS.md](../frontend/docs/SUPABASE_SETUP_ANALYTICS.md). Create two storage buckets: `exams` (private) and `avatars` (public).

Then run, in the Supabase SQL editor and in this order:

1. `backend/sql/001_ai_embeddings.sql`: turns on `pgvector`, adds `post_embeddings` and `match_posts()`
2. `backend/sql/002_moderation.sql`: adds the moderation columns and `moderation_log`
3. `backend/sql/003_database_hardening.sql`: row level security, policies, triggers and functions
4. `backend/sql/003b_finish_hardening.sql`: closes the old open policies and revokes extra privileges. Read it before running; it removes access on purpose.
5. `backend/sql/003c_owner_reads_own_uploads.sql`: lets uploaders see and delete their own unlinked exam files
6. `backend/sql/004_cleanup_unused_tags.sql`: removes a tag when its last post goes away
7. `backend/sql/005_ai_usage.sql`: the AI usage table, the daily-limit counter and the dashboard function
8. `backend/sql/006_keyword_search.sql`: the keyword search that finds posts by a teacher's name or a rare word

The backend of this version needs `003` (it calls the functions it adds), and an older backend stops being able to write once `003` is on, so deploy this version first. See [security.md](security.md).

Each file ends with a commented section that undoes it.

### 3. Make the RSA key pair

```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out private.pem
openssl rsa -pubout -in private.pem -out public.pem
```

Put the private key in `backend/.env` as `RSA_PRIVATE_KEY`, on one line with `\n` where the line breaks were. Put the public key in `frontend/.env` as `NEXT_PUBLIC_RSA_PUBLIC_KEY`, inside double quotes. Do not commit either file.

### 4. Environment variables

Copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to `frontend/.env`, then fill them in.

**Backend**

| Variable | Needed for | Notes |
|---|---|---|
| `SUPABASE_URL` | Everything | |
| `SUPABASE_KEY` | Everything | The anon key. Used for sign-in and token checks. |
| `SUPABASE_SERVICE_ROLE_KEY` | Operator scripts only | **Do not set this on the server or on Render.** Only `ai:reindex`, `ai:recheck` and `ai:moderation-eval` read it, on your own machine. The server runs on the anon key and the caller's token. |
| `RSA_PRIVATE_KEY` | Sign-in and sign-up | |
| `FRONTEND_URL` | CORS, email links | For example `http://localhost:3000` |
| `AI_ENABLED` | Ask RuamLem | Kill switch, `false` by default |
| `AI_MODERATION_ENABLED` | Moderation | Kill switch, `false` by default |
| `AZURE_OPENAI_ENDPOINT` | Both AI features | The v1 endpoint: `https://<resource>.openai.azure.com/openai/v1/` |
| `AZURE_OPENAI_API_KEY` | Both AI features | |
| `AZURE_OPENAI_CHAT_DEPLOYMENT` | Both AI features | The deployment **name**, not the model name |
| `AZURE_OPENAI_EMBED_DEPLOYMENT` | Ask RuamLem | The deployment name of `text-embedding-3-small` |
| `AZURE_CONTENT_SAFETY_ENDPOINT`, `AZURE_CONTENT_SAFETY_KEY` | Moderation | |
| `AI_DAILY_LIMIT_PER_USER` | Ask RuamLem | Messages per user per day, default 50 (counted in the database) |
| `AI_DAILY_TOKEN_LIMIT_PER_USER` | Ask RuamLem | Optional tokens per user per day. 0 or empty means no limit. |
| `AI_PRICE_CURRENCY`, `AI_PRICE_CHAT_INPUT_PER_MTOK`, `AI_PRICE_CHAT_OUTPUT_PER_MTOK`, `AI_PRICE_EMBEDDING_PER_MTOK` | Usage dashboard | Prices per million tokens for the estimated cost. Empty means tokens only. See [ai-usage.md](ai-usage.md). |

**Frontend**

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_API_URL` | The backend address, for example `http://localhost:3030` |
| `NEXT_PUBLIC_RSA_PUBLIC_KEY` | The public half of the RSA key pair |
| `NEXT_PUBLIC_AI_ENABLED` | Shows the `/ask` page. Everything starting with `NEXT_PUBLIC_` is visible in the browser, so never put a secret here. |

### 5. Run

```bash
cd backend && bun run dev      # http://localhost:3030, API docs at /openapi
cd frontend && bun run dev     # http://localhost:3000
```

The backend restarts by itself when a source file changes. It reads `.env` only when it starts, so restart it after changing `.env`.

### 6. Turn on the AI features (optional)

1. Fill in the Azure variables and set `AI_ENABLED=true`, `AI_MODERATION_ENABLED=true` and `NEXT_PUBLIC_AI_ENABLED=true`.
2. Restart both servers.
3. Run `bun run ai:reindex` in `backend/` once, so the existing posts can be found by Ask RuamLem.

Student Azure subscriptions often have no quota for some models. Check **Usage + quotas** before relying on a deployment, and set a budget alert on the resource group.

## Scripts

**Backend** (`cd backend`)

| Command | What it does |
|---|---|
| `bun run dev` | Starts the API and restarts it when code changes |
| `bun run build` / `bun run start` | Builds into `dist/` and runs the build (used by the Docker image) |
| `bun run test` | Runs every automated backend test (`bun test src`). Needs no network and no secrets. |
| `bun run ai:reindex` | Embeds every post that is missing or changed, for Ask RuamLem. Safe to repeat. `--force` re-embeds everything. Operator script: needs `SUPABASE_SERVICE_ROLE_KEY` in your local `.env`. |
| `bun run ai:recheck` | Re-runs moderation for items held only because a check failed |
| `bun run ai:moderation-eval` | Measures moderation on the labelled set. Options: `--verbose` (every item), `--strict` (exit with an error if bad content was published or good content rejected), `--rpm=12` (requests per minute), `--out=file.json` (save decisions, without any text) |

**Frontend** (`cd frontend`)

| Command | What it does |
|---|---|
| `bun run dev` | Starts the site with hot reload |
| `bun run build` / `bun run start` | Production build and server |
| `bun run lint` | ESLint |
| `bun run test` | Vitest and Testing Library |

## Tests

| Where | Count | What they cover |
|---|---|---|
| `backend/src/**/*.test.ts` | 402 tests in 25 files | Per-request tokens (including 40 interleaved requests), a guard that no server file mentions the service-role key, prompts and escaping, citations, keyword pieces, the hijack guard (blocked and allowed phrases), SSE, the Ask flow with a fake model (both modes, history, keyword hits), the daily limits, usage recording and cost estimate, error classification, file-type checks, Thai ID and phone rules, the moderation schema, decision, service, actions, recheck and eval scoring, the visibility rule, and the post read paths against an in-memory database |
| `frontend/src/**/*.test.ts(x)` | 141 tests in 13 files | `SafeMarkdown` against XSS payloads, the SSE parser, the stream client, the chat hook, the history builder and the saved-chat store (limits, quota, broken data), the ask form and answer states, the moderation labels, notice, queue and tabs |

No test calls a real model or the real database. Anything that needs a service gets a fake.

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request, in two jobs:

- **Backend:** install (with the lockfile frozen), typecheck, test, build
- **Frontend:** install, typecheck, lint, test, build

It uses no secrets. The status badge is at the top of the main README.

## Deploying

| Part | Where | Notes |
|---|---|---|
| Backend | Render, from `backend/Dockerfile` | The server listens on port **3030** (fixed in code). Set the backend variables above in Render. |
| Frontend | Vercel | Set the frontend variables. `NEXT_PUBLIC_API_URL` must point at the Render address. |

Before turning on an AI feature in production:

1. Add the Azure variables to Render. **Do not add `SUPABASE_SERVICE_ROLE_KEY`.** The server only needs `SUPABASE_URL` and the anon key `SUPABASE_KEY`.
2. Make sure the SQL files `001`, `002` and `003` have been run.
3. Deploy this version, then set the kill switches to `true`.
4. Run `ai:reindex` once from your own machine.
5. Run `003b`, `003c`, `004`, `005` and `006` from `backend/sql/` (in that order) if you have not yet.

Row level security is on, so a backend from before this change (which sent no user token) can no longer write. Deploy this version before relying on the site.

## Capacity

The chat deployment on the student subscription allows **15 requests and 15,000 tokens per minute**. Each Ask RuamLem question and each moderated post, edit or comment uses one request.

- When moderation goes over the limit, new items are held with the reason `check_failed`. That is the safe failure: nothing is published unchecked. Run `bun run ai:recheck` afterwards.
- When Ask RuamLem goes over the limit, the user sees "temporarily unavailable" (`unavailable`).
- More capacity means raising the deployment's quota in Azure.

## When something goes wrong

| Symptom | Likely cause | What to do |
|---|---|---|
| New posts all wait as "under review" with `check_failed` | Azure rate limit (HTTP 429), an outage, or a wrong Azure variable | Check the backend log for `moderation check failed` and its status. Fix the cause, then run `bun run ai:recheck`. |
| Ask RuamLem always gives general answers and never cites posts | The index is empty, or the posts are not published | Run `bun run ai:reindex` |
| Asking for a teacher's name or a rare word finds nothing | `sql/006` has not been run (the keyword search is missing), or no published post contains that text | Run `006`. The backend log says `keyword_match_posts failed` when the function is missing. |
| Ask RuamLem answers "AI disabled" | `AI_ENABLED` is not `true`, or the backend was not restarted | Set it and restart |
| Ask RuamLem shows a content-filter message | Azure's filter blocked the question or one of the posts it found | Expected for harmful text. If it keeps happening for normal questions, look for a hostile post in the results and hold it. |
| The `/ask` page shows 404 | `NEXT_PUBLIC_AI_ENABLED` is not `true` | Set it and restart the frontend |
| Sign-in fails right after setting up | The RSA keys do not match, or `NEXT_PUBLIC_RSA_PUBLIC_KEY` is missing (the browser then sends unencrypted data the backend cannot read) | Regenerate the pair and set both halves |
| The Moderation tab does not appear on `/admin` | Moderation is off, or your account is not an admin | Set `AI_MODERATION_ENABLED=true`, check `profiles.user_role` |
| The admin user list is empty or fails | `sql/003` is not applied (the `admin_list_users` function is missing), or you are not an admin | Run `003`, check `profiles.user_role` |
| Every write fails with a permission error right after turning RLS on | The backend is an old version that sends no user token | Deploy this version |
| An operator script says the service-role key is missing | It is only read from your local `backend/.env` | Add it there, never on the server |
| An upload is refused with "File content does not match its extension" | The file was renamed, or it is corrupt | Upload the real file type |

## Working on the code

- Keep the four backend layers: routes, controllers, services, repositories. Only repositories talk to Supabase.
- Put AI building blocks in `backend/src/ai/` and feature logic in `backend/src/services/ai/`.
- Never log a question, an answer or a post's text: log ids, decisions and timings.
- Never put model output into the page as HTML. Use `SafeMarkdown`.
- Every new environment variable goes into the matching `.env.example` with a comment.
- Every database change goes into a new numbered file in `backend/sql/`, with its undo section.
- Commit messages are short: `type(scope): summary`, for example `fix(backend): reject empty uploads`.

## Dependencies

- Dependabot opens weekly PRs for both packages (`.github/dependabot.yml`).
- The **frontend stays on TypeScript 6**: `typescript-eslint` (used by `eslint-config-next`) does not support TypeScript 7 yet. Dependabot ignores TypeScript major updates in `frontend/`; lift that when typescript-eslint supports 7.
- The backend uses TypeScript 7 with `moduleResolution: "bundler"`.
- `eslint-config-next` 16 turns on React Compiler rules. `react-hooks/immutability`, `set-state-in-effect` and `preserve-manual-memoization` are set to `warn` in `frontend/eslint.config.mjs` because existing pages trip them; fix the warnings page by page.
