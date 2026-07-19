const { z } = require("zod");

const logMealSchema = z.object({
  logDate: z.string(), // ISO date string, e.g. "2026-07-19"
  mealSlot: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  foodId: z.string().optional(),
  foodName: z.string().optional(),
  quantityG: z.number().positive(),
});

const searchFoodsQuerySchema = z.object({
  search: z.string().optional(),
});

const confirmMealScanSchema = z.object({
  logDate: z.string(),
  mealSlot: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  items: z.array(
    z.object({
      foodId: z.string().optional(),
      foodName: z.string().optional(),
      quantityG: z.number().positive(),
      isAiDetected: z.boolean().optional(),
      confidence: z.number().min(0).max(1).optional(),
    })
  ).min(1),
});

module.exports = { logMealSchema, searchFoodsQuerySchema, confirmMealScanSchema };
