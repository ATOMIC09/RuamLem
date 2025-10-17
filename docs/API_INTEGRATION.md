# API Integration Guide

This document explains how the RuamLem frontend connects to the backend API.

## Backend Repository
- URL: https://github.com/RuamLem/RuamLem-backend
- Backend runs on: `http://localhost:3030`
- API Documentation: `http://localhost:3030/openapi`

## Environment Setup

### 1. Create `.env.local` file

You need to configure the following environment variables in `.env.local`:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3030

# RSA Public Key for encryption (IMPORTANT!)
# You need to obtain this from your backend team
NEXT_PUBLIC_RSA_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----"
```

### 2. Get RSA Public Key from Backend

The backend uses RSA encryption for authentication. You need to:
1. Contact the backend team to get the RSA public key
2. The public key should match the private key in the backend's `.env` file
3. Add it to your `.env.local` file

**Note:** For development without RSA setup, the code will fall back to base64 encoding, but this is NOT secure for production.

## Architecture

### Directory Structure

```
src/
├── lib/
│   ├── api.ts           # Core API utilities and configuration
│   └── crypto.ts        # RSA encryption and password validation
├── services/
│   ├── auth.service.ts  # Authentication API calls
│   └── post.service.ts  # Post and comment API calls
└── app/
    └── hooks/
        └── use-auth.ts  # Authentication hook
```

### Key Components

#### 1. API Layer (`src/lib/api.ts`)
- `apiRequest()`: Generic HTTP request wrapper
- `getAuthToken()`, `setAuthToken()`, `removeAuthToken()`: Token management
- `getAuthHeaders()`: Adds authorization headers to requests

#### 2. Crypto Layer (`src/lib/crypto.ts`)
- `encryptRSA()`: Encrypts data using RSA public key
- `validatePassword()`: Validates password according to backend requirements:
  - Minimum 8 characters
  - At least one letter (A-Z or a-z)
  - At least one number (0-9)

#### 3. Authentication Service (`src/services/auth.service.ts`)
- `signUp()`: Register new user
- `signIn()`: Login user
- `signOut()`: Logout user
- `forgotPassword()`: Request password reset email
- `resetPassword()`: Reset password with token
- `verifyResetToken()`: Verify reset token validity

#### 4. Post Service (`src/services/post.service.ts`)
- `createPost()`: Create a new post with PDF attachment
- `getPosts()`: Get posts with pagination
- `getPostsByTag()`: Filter posts by tag
- `getPostsAfter()`: Get posts after specific ID (pagination)
- `getComments()`: Get comments for a post
- `createComment()`: Add comment to a post

## API Endpoints

### Authentication Endpoints

#### Sign Up
```typescript
POST /auth/signUp
Body: { data: string } // RSA encrypted JSON: { email, firstName, lastName, password }
Response: { user, token }
```

#### Sign In
```typescript
POST /auth/signIn
Body: { data: string } // RSA encrypted JSON: { email, password }
Response: { user, token }
```

#### Sign Out
```typescript
POST /auth/signOut
Headers: { Authorization: "Bearer <token>" }
Response: { message }
```

#### Forgot Password
```typescript
POST /auth/forget
Body: { email: string }
Response: { message }
```

#### Reset Password
```typescript
POST /auth/reset-password
Body: { token: string, newPassword: string }
Response: { message }
```

### Post Endpoints

#### Create Post
```typescript
POST /post
Headers: { Authorization: "Bearer <token>" }
Body: FormData { title, body, tag, pdf: File }
Response: { post }
```

#### Get Posts
```typescript
POST /getPost
Body: { count?: number }
Response: { posts }
```

#### Get Posts by Tag
```typescript
POST /getPostFilter
Body: { tags: string, count?: number }
Response: { posts }
```

#### Get Posts After ID
```typescript
POST /getPostAfter
Body: { lastId: number, count?: number }
Response: { posts }
```

#### Get Comments
```typescript
POST /getComment
Body: { postId: number }
Response: { comments }
```

#### Add Comment
```typescript
POST /comment
Headers: { Authorization: "Bearer <token>" }
Body: { post_id: string, post_body: string }
Response: { comment }
```

## Usage Examples

### Authentication

```typescript
import * as authService from '@/services/auth.service';

// Sign up
const result = await authService.signUp({
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  password: 'SecurePass123'
});

if (!result.error && result.token) {
  // User is signed up and authenticated
  console.log('User:', result.user);
  console.log('Token:', result.token);
}

// Sign in
const loginResult = await authService.signIn({
  email: 'user@example.com',
  password: 'SecurePass123'
});
```

### Posts

```typescript
import * as postService from '@/services/post.service';

// Create a post
const formData = new FormData();
formData.append('pdf', pdfFile);

const result = await postService.createPost({
  title: 'My Post Title',
  body: 'Post content',
  tag: 'Mathematics',
  pdf: pdfFile
});

// Get posts
const posts = await postService.getPosts(10);

// Filter by tag
const mathPosts = await postService.getPostsByTag('Mathematics', 10);

// Add comment
await postService.createComment({
  post_id: '123',
  post_body: 'Great post!'
});
```

### Using the Auth Hook

```typescript
import { useAuth } from '@/app/hooks/use-auth';

function MyComponent() {
  const { isSignedIn, user, signOut, isLoading } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  
  if (!isSignedIn) {
    return <div>Please sign in</div>;
  }
  
  return (
    <div>
      <p>Welcome, {user?.name}!</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

## Running Both Projects

### Backend Setup
```bash
cd RuamLem-backend
bun install
bun run dev
```
Backend will run on: http://localhost:3030

### Frontend Setup
```bash
cd RuamLem-frontend
npm install
npm run dev
```
Frontend will run on: http://localhost:3000

## Security Notes

1. **RSA Encryption**: Authentication data (email, password, names) is encrypted using RSA before sending to the backend
2. **JWT Tokens**: The backend returns JWT tokens for authenticated sessions
3. **Token Storage**: Tokens are stored in localStorage (consider using httpOnly cookies for production)
4. **Password Requirements**: 
   - Minimum 8 characters
   - Must contain at least one letter
   - Must contain at least one number

## Troubleshooting

### CORS Errors
If you see CORS errors, make sure the backend has CORS enabled for `http://localhost:3000`

### RSA Encryption Errors
If encryption fails:
1. Verify the public key is correctly formatted in `.env.local`
2. Ensure it matches the backend's private key
3. Check browser console for detailed error messages
4. The system will fall back to base64 encoding for development

### 401 Unauthorized
- Check if the token is being sent in the Authorization header
- Verify the token hasn't expired
- Try signing out and signing in again

### Network Errors
- Ensure the backend is running on port 3030
- Check that `NEXT_PUBLIC_API_URL` is correct in `.env.local`
- Verify there are no firewall issues

## Next Steps

To complete the integration:

1. **Get RSA Keys**: Contact backend team for the RSA public key
2. **Update Environment**: Add the public key to `.env.local`
3. **Test Authentication**: Try signing up and signing in
4. **Test Posts**: Create, view, and comment on posts
5. **Error Handling**: Add proper error boundaries and user feedback
6. **Loading States**: Improve loading indicators
7. **Optimizations**: Add caching, debouncing, and optimistic updates

## Development vs Production

### Development
- Uses `http://localhost:3030` for API
- May fall back to base64 if RSA not configured
- Tokens stored in localStorage

### Production Checklist
- [ ] Use HTTPS for all API calls
- [ ] Proper RSA encryption configured
- [ ] Secure token storage (httpOnly cookies)
- [ ] Error logging and monitoring
- [ ] Rate limiting on API calls
- [ ] Input validation and sanitization
- [ ] CSRF protection
- [ ] Content Security Policy headers
