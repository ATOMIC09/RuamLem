# API reference

The backend is a JSON API. Locally it runs at `http://localhost:3030`. An interactive version of this list, generated from the code, is served at `/openapi`.

## How to read the tables

- **Who**: *Public* needs no token. *Signed in* needs `Authorization: Bearer <access token>`. *Owner* means signed in as the author of that post or comment. *Admin* means signed in with the `admin` role.
- **Public reads and moderation.** The public read endpoints marked with \* return only published posts and comments. If the request carries a valid token, the caller's own held and rejected items are included too, with their `moderation_status` and `moderation_reason`. A post the caller may not see is answered exactly like a post that does not exist. The database enforces this with row level security, and the backend adds its own filter while moderation is on.
- **Responses.** Most endpoints answer HTTP 200 and report the outcome in the body: `{ status: 200, data }`, `{ success: true, ... }` or `{ status: 4xx/500, message }`, `{ error }`. Invalid request bodies get HTTP 422. `/ai/ask` uses real HTTP status codes and streams its answer.
- The `/auth/signUp` and `/auth/signIn` bodies are RSA-encrypted JSON (see [architecture.md](architecture.md#accounts-and-sign-in)).

## Accounts

| Method | Path | Who | Body | Result |
|---|---|---|---|---|
| POST | `/auth/signUp` | Public | `{ data }`: encrypted `{ email, firstName, lastName, password }` | Creates the account and sends a confirmation email. Password: 8 or more characters, at least one letter and one digit. |
| POST | `/auth/signIn` | Public | `{ data }`: encrypted `{ email, password }` | `{ success, uuid, firstName, lastName, avatarUrl, bio, userRole, session }` |
| POST | `/auth/signOut` | Signed in | | Ends the session |
| POST | `/auth/forget` | Public | `{ email }` | Sends a password-reset email |
| POST | `/auth/verify-reset-token` | Public | `{ token }` | Checks a reset link and returns the user's name |
| POST | `/auth/reset-password` | Public, with a reset token | `{ token, newPassword }` | Sets the new password |

## Posts and comments

| Method | Path | Who | Body | Result |
|---|---|---|---|---|
| POST | `/post` | Signed in | `{ title (1-255), body, tag (1-50), fileNames? (up to 10) }` | `{ status: 200, postId, tagId }`. With moderation on, also `moderation: { status, reason }`. |
| PUT | `/post/:postId` | Owner | `{ title, body, tag }` | Updates the post. With moderation on, the new text is checked again and `moderation` is returned. A post rejected by an admin cannot be edited. |
| DELETE | `/post/:postId` | Owner | | Deletes the post, its files (storage and rows), comments and tag links |
| POST | `/post/getPost` | Public\* | `{ count? (1-100) }` | Newest posts first, with author, files, tags and comment count |
| POST | `/post/getPostAfter` | Public\* | `{ lastId, count? }` | The next page: posts with an id below `lastId` |
| POST | `/post/getPostFilter` | Public\* | `{ tags, count? }` | Posts with the given tag name |
| POST | `/post/id` | Public\* | `{ postId }` | One post |
| GET | `/post/tags` | Public | | Every tag |
| POST | `/post/comment` | Signed in | `{ postId (string), body }` | `{ status: 200, message: <comment> }`. With moderation on, also `moderation`. |
| POST | `/post/getComment` | Public\* | `{ postId }` | Comments, newest first |
| POST | `/post/:id/appeal` | Owner | | Sends a post the AI rejected to an admin. See [moderation.md](moderation.md#appeals). |
| POST | `/post/comment/:id/appeal` | Owner | | The same for a comment |

## Files

| Method | Path | Who | Body | Result |
|---|---|---|---|---|
| POST | `/upload/file/post/:postId` | Owner | multipart `file` | Attaches a file. Up to 10 per post, 50 MB each, and only pdf, doc, docx, ppt, pptx, jpg, jpeg, png or txt whose first bytes match the extension. With moderation on, a file name containing a phone number or national ID holds the post. |
| POST | `/upload/file` | Signed in | multipart `file` | Uploads a file not linked to any post (same checks). The website does not use it. |
| GET | `/download/file?filename=` | Public | | `{ success, url }`: a signed download URL valid for 60 seconds |
| DELETE | `/file/:fileId` | Owner | `{ postId }` | Removes one file from a post |
| DELETE | `/files` | Owner | `{ fileIds, postId }` | Removes several files from a post |

## Profile

| Method | Path | Who | Body | Result |
|---|---|---|---|---|
| GET | `/profile` | Signed in | | Your profile |
| PUT | `/profile` | Signed in | `{ firstName?, lastName?, bio?, avatarUrl? }` | Updates your profile |
| POST | `/profile/avatar/upload` | Signed in | multipart `file` | JPEG, PNG, WebP or GIF up to 10 MB, stored in the `avatars` bucket |

## Likes, views and downloads

| Method | Path | Who | Body | Result |
|---|---|---|---|---|
| POST | `/like/toggle` | Signed in | `{ postId }` | Likes or unlikes |
| POST | `/like/status` | Public (token optional) | `{ postId }` | `{ isLiked, likeCount }` |
| POST | `/like/multiple` | Public | `{ postIds }` | Like counts for several posts |
| POST | `/analytics/view` | Public (token optional) | `{ postId }` | Records a view, at most once per user or IP address per 24 hours |
| POST | `/analytics/view/count` | Public | `{ postId }` | View count |
| POST | `/analytics/view/multiple` | Public | `{ postIds }` | View counts |
| POST | `/analytics/download` | Public (token optional) | `{ fileId, postId }` | Records a download |
| POST | `/analytics/download/count` | Public | `{ fileId }` | Download count |
| POST | `/analytics/download/multiple` | Public | `{ fileIds }` | Download counts |
| GET | `/stats` | Public | | Totals: posts, members, posts this month, comments, files, likes, views, downloads. With moderation on, post and comment totals count published items only. |

## Admin

| Method | Path | Who | Body | Result |
|---|---|---|---|---|
| GET | `/admin/users` | Admin | | Every user with email, role, and post and comment counts (from the `admin_list_users` database function) |
| DELETE | `/admin/users/:userId` | Admin | | Deletes the account and, through the database, everything it owns. Needs `admin_delete_user` from `sql/003b`. An admin cannot delete themselves. |
| PUT | `/admin/users/:userId/role` | Admin | `{ role: "user" or "admin" }` | `user` is stored as `member` |
| DELETE | `/admin/posts/:postId` | Admin | | Deletes any post |
| GET | `/admin/moderation` | Admin | | `{ enabled, data: [ ...held items ] }`, appealed items first. See [moderation.md](moderation.md#the-admin-queue). |
| POST | `/admin/moderation/:type/:id/approve` | Admin | | `type` is `post` or `comment`. Publishes the item. |
| POST | `/admin/moderation/:type/:id/reject` | Admin | | Rejects the item. This decision is final. |
| GET | `/admin/ai-usage?days=30` | Admin | | AI usage for the last 1 to 365 Thai calendar days: totals, by day, by feature and the top users, each with tokens and an estimated cost (`cost` is `null` when no price is set). See [ai-usage.md](ai-usage.md). |

## Ask RuamLem

| Method | Path | Who | Body | Result |
|---|---|---|---|---|
| POST | `/ai/ask` | Signed in | `{ question, history? }`: `question` is 1 to 500 characters, not only spaces. `history` is optional: up to 8 earlier messages `{ role: "user" or "assistant", content (up to 1500 characters) }`. | A `text/event-stream` response. Without a valid token: HTTP 401. Invalid body: HTTP 422. |

The stream sends these events, in this order:

| Event | Data | When |
|---|---|---|
| `sources` | `[{ n, postId, title }]` | First. An empty list means no post matched, and the answer that follows comes from the model's general knowledge. |
| `delta` | `{ text }` | Repeated: the next piece of the answer |
| `done` | `{ usage: { embeddingTokens, promptTokens, completionTokens, totalTokens }, ms }` | Last, on success |
| `error` | `{ code }` | Last, on failure. `code` is `rate_limited`, `content_filtered`, `unavailable` or `ai_disabled`. |

Details are in [ask-ruamlem.md](ask-ruamlem.md).
