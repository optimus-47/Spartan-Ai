const { z } = require("zod");

const activityLevelMap = {
  "sedentary": "sedentary",
  "lightly active": "light", "light": "light",
  "moderately active": "moderate", "active": "active", "moderate": "moderate",
  "very active": "very_active", "very_active": "very_active",
};

const goalMap = {
  "lose fat": "fat_loss", "fat loss": "fat_loss", "weight loss": "fat_loss",
  "gain muscle": "muscle_gain", "muscle gain": "muscle_gain", "build muscle": "muscle_gain",
  "maintain": "maintenance", "maintenance": "maintenance",
  "get stronger": "strength", "strength": "strength",
  "general fitness": "general_fitness", "stay fit": "general_fitness",
};

const experienceMap = {
  "beginner": "beginner", "intermediate": "intermediate", "advanced": "advanced",
};

const foodPreferenceMap = {
  "vegetarian": "vegetarian",
  "vegan": "vegan",
  "omnivore": "non_vegetarian", "non-vegetarian": "non_vegetarian", "non vegetarian": "non_vegetarian",
  "eggetarian": "eggetarian",
};

function normalizeEnum(value, map) {
  if (typeof value !== "string") return value;
  return map[value.toLowerCase().trim()] || value;
}

const updateProfileSchema = z.preprocess(
  (data) => {
    if (typeof data !== "object" || data === null) return data;
    return {
      ...data,
      activityLevel: normalizeEnum(data.activityLevel, activityLevelMap),
      goal: normalizeEnum(data.goal, goalMap),
      gymExperience: normalizeEnum(data.gymExperience, experienceMap),
      foodPreference: normalizeEnum(data.foodPreference, foodPreferenceMap),
    };
  },
  z.object({
    age: z.coerce.number().int().positive().optional(),
    gender: z.string().optional(),
    heightCm: z.coerce.number().positive().optional(),
    weightKg: z.coerce.number().positive().optional(),
    bodyFatPct: z.coerce.number().positive().optional(),
    activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active"]).optional(),
    goal: z.enum(["fat_loss", "muscle_gain", "maintenance", "strength", "general_fitness"]).optional(),
    gymExperience: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    foodPreference: z.enum(["vegetarian", "vegan", "non_vegetarian", "eggetarian"]).optional(),
    sleepHoursTarget: z.coerce.number().positive().optional(),
    waterIntakeTargetMl: z.coerce.number().int().positive().optional(),
    displayName: z.string().min(1).max(50).optional(),
  })
);

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