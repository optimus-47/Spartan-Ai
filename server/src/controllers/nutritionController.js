const nutritionService = require("../services/nutritionService");
const { logMealSchema, confirmMealScanSchema } = require("../validators/nutritionValidators");

async function search(req, res, next) {
  try {
    const foods = await nutritionService.searchFoods(req.query.search);
    res.json(foods);
  } catch (err) {
    next(err);
  }
}

async function logMeal(req, res, next) {
  try {
    const parsed = logMealSchema.parse(req.body);
    const item = await nutritionService.logMealItem(req.userId, parsed);
    res.status(201).json(item);
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: err.errors[0].message },
      });
    }
    next(err);
  }
}

async function getMeals(req, res, next) {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "date query param is required" },
      });
    }
    const result = await nutritionService.getMealsForDate(req.userId, date);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
async function scanMeal(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "No image file provided" },
      });
    }
    const detectedItems = await nutritionService.detectFoodFromImage(
      req.file.buffer,
      req.file.mimetype
    );
    res.json({ detectedItems });
  } catch (err) {
    next(err);
  }
}

async function confirmScan(req, res, next) {
  try {
    const parsed = confirmMealScanSchema.parse(req.body);
    const loggedItems = await nutritionService.confirmMealScan(req.userId, parsed);
    res.status(201).json({ loggedItems });
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: err.errors[0].message },
      });
    }
    next(err);
  }
}

module.exports = { search, logMeal, getMeals, scanMeal, confirmScan };