# CORS Error Fix Guide

## The Problem

You're getting a CORS (Cross-Origin Resource Sharing) error because:
- **Frontend** runs on: `http://localhost:3000`
- **Backend** runs on: `http://localhost:3030`
- Different ports = different origins = CORS required

Error message:
```
Access to fetch at 'http://localhost:3030/auth/signIn' from origin 'http://localhost:3000' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

## ✅ Solution 1: Fix Backend CORS (RECOMMENDED)

This is the proper solution. The backend needs to allow requests from your frontend.

### Steps:

1. **Install CORS plugin in backend:**
```bash
cd RuamLem-backend
bun add @elysiajs/cors
```

2. **Update `RuamLem-backend/src/index.ts`:**

Add the CORS import at the top:
```typescript
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";  // ← ADD THIS
import { openapi } from "@elysiajs/openapi";
// ... other imports
```

Add CORS configuration after creating the app:
```typescript
const app = new Elysia()
  .use(cors({                           // ← ADD THIS BLOCK
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }))
  .use(openapi({
    // ... rest of config
```

3. **Restart backend server:**
```bash
# Stop the server (Ctrl+C) and restart
bun run dev
```

4. **Test again** - CORS error should be gone! ✅

### For Production (Better CORS Config):

```typescript
.use(cors({
  origin: (request) => {
    const origin = request.headers.get('origin');
    // Allow localhost during development
    if (origin?.includes('localhost')) return origin;
    // Add production domains
    if (origin === 'https://ruamlem.com') return origin;
    if (origin === 'https://www.ruamlem.com') return origin;
    return false;
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
```

## ✅ Solution 2: Use Next.js Proxy (TEMPORARY)

I've already set up a proxy in your `next.config.ts`. This works but is not ideal for production.

### What I Changed:

**File: `next.config.ts`**
```typescript
async rewrites() {
  return [
    {
      source: '/api/backend/:path*',
      destination: 'http://localhost:3030/:path*',
    },
  ];
}
```

### To Use the Proxy:

**Update `.env.local`:**
```env
# Change this:
NEXT_PUBLIC_API_URL=http://localhost:3030

# To this:
NEXT_PUBLIC_API_URL=/api/backend
```

Then restart your frontend:
```bash
npm run dev
```

### How It Works:
- Frontend makes request to: `/api/backend/auth/signIn`
- Next.js proxies it to: `http://localhost:3030/auth/signIn`
- Same origin = No CORS error! ✅

### Limitations:
- ❌ Only works in development
- ❌ Doesn't work with `npm run build` → `npm start`
- ❌ Backend still needs CORS for direct API access
- ❌ Adds extra latency

## 🎯 Which Solution Should You Use?

### Use Solution 1 (Backend CORS) if:
- ✅ You have access to modify the backend
- ✅ You want the proper solution
- ✅ You're preparing for production
- ✅ You want to learn best practices

### Use Solution 2 (Proxy) if:
- ⚠️ You can't modify the backend right now
- ⚠️ Backend team will fix it later
- ⚠️ You need to develop immediately
- ⚠️ This is temporary

## 🔄 Step-by-Step: Backend CORS Fix

### 1. Open Backend Terminal:
```bash
cd RuamLem-backend
```

### 2. Install CORS Package:
```bash
bun add @elysiajs/cors
```

You should see:
```
bun add v1.x.x
installed @elysiajs/cors@x.x.x
```

### 3. Edit `src/index.ts`:

**Before:**
```typescript
import { Elysia } from "elysia";
import { openapi } from "@elysiajs/openapi";

const app = new Elysia()
  .use(openapi({
```

**After:**
```typescript
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";  // ← ADD
import { openapi } from "@elysiajs/openapi";

const app = new Elysia()
  .use(cors({                           // ← ADD
    origin: 'http://localhost:3000',
    credentials: true
  }))
  .use(openapi({
```

### 4. Save and Restart:
```bash
# Ctrl+C to stop
bun run dev
```

### 5. Test in Browser:
- Go to http://localhost:3000/signin
- Try to sign in
- Check Network tab - should succeed! ✅

## 🧪 How to Test

### Test 1: Check CORS Headers
Open browser DevTools (F12) → Network tab:

**Before fix:**
```
Request Method: OPTIONS (preflight)
Status: (failed)
```

**After fix:**
```
Request Method: OPTIONS (preflight)
Status: 204 No Content
Response Headers:
  access-control-allow-origin: http://localhost:3000
  access-control-allow-credentials: true
```

### Test 2: Try Sign In
1. Go to http://localhost:3000/signin
2. Enter email: test@example.com
3. Enter password: TestPass123
4. Click "เข้าสู่ระบบ"
5. Should work! ✅

## 📝 Backend Code Example

Complete `src/index.ts` with CORS:

```typescript
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { authRoute } from "./routes/auth-route";
import { fileRoute } from "./routes/file-route";
import { postRoute } from "./routes/post-route";

const app = new Elysia()
  // Add CORS - must be before other middleware
  .use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }))
  // OpenAPI documentation
  .use(openapi({
    documentation: {
      info: {
        title: 'RuamLem API',
        description: 'A social platform backend API',
        version: '1.0.50'
      },
      servers: [
        {
          url: 'http://localhost:3030',
          description: 'Development server'
        }
      ],
      tags: [
        { name: 'Auth', description: 'Authentication endpoints' },
        { name: 'Posts', description: 'Post management endpoints' },
        { name: 'Files', description: 'File upload endpoints' }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      }
    }
  }));

// Register routes
authRoute(app);
fileRoute(app);
postRoute(app);

// Start server
app.listen(3030, () => {
  console.log("🚀 Server running on http://localhost:3030");
  console.log("📖 API Documentation: http://localhost:3030/openapi");
  console.log("✅ CORS enabled for http://localhost:3000");
});
```

## 🚨 Common Issues

### Issue: Still getting CORS after adding plugin
**Solution:** 
- Make sure CORS is added BEFORE other middleware
- Restart backend completely
- Clear browser cache (Ctrl+Shift+Delete)
- Try in incognito mode

### Issue: CORS works for some endpoints but not others
**Solution:**
- Make sure CORS is at the app level, not route level
- Check `methods` array includes the method you're using

### Issue: Credentials error
**Solution:**
- Make sure `credentials: true` is set in CORS
- Frontend should send credentials if needed

### Issue: Can't install @elysiajs/cors
**Solution:**
```bash
# Try with --save
bun add @elysiajs/cors --save

# Or check Bun version
bun --version

# Update Bun if needed
bun upgrade
```

## 📚 Resources

- [Elysia CORS Plugin Docs](https://elysiajs.com/plugins/cors.html)
- [MDN CORS Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Understanding CORS](https://web.dev/cross-origin-resource-sharing/)

## ✅ Checklist

- [ ] Install `@elysiajs/cors` in backend
- [ ] Import cors plugin in `src/index.ts`
- [ ] Add `.use(cors({...}))` configuration
- [ ] Restart backend server
- [ ] Test sign in from frontend
- [ ] Verify in Network tab
- [ ] Celebrate! 🎉

---

**Recommendation:** Use Solution 1 (Backend CORS) - it's the proper way and works in all environments!
