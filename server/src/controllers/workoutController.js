const workoutService = require("../services/workoutService");
const { generatePlanRequestSchema } = require("../validators/workoutValidators");

function validationMessage(err) {
  return Array.isArray(err.issues) && err.issues[0]?.message
    ? err.issues[0].message
    : "Invalid request";
}

async function generatePlan(req, res, next) {
  try {
    const parsed = generatePlanRequestSchema.parse(req.body || {});
    const plan = await workoutService.generateWorkoutPlan(req.userId, parsed.splitType);
    res.status(201).json(plan);
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: validationMessage(err) },
      });
    }
    next(err);
  }
}

async function getActivePlan(req, res, next) {
  try {
    const plan = await workoutService.getActivePlan(req.userId);
    res.json(plan);
  } catch (err) {
    next(err);
  }
}

async function getExercises(req, res, next) {
  try {
    const exercises = await workoutService.getExercises();
    res.json(exercises);
  } catch (err) {
    next(err);
  }
}

module.exports = { generatePlan, getActivePlan, getExercises };
