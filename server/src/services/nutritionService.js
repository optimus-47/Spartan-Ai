const prisma = require("../config/prismaClient");
const { visionModel } = require("../config/geminiClient");
const { findBestFoodMatch } = require("../utils/fuzzyMatch");

async function searchFoods(searchTerm) {
  if (!searchTerm) {
    return prisma.food.findMany({ take: 20, orderBy: { name: "asc" } });
  }

  return prisma.food.findMany({
    where: {
      name: { contains: searchTerm, mode: "insensitive" },
    },
    take: 20,
  });
}

// Same function powers BOTH manual entry and (later) confirmed AI-detected items —
// this is what guarantees identical results regardless of entry method.
async function logMealItem(userId, { logDate, mealSlot, foodId, foodName, quantityG, isAiDetected, confidence }) {
  let food = null;
  if (foodId) {
    food = await prisma.food.findUnique({ where: { id: foodId } });
    if (!food) {
      const err = new Error("Food not found");
      err.statusCode = 404;
      err.code = "FOOD_NOT_FOUND";
      throw err;
    }
  }

  // snapshot macros at log time — see PRD note on why this isn't a live join
  const factor = quantityG / 100;
  const caloriesSnapshot = food ? food.caloriesPer100g * factor : 0;
  const proteinSnapshot = food ? food.proteinPer100g * factor : 0;
  const carbsSnapshot = food ? food.carbsPer100g * factor : 0;
  const fatSnapshot = food ? food.fatPer100g * factor : 0;

  let mealLog = await prisma.mealLog.findFirst({
    where: { userId, logDate: new Date(logDate), mealSlot },
  });

  if (!mealLog) {
    mealLog = await prisma.mealLog.create({
      data: { userId, logDate: new Date(logDate), mealSlot },
    });
  }

  return prisma.mealLogItem.create({
    data: {
      mealLogId: mealLog.id,
      foodId: food?.id || null,
      foodNameSnapshot: food?.name || foodName || "Unknown food",
      quantityG,
      caloriesSnapshot,
      proteinSnapshot,
      carbsSnapshot,
      fatSnapshot,
      isAiDetected: isAiDetected || false,
      confidence: confidence ?? null,
    },
  });
}

async function getMealsForDate(userId, logDate) {
  const mealLogs = await prisma.mealLog.findMany({
    where: { userId, logDate: new Date(logDate) },
    include: { items: true },
  });

  const totals = mealLogs.reduce(
    (acc, log) => {
      log.items.forEach((item) => {
        acc.calories += item.caloriesSnapshot;
        acc.protein += item.proteinSnapshot;
        acc.carbs += item.carbsSnapshot;
        acc.fat += item.fatSnapshot;
      });
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return { mealLogs, totals };
}
async function detectFoodFromImage(imageBuffer, mimeType) {
  const foodCatalog = await prisma.food.findMany();

  const prompt = `
Identify each distinct food item visible in this image. For each item, estimate its name and portion size in grams.

Respond with ONLY valid JSON (no markdown, no explanation) matching exactly this shape:
{
  "items": [
    { "name": "string", "estimatedGrams": 100, "confidence": 0.8 }
  ]
}
confidence is a number from 0 to 1 reflecting how sure you are about the identification.
`;

  const imagePart = {
    inlineData: {
      data: imageBuffer.toString("base64"),
      mimeType,
    },
  };

  const result = await visionModel.generateContent([prompt, imagePart]);
  const rawText = result.response.text();
  const cleaned = rawText.replace(/```json|```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    const err = new Error("AI returned malformed JSON for image detection");
    err.statusCode = 502;
    err.code = "AI_INVALID_RESPONSE";
    throw err;
  }

  // match each detected item against the real food catalog
  const itemsWithMatches = parsed.items.map((item) => {
    const match = findBestFoodMatch(item.name, foodCatalog);
    return {
      detectedName: item.name,
      estimatedGrams: item.estimatedGrams,
      confidence: item.confidence,
      matchedFoodId: match?.id || null,
      matchedFoodName: match?.name || null,
    };
  });

  return itemsWithMatches;
}

async function confirmMealScan(userId, { logDate, mealSlot, items }) {
  const loggedItems = [];
  for (const item of items) {
    const logged = await logMealItem(userId, {
      logDate,
      mealSlot,
      foodId: item.foodId,
      foodName: item.foodName,
      quantityG: item.quantityG,
      isAiDetected: item.isAiDetected ?? true,
      confidence: item.confidence,
    });
    loggedItems.push(logged);
  }
  return loggedItems;
}

module.exports = { searchFoods, logMealItem, getMealsForDate, detectFoodFromImage, confirmMealScan };