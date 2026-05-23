import { getStatistics } from "../repositories/stats-repo";

export const getStatsController = async () => {
  try {
    const result = await getStatistics();
    return result;
  } catch (err: any) {
    return { status: 500, message: err.message };
  }
};
