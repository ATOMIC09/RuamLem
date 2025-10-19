# Edit Post Integration Documentation

## Overview
Successfully integrated the edit post functionality with the RuamLem backend API. Users can now edit their own posts from the "My Posts" page.

## Backend API Endpoint
- **Endpoint**: `PUT /post/:postId`
- **Authentication**: Bearer Token (required)
- **Request Body**:
  ```json
  {
    "title": "string",
    "body": "string",
    "tag": "string"
  }
  ```
- **Response**: 
  ```json
  {
    "success": boolean,
    "message": "string",
    "error": "string" (if applicable)
  }
  ```

## Files Modified

### 1. `src/services/post.service.ts`
**Added**: New `updatePost()` function

```typescript
export async function updatePost(
  postId: number,
  title: string,
  body: string,
  tag: string
): Promise<{ success?: boolean; message?: string; error?: string }>
```

**Features**:
- Sends PUT request to `/post/:postId` endpoint
- Validates response for success/error
- Returns error message if JWT is expired
- Returns success message on completion

### 2. `src/app/my-posts/[id]/edit/page.tsx`
**Updated**: `handleSave()` function

**Changes**:
- Replaced placeholder implementation with actual backend call
- Calls `postService.updatePost()` with form data
- Handles JWT expiration by showing sign-in modal
- Displays error messages if update fails
- Shows success alert and redirects to `/my-posts` on success

## User Flow

1. User navigates to "My Posts" page
2. User clicks the edit icon (pencil icon) on a post
3. User is redirected to `/my-posts/[id]/edit` page
4. Edit page loads post data:
   - Title
   - Body/Content
   - Tag
   - Existing attachments (read-only)
5. User makes changes to title, body, and/or tag
6. User clicks "Save Changes" button
7. Frontend validates that title and body are not empty
8. Frontend sends PUT request to backend with updated data
9. If JWT expired:
   - Sign-in required modal appears
   - User redirects to sign-in page
10. If success:
    - Success alert shown
    - User redirected to `/my-posts` page
11. If error:
    - Error message displayed below header
    - User can correct and try again

## Error Handling

- **JWT Expiration**: Detected by checking if error includes "JWT" or "expired"
- **Validation Errors**: Backend returns 400 status with validation error message
- **Authorization Errors**: Backend returns 401 if user doesn't own the post
- **Server Errors**: Backend returns 500 with error message

## Testing Checklist

- [ ] Edit post title only
- [ ] Edit post body only
- [ ] Edit post tag only
- [ ] Edit all fields together
- [ ] Try editing without title (should show validation error)
- [ ] Try editing without body (should show validation error)
- [ ] Try editing another user's post (should show "no permission" error)
- [ ] Let JWT expire and try to edit (should show sign-in modal)
- [ ] Verify redirect to my-posts after successful edit

## Notes

- Attachments cannot be modified during post edit (read-only)
- Only the post owner can edit their posts
- Tag field can be empty if needed
- Changes are persisted in real-time on the backend
