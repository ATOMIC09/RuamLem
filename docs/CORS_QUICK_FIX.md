# 🚀 Quick Fix for CORS Error

## The Problem
```
CORS policy: No 'Access-Control-Allow-Origin' header
```

## ⚡ Quick Solution (5 minutes)

### In Backend Terminal:
```bash
cd RuamLem-backend
bun add @elysiajs/cors
```

### Edit `src/index.ts`:
Add at the top:
```typescript
import { cors } from "@elysiajs/cors";
```

Add after `new Elysia()`:
```typescript
const app = new Elysia()
  .use(cors({
    origin: 'http://localhost:3000',
    credentials: true
  }))
  .use(openapi({
    // ... rest of code
```

### Restart Backend:
```bash
# Ctrl+C then:
bun run dev
```

### Test:
- Go to http://localhost:3000/signin
- Try signing in
- Should work! ✅

---

**Need help?** See `CORS_FIX.md` for detailed instructions.
