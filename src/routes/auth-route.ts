import { Elysia } from "elysia";
import { signUpController , signInController} from "../controllers/auth-controller"
import { decryptRSA } from "../services/auth-service";

export const Routes = (app: Elysia) => {
  app.post("/auth/signup", async (c) => {
    try {
      const body = await c.request.json();
      const encryptedData = body.data;

      // decrypt
      const decryptedJSON = decryptRSA(encryptedData);

      // console.log(decryptedJSON);
      const { email, firstName, lastName, password } = JSON.parse(decryptedJSON);

      const result = await signUpController(email, password, firstName, lastName);
      return result;

    } catch (err: any) {
      return { error: err.message };
    }
  });


  app.post("/auth/signin", async (c) => {

    const body = await c.request.json();
    const encryptedData = body.data;

    const decryptedJSON = decryptRSA(encryptedData);

    const { email, password } = JSON.parse(decryptedJSON);

    return signInController(email, password);
  });

  return app;
}
