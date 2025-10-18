# Axios Migration & Backend Integration

## Overview
The frontend has been successfully migrated from fetch API to axios, with full backend integration for the post creation feature.

## Changes Made

### 1. **Package Installation**
- ✅ Installed `axios@1.12.2` using bun

### 2. **API Layer Rewrite** (`src/lib/api.ts`)

#### Key Changes:
- **From:** Fetch-based API with manual header management
- **To:** Axios-based API with automatic interceptors

#### Features:
- **Request Interceptor**: Automatically adds authentication token to all requests
- **Response Interceptor**: Handles 401 errors and removes invalid tokens
- **FormData Support**: Properly handles multipart/form-data for file uploads
- **Better Error Handling**: Distinguishes between network errors and API errors

#### New Function Signature:
```typescript
export async function apiRequest<T = unknown>(
  endpoint: string,
  options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    data?: unknown;                    // Use instead of 'body'
    headers?: Record<string, string>;
    params?: Record<string, unknown>;
    isFormData?: boolean;             // Set true for file uploads
  }
): Promise<T>
```

### 3. **Post Service Updates** (`src/services/post.service.ts`)

#### Updated Function:
- `createPost()`: Now properly supports multiple files and tags
  - Converts `tags[]` to comma-separated string for backend
  - Appends all files to FormData with `isFormData: true`
  - Includes auth token automatically via axios interceptor

#### Migration Pattern:
```typescript
// Before (Fetch)
const response = await apiRequest('/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});

// After (Axios)
const response = await apiRequest('/endpoint', {
  method: 'POST',
  data: data,  // Automatically serialized
});
```

#### Updated Functions:
- ✅ `createPost()` - File upload with FormData
- ✅ `getPosts()` - Get posts list
- ✅ `getPostsByTag()` - Filter by tags
- ✅ `getPostsAfter()` - Pagination
- ✅ `getComments()` - Fetch comments
- ✅ `createComment()` - Add comment

### 4. **Auth Service Updates** (`src/services/auth.service.ts`)

#### Updated Functions:
- ✅ `signUp()` - Register with encrypted payload
- ✅ `signIn()` - Login with encryption
- ✅ `signOut()` - Logout (auth token auto-added)
- ✅ `forgotPassword()` - Password reset request
- ✅ `resetPassword()` - Reset password with token
- ✅ `verifyResetToken()` - Validate token

#### Changes:
- Removed explicit header management (handled by interceptors)
- Changed all `body` to `data` parameter
- Removed unused `getAuthHeaders()` import

### 5. **Post Page Component** (`src/app/post/page.tsx`)

Already integrated to use the backend:
- ✅ Validates title and tags
- ✅ Calls `postService.createPost()` with form data
- ✅ Displays loading and error states
- ✅ Redirects to community page on success

## API Integration Flow

```
User Form Submission
        ↓
Post Page Component
        ↓
postService.createPost()
        ↓
apiRequest() with axios
        ↓
Request Interceptor (adds token)
        ↓
Backend: POST /post (multipart/form-data)
        ↓
Response Interceptor (handles errors)
        ↓
Success/Error Response
```

## Axios Interceptors

### Request Interceptor
- Automatically retrieves auth token from localStorage
- Adds `Authorization: Bearer {token}` header
- Works for all requests (unless token is missing)

### Response Interceptor
- Handles 401 Unauthorized responses
- Removes invalid/expired tokens
- Throws proper ApiError exceptions

## FormData Handling

For file uploads, set `isFormData: true`:

```typescript
const formData = new FormData();
formData.append('title', 'My Post');
formData.append('files', file1);
formData.append('files', file2);

const response = await apiRequest('/post', {
  method: 'POST',
  data: formData,
  isFormData: true,  // Important!
});
```

The axios instance will:
1. Set `Content-Type: multipart/form-data`
2. Let the browser set boundary
3. Allow streaming of large files

## Error Handling

Errors are caught and transformed to `ApiError`:

```typescript
try {
  const response = await postService.createPost(data);
  if (response.error) {
    console.error('API Error:', response.error);
  }
} catch (error) {
  if (error instanceof ApiError) {
    console.error('HTTP Error:', error.status, error.message);
  }
}
```

## Environment Configuration

Ensure `.env.local` contains:
```env
NEXT_PUBLIC_API_URL=http://localhost:3030
```

The backend should be running at `http://localhost:3030`

## Testing the Integration

1. Start the backend server
2. Run the frontend: `bun dev`
3. Navigate to `/post` page
4. Fill in the form and submit
5. Check browser console for success/error messages
6. Verify post appears in community page

## Benefits of Axios Over Fetch

✅ **Automatic Request/Response Interceptors** - Centralized auth token management  
✅ **Request Cancellation** - Built-in support for aborting requests  
✅ **Timeout Support** - Global timeout configuration (10s default)  
✅ **Response Transformation** - Automatic JSON parsing  
✅ **Consistent Error Handling** - All errors follow same structure  
✅ **Upload Progress** - Can track file upload progress  
✅ **Request Retry** - Easy to implement retry logic  

## Files Modified

1. `src/lib/api.ts` - Complete rewrite with axios
2. `src/services/post.service.ts` - Updated all functions
3. `src/services/auth.service.ts` - Updated all functions
4. `src/app/post/page.tsx` - Already integrated

## Backward Compatibility

All service functions maintain their original interfaces:
- Input parameters unchanged
- Return types unchanged
- Error handling consistent
- Existing components work without modification

## Next Steps

1. ✅ Test post creation with file upload
2. ✅ Test all authentication flows
3. ✅ Monitor performance with axios
4. Consider adding request/upload progress tracking
5. Add retry logic for failed requests
