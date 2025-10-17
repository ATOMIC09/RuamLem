# Supabase Password Reset Flow - Fixed

## The Problem

The password reset link from Supabase uses a different format than expected:

**Email Link Format:**
```
https://czwwrghymozmtmobhnqa.supabase.co/auth/v1/verify?token=xxx&type=recovery&redirect_to=http://localhost:3000/reset-password
```

**After Supabase Verification, Redirects To:**
```
http://localhost:3000/reset-password#access_token=xxx&...
```
OR if expired:
```
http://localhost:3000/reset-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired
```

## The Solution

The reset password page now properly handles Supabase's URL hash parameters:

### Key Changes in `/reset-password` Page:

1. **Extract Token from Hash (not query params)**:
   ```typescript
   const hash = window.location.hash.substring(1); // Remove #
   const params = new URLSearchParams(hash);
   const accessToken = params.get('access_token');
   const error = params.get('error');
   ```

2. **Handle Error States**:
   - `error=access_denied` → Token expired
   - `error_code=otp_expired` → Link expired
   - Show appropriate Thai error messages

3. **Use Access Token for Password Reset**:
   - Extract `access_token` from hash
   - Send to backend: `POST /auth/reset-password { token: accessToken, newPassword }`
   - Backend uses `supabase.auth.setSession({ access_token })` then updates password

## How It Works Now

### Flow Diagram:

```
User requests reset
    ↓
Backend: supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "http://localhost:3000/reset-password"
})
    ↓
Email sent with link to Supabase verification endpoint
    ↓
User clicks: https://xxx.supabase.co/auth/v1/verify?token=xxx&type=recovery
    ↓
Supabase verifies token
    ↓
If valid → Redirect: localhost:3000/reset-password#access_token=xxx&...
If expired → Redirect: localhost:3000/reset-password#error=access_denied&...
    ↓
Frontend extracts access_token from hash
    ↓
User enters new password
    ↓
POST /auth/reset-password { token: access_token, newPassword }
    ↓
Backend:
  - supabase.auth.setSession({ access_token, refresh_token })
  - supabase.auth.updateUser({ password: newPassword })
    ↓
Success → Auto-redirect to /signin after 3s
```

### Backend Implementation (Already Exists):

**File: `src/repositories/auth-repo.ts`**

```typescript
export async function updatePassword(token: string, newPassword: string) {
  try {
    // Set the session using the token from the reset link
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: token,
      refresh_token: token, // In recovery flow, both tokens are the same
    });

    if (sessionError) throw sessionError;

    // Update the password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) throw updateError;

    return {
      status: 200,
      message: "รหัสผ่านถูกอัปเดตเรียบร้อยแล้ว",
    };
  } catch (err: any) {
    return {
      status: 500,
      message: err.message,
    };
  }
}
```

## Important Notes

### 1. No Encryption Needed
- Password is sent as plain text to backend
- Supabase Auth handles password hashing automatically
- Backend doesn't decrypt - it uses Supabase's `updateUser` API

### 2. Token in Hash, Not Query Params
- Use `window.location.hash` NOT `useSearchParams()`
- Hash parameters: `#access_token=xxx&type=recovery&...`
- Query parameters: `?token=xxx` (old approach, doesn't work with Supabase)

### 3. Error Handling
- Check for `error` parameter in hash first
- Common errors:
  - `otp_expired` → Link expired (15 min default)
  - `access_denied` → Invalid or already used token
  - Display user-friendly Thai messages

### 4. Token Lifetime
- Supabase reset tokens expire in 15 minutes (configurable)
- Tokens are one-time use
- After successful password reset, token is invalidated

## Testing

1. **Test Expired Link**:
   - Request password reset
   - Wait 15+ minutes
   - Click link
   - Should show: "ลิงก์หมดอายุแล้ว กรุณาขอรีเซ็ตรหัสผ่านใหม่"

2. **Test Valid Link**:
   - Request password reset
   - Click link immediately
   - Should show password reset form
   - Enter new password
   - Should see success message and redirect

3. **Test Reusing Link**:
   - Successfully reset password
   - Try clicking the same link again
   - Should show expired/invalid error

## Configuration

### Backend (in `auth-repo.ts`):

```typescript
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: "http://localhost:3000/reset-password", 
});
```

**For Production**: Change to production URL:
```typescript
redirectTo: "https://yourdomain.com/reset-password"
```

### Frontend (in `.env.local`):

No special configuration needed. The page automatically:
- Detects URL hash parameters
- Extracts access_token or error
- Handles all states appropriately

## Security Considerations

1. ✅ Token in URL hash is not sent to server (client-side only)
2. ✅ Token is short-lived (15 min expiration)
3. ✅ Token is one-time use (invalidated after password change)
4. ✅ Password validation enforced (8+ chars, letters + numbers)
5. ✅ HTTPS required in production (Supabase enforces this)

## Common Issues & Solutions

### Issue: "ลิงก์หมดอายุแล้ว"
**Solution**: Request new password reset. Links expire after 15 minutes.

### Issue: Page shows loading forever
**Solution**: Check browser console for errors. Token may be malformed.

### Issue: "Invalid or expired token" error
**Solution**: 
- Token may have been used already
- Request new password reset
- Check if backend can reach Supabase

### Issue: Redirect URL mismatch
**Solution**: Ensure `redirectTo` in backend matches actual frontend URL

## Differences from Standard JWT Flow

| Aspect | Standard JWT | Supabase Recovery |
|--------|-------------|-------------------|
| Token Location | Query param | URL hash |
| Token Type | Custom JWT | Supabase access_token |
| Verification | Backend API call | Client extracts, backend uses directly |
| Encryption | Required | Not needed (Supabase handles) |
| Expiration | Custom | Supabase default (15 min) |

