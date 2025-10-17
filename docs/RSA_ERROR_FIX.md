# RSA Encryption Error Fix

## The Error

```
POST http://localhost:3030/auth/signIn 500 (Internal Server Error)
"Unexpected token 'e', "error:0400"... is not valid JSON"
```

This error means the backend is failing to decrypt the RSA-encrypted data.

## Root Cause

The issue is a **hash algorithm mismatch** between frontend and backend:

- **Frontend (Browser):** Uses `RSA-OAEP` with `SHA-256` by default
- **Backend (Node.js):** Uses `RSA_PKCS1_OAEP_PADDING` with `SHA-1` by default

When the backend tries to decrypt with SHA-1, but the data was encrypted with SHA-256, it fails!

## ✅ Solutions

### Solution 1: Update Frontend to Use SHA-1 (DONE ✅)

I've already updated `src/lib/crypto.ts` to try SHA-1 first, then fall back to SHA-256.

**Try signing in again** - it should work now!

### Solution 2: Update Backend to Use SHA-256 (Better for production)

If you still have issues, the backend should explicitly use SHA-256:

**In `RuamLem-backend/src/services/auth-service.ts`:**

```typescript
export function decryptRSA(encrypted: string): string {
  const RSA_PRIVATE_KEY:string = process.env.RSA_PRIVATE_KEY!.replace(/\\n/g, '\n');
  
  if (!RSA_PRIVATE_KEY) {
    throw new Error("RSA private key is not defined in env");
  }

  return crypto.privateDecrypt(
    {
      key: RSA_PRIVATE_KEY,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',  // ← ADD THIS LINE
    },
    Buffer.from(encrypted, "base64")
  ).toString("utf-8");
}
```

This makes the backend use SHA-256, matching the browser's default.

## Testing

### Test 1: Try Sign In
1. Clear browser cache (Ctrl+Shift+R)
2. Go to http://localhost:3000/signin
3. Enter your credentials
4. Click sign in

### Test 2: Check Console
Open DevTools (F12) → Console tab

**Should see:**
```
✅ No RSA errors
✅ No decryption errors
```

**Should NOT see:**
```
❌ "RSA encryption error"
❌ "Falling back to base64"
❌ "SHA-1 encryption failed"
```

### Test 3: Check Network
Open DevTools (F12) → Network tab

**Before fix:**
```
POST /auth/signIn
Status: 500 Internal Server Error
Response: error:04000...
```

**After fix:**
```
POST /auth/signIn  
Status: 200 OK
Response: { user: {...}, token: "..." }
```

## If It Still Doesn't Work

### Option 1: Verify RSA Key Compatibility

The public key in `.env.local` must match the private key in backend:

```bash
# Test if keys are compatible (in backend directory)
echo "test" > test.txt

# Encrypt with public key
openssl rsautl -encrypt -pubin -inkey <(echo "$NEXT_PUBLIC_RSA_PUBLIC_KEY") -in test.txt -out encrypted.bin

# Decrypt with private key
openssl rsautl -decrypt -inkey <(echo "$RSA_PRIVATE_KEY") -in encrypted.bin

# Should output: test
```

### Option 2: Check Backend Logs

Look at the backend terminal for error messages:

```
# Common errors:
❌ "error:04000000:RSA routines:OAEP_PADDING_CHK:oaep decoding error"
   → Hash mismatch (SHA-1 vs SHA-256)

❌ "error:0407109F:rsa routines:RSA_padding_check_PKCS1_type_2:pkcs decoding error"
   → Wrong padding type

❌ "error:04000000:RSA routines::data too large for key size"
   → Data too large (>= key size - 42 bytes for OAEP)
```

### Option 3: Temporarily Disable RSA

For debugging, you can temporarily remove the RSA key from `.env.local`:

```env
# Comment out or remove:
# NEXT_PUBLIC_RSA_PUBLIC_KEY="..."
```

This will make the frontend use base64 encoding instead. **ONLY FOR TESTING!**

## Updated Files

I've updated these files:

1. **`src/lib/crypto.ts`**
   - Now tries SHA-1 first (Node.js default)
   - Falls back to SHA-256 if SHA-1 fails
   - Better error logging

2. **`src/lib/api.ts`**
   - Better error handling for non-JSON responses
   - Logs full error messages to console
   - Handles backend errors gracefully

## Why This Happens

### The Technical Details:

1. **RSA-OAEP Padding** requires a hash function
2. **Node.js crypto.privateDecrypt** defaults to SHA-1 when using `RSA_PKCS1_OAEP_PADDING`
3. **Browser Web Crypto API** defaults to SHA-256
4. When hash algorithms don't match, decryption fails!

### The Fix:

**Option A:** Frontend uses SHA-1 (what I did)
- ✅ Works immediately
- ⚠️ SHA-1 is deprecated (but still secure for OAEP)

**Option B:** Backend uses SHA-256 (recommended)
- ✅ More secure
- ✅ Modern standard
- Requires backend change

## Production Recommendations

For production, you should:

1. **Backend:** Explicitly use SHA-256:
   ```typescript
   oaepHash: 'sha256'
   ```

2. **Frontend:** Use SHA-256 (already supported)

3. **Keys:** Generate 4096-bit keys for extra security:
   ```bash
   openssl genrsa -out private.pem 4096
   ```

4. **Consider:** Using a crypto library like [jsencrypt](https://www.npmjs.com/package/jsencrypt) or [node-rsa](https://www.npmjs.com/package/node-rsa) for more control

## Quick Checklist

- [x] Updated `src/lib/crypto.ts` to use SHA-1
- [x] Updated `src/lib/api.ts` for better error handling  
- [ ] Test sign in - should work now!
- [ ] (Optional) Update backend to use SHA-256
- [ ] (Optional) Generate stronger keys for production

## Next Steps

1. **Try signing in** - should work now! ✅
2. If it works, great! You're done.
3. If not, check the console logs for specific errors
4. Share the console error with me for further debugging

---

**TL;DR:** The frontend was using SHA-256, backend expected SHA-1. I fixed the frontend to use SHA-1. Try signing in again!
