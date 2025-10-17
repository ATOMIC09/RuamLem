# Message for Backend Team

Hi Backend Team! 👋

The frontend is getting CORS errors when trying to connect to the API. Could you please add CORS support to the backend?

## What needs to be done:

### 1. Install the CORS plugin:
```bash
bun add @elysiajs/cors
```

### 2. Update `src/index.ts`:

**Add import at the top:**
```typescript
import { cors } from "@elysiajs/cors";
```

**Add CORS middleware (before OpenAPI):**
```typescript
const app = new Elysia()
  .use(cors({
    origin: 'http://localhost:3000',  // Frontend URL
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }))
  .use(openapi({
    // ... existing config
```

### 3. Restart the server

## For Production:

You might want to use dynamic origin checking:

```typescript
.use(cors({
  origin: (request) => {
    const origin = request.headers.get('origin');
    // Allow localhost during development
    if (origin?.includes('localhost')) return origin;
    // Add production domains
    if (origin === 'https://ruamlem.com') return origin;
    return false;
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
```

## Why this is needed:

CORS (Cross-Origin Resource Sharing) is a browser security feature. Since the frontend (`localhost:3000`) and backend (`localhost:3030`) are on different ports, they're considered different origins. The backend needs to explicitly allow requests from the frontend origin.

## Resources:

- [Elysia CORS Plugin](https://elysiajs.com/plugins/cors.html)
- [CORS Explained](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

Thanks! 🙏

---

**Current Error:**
```
Access to fetch at 'http://localhost:3030/auth/signIn' from origin 'http://localhost:3000' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```
