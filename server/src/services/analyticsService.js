const prisma = require("../config/prismaClient");

async function getWeightTrend(userId) {
  return prisma.bodyMetric.findMany({
    where: { userId },
    orderBy: { recordedAt: "asc" },
    select: { weightKg: true, recordedAt: true },
  });
}

async function getCaloriesTrend(userId) {
  const mealLogs = await prisma.mealLog.findMany({
    where: { userId },
    include: { items: true },
    orderBy: { logDate: "asc" },
  });

  // group by date, sum calories per day
  const dailyTotals = {};
  for (const log of mealLogs) {
    const dateKey = log.logDate.toISOString().split("T")[0];
    const dayCalories = log.items.reduce((sum, item) => sum + item.caloriesSnapshot, 0);
    dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + dayCalories;
  }

  return Object.entries(dailyTotals).map(([date, calories]) => ({ date, calories }));
}

module.exports = { getWeightTrend, getCaloriesTrend };