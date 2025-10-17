# Email Confirmation Page

This document explains the email confirmation page that handles the redirect from Supabase after users click the verification link.

## Page Location

**Route**: `/confirm-email`
**File**: `src/app/confirm-email/page.tsx`

## Purpose

This page receives users after they click the email confirmation link sent by Supabase during registration. It verifies the token and displays appropriate success or error messages.

## Email Link Flow

```
User clicks link from email
    ↓
https://[project].supabase.co/auth/v1/verify?token=xxx&type=signup&redirect_to=http://localhost:3000/confirm-email
    ↓
Supabase verifies token
    ↓
Redirects to: http://localhost:3000/confirm-email#access_token=xxx&type=signup&...
    OR
Redirects to: http://localhost:3000/confirm-email#error=...&error_description=...
    ↓
Frontend extracts parameters and shows result
```

## URL Parameters (in Hash)

Supabase uses URL hash parameters (after `#`) not query parameters:

### Success Parameters:
- `access_token` - JWT access token from Supabase
- `type` - Should be "signup" for email confirmation
- `expires_in` - Token expiration time
- `refresh_token` - Refresh token

### Error Parameters:
- `error` - Error type (e.g., "access_denied")
- `error_code` - Specific error code (e.g., "otp_expired")
- `error_description` - Human-readable error message

## Page States

### 1. Loading State (Verifying)

Shows while checking the URL parameters:
```
🔄 กำลังยืนยันอีเมล...
กรุณารอสักครู่
```

### 2. Success State

Shows when email is successfully confirmed:
```
✅ ยืนยันอีเมลสำเร็จ!

บัญชีของคุณได้รับการยืนยันแล้ว
คุณสามารถเข้าสู่ระบบได้แล้วตอนนี้

กำลังนำคุณไปยังหน้าเข้าสู่ระบบ...

[เข้าสู่ระบบเลย]
```

**Auto-redirect**: After 3 seconds → `/signin`

### 3. Error State

Shows when verification fails:
```
❌ เกิดข้อผิดพลาด

[Error message in Thai]

[ลงทะเบียนใหม่]
[กลับไปหน้าเข้าสู่ระบบ]
```

## Error Handling

### Common Errors:

1. **Expired Link**:
   - Error: `otp_expired`
   - Message: "ลิงก์ยืนยันหมดอายุแล้ว กรุณาลงทะเบียนใหม่"
   - Action: User can register again

2. **Invalid Link**:
   - Error: `invalid` in description
   - Message: "ลิงก์ยืนยันไม่ถูกต้อง"
   - Action: Check email or register again

3. **No Token**:
   - Direct page access without parameters
   - Message: "ไม่พบข้อมูลการยืนยัน กรุณาคลิกลิงก์จากอีเมลอีกครั้ง"
   - Action: Click email link again

## Backend Configuration Required

The backend needs to update the `redirect_to` URL in the signup function.

### Current Backend Code (needs update):

**File**: `src/repositories/auth-repo.ts`

```typescript
export async function createAuthUser(email: string, password: string, firstName: string, lastName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // ADD THIS:
    options: {
      emailRedirectTo: 'http://localhost:3000/confirm-email'
    }
  });
  // ... rest of code
}
```

### For Production:

```typescript
options: {
  emailRedirectTo: 'https://yourdomain.com/confirm-email'
}
```

## Implementation Details

### Technology Used:
- React hooks: `useState`, `useEffect`
- Next.js: `useRouter` for navigation
- Icons: `FaCheckCircle`, `FaTimesCircle` from react-icons
- URL API: `window.location.hash` and `URLSearchParams`

### Key Features:
1. ✅ Automatic token extraction from URL hash
2. ✅ Error detection and user-friendly messages
3. ✅ Auto-redirect to signin after success
4. ✅ Loading state during verification
5. ✅ Manual navigation buttons as backup
6. ✅ Consistent styling with other pages

## User Experience Flow

### Complete Registration to Signin Flow:

```
1. User fills signup form
   ↓
2. Backend creates account, sends email
   ↓
3. User sees: "ลงทะเบียนสำเร็จ! กรุณาตรวจสอบอีเมล..."
   ↓
4. User receives email with confirmation link
   ↓
5. User clicks link
   ↓
6. Browser opens: /confirm-email
   ↓
7. Page shows: "กำลังยืนยันอีเมล..."
   ↓
8. Supabase verifies token
   ↓
9. Page shows: "ยืนยันอีเมลสำเร็จ!"
   ↓
10. Auto-redirect to /signin (3 seconds)
    ↓
11. User can now sign in ✅
```

## Testing

### Test Successful Confirmation:

1. Register new account at `/signup`
2. Check email for confirmation link
3. Click the confirmation link
4. Should see loading → success → redirect
5. Should be able to sign in now

### Test Expired Link:

1. Register account
2. Wait for link to expire (or use old link)
3. Click expired link
4. Should see error: "ลิงก์ยืนยันหมดอายุแล้ว..."
5. Can click "ลงทะเบียนใหม่" to try again

### Test Invalid Link:

1. Try accessing `/confirm-email` directly
2. Should see: "ไม่พบข้อมูลการยืนยัน..."

### Test Direct Access:

1. Navigate to `/confirm-email` without clicking email
2. Should show error about missing verification data

## Security Considerations

1. ✅ Token only in URL hash (not sent to server)
2. ✅ Token is one-time use (Supabase handles)
3. ✅ Link expires after set time
4. ✅ No sensitive data stored in page
5. ✅ Auto-redirect prevents lingering on confirmation page

## Styling

Matches the design system:
- Colors: `#405168` (primary), `#1c2a48` (dark), `#7a8b99` (muted)
- Borders: `border-[#e0e7f1]`
- Backgrounds: `bg-[#f0f4f8]` (light accent)
- Rounded corners: `rounded-3xl`
- Shadow: `shadow-sm`, `hover:shadow-md`

## Related Files

- `/signup` - Initial registration page
- `/signin` - Login page (redirect destination)
- `EMAIL_CONFIRMATION_FLOW.md` - Complete flow documentation

## Future Enhancements

Possible improvements:
1. **Email Resend** - Add "resend confirmation" button if expired
2. **Progress Bar** - Show countdown before auto-redirect
3. **Welcome Message** - Personalize success message with user name
4. **Statistics** - Track confirmation rates
5. **Multi-language** - Support English/Thai toggle

## Troubleshooting

### Issue: Page shows "ไม่พบข้อมูลการยืนยัน"
**Solution**: 
- User must click link from email
- Check if email was delivered
- Verify link isn't corrupted

### Issue: Always shows loading
**Solution**:
- Check browser console for errors
- Verify URL has hash parameters
- Check Supabase configuration

### Issue: Auto-redirect not working
**Solution**:
- Check if router is working
- Manually click "เข้าสู่ระบบเลย" button
- Verify timeout is running

### Issue: Backend still redirects to root
**Solution**:
- Update backend `emailRedirectTo` configuration
- Restart backend server after changes
- Clear Supabase cache if needed

