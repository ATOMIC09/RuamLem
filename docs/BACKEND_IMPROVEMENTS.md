# Backend Improvements for Error Handling

## Issue
The backend has inconsistent error response formats across different endpoints, making it difficult for the frontend to handle errors reliably.

## Current Problems

1. **Inconsistent Response Format**
   - Some endpoints return: `{ status: 400, message: "..." }`
   - Some return: `{ success: false, message: "..." }`
   - Some catch-blocks return: `{ status: 500, message: "...", error: "..." }`

2. **Missing Input Validation**
   - POST /post doesn't validate title/body/tag fields
   - Only checks for file existence

3. **Unclear Error Messages**
   - Some errors are technical ("No file uploaded")
   - No distinction between client errors (4xx) and server errors (5xx)

## Proposed Solution

### 1. Create Error Response Utility

Create `src/utils/error-handler.ts`:

```typescript
export interface ApiResponse<T = any> {
  status: number;
  success: boolean;
  message: string;
  data?: T;
  error?: string; // For additional error details
}

export class ValidationError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function errorResponse(
  statusCode: number,
  message: string,
  error?: any
): ApiResponse {
  return {
    status: statusCode,
    success: false,
    message,
    error: error?.message || undefined,
  };
}

export function successResponse<T>(
  data: T,
  message: string = "Success"
): ApiResponse<T> {
  return {
    status: 200,
    success: true,
    message,
    data,
  };
}
```

### 2. Update POST /post Endpoint

**File**: `src/routes/post-route.ts`

```typescript
import { errorResponse, successResponse, ValidationError } from "../utils/error-handler";

app.post("/post", async (c) => {
    try {
        const authHeader = c.request.headers.get("authorization");
        if (!authHeader) {
            return errorResponse(401, "Unauthorized: No authentication token provided");
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            return errorResponse(401, "Unauthorized: Invalid token format");
        }

        const formData = await c.request.formData();
        const file = formData.get("pdf") as File;
        const title = formData.get("title") as string;
        const body = formData.get("body") as string;
        const tag = formData.get("tag") as string;

        // Validate all fields
        if (!title?.trim()) {
            return errorResponse(400, "Validation Error: Title is required");
        }

        if (!tag?.trim()) {
            return errorResponse(400, "Validation Error: At least one tag is required");
        }

        if (!file) {
            return errorResponse(400, "Validation Error: PDF file is required");
        }

        if (file.type !== "application/pdf") {
            return errorResponse(400, "Validation Error: Only PDF files are accepted");
        }

        if (file.size > 50 * 1024 * 1024) { // 50MB limit
            return errorResponse(400, "Validation Error: File size exceeds 50MB limit");
        }

        const result = await post(token, title, body, tag, file);
        
        if (!result.success) {
            return errorResponse(
                result.status || 500,
                result.message || "Failed to create post"
            );
        }

        return successResponse(result, result.message);
    } catch (err: any) {
        console.error("POST /post error:", err);
        return errorResponse(500, "Internal server error", err);
    }
}, {
    detail: {
        tags: ['Posts'],
        summary: 'Create Post',
        description: 'Create a new post with PDF attachment',
        security: [{ bearerAuth: [] }]
    }
});
```

### 3. Update POST /comment Endpoint

```typescript
app.post("/comment", async ({ request, body }) => {
    try {
        const authHeader = request.headers.get("authorization");
        if (!authHeader) {
            return errorResponse(401, "Unauthorized: No authentication token provided");
        }

        const token = authHeader.split(" ")[1];

        if (!body.post_id) {
            return errorResponse(400, "Validation Error: post_id is required");
        }

        if (!body.post_body?.trim()) {
            return errorResponse(400, "Validation Error: Comment body is required");
        }

        const result = await comment(token, body.post_id, body.post_body);
        
        if (!result.success) {
            return errorResponse(result.status || 500, result.message);
        }

        return successResponse(result, result.message);
    } catch (err: any) {
        console.error("POST /comment error:", err);
        return errorResponse(500, "Internal server error", err);
    }
}, {
    body: t.Object({
        post_id: t.String({ description: "ID of the post to comment on" }),
        post_body: t.String({ description: "Comment content (required)" })
    }),
    detail: {
        tags: ['Posts'],
        summary: 'Add Comment',
        description: 'Add a comment to a post',
        security: [{ bearerAuth: [] }]
    }
});
```

### 4. Update Controller Error Handling

**File**: `src/controllers/post-controller.ts`

```typescript
export async function post(token: string, title: string, body: string, tag: string, file: File) {
    try {
        if (!title?.trim()) {
            return { success: false, status: 400, message: "Title is required" };
        }

        if (!tag?.trim()) {
            return { success: false, status: 400, message: "At least one tag is required" };
        }

        if (file.type !== "application/pdf") {
            return { success: false, status: 400, message: "Only PDF files are allowed" };
        }

        const { data: user, error } = await supabase.auth.getClaims(token);
        if (error || !user) {
            return { success: false, status: 401, message: "Invalid or expired authentication token" };
        }

        const userId = user.claims.sub;

        const postResult = await uploadPost(userId, title, body, tag);
        if (postResult.status !== 200) {
            return { success: false, status: postResult.status, message: postResult.message || "Failed to create post" };
        }

        const fileResult = await uploadPDF(file, userId, postResult.postId);
        if (!fileResult.success) {
            // Rollback post on file upload failure
            await supabase.from("post_tags").delete().eq("post_id", postResult.postId);
            await supabase.from("posts").delete().eq("id", postResult.postId);
            
            return {
                success: false,
                status: 500,
                message: "Failed to upload file. Post creation rolled back.",
                error: fileResult.error
            };
        }

        return {
            success: true,
            status: 200,
            message: "Post and PDF uploaded successfully",
            postId: postResult.postId,
            filePath: fileResult.path
        };
    } catch (err: any) {
        console.error("Error in post controller:", err);
        return {
            success: false,
            status: 500,
            message: "Internal server error",
            error: err.message
        };
    }
}
```

## Benefits

✅ **Consistency**: All endpoints return same response format
✅ **Clear Errors**: Frontend knows exactly what went wrong
✅ **Better Debugging**: Detailed error messages for developers
✅ **Input Validation**: Catch invalid data early
✅ **Security**: Better error handling prevents info leakage
✅ **Maintainability**: Centralized error handling

## Migration Path

1. Create error-handler utility
2. Update POST /post first (highest priority)
3. Update POST /comment
4. Update all other endpoints
5. Test with frontend
6. Deploy to production

## Testing

```bash
# Test missing file
curl -X POST http://localhost:3030/post \
  -H "Authorization: Bearer TOKEN" \
  -F "title=Test" \
  -F "tag=test"
# Expected: 400 "PDF file is required"

# Test invalid file type
curl -X POST http://localhost:3030/post \
  -H "Authorization: Bearer TOKEN" \
  -F "title=Test" \
  -F "tag=test" \
  -F "pdf=@image.jpg"
# Expected: 400 "Only PDF files are accepted"

# Test missing title
curl -X POST http://localhost:3030/post \
  -H "Authorization: Bearer TOKEN" \
  -F "tag=test" \
  -F "pdf=@file.pdf"
# Expected: 400 "Title is required"
```
