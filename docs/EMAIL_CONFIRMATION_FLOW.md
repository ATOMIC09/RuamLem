# Email Confirmation Flow

This document explains the complete email confirmation flow for user registration in the RuamLem application.

## Overview

Supabase requires email confirmation before users can sign in. When a user registers, they receive a confirmation email and must verify their email address before accessing the system.

## Registration Flow

```
User fills signup form
    ↓
Frontend calls signUp API
    ↓
Backend creates Supabase user
    ↓
Supabase sends confirmation email
    ↓
Backend returns {"message": "SignUp success"}
    ↓
Frontend shows success page with instructions
    ↓
User checks email and clicks confirmation link
    ↓
Supabase confirms email
    ↓
User can now sign in
```

## Implementation Details

### 1. Signup API Response

**Backend Response** (from `/auth/signUp`):
```json
{
  "message": "SignUp success"
}
```

**Frontend Handling**:
- Does NOT attempt to automatically sign in
- Shows success message with email confirmation instructions
- Redirects user to check their email

### 2. Success Page UI

After successful registration, users see:
- ✅ Green checkmark icon
- Success message: "ลงทะเบียนสำเร็จ!"
- Instructions to check email
- User's email address displayed
- Reminder to check spam folder
- Button to go to signin page

### 3. Email Confirmation

**Supabase sends email with**:
- Confirmation link
- Link format: `https://[project].supabase.co/auth/v1/verify?token=xxx&type=signup`
- Link redirects to frontend after confirmation

**After clicking confirmation link**:
- Email is verified in Supabase
- User can now sign in
- Attempting to sign in before confirmation shows: "Email not confirmed"

## Error Handling

### During Signup

1. **Duplicate Email**:
   ```
   Error: "duplicate key value violates unique constraint..."
   Shown as: "อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น"
   ```

2. **Validation Errors**:
   - Missing fields
   - Invalid email format
   - Weak password
   - Passwords don't match
   - Terms not accepted

### During Signin (Before Confirmation)

```json
{
  "success": false,
  "message": "Email not confirmed"
}
```

**Frontend shows**: "Email not confirmed" (or custom Thai message)

**Solution**: User needs to check email and click confirmation link

## User Experience

### 1. Registration Page (`/signup`)

Fields:
- ชื่อ (First Name)
- นามสกุล (Last Name)
- อีเมล (Email)
- รหัสผ่าน (Password) - with show/hide toggle
- ยืนยันรหัสผ่าน (Confirm Password) - with show/hide toggle
- Terms acceptance checkbox

Button: "สร้างบัญชี" (Create Account)

### 2. Success Page (after signup)

Shows:
```
✅ ลงทะเบียนสำเร็จ!

ลงทะเบียนสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชีของคุณ
กรุณาคลิกลิงก์ในอีเมลเพื่อยืนยันบัญชีของคุณ

📧 โปรดตรวจสอบกล่องจดหมายและโฟลเดอร์สแปมของคุณ
ส่งไปยัง: user@example.com

[ไปหน้าเข้าสู่ระบบ]
```

### 3. Confirmation Email

User receives email from Supabase with:
- Confirmation link
- Instructions
- Link expires after certain time (default: 24 hours)

### 4. After Confirmation

User clicks link → Email verified → Can sign in normally

### 5. Signin Page (`/signin`)

If user tries to sign in before confirming:
```
❌ Email not confirmed
```

After confirming:
```
✅ Sign in successful → Redirect to home
```

## Code Changes

### `auth.service.ts`

**Before**:
```typescript
// Automatically signed in after signup
return signIn(email, password);
```

**After**:
```typescript
// Return success message, no auto-signin
return {
  message: 'ลงทะเบียนสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชีของคุณ'
};
```

### `signup/page.tsx`

**Added**:
- `isSuccess` state - tracks successful registration
- `successMessage` state - stores confirmation message
- Success page UI component
- Email display in confirmation message

**Flow**:
1. Form submission
2. API call
3. Check for errors
4. If `response.message` → Show success page
5. If `response.user` && `response.token` → Auto-signin (fallback)

## Backend Configuration

### Supabase Email Settings

Required settings in Supabase project:
- Email confirmation enabled
- Email templates configured
- SMTP settings (if custom email)
- Confirmation URL redirect (optional)

### Backend Code

```typescript
export async function signUpController(email, password, firstname, lastname) {
  // Creates user in Supabase Auth
  const uuid = await createAuthUser(email, password, firstname, lastname);
  
  // Supabase automatically sends confirmation email
  
  return { message: "SignUp success" };
}
```

## Testing

### Test Successful Registration:
1. Go to `/signup`
2. Fill in all fields with valid data
3. Accept terms
4. Click "สร้างบัญชี"
5. Should see success page with email instructions
6. Check email inbox (and spam)
7. Click confirmation link
8. Go to `/signin`
9. Sign in with registered credentials
10. Should successfully sign in

### Test Signin Before Confirmation:
1. Register new account
2. DON'T click confirmation link
3. Try to sign in immediately
4. Should see "Email not confirmed" error
5. Go to email and confirm
6. Try signin again
7. Should work now

### Test Duplicate Email:
1. Register with email A
2. Try to register again with same email A
3. Should see "อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น"

## Common Issues

### Issue: Not receiving confirmation email
**Solutions**:
- Check spam folder
- Verify email address is correct
- Check Supabase email settings
- Check SMTP configuration

### Issue: Confirmation link expired
**Solutions**:
- Request new signup (if link expired)
- Backend can implement resend confirmation endpoint
- Supabase allows configuring expiration time

### Issue: "Email not confirmed" persists
**Solutions**:
- Ensure confirmation link was clicked
- Check Supabase Auth dashboard for user status
- Verify email confirmation settings are enabled

## Future Enhancements

Possible improvements:
1. **Resend Confirmation Email** - Add button to resend if not received
2. **Custom Email Templates** - Branded confirmation emails
3. **Email Change Flow** - Allow users to change email with re-confirmation
4. **Countdown Timer** - Show "resend email" button after 60 seconds
5. **Email Status Check** - API endpoint to check if email is confirmed

## Security Considerations

1. ✅ Email verification prevents fake accounts
2. ✅ Confirmation links expire after set time
3. ✅ One-time use confirmation tokens
4. ✅ Passwords encrypted (RSA + Supabase hashing)
5. ✅ No auto-signin without email confirmation
6. ✅ Clear error messages without exposing system details

