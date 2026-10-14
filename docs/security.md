# Security

This page lists what protects RuamLem's users and data, what an audit of the database found, how that was fixed, and what is still open.

## The rule for production

**The production server does not hold a key that bypasses the database's protections.** Every request runs as the signed-in person who sent it, and the database decides, row by row, what that person may read and change. The key that bypasses this (Supabase's *service-role key*) exists only on a developer's own machine, for three maintenance scripts. A test fails if any server code mentions it.

## What protects users today

| Risk | Protection | Where |
|---|---|---|
| **A powerful key on the server** | The server holds only the public anon key. Each request forwards the caller's own access token, so row level security applies to every call. | `backend/src/request-context.ts`, `backend/src/supabase.ts` |
| **One user's token reaching another user's request** | The token lives in a per-request store (`AsyncLocalStorage`). A test fires 40 interleaved requests, some anonymous and some with expired tokens, and checks that every database call carried exactly its own request's token. | `backend/src/request-context.test.ts` |
| **A stale browser token breaking public pages** | An expired or malformed token is treated as "not signed in", so public pages keep working. | `usableToken()` in `request-context.ts` |
| **Secrets leaking to the browser** | Every Azure and Supabase secret stays on the backend. The browser only calls the backend API. | `backend/src/ai/client.ts` |
| **Dangerous uploads** | Only pdf, doc, docx, ppt, pptx, jpg, jpeg, png and txt, and only when the first bytes match the extension (`%PDF`, `PK`, the Office, JPEG and PNG signatures, or valid UTF-8 text with no control characters). A renamed `.exe` is rejected. | `backend/src/utils/file-validation.ts` |
| **A file served as something else** | The stored content type comes from the validated type, never from the browser, so HTML uploaded as `photo.png` is never served as a web page. | same |
| **Script injection through AI answers (XSS)** | `SafeMarkdown` shows the model's text without parsing HTML, drops images, and keeps only links to RuamLem's own `/post/<id>` pages. This matters because the session token sits in `localStorage`. | `frontend/src/app/components/ai/SafeMarkdown.tsx` |
| **Prompt injection** | Posts, questions and earlier chat turns are escaped and wrapped as data, and the rules say they are data, never instructions. Azure's jailbreak filter is a final answer: in moderation the item is held for a person, and it is never retried on another model. | `backend/src/ai/prompts.ts` |
| **Hijacking the chatbot** ("act as ...", "ignore your instructions") | A pattern check refuses the obvious attempts in English and Thai before any paid call. The general-mode prompt limits the assistant to studying and RuamLem, and forbids changing its role. The model has no tools and no secrets to leak. | `backend/src/ai/guard.ts`, `backend/src/ai/prompts.ts` |
| **A fake chat history** | The conversation sent by the browser is escaped like everything else, so a forged "assistant" turn cannot close the block or add a fake source. | same |
| **Made-up citations** | Citations to sources that were not sent are removed while the answer streams. | `backend/src/ai/citations.ts` |
| **Sensitive data in logs** | AI code logs ids, decisions, rule names, token counts and timings, never a question, an answer or a post. Tests check this. | `backend/src/services/ai/*` |
| **Personal data in posts** | Phone numbers and Thai national IDs hold a post or comment for review, even inside a file name. | `backend/src/ai/pii.ts` |
| **Hidden content leaking** | Held and rejected items are hidden by the database policies and by the backend's filters, and they are removed from the Ask RuamLem index. | `backend/src/utils/visibility.ts`, `sql/003` |
| **Credentials in transit** | Sign-in and sign-up data is RSA-encrypted in the browser, on top of HTTPS. | `frontend/src/lib/crypto.ts` |
| **Cost abuse** | Ask RuamLem needs a signed-in user and allows 50 messages per user per day, plus an optional token limit. The quota is counted in the database (`ai_usage`), so a restart does not reset it. Messages are capped at 500 characters and the history at 8 messages. Admins can see who uses how many tokens. | `backend/src/services/ai/rate-limit.ts`, [ai-usage.md](ai-usage.md) |

## What the database enforces

Row level security is **on for every table**, with policies written in `backend/sql/003_database_hardening.sql`. The two database roles are `anon` (not signed in) and `authenticated` (signed in).

| Who | What the policies allow |
|---|---|
| Everyone | Read published posts and comments, profiles, tags, likes, and the search index entries of published posts. Get a download link for a file only while its post is visible to them. |
| A signed-in user | Create posts, comments, files, tags and likes **as themselves**; edit and delete their own; see their own held and rejected items; upload files and delete their own uploads; write only inside their own avatar folder. |
| An admin | Read and change everything the admin and moderation screens need, including held items, the audit log, roles, and other people's posts and files. |
| Nobody but an admin | Change a role. Read the audit log. See the user list with email addresses. |

Things the database refuses even if the backend had a bug:

- Creating, editing or deleting someone else's post, comment, file, like or profile.
- Making yourself an admin, or changing a profile's id.
- Overturning an admin's rejection. A trigger blocks any change to a post or comment that an admin rejected.
- Writing an audit-log entry about someone else's content, or in an admin's name.
- Reading the visitor logs (`post_views`, `file_downloads`, which hold IP addresses). Counts go through small functions that return only numbers.
- Truncating or altering tables through the API.

### Narrow functions instead of a bypass

A few things need more power than a normal user has. Each is a small database function that checks who is calling:

| Function | Who may call it | What it does |
|---|---|---|
| `is_admin()` | everyone | True when the caller has the `admin` role |
| `record_post_view`, `record_file_download` | everyone | Record one event (once per 24 hours per user or IP address for views), only for visible posts |
| `post_view_counts`, `file_download_counts`, `engagement_totals` | everyone | Return counts only |
| `admin_list_users` | admins | The user list with email addresses (they live in `auth.users`) |
| `admin_delete_user` | admins | Deletes an account (cannot delete yourself) |
| `match_posts` | everyone | The Ask RuamLem search, which only sees published posts because the search index is protected too |

A trigger on `auth.users` creates each new account's profile (the sign-up has no session yet, so the backend cannot insert it as the user).

## Database access audit

The Supabase security advisor reported RLS switched off on seven tables, and reading the policies showed more open doors. The audit measured what someone holding **only the public anon key** could do, counting rows and never reading their contents.

| Action with only the anon key | Before the fix |
|---|---|
| Read all 11 user profiles, every post, comment, file record, tag and tag link, and every view and download record | Possible |
| Insert rows (for example a new tag, or fake post views) | Possible |
| List, download, upload, overwrite and delete exam files; write to the avatars bucket | Possible |
| Anon and signed-in roles held every table privilege, even `TRUNCATE` | Yes |
| Read `post_embeddings` or `moderation_log` | Refused (these were already locked) |

### The fix, step by step

1. **Code (done, committed).** The server runs every request as its caller (above). Analytics and the admin features moved to database functions. The service-role key left the server entirely.
2. **Database, part one (applied to the live project):** `sql/003_database_hardening.sql`: RLS on everywhere, every policy, both guard triggers, the sign-up trigger, the functions, and the new storage policies.
3. **Database, part two (applied): `sql/003b_finish_hardening.sql`.** It removed the old open policies on the visitor logs and both storage buckets, cut the table privileges back to what each role needs, and added `admin_delete_user`. The assistant that wrote it was not permitted to run these statements (they remove access), so the owner ran it by hand after reading it.
4. **Database, part three (applied): `sql/003c_owner_reads_own_uploads.sql`.** The matrix found that a member could not delete a file they had just uploaded (Storage deletes also need read access, and the file was not linked to a post yet). It adds a policy for that and removes anon's access to the two admin functions.

### How it was tested

- **A policy matrix** (`77 checks`) talks to Supabase directly with real tokens, bypassing the backend, as a visitor, as two ordinary members and as the admin. With part one applied, **66 of 77 passed**, and the 11 that failed were exactly the ones that part two fixes (the visitor-log tables and the storage buckets). After `003b` it passed 76, and after `003c` **all 77**.
- **Every feature, through the real API with the server holding no service-role key:** the backend smoke test (26 checks), the moderation API test (44), the upload test (8), and two browser tests (Ask RuamLem chat, 15; moderation screens, 18).
- **Code rules:** a test fails if any server file mentions the service-role key or uses the auth admin API, or if a script is imported by the server.

### Turning moderation off

With `AI_MODERATION_ENABLED=false` the backend stops screening new content and new posts are published at once. Items that were **already held or rejected stay hidden**, because the database policies hide them regardless of the switch. An admin can approve them after turning moderation back on.

## Known gaps

| Gap | Why it matters | Suggested fix |
|---|---|---|
| A signed-in author can mark their own post as published directly in the database | The AI decision is enforced by the backend. A user who also held the server's anon key (which is never sent to browsers) and their own token could skip it. The database does stop them overturning an admin's rejection. | Keep the anon key private. For stronger enforcement, have the database accept only signed moderation decisions. |
| The session token is stored in `localStorage` | Any script injected into the page could read it | Move it to an httpOnly cookie |
| Password reset uses one shared Supabase client (`setSession`, then `updateUser`) | Two resets at the same moment could interfere | Create a client per request for that flow |
| A user holding the server's anon key and their own token could write fake `ai_usage` rows for themselves | They only raise their own count, but a flood could push other people's old rows out of the 200,000-row loop | Keep the anon key private. See [ai-usage.md](ai-usage.md#residual-risk). |
| File contents are not scanned | Personal data inside a PDF or an image is not detected | Out of scope for now |
| Most endpoints answer HTTP 200 with the error in the body | Monitoring tools see every failure as a success | Return real status codes |
| Existing exam files were uploaded before ownership was tracked | `003` gives them their authors as owners, but files with no matching `files` row have no owner | Review storage for orphaned files |
