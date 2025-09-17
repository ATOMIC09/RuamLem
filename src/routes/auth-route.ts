import { Elysia } from "elysia";
import { signupController } from "../controllers/auth-controller"
import { decryptRSA } from "../services/auth-service";

export const authRoutes = (app: Elysia) =>
  app.post("/auth/signup", async (c) => {
    try {
      const body = await c.request.json();
      const encryptedData = body.data; 

      // decrypt
      const decryptedJSON = decryptRSA(encryptedData);

      // console.log(decryptedJSON);
      const { email, firstName, lastName, password } = JSON.parse(decryptedJSON);
      
      const result = await signupController(email, password, firstName, lastName);
      return result;

    } catch (err: any) {
      return { error: err.message };
    }
  });
