const prisma = require("../config/prismaClient");
const { textModel } = require("../config/geminiClient");
const { aiPlanResponseSchema } = require("../validators/workoutValidators");

// --- Step A: deterministic safety filter (no AI involved) ---
async function getEligibleExercises(userId) {
  const injuries = await prisma.userInjury.findMany({
    where: { userId, active: true },
  });
  const equipment = await prisma.userEquipment.findMany({ where: { userId } });

  const injuryTags = injuries.map((i) => i.injuryTag.toLowerCase());
  const equipmentTags = equipment.map((e) => e.equipmentTag.toLowerCase());

  const allExercises = await prisma.exercise.findMany();

  const eligible = allExercises.filter((ex) => {
    const isContraindicated = ex.contraindicationTags.some((tag) =>
      injuryTags.includes(tag.toLowerCase())
    );
    if (isContraindicated) return false;

    // exercises with no equipment requirement are always eligible (bodyweight)
    if (ex.equipmentRequired.length === 0) return true;

    // otherwise, user must have at least one of the required equipment tags
    const hasEquipment = ex.equipmentRequired.some((req) =>
      equipmentTags.includes(req.toLowerCase())
    );
    return hasEquipment;
  });

  return eligible;
}

// --- Step B: build the prompt and call Gemini ---
async function callGeminiForPlan(profile, eligibleExercises, splitType) {
  const exercisePoolForPrompt = eligibleExercises.map((ex) => ({
    id: ex.id,
    name: ex.name,
    muscleGroup: ex.muscleGroup,
  }));

  const prompt = `
You are a fitness programming assistant. Generate a 1-week workout plan using ONLY exercises from the provided pool. Do not invent exercises or use any exercise ID not in the pool.

User profile:
- Goal: ${profile?.goal || "general_fitness"}
- Experience level: ${profile?.gymExperience || "beginner"}
- Preferred split: ${splitType || "let the plan reflect experience level"}

Available exercise pool (ONLY use these IDs):
${JSON.stringify(exercisePoolForPrompt)}

Respond with ONLY valid JSON (no markdown, no explanation) matching exactly this shape:
{
  "splitType": "string",
  "days": [{ "dayIndex": 0, "label": "string", "isRestDay": false }],
  "exercises": [
    {
      "exerciseId": "must be one of the ids from the pool above",
      "dayIndex": 0,
      "orderIndex": 0,
      "targetSets": 3,
      "targetRepsMin": 8,
      "targetRepsMax": 12,
      "targetRpe": 7
    }
  ]
}
Cover 7 days total (dayIndex 0-6), including rest days appropriate for the experience level.
`;

  const result = await textModel.generateContent(prompt);
  const rawText = result.response.text();

  // Gemini sometimes wraps JSON in markdown fences despite instructions — strip them defensively
  const cleaned = rawText.replace(/```json|```/g, "").trim();

  let parsedJson;
  try {
    parsedJson = JSON.parse(cleaned);
  } catch (e) {
    const err = new Error("AI returned malformed JSON");
    err.statusCode = 502;
    err.code = "AI_INVALID_RESPONSE";
    throw err;
  }

  return parsedJson;
}

// --- Step C: validate AI output against schema AND against the eligible pool ---
function validateAiPlan(aiPlan, eligibleExercises) {
  const parsed = aiPlanResponseSchema.parse(aiPlan); // throws ZodError if shape is wrong

  const eligibleIds = new Set(eligibleExercises.map((ex) => ex.id));
  const invalidExercise = parsed.exercises.find((ex) => !eligibleIds.has(ex.exerciseId));

  if (invalidExercise) {
    const err = new Error(
      `AI selected an exercise (${invalidExercise.exerciseId}) outside the safe eligible pool`
    );
    err.statusCode = 502;
    err.code = "AI_CONSTRAINT_VIOLATION";
    throw err;
  }

  return parsed;
}

// --- Orchestrator: the full pipeline ---
async function generateWorkoutPlan(userId, splitType) {
  const profile = await prisma.userProfile.findUnique({ where: { userId } });

  const eligibleExercises = await getEligibleExercises(userId);

  if (eligibleExercises.length === 0) {
    const err = new Error(
      "No eligible exercises found for this user's injuries/equipment combination"
    );
    err.statusCode = 422;
    err.code = "NO_ELIGIBLE_EXERCISES";
    throw err;
  }

  const aiPlanRaw = await callGeminiForPlan(profile, eligibleExercises, splitType);
  const validatedPlan = validateAiPlan(aiPlanRaw, eligibleExercises);

  const savedPlan = await prisma.workoutPlan.create({
    data: {
      userId,
      goal: profile?.goal || null,
      planJson: validatedPlan,
    },
  });

  return savedPlan;
}

async function getActivePlan(userId) {
  const plan = await prisma.workoutPlan.findFirst({
    where: { userId },
    orderBy: { generatedAt: "desc" },
  });

  if (!plan) {
    const err = new Error("No workout plan found — generate one first");
    err.statusCode = 404;
    err.code = "NO_ACTIVE_PLAN";
    throw err;
  }

  return plan;
}

module.exports = { generateWorkoutPlan, getActivePlan, getEligibleExercises };