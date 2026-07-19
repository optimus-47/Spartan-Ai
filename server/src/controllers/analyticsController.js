const analyticsService = require("../services/analyticsService");

async function weightTrend(req, res, next) {
  try {
    const data = await analyticsService.getWeightTrend(req.userId);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function caloriesTrend(req, res, next) {
  try {
    const data = await analyticsService.getCaloriesTrend(req.userId);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { weightTrend, caloriesTrend };