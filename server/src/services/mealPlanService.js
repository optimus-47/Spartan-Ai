const prisma = require("../config/prismaClient");
const { textModel } = require("../config/geminiClient");
const { aiMealPlanResponseSchema } = require("../validators/mealPlanValidators");
const retryWithBackoff = require("../utils/retryWithBackoff");

// deterministic filter — same safety pattern as the workout generator
async function getEligibleFoods(dietType) {
  const allFoods = await prisma.food.findMany();

  if (!dietType || dietType === "non_vegetarian") return allFoods;

  // simple tag-based filtering — foods flagged non-veg by name/cuisine convention
  // (kept simple since the catalog doesn't have a dedicated diet-type column yet)
  const nonVegKeywords = ["chicken", "fish", "egg", "mutton", "meat"];
  if (dietType === "vegan") {
    const dairyKeywords = ["paneer", "curd", "yogurt", "milk", "ghee", "butter", "cheese"];
    return allFoods.filter((f) => {
      const nameLower = f.name.toLowerCase();
      return !nonVegKeywords.some((k) => nameLower.includes(k)) &&
             !dairyKeywords.some((k) => nameLower.includes(k));
    });
  }

  // vegetarian / eggetarian: exclude meat/fish, allow dairy; eggetarian also allows egg
  return allFoods.filter((f) => {
    const nameLower = f.name.toLowerCase();
    const excludeKeywords = dietType === "eggetarian"
      ? nonVegKeywords.filter((k) => k !== "egg")
      : nonVegKeywords;
    return !excludeKeywords.some((k) => nameLower.includes(k));
  });
}

async function callGeminiForMealPlan(profile, eligibleFoods, days) {
  const foodPoolForPrompt = eligibleFoods.map((f) => ({
    id: f.id,
    name: f.name,
    caloriesPer100g: f.caloriesPer100g,
    proteinPer100g: f.proteinPer100g,
  }));

  const prompt = `
You are a nutrition planning assistant. Generate a ${days}-day meal plan using ONLY 
foods from the provided pool. Do not invent foods or use any food ID not in the pool.

User profile:
- Goal: ${profile?.goal || "general_fitness"}
- Food preference: ${profile?.foodPreference || "no restriction"}

Available food pool (ONLY use these IDs):
${JSON.stringify(foodPoolForPrompt)}

Respond with ONLY valid JSON (no markdown, no explanation) matching exactly this shape:
{
  "dietType": "string",
  "days": [
    {
      "dayIndex": 0,
      "meals": [
        { "mealSlot": "breakfast", "foodId": "must be one of the ids from the pool", "quantityG": 150 }
      ]
    }
  ]
}
Include breakfast, lunch, dinner, and one snack per day, with reasonable portion sizes 
supporting the user's goal.
`;

  const result = await textModel.generateContent(prompt);
  const cleaned = result.response.text().replace(/```json|```/g, "").trim();

  let result;
  try {
    result = await retryWithBackoff(() => textModel.generateContent(prompt));
  } catch (e) {
    const err = new Error("AI service is currently overloaded. Please try again in a moment.");
    err.statusCode = 503;
    err.code = "AI_UNAVAILABLE";
    throw err;
  }
  return parsed;
}

function validateMealPlan(aiPlan, eligibleFoods) {
  const parsed = aiMealPlanResponseSchema.parse(aiPlan);
  const eligibleIds = new Set(eligibleFoods.map((f) => f.id));

  for (const day of parsed.days) {
    for (const meal of day.meals) {
      if (!eligibleIds.has(meal.foodId)) {
        const err = new Error(
          `AI selected a food (${meal.foodId}) outside the eligible pool for this diet type`
        );
        err.statusCode = 502;
        err.code = "AI_CONSTRAINT_VIOLATION";
        throw err;
      }
    }
  }
  return parsed;
}

async function generateMealPlan(userId, dietType, days) {
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  const effectiveDietType = dietType || profile?.foodPreference || "non_vegetarian";

  const eligibleFoods = await getEligibleFoods(effectiveDietType);
  if (eligibleFoods.length === 0) {
    const err = new Error("No eligible foods found for this diet type");
    err.statusCode = 422;
    err.code = "NO_ELIGIBLE_FOODS";
    throw err;
  }

  const aiPlanRaw = await callGeminiForMealPlan(profile, eligibleFoods, days);
  const validatedPlan = validateMealPlan(aiPlanRaw, eligibleFoods);

  const saved = await prisma.aiMealPlan.create({
    data: {
      userId,
      dietType: effectiveDietType,
      goal: profile?.goal || null,
      generatedPlan: validatedPlan,
    },
  });

  return saved;
}

module.exports = { generateMealPlan };