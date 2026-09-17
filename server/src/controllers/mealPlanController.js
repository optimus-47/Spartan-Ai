const mealPlanService = require("../services/mealPlanService");
const { generateMealPlanRequestSchema } = require("../validators/mealPlanValidators");

async function generate(req, res, next) {
  try {
    const parsed = generateMealPlanRequestSchema.parse(req.body || {});
    const plan = await mealPlanService.generateMealPlan(req.userId, parsed.dietType, parsed.days);
    res.status(201).json(plan);
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: err.issues[0].message } });
    }
    next(err);
  }
}

module.exports = { generate };
