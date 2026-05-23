import Elysia from "elysia";
import { getStatsController } from "../controllers/stats-controller";

export const statsRoute = new Elysia({ prefix: "/stats" })
  .get("/", () => getStatsController());

export default statsRoute;
