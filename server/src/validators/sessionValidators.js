const { z } = require("zod");

const startSessionSchema = z.object({
  planId: z.string().optional(),
});

const logSetSchema = z.object({
  exerciseId: z.string(),
  weightKg: z.number().positive(),
  reps: z.number().int().positive(),
});

module.exports = { startSessionSchema, logSetSchema };