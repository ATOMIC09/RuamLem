# Quick Reference: Axios & Backend Integration

## Making API Calls

### Basic GET Request
```typescript
const response = await apiRequest('/getPost', {
  method: 'GET',
});
```

### POST with JSON Data
```typescript
const response = await apiRequest('/post', {
  method: 'POST',
  data: { title: 'Hello', body: 'World' },
});
```

### POST with Form Data (Files)
```typescript
const formData = new FormData();
formData.append('title', 'My Post');
formData.append('files', file);

const response = await apiRequest('/post', {
  method: 'POST',
  data: formData,
  isFormData: true,  // Important!
});
```

### With Query Parameters
```typescript
const response = await apiRequest('/posts', {
  method: 'GET',
  params: { page: 1, limit: 10 },
});
```

### With Custom Headers
```typescript
const response = await apiRequest('/endpoint', {
  method: 'POST',
  data: { ... },
  headers: { 'X-Custom-Header': 'value' },
});
```

## Authentication (Automatic)

Token is **automatically added** to all requests:

```typescript
// No need to do this - it's automatic!
// config.headers.Authorization = `Bearer ${token}`

// Just use the service normally
const response = await postService.createPost(data);
```

## Error Handling

```typescript
try {
  const response = await postService.createPost(data);
  
  // Check for API errors
  if (response.error) {
    console.error('API Error:', response.error);
    return;
  }
  
  // Use the response
  console.log('Success:', response.post);
  
} catch (error) {
  // Handle network/system errors
  if (error instanceof ApiError) {
    console.error(`HTTP ${error.status}: ${error.message}`);
  }
}
```

## Service Usage Examples

### Create Post
```typescript
const response = await postService.createPost({
  title: 'My Title',
  body: 'Description',
  tags: ['tag1', 'tag2'],
  files: [file1, file2]  // Optional
});
```

### Get Posts
```typescript
const response = await postService.getPosts(10);
console.log(response.posts);
```

### Get Posts by Tag
```typescript
const response = await postService.getPostsByTag('JavaScript', 10);
```

### Get Comments
```typescript
const response = await postService.getComments(postId);
```

### Create Comment
```typescript
const response = await postService.createComment({
  post_id: '123',
  post_body: 'My comment'
});
```

### Sign Up
```typescript
const response = await authService.signUp({
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  password: 'SecurePass123'
});
```

### Sign In
```typescript
const response = await authService.signIn({
  email: 'user@example.com',
  password: 'SecurePass123'
});

if (response.token && response.user) {
  // User is logged in
}
```

### Sign Out
```typescript
await authService.signOut();
// Token is automatically cleared
```

## Interceptor Flow

```
Your Code
   ↓
apiRequest() function
   ↓
axios instance
   ↓
[Request Interceptor] → Add auth token
   ↓
Backend API
   ↓
[Response Interceptor] → Handle 401 errors
   ↓
Response/Error
```

## Environment Setup

### .env.local
```env
NEXT_PUBLIC_API_URL=http://localhost:3030
```

### Backend Requirements
- Must be running on configured URL
- Must support all endpoints in API_INTEGRATION.md
- Must return proper error responses with `error` or `message` fields

## Common Issues & Solutions

### Issue: "Cannot find module 'axios'"
**Solution:** Run `bun add axios`

### Issue: "401 Unauthorized"
**Solution:** Token is missing or expired. Call `signIn()` to get a new token.

### Issue: CORS errors
**Solution:** Backend must have CORS enabled for your frontend URL

### Issue: File upload fails
**Solution:** Make sure to set `isFormData: true` when uploading files

### Issue: Token not being sent
**Solution:** Token is automatic via interceptor. Check localStorage for 'authToken' key.

## Debugging

### Check Token
```typescript
const token = localStorage.getItem('authToken');
console.log('Current token:', token);
```

### Log Requests
```typescript
// Add this to src/lib/api.ts after interceptors
axiosInstance.interceptors.request.use(
  (config) => {
    console.log('→ Request:', config.method?.toUpperCase(), config.url);
    return config;
  }
);
```

### Log Responses
```typescript
// Add this to src/lib/api.ts after interceptors
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('← Response:', response.status, response.data);
    return response;
  }
);
```

## TypeScript Support

Full TypeScript support for all functions:

```typescript
// Typed response
const response = await apiRequest<{ posts: Post[] }>('/getPost', {
  method: 'POST',
  data: { count: 10 }
});

// Types are inferred from service
const postResponse = await postService.getPosts(10);
// postResponse has type: { posts?: Post[]; error?: string }
```

## Performance Tips

1. **Batch Requests**: Combine multiple requests if possible
2. **Pagination**: Use `count` parameter to limit results
3. **Caching**: Consider caching frequently accessed data
4. **Error Retry**: Implement retry logic for failed requests
5. **File Size**: Limit file sizes before upload

## Important Notes

⚠️ **Always set `isFormData: true` when uploading files**

⚠️ **Token is stored in localStorage** - Not secure for passwords

⚠️ **Timeout is 10 seconds** - Increase for large file uploads

⚠️ **Tags must be array** - Will be joined with commas for backend

⚠️ **Files must be File objects** - Not FileList

## For Backend Developers

The frontend expects responses in this format:

### Success Response
```json
{
  "post": { "id": 1, ... },
  "posts": [...],
  "comment": { "id": 1, ... },
  "message": "Success message"
}
```

### Error Response
```json
{
  "error": "Error message",
  "message": "Optional detailed message"
}
```

The frontend will accept either `error` or `message` field for error display.

## Resources

- `src/lib/api.ts` - Core API configuration
- `src/services/post.service.ts` - Post operations
- `src/services/auth.service.ts` - Authentication
- `docs/API_INTEGRATION.md` - Full API documentation
- `docs/AXIOS_MIGRATION.md` - Detailed migration guide
