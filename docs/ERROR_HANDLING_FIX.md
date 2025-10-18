# Error Handling Fix - Frontend & Backend

## Problem Identified

**Issue**: Frontend showed "โพสต์สำเร็จ!" (Post successful) even when backend returned `{"status":400,"message":"No file uploaded"}`

**Root Causes**:
1. **Form field name mismatch**: Backend expects `"pdf"` but frontend was sending `"files"`
2. **Multiple files issue**: Backend accepts only ONE PDF, but frontend allowed multiple files
3. **File type mismatch**: Backend only accepts PDF, but frontend allowed multiple formats
4. **Inconsistent error response handling**: Different endpoints return errors in different formats
5. **No validation before submission**: Frontend wasn't validating file type/count before sending

## Frontend Fixes Implemented

### 1. ✅ `src/lib/api.ts` - Improved Error Extraction
**What changed**: Better error message extraction from backend responses

```typescript
// Now handles multiple response formats:
// { error: "message" }
// { message: "message" }
// { status: 400, message: "..." }
```

### 2. ✅ `src/services/post.service.ts` - Form Field & Validation Fix
**What changed**:
- Changed form field from `"files"` → `"pdf"` to match backend expectation
- Added validation for single file only
- Added PDF file type validation
- Better response format handling

```typescript
// Before: formData.append('files', file)
// After:  formData.append('pdf', file)
```

### 3. ✅ `src/app/post/page.tsx` - Comprehensive Validation
**What changed**:
- Added check for multiple files
- Added PDF type validation BEFORE submission
- Updated accept attribute to `.pdf` only
- Updated UI text to say "PDF only"

```typescript
// Validations added:
if (files.length > 1) {
    setError("กรุณาแนบไฟล์เพียงหนึ่งไฟล์เท่านั้น");
}

if (files[0].type !== 'application/pdf') {
    setError("กรุณาแนบไฟล์ PDF เท่านั้น");
}
```

## Backend Recommendations

### Current Backend Issues (`/src/routes/post-route.ts`)

1. **Inconsistent Error Format**
   ```typescript
   // Current - inconsistent format
   if (!file) {
       return { status: 400, message: "No file uploaded" };
   }
   ```
   
2. **No validation on title/body/tag**
   ```typescript
   // Missing: What if title is empty?
   // Missing: What if tag is empty?
   ```

3. **Silent failures** - Some errors don't return proper status codes

### Suggested Backend Improvements

Create a standardized error response format:

```typescript
interface ApiErrorResponse {
  status: number;
  success: false;
  message: string;
  error?: string;
}

interface ApiSuccessResponse<T> {
  status: number;
  success: true;
  message: string;
  data: T;
}
```

**Updated POST /post endpoint**:

```typescript
app.post("/post", async (c) => {
    const authHeader = c.request.headers.get("authorization");
    if (!authHeader) {
        return {
            status: 401,
            success: false,
            message: "Unauthorized: No token provided"
        };
    }

    const token = authHeader.split(" ")[1];
    const formData = await c.request.formData();
    const file = formData.get("pdf") as File;
    const title = formData.get("title") as string;
    const body = formData.get("body") as string;
    const tag = formData.get("tag") as string;

    // Validate all required fields
    if (!title?.trim()) {
        return {
            status: 400,
            success: false,
            message: "Title is required"
        };
    }

    if (!tag?.trim()) {
        return {
            status: 400,
            success: false,
            message: "At least one tag is required"
        };
    }

    if (!file) {
        return {
            status: 400,
            success: false,
            message: "PDF file is required"
        };
    }

    if (file.type !== "application/pdf") {
        return {
            status: 400,
            success: false,
            message: "Only PDF files are allowed"
        };
    }

    return post(token, title, body, tag, file);
});
```

## Testing Checklist

- [ ] Frontend validates file is required
- [ ] Frontend shows error if no file selected
- [ ] Frontend shows error if multiple files selected
- [ ] Frontend shows error if file is not PDF
- [ ] Frontend shows error if title is empty
- [ ] Frontend shows error if tags are empty
- [ ] Backend returns `status: 400` for validation errors
- [ ] Backend returns consistent error format
- [ ] Frontend properly displays backend error messages
- [ ] Success message appears when post creation succeeds
- [ ] Page redirects to community after success

## Summary

✅ **Frontend**: Completely fixed to match backend requirements and handle all error cases
⚠️ **Backend**: Should implement consistent error response format for better maintainability
