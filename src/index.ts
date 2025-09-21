import { Elysia } from "elysia";
import { authRoute } from "./routes/auth-route";
import { fileRoute } from "./routes/file-route";

const app = new Elysia();

authRoute(app);
fileRoute(app);

app.listen(3030, () =>{
  console.log("server running on http://localhost:3030");
});

