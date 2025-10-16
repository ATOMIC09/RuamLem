import { Elysia } from "elysia";
import { signUpController, signInController, signOutController, forgetPasswordController } from "../controllers/auth-controller"
import { decryptRSA } from "../services/auth-service";
// import { supabase } from "../supabase";

export const authRoute = (app: Elysia) => {
  app.post("/auth/signUp", async (c) => {
    try {
      const body = await c.request.json();
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
  });

  app.post("/auth/signIn", async (c) => {

    const body = await c.request.json();
    const encryptedData = body.data;

    const decryptedJSON = decryptRSA(encryptedData);

    const { email, password } = JSON.parse(decryptedJSON);

    return signInController(email, password);
  });

  app.post("/auth/signOut", async (c) => {

    const authHeader = c.request.headers.get("authorization");
    if (!authHeader) return { status: 401, message: "No token" };
    const token = authHeader.split(" ")[1];

    return signOutController(token);
  });

  app.post("/auth/forget", async (c) =>{
    const body = await c.request.json();
    const email = body.email;

    if(!email){
      return {
        error: "email is empty"
      }
    }

    // console.log(email);

    return forgetPasswordController(email);


  });

  // app.get("/name", async (c) => {
  //   const authHeader = c.request.headers.get("authorization");
  //   if (!authHeader) return { success: false, message: "No token" };

  //   const token = authHeader.split(" ")[1];

  //   const { data: user, error } = await supabase.auth.getClaims(token);
  //   if (error || !user) {
  //     return {sccess: false, message: "Invalid session"};
  //   }

  //   return{
  //     success: true,
  //     name: user
  //   };
  // });

  return app;
}
