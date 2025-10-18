# Axios Integration Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND (Next.js + React)                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           React Components                            │   │
│  │  (Post Page, Auth Pages, Community, etc.)           │   │
│  └──────────────┬───────────────────────────────────────┘   │
│                 │                                             │
│  ┌──────────────▼───────────────────────────────────────┐   │
│  │           Service Layer                               │   │
│  │  • postService.ts                                    │   │
│  │  • authService.ts                                    │   │
│  │  • (Business logic & data transformation)            │   │
│  └──────────────┬───────────────────────────────────────┘   │
│                 │                                             │
│  ┌──────────────▼───────────────────────────────────────┐   │
│  │           API Layer (src/lib/api.ts)                 │   │
│  │  • apiRequest() function                             │   │
│  │  • Error handling                                    │   │
│  │  • Request/Response interceptors                     │   │
│  └──────────────┬───────────────────────────────────────┘   │
│                 │                                             │
│  ┌──────────────▼───────────────────────────────────────┐   │
│  │           Axios Instance                              │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │ Request Interceptor                          │    │   │
│  │  │ • Add Authorization: Bearer {token}         │    │   │
│  │  │ • Set headers                                │    │   │
│  │  └──────────────┬───────────────────────────────┘    │   │
│  │                 │                                      │   │
│  │  ┌──────────────▼───────────────────────────────┐    │   │
│  │  │ HTTP Request                                  │    │   │
│  │  │ POST /post (multipart/form-data)            │    │   │
│  │  │ GET /getPost (application/json)             │    │   │
│  │  │ POST /auth/signIn (application/json)        │    │   │
│  │  └──────────────┬───────────────────────────────┘    │   │
│  │                 │                                      │   │
│  │  ┌──────────────▼───────────────────────────────┐    │   │
│  │  │ Response Interceptor                          │    │   │
│  │  │ • Check status codes                          │    │   │
│  │  │ • Handle 401 Unauthorized                     │    │   │
│  │  │ • Transform response                          │    │   │
│  │  └──────────────┬───────────────────────────────┘    │   │
│  │                 │                                      │   │
│  │  └─────────────────────────────────────────────────┘  │   │
│  └──────────────┬───────────────────────────────────────┘   │
│                 │                                             │
│  ┌──────────────▼───────────────────────────────────────┐   │
│  │      localStorage (Token Storage)                     │   │
│  │      • authToken (JWT)                               │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND (Node.js / Bun)                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         HTTP Router                                  │   │
│  │  • POST /post (create)                              │   │
│  │  • POST /getPost (read)                             │   │
│  │  • POST /auth/signUp (register)                     │   │
│  │  • POST /auth/signIn (login)                        │   │
│  │  • POST /auth/signOut (logout)                      │   │
│  └──────────────┬───────────────────────────────────────┘   │
│                 │                                             │
│  ┌──────────────▼───────────────────────────────────────┐   │
│  │         Business Logic                                │   │
│  │  • Validate requests                                 │   │
│  │  • Handle file uploads                               │   │
│  │  • Manage database                                   │   │
│  └──────────────┬───────────────────────────────────────┘   │
│                 │                                             │
│  ┌──────────────▼───────────────────────────────────────┐   │
│  │         Database (Supabase / PostgreSQL)             │   │
│  │  • users table                                       │   │
│  │  • posts table                                       │   │
│  │  • comments table                                    │   │
│  │  • file storage                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Request Flow Diagram

### Creating a Post

```
User fills form
    │
    ▼
handleSubmit()
    │
    ├─ Validate title
    ├─ Validate tags
    │
    ▼
postService.createPost({
  title, body, tags, files
})
    │
    ▼
apiRequest('/post', {
  method: 'POST',
  data: formData,
  isFormData: true
})
    │
    ▼
[REQUEST INTERCEPTOR]
    │
    ├─ Get token from localStorage
    ├─ Add Authorization header
    ├─ Set Content-Type: multipart/form-data
    │
    ▼
HTTPS POST http://localhost:3030/post
    │
    Body: FormData {
      title: "My Title",
      body: "Description",
      tag: "tag1,tag2",
      files: [File, File]
    }
    │
    ├─ Network transmission
    │
    ▼
BACKEND RECEIVES
    │
    ├─ Verify auth token
    ├─ Validate request
    ├─ Process form data
    ├─ Save to database
    │
    ▼
RESPONSE: { post: {...} }
    │
    ▼
[RESPONSE INTERCEPTOR]
    │
    ├─ Check status code
    ├─ Handle errors if any
    ├─ Return response
    │
    ▼
Component receives response
    │
    ├─ Check if response.error
    ├─ Show success/error message
    ├─ Redirect to /community
    │
    ▼
Success! ✅
```

## Authentication Flow

### Sign In

```
User enters email & password
    │
    ▼
handleSubmit()
    │
    ▼
authService.signIn({
  email, password
})
    │
    ├─ Encrypt password with RSA
    │
    ▼
apiRequest('/auth/signIn', {
  method: 'POST',
  data: { data: encryptedData }
})
    │
    ▼
[REQUEST INTERCEPTOR]
    │ (no token yet, skip auth header)
    │
    ▼
POST /auth/signIn
    │
    ▼
BACKEND:
    │
    ├─ Decrypt data with RSA private key
    ├─ Verify credentials
    ├─ Generate JWT token
    │
    ▼
RESPONSE: {
  user: { id, email, firstName, lastName },
  token: "eyJhbGciOi..."
}
    │
    ▼
[RESPONSE INTERCEPTOR]
    │
    │
    ▼
Component receives response
    │
    ├─ Save token: setAuthToken(token)
    │  (stored in localStorage)
    │
    ├─ Save user: context/store
    │
    ▼
Redirect to /community
    │
    ▼
All future requests include token ✅
```

## Interceptor Sequence

### Request Interceptor (Every Request)

```
Request begins
    │
    ▼
[REQUEST INTERCEPTOR RUNS]
    │
    ├─ config = new request config
    │
    ├─ token = getAuthToken() from localStorage
    │
    ├─ if (token) {
    │    config.headers.Authorization = `Bearer ${token}`
    │  }
    │
    ├─ return config
    │
    ▼
Request continues with auth header
```

### Response Interceptor (Every Response)

```
Response received
    │
    ▼
[RESPONSE INTERCEPTOR RUNS]
    │
    ├─ if (error?.response?.status === 401) {
    │    removeAuthToken() // Token invalid
    │    // User will be redirected to login
    │  }
    │
    ├─ throw error or return response
    │
    ▼
Error handling in service layer
```

## Data Flow: Post Creation

```
Form State:
┌────────────────────────────┐
│ title: "My Post"           │
│ description: "Desc"        │
│ tags: ["tag1", "tag2"]     │
│ files: [File, File]        │
│ isLoading: false           │
│ error: ""                  │
│ success: false             │
└────────────────────────────┘
    │
    ▼ handleSubmit()
    │
    ├─ Validate input
    ├─ setIsLoading(true)
    │
    ▼
FormData Creation:
┌────────────────────────────┐
│ title: "My Post"           │
│ body: "Desc"               │
│ tag: "tag1,tag2"           │  (joined with comma)
│ files: [File, File]        │
└────────────────────────────┘
    │
    ▼ apiRequest()
    │
    ├─ Axios serializes FormData
    ├─ Request Interceptor adds token
    ├─ Sends to /post endpoint
    │
    ▼ Backend processes
    │
    ├─ Extracts multipart data
    ├─ Saves files
    ├─ Creates post record
    │
    ▼ Response received
    │
    ├─ { post: {...}, error?: ... }
    │
    ▼ Component handling
    │
    ├─ if (response.error) {
    │    setError(response.error)
    │    setIsLoading(false)
    │  } else {
    │    setSuccess(true)
    │    setTimeout(() => router.push('/community'), 2000)
    │  }
    │
    ▼ User sees success message
    │ and is redirected ✅
```

## Error Handling Flow

```
Any Error Occurs:
    │
    ├─ Network Error
    │  └─ ApiError("Network error")
    │
    ├─ 4xx/5xx Response
    │  ├─ Response Interceptor catches
    │  └─ Creates ApiError from response
    │
    ├─ 401 Unauthorized
    │  ├─ Response Interceptor catches
    │  ├─ removeAuthToken()
    │  └─ ApiError("Unauthorized")
    │
    ├─ Parse Error
    │  └─ ApiError("Invalid response")
    │
    ▼
Service catches error
    │
    ├─ Returns { error: error.message }
    │
    ▼
Component receives error
    │
    ├─ setError(response.error)
    │
    ▼
User sees error message
```

## File Upload Process

```
User selects files
    │
    ▼
handleFileChange()
    │
    ├─ e.target.files (FileList)
    ├─ Array.from() converts to File[]
    ├─ setFiles([file1, file2, ...])
    │
    ▼
User submits form
    │
    ▼
handleSubmit()
    │
    ├─ Create FormData
    ├─ formData.append('title', title)
    ├─ formData.append('body', body)
    ├─ formData.append('tag', tags.join(','))
    │
    ├─ Loop through files:
    │  └─ formData.append('files', file)
    │      (all files use same key)
    │
    ▼
apiRequest('/post', {
  method: 'POST',
  data: formData,
  isFormData: true    ← Important!
})
    │
    ▼
Request Interceptor
    │
    ├─ Detects isFormData: true
    ├─ Sets Content-Type: multipart/form-data
    │  (Let browser set boundary)
    │
    ▼
Axios sends request
    │
    ├─ Headers: {
    │    Authorization: "Bearer token",
    │    Content-Type: "multipart/form-data; boundary=..."
    │  }
    │
    ├─ Body: [multipart encoded]
    │
    ▼
Backend receives
    │
    ├─ Parses multipart/form-data
    ├─ Extracts fields and files
    ├─ Validates
    ├─ Saves files to storage
    ├─ Creates post record
    │
    ▼
Success Response ✅
```

## TypeScript Type Flow

```
Component
    │
    ├─ postService.createPost(data)
    │  └─ data: CreatePostData {
    │      title: string,
    │      body: string,
    │      tags: string[],
    │      files?: File[]
    │    }
    │
    ▼
Service Function
    │
    ├─ apiRequest<{ post?: Post; error?: string }>()
    │  └─ Returns typed response
    │
    ▼
API Layer
    │
    ├─ axios instance
    ├─ InternalAxiosRequestConfig
    ├─ AxiosResponse<T>
    ├─ AxiosError
    │
    ▼
Component
    │
    ├─ response: { post?: Post; error?: string }
    │
    ├─ if (response.error)
    │  └─ error: string
    │
    ├─ if (response.post)
    │  └─ post: Post {
    │      id: number,
    │      title: string,
    │      body: string,
    │      tag: string,
    │      author: {...},
    │      createdAt: string
    │    }
    │
    ▼
TypeScript ensures type safety ✅
```

## Key Points

✅ **Automatic Token Management** - Interceptor handles it  
✅ **FormData for Files** - Set `isFormData: true`  
✅ **Centralized Errors** - All go through error handler  
✅ **Type Safe** - Full TypeScript support  
✅ **Backward Compatible** - All signatures unchanged  
✅ **Production Ready** - Fully tested  

---

**This architecture ensures reliable, maintainable, and secure API communication between frontend and backend.**
