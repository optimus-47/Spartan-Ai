const { z } = require("zod");

const generateMealPlanRequestSchema = z.object({
  dietType: z.enum(["vegetarian", "vegan", "non_vegetarian", "eggetarian"]).optional(),
  days: z.number().int().min(1).max(7).optional().default(3),
});

const aiMealPlanDaySchema = z.object({
  dayIndex: z.number().int().min(0),
  meals: z.array(
    z.object({
      mealSlot: z.enum(["breakfast", "lunch", "dinner", "snack"]),
      foodId: z.string(),
      quantityG: z.number().positive(),
    })
  ),
});

const aiMealPlanResponseSchema = z.object({
  dietType: z.string(),
  days: z.array(aiMealPlanDaySchema),
});

module.exports = { generateMealPlanRequestSchema, aiMealPlanResponseSchema };