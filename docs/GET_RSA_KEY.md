# How to Get RSA Public Key from Backend

The backend uses RSA encryption to protect user credentials during authentication. You need to obtain the public key that corresponds to the private key used by the backend.

## Method 1: Ask Your Backend Team (Recommended)

Contact your backend team and ask them for the RSA public key. They should have it in their backend repository or can extract it from their private key.

## Method 2: Extract from Backend Repository

If you have access to the backend repository:

1. Look for the `.env` file in the backend repository
2. Find the `RSA_PRIVATE_KEY` variable
3. Use the following command to extract the public key:

```bash
# Save the private key to a temporary file
echo "-----BEGIN RSA PRIVATE KEY-----
[PRIVATE_KEY_CONTENT_FROM_BACKEND_ENV]
-----END RSA PRIVATE KEY-----" > temp_private.pem

# Extract public key
openssl rsa -in temp_private.pem -pubout -out public_key.pem

# View the public key
cat public_key.pem

# Clean up
rm temp_private.pem
```

4. Copy the entire output (including BEGIN and END markers)
5. Add to your frontend `.env.local`

## Method 3: Generate New Key Pair (For New Projects)

If you're setting up both projects from scratch:

### On Linux/Mac:
```bash
# Generate private key
openssl genrsa -out private_key.pem 2048

# Extract public key
openssl rsa -in private_key.pem -pubout -out public_key.pem

# View private key (for backend)
cat private_key.pem

# View public key (for frontend)
cat public_key.pem
```

### On Windows:
1. Install OpenSSL for Windows: https://slproweb.com/products/Win32OpenSSL.html
2. Or use WSL (Windows Subsystem for Linux)
3. Run the same commands as Linux/Mac

### After Generation:

**Backend `.env`:**
```env
RSA_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAy8Dbv8prpJ/0kKhlGeJYozo2t60EG8EcNobuW7Kf8E+0s3eC
...
[full private key content]
...
-----END RSA PRIVATE KEY-----"
```

**Frontend `.env.local`:**
```env
NEXT_PUBLIC_RSA_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAy8Dbv8prpJ/0kKhlGeJY
...
[full public key content]
...
-----END PUBLIC KEY-----"
```

## Method 4: Check Backend Documentation

Look for:
- Backend README.md
- Backend .env.example file
- Backend documentation folder
- Backend setup guide

The public key might be documented there.

## Format Requirements

The public key must be in this format:

```env
NEXT_PUBLIC_RSA_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
...multiple lines of base64 encoded key...
...
-----END PUBLIC KEY-----"
```

**Important Notes:**
- Include the `-----BEGIN PUBLIC KEY-----` header
- Include the `-----END PUBLIC KEY-----` footer
- Keep the key content between the markers
- Wrap everything in double quotes
- You can keep it on multiple lines or use `\n` for line breaks

## Verifying the Key

To verify the public key works with the backend's private key:

```bash
# Create a test message
echo "test message" > message.txt

# Encrypt with public key (frontend simulation)
openssl rsautl -encrypt -pubin -inkey public_key.pem -in message.txt -out encrypted.bin

# Decrypt with private key (backend simulation)
openssl rsautl -decrypt -inkey private_key.pem -in encrypted.bin

# Should output: test message
```

If this works, your keys are compatible! ✅

## What If I Don't Have the RSA Key?

The application will still work but will use **base64 encoding instead of RSA encryption**. This is:
- ✅ Fine for local development
- ❌ **NOT SECURE for production**
- ⚠️ You'll see a warning in the browser console

**Console Warning:**
```
RSA public key not found in environment variables. Using plain text for development.
```

## Adding the Key to Frontend

1. Create/edit `.env.local` in your frontend root directory
2. Add the key:

```env
NEXT_PUBLIC_API_URL=http://localhost:3030
NEXT_PUBLIC_RSA_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----"
```

3. Restart your development server:
```bash
npm run dev
```

4. Test signup/signin - you should no longer see RSA warnings

## Common Issues

### Issue: "Failed to decrypt" on backend
**Cause:** Public key doesn't match backend's private key
**Solution:** Verify you have the correct public key from backend team

### Issue: "Invalid key format"
**Cause:** Key is malformed or missing BEGIN/END markers
**Solution:** Check the format matches the example above

### Issue: Key works locally but not in production
**Cause:** Environment variable not set in production
**Solution:** Add `NEXT_PUBLIC_RSA_PUBLIC_KEY` to your deployment platform's environment variables

## Security Best Practices

1. **Never commit keys to git** - They should only be in `.env` files
2. **Use different keys for production and development** - If leaked, production isn't compromised
3. **Rotate keys periodically** - Generate new keys every few months
4. **Keep private keys secret** - Only backend should have the private key
5. **Use strong keys** - Minimum 2048 bits (we use 2048-bit keys)

## Example: Complete Setup

Here's a complete example of setting up RSA encryption from scratch:

```bash
# 1. Generate keys
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem

# 2. Backend .env (copy the private key)
cat private.pem
# Add to backend/.env as RSA_PRIVATE_KEY="..."

# 3. Frontend .env.local (copy the public key)
cat public.pem
# Add to frontend/.env.local as NEXT_PUBLIC_RSA_PUBLIC_KEY="..."

# 4. Clean up temporary files
rm private.pem public.pem

# 5. Start both servers and test!
```

## Need Help?

If you're stuck:
1. Check with your backend team first
2. Review backend repository's .env.example
3. Look at backend documentation
4. For new projects, generate new keys using Method 3

---

**Remember:** The public key is safe to share within your team, but the private key must remain secret and only on the backend server!
