import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { authRoute } from "./routes/auth-route";
import { fileRoute } from "./routes/file-route";
import { postRoute } from "./routes/post-route";
import { profileRoute } from "./routes/profile-route";
import { statsRoute } from "./routes/stats-route";
import { likeRoute } from "./routes/like-route";
import { analyticsRoute } from "./routes/analytics-route";

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
        version: '1.2.0'
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
        { name: 'Files', description: 'File upload and download endpoints' },
        { name: 'Profile', description: 'User profile and avatar settings endpoints' },
        { name: 'Stats', description: 'Platform statistics endpoints' },
        { name: 'Likes', description: 'Post like/engagement endpoints' },
        { name: 'Analytics', description: 'View and download tracking endpoints' }
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
  }))
  .use(authRoute)
  .use(fileRoute)
  .use(postRoute)
  .use(profileRoute)
  .use(statsRoute)
  .use(likeRoute)
  .use(analyticsRoute);

app.listen(3030, () => {
  console.log("Server running on http://localhost:3030");
  console.log("📖 API Documentation: http://localhost:3030/openapi");
});
