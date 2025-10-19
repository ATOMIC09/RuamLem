import Elysia from "elysia";
import { getStatisticsController } from "../controllers/statistics-controller";

const statisticsRoute = new Elysia({ prefix: "/statistics" })
  .get("/", () => getStatisticsController());

export default statisticsRoute;
