const { z } = require("zod");

const generatePlanRequestSchema = z.object({
  splitType: z.enum([
    "ppl", "upper_lower", "bro_split", "arnold",
    "powerlifting", "bodybuilding", "home", "calisthenics",
  ]).optional(),
});

// Shape we require Gemini's JSON output to match
const aiPlanExerciseSchema = z.object({
  exerciseId: z.string(),
  dayIndex: z.number().int().min(0),
  orderIndex: z.number().int().min(0),
  targetSets: z.number().int().min(1).max(10),
  targetRepsMin: z.number().int().min(1).max(50),
  targetRepsMax: z.number().int().min(1).max(50),
  targetRpe: z.number().min(1).max(10),
});

const aiPlanResponseSchema = z.object({
  splitType: z.string(),
  days: z.array(
    z.object({
      dayIndex: z.number().int(),
      label: z.string(),
      isRestDay: z.boolean(),
    })
  ),
  exercises: z.array(aiPlanExerciseSchema),
});

module.exports = { generatePlanRequestSchema, aiPlanResponseSchema };