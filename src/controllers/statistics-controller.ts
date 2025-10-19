import { getStatistics } from "../repositories/statistics-repo";

export const getStatisticsController = async () => {
  try {
    const result = await getStatistics();
    return result;
  } catch (err: any) {
    return { status: 500, message: err.message };
  }
};
