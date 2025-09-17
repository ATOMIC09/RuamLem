import { Elysia } from "elysia";
import { authRoutes } from "./routes/auth-route";

// const app = new Elysia();

const app = new Elysia();

authRoutes(app);

app.listen(3030, () =>{
  console.log("server running on http://localhost:3030");
});




// const app = new Elysia().get("/", () => "Hello Elysia J").listen(3030);

// console.log(
//   `Elysia is running at ${app.server?.hostname}:${app.server?.port}`
// );
