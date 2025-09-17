import { Elysia } from "elysia";
import { Routes } from "./routes/auth-route";

// const app = new Elysia();

const app = new Elysia();

Routes(app);

app.listen(3030, () =>{
  console.log("server running on http://localhost:3030");
});

