# Password Reset Flow

This document explains the complete password reset flow in the RuamLem frontend application.

## Flow Overview

```
User Forgets Password
    ↓
/forgot-password page
    ↓
User enters email → API call to backend
    ↓
Backend sends email with reset link
    ↓
User clicks link in email
    ↓
/reset-password?token=xxx page
    ↓
Verify token with backend
    ↓
User enters new password
    ↓
Password reset successful → Redirect to /signin
```

## Pages

### 1. `/forgot-password`
- **File**: `src/app/forgot-password/page.tsx`
- **Purpose**: User enters their email to request a password reset
- **Features**:
  - Email validation
  - Calls `authService.forgotPassword(email)`
  - Shows success message after sending
  - Allows resending email
  
### 2. `/reset-password`
- **File**: `src/app/reset-password/page.tsx`
- **Purpose**: User sets a new password using the token from email
- **Features**:
  - Extracts token from URL query parameter
  - Verifies token on mount using `authService.verifyResetToken(token)`
  - Password validation (8+ chars, letters + numbers)
  - Confirm password matching
  - Calls `authService.resetPassword(token, newPassword)`
  - Auto-redirects to `/signin` after 3 seconds on success

## API Endpoints Used

### 1. Forgot Password
- **Endpoint**: `POST /auth/forgot-password`
- **Request**: `{ email: string }`
- **Response**: `{ message?: string, error?: string }`

### 2. Verify Reset Token
- **Endpoint**: `POST /auth/verify-reset-token`
- **Request**: `{ token: string }`
- **Response**: `{ valid?: boolean, error?: string }`

### 3. Reset Password
- **Endpoint**: `POST /auth/reset-password`
- **Request**: `{ token: string, newPassword: string }`
- **Response**: `{ message?: string, error?: string }`

## States and Validations

### Reset Password Page States

1. **Loading State**: Validating the token
   - Shows spinner with "กำลังตรวจสอบลิงก์..."

2. **Invalid Token State**: Token expired or invalid
   - Shows error message
   - Offers link to request new reset
   - Offers link to go back to signin

3. **Valid Token State**: Main form
   - New password input with show/hide toggle
   - Confirm password input with show/hide toggle
   - Password validation requirements displayed
   - Submit button

4. **Success State**: Password changed successfully
   - Shows success checkmark
   - Auto-redirects to signin after 3 seconds

### Password Requirements

- Minimum 8 characters
- Must contain both letters and numbers
- Validated using `validatePassword()` from `lib/crypto.ts`

## User Experience

### Email Link Format

The backend should send an email with a link like:
```
https://yourdomain.com/reset-password?token=RESET_TOKEN_HERE
```

### Error Messages (Thai)

- "ไม่พบรหัสยืนยัน กรุณาคลิกลิงก์จากอีเมลอีกครั้ง" - No token found
- "ลิงก์หมดอายุหรือไม่ถูกต้อง กรุณาขอรีเซ็ตรหัสผ่านใหม่" - Invalid/expired token
- "รหัสผ่านไม่ถูกต้อง" - Password validation failed
- "รหัสผ่านไม่ตรงกัน" - Passwords don't match

### Success Messages (Thai)

- "เปลี่ยนรหัสผ่านสำเร็จ!" - Password changed successfully
- "คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้แล้ว" - Can now login with new password

## Security Considerations

1. **Token Verification**: Token is verified before showing the form
2. **Token Expiration**: Backend should implement token expiration (typically 15 minutes)
3. **One-Time Use**: Token should be invalidated after successful password reset
4. **Password Strength**: Enforced minimum requirements
5. **HTTPS**: Reset links should use HTTPS in production

## Testing

To test the password reset flow:

1. Go to `/forgot-password`
2. Enter a valid registered email
3. Check the email inbox for the reset link
4. Click the link (should open `/reset-password?token=xxx`)
5. Enter new password (meeting requirements)
6. Confirm the password
7. Submit and verify redirect to signin
8. Try signing in with the new password

## Backend Requirements

The backend must implement:

1. **POST /auth/forgot-password**
   - Generate unique reset token
   - Store token with expiration (15 min)
   - Send email with reset link
   - Return success response

2. **POST /auth/verify-reset-token**
   - Check if token exists
   - Check if token is not expired
   - Return validity status

3. **POST /auth/reset-password**
   - Verify token is valid and not expired
   - Hash new password
   - Update user's password in database
   - Invalidate the reset token
   - Return success response

## Notes

- The reset password page uses `useSearchParams()` from Next.js to get the token
- All forms have loading states to prevent double submissions
- Error handling covers network errors and API errors
- UI follows the same design system as signin/signup pages
