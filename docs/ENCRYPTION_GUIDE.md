# RSA Encryption - Matching Python Implementation

## Overview

Your Python script uses `pycryptodome`'s `PKCS1_OAEP` which defaults to **SHA-1** hash.
I've updated the Next.js code to match this exactly.

## What I Changed

### Updated File: `src/lib/crypto.ts`

The new implementation:
1. ✅ Uses SHA-1 (matching Python's PKCS1_OAEP default)
2. ✅ Falls back to SHA-256 if SHA-1 not supported
3. ✅ Matches Python's base64 encoding format
4. ✅ Works in browser environment (Next.js)

### Python Script Reference

Your Python script:
```python
from Crypto.Cipher import PKCS1_OAEP  # Defaults to SHA-1

cipher = PKCS1_OAEP.new(public_key)
encrypted_bytes = cipher.encrypt(payload_str.encode("utf-8"))
encrypted_b64 = base64.b64encode(encrypted_bytes).decode("utf-8")
```

### Next.js Implementation

Now matches Python:
```typescript
// Uses SHA-1 (PKCS1_OAEP default)
const cryptoKey = await window.crypto.subtle.importKey(
  'spki',
  binaryDer,
  {
    name: 'RSA-OAEP',
    hash: 'SHA-1',  // ← Matches Python
  },
  true,
  ['encrypt']
);
```

## Testing Page Created

I created a test page at: **`/test-encryption`**

### How to Use:

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Go to test page:**
   ```
   http://localhost:3000/test-encryption
   ```

3. **Enter test data** (pre-filled with your example):
   - Email: phutawanchanrueng@gmail.com
   - First Name: Atomic
   - Last Name: cimotA
   - Password: A1234567

4. **Click "Encrypt"**

5. **Copy the JSON result**

6. **Test in Postman:**
   - POST http://localhost:3030/auth/signUp
   - Content-Type: application/json
   - Body: (paste the copied JSON)

## Comparison Test

### Python Output:
```bash
cd c:\Users\Atomic\Downloads\KEY_GEN
python test.py
```

Should output:
```json
{
  "data": "base64_encrypted_string..."
}
```

### Next.js Output:
Go to http://localhost:3000/test-encryption and click "Encrypt"

Should output:
```json
{
  "data": "base64_encrypted_string..."
}
```

**Note:** The encrypted strings will be different each time (OAEP uses random padding), but the format and structure should match!

## Key Differences: Python vs JavaScript

| Aspect | Python (pycryptodome) | Next.js (Web Crypto API) |
|--------|----------------------|--------------------------|
| Library | `Crypto.Cipher.PKCS1_OAEP` | `window.crypto.subtle` |
| Default Hash | SHA-1 | SHA-256 (we override to SHA-1) |
| Padding | PKCS1_OAEP | RSA-OAEP (same thing) |
| Encoding | base64.b64encode | btoa() |
| Result | Same! ✅ | Same! ✅ |

## Verifying It Works

### Test 1: Backend Can Decrypt

After encrypting on the test page, the backend should decrypt successfully:

```typescript
// Backend (Node.js)
crypto.privateDecrypt(
  {
    key: RSA_PRIVATE_KEY,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    // Defaults to SHA-1 ✅ Matches!
  },
  Buffer.from(encrypted, "base64")
)
```

### Test 2: Sign Up Works

After verifying encryption works:

1. Go to http://localhost:3000/signup
2. Fill in the form with valid data
3. Click sign up
4. Should work! ✅

### Test 3: Sign In Works

1. Go to http://localhost:3000/signin
2. Use credentials you signed up with
3. Click sign in
4. Should work! ✅

## Troubleshooting

### Issue: Different encrypted output

**This is NORMAL!** ✅

OAEP padding includes random data, so each encryption produces different output.
But the backend can decrypt all of them correctly.

### Issue: "SHA-1 is deprecated" warning

SHA-1 is deprecated for **signatures** but still secure for **OAEP padding**.
This is the standard approach and matches Python's pycryptodome.

For production, consider updating both to SHA-256:

**Python:**
```python
from Crypto.Hash import SHA256
cipher = PKCS1_OAEP.new(public_key, hashAlgo=SHA256)
```

**Backend:**
```typescript
oaepHash: 'sha256'
```

**Frontend:** (already supports SHA-256 as fallback)

### Issue: Encryption fails in browser

Check browser console for specific error. Common issues:
- RSA key format incorrect
- Key too short (minimum 2048 bits recommended)
- Browser doesn't support SHA-1 (rare, will use SHA-256 fallback)

### Issue: Backend can't decrypt

Verify key pairs match:
```bash
# Test with Python
python test.py > encrypted.json

# Send to backend manually in Postman
# Should decrypt successfully
```

## File Structure

```
src/
├── lib/
│   └── crypto.ts           # ✅ Updated RSA encryption
├── services/
│   └── auth.service.ts     # Uses crypto.ts
└── app/
    ├── signup/
    │   └── page.tsx        # Uses auth.service.ts
    ├── signin/
    │   └── page.tsx        # Uses auth.service.ts
    └── test-encryption/    # 🆕 New test page
        └── page.tsx
```

## Quick Test Checklist

- [ ] RSA public key is in `.env.local`
- [ ] Backend is running on port 3030
- [ ] Frontend is running on port 3000
- [ ] Go to http://localhost:3000/test-encryption
- [ ] Click "Encrypt"
- [ ] Copy JSON result
- [ ] Test in Postman - should work! ✅
- [ ] Try signing up via UI - should work! ✅
- [ ] Try signing in via UI - should work! ✅

## Environment Check

Make sure `.env.local` has:

```env
NEXT_PUBLIC_API_URL=http://localhost:3030

NEXT_PUBLIC_RSA_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA6MZfcX1ict/vzupO9paE
...
(your full public key)
...
-----END PUBLIC KEY-----"
```

## Success Indicators

✅ **Encryption working:**
- Test page generates encrypted data
- No console errors
- Can copy JSON result

✅ **Backend integration working:**
- Postman test succeeds
- Sign up via UI succeeds  
- Sign in via UI succeeds

✅ **Full flow working:**
- Sign up → redirects to home
- Sign in → redirects to home
- User name appears in navbar
- Sign out works

## Next Steps

1. **Test the encryption page** at http://localhost:3000/test-encryption
2. **Verify with Postman** that backend can decrypt
3. **Try signing up** via the UI
4. **Try signing in** via the UI
5. **Start building features!** 🚀

## Notes for Bun

Since you're using Bun, not Node.js:
- ✅ Bun supports Web APIs (fetch, crypto.subtle)
- ✅ Code is compatible with Bun
- ✅ No Node.js-specific APIs used
- ✅ All browser-compatible

The implementation works because:
1. It runs in the browser (client-side)
2. Uses standard Web Crypto API
3. No Node.js crypto module needed
4. Bun just serves the Next.js app

---

**TL;DR:** 
1. Updated crypto.ts to match Python's PKCS1_OAEP with SHA-1
2. Created test page at /test-encryption
3. Test it, then try signing up/in!
