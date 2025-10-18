import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { authRoute } from "./routes/auth-route";
import { fileRoute } from "./routes/file-route";
import { postRoute } from "./routes/post-route";

const app = new Elysia()
  .use(cors({
    origin: 'http://localhost:3000',
    credentials: true
  }))
  .onRequest(({ request }) => {
    console.log(`📨 ${request.method} ${new URL(request.url).pathname}`);
  })
  .use(openapi({
    documentation: {
      info: {
        title: 'RuamLem API',
        description: 'A social platform backend API with authentication, posts, and file management',
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
        { name: 'Files', description: 'File upload and download endpoints' }
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

authRoute(app);
fileRoute(app);
postRoute(app);

app.listen(3030, () => {
  console.log("Server running on http://localhost:3030");
  console.log("📖 API Documentation: http://localhost:3030/openapi");
});

