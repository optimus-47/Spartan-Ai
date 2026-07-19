const { z } = require("zod");

const updateProfileSchema = z.object({
  age: z.number().int().positive().optional(),
  gender: z.string().optional(),
  heightCm: z.number().positive().optional(),
  weightKg: z.number().positive().optional(),
  bodyFatPct: z.number().positive().optional(),
  activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active"]).optional(),
  goal: z.enum(["fat_loss", "muscle_gain", "maintenance", "strength", "general_fitness"]).optional(),
  gymExperience: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  foodPreference: z.enum(["vegetarian", "vegan", "non_vegetarian", "eggetarian"]).optional(),
  sleepHoursTarget: z.number().positive().optional(),
  waterIntakeTargetMl: z.number().int().positive().optional(),
});

const addInjurySchema = z.object({
  injuryTag: z.string().min(1),
  affectedBodyPart: z.string().optional(),
});

const updateEquipmentSchema = z.object({
  equipmentTags: z.array(z.string()),
});

const addBodyMetricSchema = z.object({
  weightKg: z.number().positive(),
});

module.exports = {
  updateProfileSchema,
  addInjurySchema,
  updateEquipmentSchema,
  addBodyMetricSchema,
};