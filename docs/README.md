# RuamLem documentation

These pages explain how RuamLem works, in detail. They are written for developers who will change the code and for anyone who wants to review how it is built. For a short, non-technical overview, start with the [main README](../README.md).

## The documents

| Document | Read it to learn |
|---|---|
| [Architecture](architecture.md) | The pieces of the system, where each one runs, how a request travels through the backend, how sign-in works, and how the frontend is organised |
| [Database](database.md) | Every table and column, how they relate, the storage buckets, the SQL files and what each one changes |
| [API reference](api.md) | Every backend endpoint: method, path, who may call it, and what it expects |
| [Ask RuamLem](ask-ruamlem.md) | The question-answering feature: how posts are indexed, searched and turned into a streamed answer with citations |
| [AI moderation](moderation.md) | How new posts and comments are checked, who can see what, appeals, the admin queue, and how accurate it is |
| [Security](security.md) | What protects users and data, the results of a database access audit, and the known gaps |
| [Development and operations](development.md) | Setting up a machine, environment variables, scripts, tests, CI, deploying, and fixing common problems |

A good reading order for someone new: **Architecture**, then **Database**, then whichever feature you will work on.

## Words used in these pages

| Word | Meaning here |
|---|---|
| **Frontend** | The website the user sees, in `frontend/` (Next.js). It runs in the browser and calls the backend. |
| **Backend** | The server program in `backend/` (Bun + Elysia). It keeps the Azure secrets and is the only part that talks to Azure. It reaches the database as the signed-in user, never with an all-powerful key. |
| **Supabase** | The hosted service that provides the Postgres database, user accounts (Auth) and file storage. |
| **Embedding** | A list of 1536 numbers that represents the meaning of a piece of text. Texts with similar meaning have similar embeddings. |
| **Vector search / pgvector** | Finding the stored embeddings closest to a new one. `pgvector` is the Postgres extension that does it. |
| **RAG** | "Retrieval-augmented generation": first find relevant posts, then ask the language model to answer using those posts. |
| **SSE** | Server-Sent Events: the server keeps the HTTP response open and sends the answer in small pieces as it is written. |
| **Content Safety** | An Azure service that scores text for hate, sexual content, violence and self-harm on a scale of 0, 2, 4 or 6. |
| **Structured output** | Asking the language model to reply only with JSON that matches a given schema. |
| **Held / rejected / published** | The three moderation states of a post or comment. Held means waiting for an admin. |
| **Kill switch** | An environment variable that turns a feature off completely (`AI_ENABLED`, `AI_MODERATION_ENABLED`). |
| **RLS (row level security)** | A Postgres feature that decides, row by row, which database user may read or change data. |
| **Anon key / service-role key** | Two Supabase API keys. The anon key is meant to be public and is limited by RLS. The service-role key bypasses RLS: RuamLem's server never holds it, and only operator scripts on a developer machine use it. |
| **Deployment (Azure)** | A named instance of a model inside an Azure OpenAI resource. Code refers to the deployment name, not the model name. |
