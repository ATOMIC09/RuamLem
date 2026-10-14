# AI usage tracking

Every call to an AI service is recorded as one row: **who** used it, **which feature**, **how many tokens**, how long it took and how it ended. Admins see the numbers on `/admin` → **การใช้งาน AI**. The same records drive the daily limit for Ask RuamLem, and make a per-user token limit a one-line change.

**Privacy:** a row holds counts and ids only. It never holds a question, an answer or a post's text.

## What is recorded

| Feature | Recorded when | Tokens |
|---|---|---|
| `ask` | Each message in Ask RuamLem finishes, fails, is cut by the content filter, or is stopped by the user | Prompt and reply tokens of the chat model, plus the embedding tokens of the question. The row also says whether the answer came from posts or from general knowledge. |
| `moderation` | A post, an edited post or a comment is checked by the chat model | Prompt and reply tokens of the model check. Nothing is recorded when a phone number or ID hit skips the paid checks. |
| `embedding` | A post is indexed for Ask RuamLem | Embedding tokens. Attributed to whoever caused the indexing (the author, or the admin who approved the post). |

Not recorded: **Azure AI Content Safety** calls (it is billed per text record, not per token), and the operator scripts (`ai:reindex`, `ai:recheck`, `ai:moderation-eval`), which have no signed-in user.

Calls that failed or were stopped are recorded too, with an `outcome` (`ok`, `content_filtered`, `error` or `aborted`), because the tokens already spent are billed anyway.

## The table

`ai_usage`, created by `backend/sql/005_ai_usage.sql`:

| Column | Meaning |
|---|---|
| `id`, `created_at` | Row id and time |
| `user_id` | Who. Not a foreign key, so deleting an account keeps the totals. |
| `feature` | `ask`, `moderation` or `embedding` |
| `mode` | For `ask`: `posts` or `general` |
| `outcome` | `ok`, `content_filtered`, `error` or `aborted` |
| `model` | The deployment name used |
| `prompt_tokens`, `completion_tokens`, `embedding_tokens`, `total_tokens` | Token counts. `total_tokens` is the model's own total, which can include hidden reasoning tokens. |
| `latency_ms` | How long the call took |

### Who can do what

Row level security applies, and the backend writes each row **as the user who made the request** (no bypass key):

- A signed-in user can insert rows only for themselves and read only their own rows.
- An admin can read every row.
- Nobody can update or delete rows through the API.

### Keeping the table small, like a CCTV loop

Rows are kept for ever, up to about **200,000**. A trigger runs on every 1,000th insert and deletes everything older than the newest 200,000 ids. At roughly 100 bytes a row, that is about 20 to 30 MB. To change the cap, edit the number in `ai_usage_trim()` in the SQL file and run the file again.

## Daily limits

Ask RuamLem checks the user's usage for the **current Thai day** before answering. Over the limit gives the `rate_limited` message.

| Setting | Meaning | Default |
|---|---|---|
| `AI_DAILY_LIMIT_PER_USER` | Messages per user per day | 50 |
| `AI_DAILY_TOKEN_LIMIT_PER_USER` | Ask RuamLem tokens per user per day (prompt + reply + embedding). `0` means no token limit. | 0 |

Two guards work together:

1. **The database count** (the function `my_ask_usage_since`) is the real quota. It survives restarts and works with several server instances.
2. **A small in-memory counter** stops a burst of parallel requests, because a call is recorded only when it ends. It is also the fallback if the database cannot be read (for example before `005` has been run).

Moderation and indexing are not limited per user: they are triggered by posting, not by chatting.

## Estimated cost

The dashboard multiplies tokens by prices **per million tokens**, read from the backend environment:

| Variable | Meaning |
|---|---|
| `AI_PRICE_CHAT_INPUT_PER_MTOK` | Price of one million prompt tokens |
| `AI_PRICE_CHAT_OUTPUT_PER_MTOK` | Price of one million reply tokens |
| `AI_PRICE_EMBEDDING_PER_MTOK` | Price of one million embedding tokens |
| `AI_PRICE_CURRENCY` | Label only, default `USD` |

The cost is computed when the page is opened, not stored, so **changing a price re-prices all history** after the backend restarts. With no price set, the page shows tokens only and says the prices are not set, instead of showing a zero cost. Take the prices from your Azure price sheet for the deployed models, and treat the result as an estimate: Azure's bill is the truth.

## The dashboard

`/admin` → **การใช้งาน AI** (shown to admins when either AI feature is on). Pick today, 7, 30 or 90 days (Thai calendar days):

- **Cards:** number of calls and active users, total tokens (prompt, reply, embedding), estimated cost, and problems (errors and content-filter blocks) with the average time.
- **Tokens per day:** a stacked bar chart.
- **By feature:** calls, tokens and cost for chat, moderation and indexing.
- **Top users:** the 20 heaviest users with name, email, calls, tokens and cost.
- **Footer:** how many rows are stored and the age of the oldest one.

The endpoint is `GET /admin/ai-usage?days=30` (admin only, see [api.md](api.md)). It calls the database function `admin_ai_usage_summary`, which does the grouping in SQL and refuses anyone who is not an admin.

## Residual risk

A user who holds the server's anon key and their own token could write fake usage rows **for themselves**. That only raises their own count, but a flood could push other people's old rows out of the 200,000-row loop. The anon key is never sent to browsers, the columns have sanity limits, and the table is statistics, not a billing record. If it ever matters, move the write behind a database function that is called by the server only.

## Code

| What | Where |
|---|---|
| Table, policies, trim trigger, summary function | `backend/sql/005_ai_usage.sql` |
| Writing rows, tokens to row, cost, Thai day | `backend/src/services/ai/usage-service.ts`, `backend/src/repositories/usage-repo.ts` |
| Where calls are recorded | `ask-service.ts` (chat), `post-controller.ts` with `recordModerationUsage` (moderation), `embed-service.ts` (indexing) |
| Daily limits | `backend/src/services/ai/rate-limit.ts`, `backend/src/controllers/ai-controller.ts` |
| Dashboard | `frontend/src/app/components/ai/AiUsagePanel.tsx`, tab in `components/moderation/ModerationTabs.tsx` |
