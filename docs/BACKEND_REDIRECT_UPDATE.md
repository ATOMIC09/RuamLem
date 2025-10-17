# Backend Configuration Required for Email Confirmation

## What Needs to Change

The backend needs to update the email redirect URL to point to the new `/confirm-email` page.

## File to Update

**Backend File**: `src/repositories/auth-repo.ts`

## Current Code (Line ~10-15)

```typescript
export async function createAuthUser(email: string, password: string, firstName: string, lastName: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    // ... rest of code
```

## Updated Code (Add options)

```typescript
export async function createAuthUser(email: string, password: string, firstName: string, lastName: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'http://localhost:3000/confirm-email'
      }
    });
    
    // ... rest of code
```

## For Production

When deploying to production, change the URL:

```typescript
options: {
  emailRedirectTo: 'https://yourdomain.com/confirm-email'
}
```

## What This Does

- Supabase will redirect users to `/confirm-email` after clicking the email verification link
- The frontend page will handle token extraction and show success/error messages
- Users will be automatically redirected to `/signin` after successful confirmation

## Testing After Change

1. Restart backend server
2. Register new account
3. Check email
4. Click confirmation link
5. Should redirect to: `http://localhost:3000/confirm-email#access_token=...`
6. Should see success page and auto-redirect to signin

## Current vs New Flow

### Current (without update):
```
Email link → Supabase → http://localhost:3000 → Home page (no confirmation UI)
```

### New (with update):
```
Email link → Supabase → http://localhost:3000/confirm-email → Success page → /signin
```

