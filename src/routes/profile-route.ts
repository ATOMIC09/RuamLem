import { Elysia, t } from "elysia";
import { supabase } from "../supabase";
import { 
  getProfileController, 
  updateProfileController,
  uploadAvatarFileController
} from "../controllers/profile-controller";

export const profileRoute = (app: Elysia) => {
  
  // Get user profile with avatar
  app.get("/profile", async (c) => {
    const authHeader = c.request.headers.get("authorization");
    if (!authHeader) return { status: 401, message: "No token provided" };
    
    const token = authHeader.split(" ")[1];

    try {
      const { data: user, error } = await supabase.auth.getClaims(token);
      
      if (error || !user) {
        return { status: 401, message: "Invalid token" };
      }

      const userId = user.claims.sub;
      return getProfileController(userId);
    } catch (err: any) {
      return { status: 400, error: err.message };
    }
  }, {
    detail: {
      tags: ['Profile'],
      summary: 'Get User Profile',
      description: 'Retrieve user profile including avatar and bio',
      security: [{ bearerAuth: [] }]
    }
  });

  // Update full profile
  app.put("/profile", async (c) => {
    const authHeader = c.request.headers.get("authorization");
    if (!authHeader) return { status: 401, message: "No token provided" };
    
    const token = authHeader.split(" ")[1];
    const body = c.body as any;

    try {
      const { data: user, error } = await supabase.auth.getClaims(token);
      
      if (error || !user) {
        return { status: 401, message: "Invalid token" };
      }

      const userId = user.claims.sub;
      return updateProfileController(userId, {
        firstName: body.firstName,
        lastName: body.lastName,
        bio: body.bio,
        avatarUrl: body.avatarUrl
      });
    } catch (err: any) {
      return { status: 400, error: err.message };
    }
  }, {
    body: t.Object({
      firstName: t.Optional(t.String({ description: "First name" })),
      lastName: t.Optional(t.String({ description: "Last name" })),
      bio: t.Optional(t.String({ description: "User bio" })),
      avatarUrl: t.Optional(t.String({ description: "Avatar image URL" }))
    }),
    detail: {
      tags: ['Profile'],
      summary: 'Update Profile',
      description: 'Update user profile information including avatar and bio',
      security: [{ bearerAuth: [] }]
    }
  });

  // Delete avatar
  // Upload avatar file
  app.post("/profile/avatar/upload", async (c) => {
    const authHeader = c.request.headers.get("authorization");
    if (!authHeader) return { status: 401, message: "No token provided" };
    
    const token = authHeader.split(" ")[1];

    try {
      const { data: user, error } = await supabase.auth.getClaims(token);
      
      if (error || !user) {
        return { status: 401, message: "Invalid token" };
      }

      const userId = user.claims.sub;
      const formData = await c.request.formData();
      const file = formData.get("file") as File;

      if (!file) {
        return { status: 400, message: "No file uploaded" };
      }

      console.log("📁 Avatar file received:", file.name, "Size:", file.size, "Type:", file.type);

      return uploadAvatarFileController(userId, file);
    } catch (err: any) {
      return { status: 400, error: err.message };
    }
  }, {
    detail: {
      tags: ['Profile'],
      summary: 'Upload Avatar File',
      description: 'Upload avatar image file to Supabase bucket (JPEG, PNG, WebP, GIF - max 10MB)',
      security: [{ bearerAuth: [] }]
    }
  });

  return app;
}
