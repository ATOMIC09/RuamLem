import { Elysia, t } from "elysia";
import { signUpController, signInController, signOutController, forgetPasswordController, resetPasswordController, verifyResetTokenController } from "../controllers/auth-controller"
import { decryptRSA } from "../services/auth-service";
// import { supabase } from "../supabase";

export const authRoute = (app: Elysia) => {
  app.post("/auth/signUp", async ({ body }) => {
    try {
      const encryptedData = body.data;

      // decrypt
      const decryptedJSON = decryptRSA(encryptedData);

      // console.log(decryptedJSON);
      const { email, firstName, lastName, password } = JSON.parse(decryptedJSON);

      // console.log(email, firstName, lastName, password);

      const result = await signUpController(email, password, firstName, lastName);
      return result;

    } catch (err: any) {
      return { error: err.message };
    }
  }, {
    body: t.Object({
      data: t.String({ description: "RSA encrypted user registration data" })
    }),
    detail: {
      tags: ['Auth'],
      summary: 'User Registration',
      description: 'Register a new user with encrypted credentials'
    }
  });

  app.post("/auth/signIn", async ({ body }) => {

    const encryptedData = body.data;

    const decryptedJSON = decryptRSA(encryptedData);

    const { email, password } = JSON.parse(decryptedJSON);

    return signInController(email, password);
  }, {
    body: t.Object({
      data: t.String({ description: "RSA encrypted login credentials" })
    }),
    detail: {
      tags: ['Auth'],
      summary: 'User Login',
      description: 'Authenticate user with encrypted credentials'
    }
  });

  app.post("/auth/signOut", async (c) => {

    const authHeader = c.request.headers.get("authorization");
    if (!authHeader) return { status: 401, message: "No token" };
    const token = authHeader.split(" ")[1];

    return signOutController(token);
  }, {
    detail: {
      tags: ['Auth'],
      summary: 'User Logout',
      description: 'Sign out the authenticated user',
      security: [{ bearerAuth: [] }]
    }
  });

  app.post("/auth/forget", async ({ body }) =>{
    const email = body.email;

    if(!email){
      return {
        error: "email is empty"
      }
    }

    // console.log(email);

    return forgetPasswordController(email);


  }, {
    body: t.Object({
      email: t.String({ description: "User email address" })
    }),
    detail: {
      tags: ['Auth'],
      summary: 'Forgot Password',
      description: 'Send password reset email to user'
    }
  });

  // API endpoint to reset password (for frontend)
  app.post("/auth/reset-password", async ({ body }) => {
    const token = body.token;
    const newPassword = body.newPassword;

    return resetPasswordController(token, newPassword);
  }, {
    body: t.Object({
      token: t.String({ description: "Reset token from email link" }),
      newPassword: t.String({ description: "New password" })
    }),
    detail: {
      tags: ['Auth'],
      summary: 'Reset Password',
      description: 'Reset password using token from email'
    }
  });

  // Verify reset token (optional - for frontend to check if token is valid)
  app.post("/auth/verify-reset-token", async ({ body }) => {
    const token = body.token;
    return verifyResetTokenController(token);
  }, {
    body: t.Object({
      token: t.String({ description: "Reset token to verify" })
    }),
    detail: {
      tags: ['Auth'],
      summary: 'Verify Reset Token',
      description: 'Verify if reset token is valid'
    }
  });

  return app;
}
