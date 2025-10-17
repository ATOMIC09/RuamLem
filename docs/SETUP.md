# Quick Setup Guide - Connecting Frontend to Backend

Follow these steps to connect your RuamLem frontend to the backend API.

## Prerequisites

- Backend repository: https://github.com/RuamLem/RuamLem-backend
- Backend running on `http://localhost:3030`
- Node.js and npm/bun installed

## Step 1: Get RSA Public Key from Backend

The backend uses RSA encryption for secure authentication. You need the public key that matches the backend's private key.

### Option A: Ask Backend Team
Contact your backend team and ask for the RSA public key from their `.env` file.

### Option B: Generate Keys (if starting fresh)
If you're setting up both projects from scratch, you can generate a new RSA key pair:

**On Linux/Mac:**
```bash
# Generate private key (2048 bits)
openssl genrsa -out private_key.pem 2048

# Extract public key from private key
openssl rsa -in private_key.pem -pubout -out public_key.pem

# View the keys
cat private_key.pem  # Add to backend .env as RSA_PRIVATE_KEY
cat public_key.pem   # Add to frontend .env.local as NEXT_PUBLIC_RSA_PUBLIC_KEY
```

**On Windows (PowerShell):**
```powershell
# You'll need OpenSSL for Windows or use WSL
# Download from: https://slproweb.com/products/Win32OpenSSL.html

# Then run the same commands as Linux/Mac
```

## Step 2: Configure Frontend Environment

1. Create `.env.local` file in the frontend root directory (if it doesn't exist)
2. Add the following configuration:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3030

# RSA Public Key (paste the key you got from backend team)
NEXT_PUBLIC_RSA_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
YOUR_PUBLIC_KEY_HERE
-----END PUBLIC KEY-----"
```

**Important:** Make sure to:
- Include the `-----BEGIN PUBLIC KEY-----` and `-----END PUBLIC KEY-----` markers
- Keep all the content on one line or use proper line breaks with `\n`
- Wrap the entire key in quotes

## Step 3: Install Dependencies

If you haven't already, install the frontend dependencies:

```bash
npm install
```

## Step 4: Start Both Servers

### Terminal 1 - Backend
```bash
cd RuamLem-backend
bun run dev
```
Wait for message: `server running on http://localhost:3030`

### Terminal 2 - Frontend
```bash
cd RuamLem-frontend
npm run dev
```
Wait for message indicating the server is running on `http://localhost:3000`

## Step 5: Test the Connection

1. Open your browser and go to `http://localhost:3000`
2. Click "สร้างบัญชี" (Sign Up)
3. Fill in the form:
   - ชื่อ (First Name): Test
   - นามสกุล (Last Name): User
   - อีเมล (Email): test@example.com
   - รหัสผ่าน (Password): TestPass123 (must have letters and numbers, minimum 8 characters)
   - ยืนยันรหัสผ่าน (Confirm Password): TestPass123
   - Check "ยอมรับเงื่อนไขการใช้งาน" (Accept Terms)
4. Click "สมัครสมาชิก" (Sign Up)

If successful, you should be redirected to the home page and see your name in the navbar.

## Step 6: Verify API Calls

Open browser DevTools (F12) and check the Network tab:
- You should see requests to `http://localhost:3030/auth/signUp`
- The request should have encrypted data
- The response should include a user object and token

## Troubleshooting

### "RSA public key not found" warning
- Check that `NEXT_PUBLIC_RSA_PUBLIC_KEY` is set in `.env.local`
- Verify the key format is correct
- The app will work but use base64 encoding instead (less secure)

### CORS errors
Backend needs to allow requests from `http://localhost:3000`. Check backend CORS configuration.

### 404 errors
- Verify backend is running on port 3030
- Check `NEXT_PUBLIC_API_URL` in `.env.local`

### Connection refused
- Make sure backend server is started
- Check if another service is using port 3030

### "Invalid credentials" on sign in
- Make sure you signed up first
- Verify email and password are correct
- Check that password meets requirements (8+ chars, letters + numbers)

## Example `.env.local` File

Here's a complete example (with placeholder public key):

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3030

# RSA Public Key - REPLACE THIS WITH ACTUAL KEY FROM BACKEND
NEXT_PUBLIC_RSA_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAy8Dbv8prpJ/0kKhlGeJY
ozo2t60EG8EcNobuW7Kf8E+0s3eC92U0aKAODLq7FDdJPl6JqcJmTxN+dBe4p8hH
... (more lines) ...
iXdXrN5S2B8vn3vCx1234567890EXAMPLE1234567890EXAMPLE123
-----END PUBLIC KEY-----"
```

## What's Integrated

✅ **Authentication**
- Sign up with encrypted credentials
- Sign in with encrypted credentials
- Sign out
- Forgot password
- JWT token management

✅ **Posts** (Ready to use)
- Create posts with PDF attachments
- View posts with pagination
- Filter posts by tags
- Add comments to posts
- Get comments for posts

✅ **Security**
- RSA encryption for sensitive data
- JWT token authentication
- Password validation
- Secure token storage

## Next Steps

1. Test the signup flow
2. Test the signin flow
3. Test creating posts (requires authentication)
4. Test viewing posts
5. Test adding comments (requires authentication)

For detailed API documentation, see `API_INTEGRATION.md`
