import { Elysia } from "elysia";

const app = new Elysia().get("/", () => "Hello Elysia J").listen(3030);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
