const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const prisma = require("../config/prismaClient");

const SALT_ROUNDS = 10;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
const GUEST_RETENTION_MS = 3 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const GUEST_EQUIPMENT = [
  "barbell",
  "dumbbell",
  "bench",
  "pull_up_bar",
  "cable_machine",
  "squat_rack",
  "dip_bar",
  "leg_press_machine",
];

const mealRotations = {
  breakfast: [
    "Oats (dry)",
    "Egg (whole, boiled)",
    "Idli",
    "Poha",
    "Dosa (plain)",
    "Whey Protein (generic)",
    "Upma",
  ],
  lunch: [
    "Chicken Breast (cooked)",
    "Dal Tadka",
    "Chole (chickpea curry)",
    "Rajma (kidney bean curry)",
    "Basmati Rice (cooked)",
    "Paneer (raw)",
    "Fish Curry",
  ],
  dinner: [
    "Roti (whole wheat)",
    "Brown Rice (cooked)",
    "Basmati Rice (cooked)",
    "Dal Tadka",
    "Chicken Breast (cooked)",
    "Paneer (raw)",
    "Rajma (kidney bean curry)",
  ],
  snack: [
    "Banana",
    "Almonds",
    "Curd/Yogurt (plain)",
    "Peanut Butter",
    "Milk (whole)",
    "Apple",
    "Whey Protein (generic)",
  ],
};

const fallbackFoods = {
  breakfast: "Oats (dry)",
  lunch: "Chicken Breast (cooked)",
  dinner: "Roti (whole wheat)",
  snack: "Banana",
};

let lastGuestCleanupAt = 0;
let guestCleanupPromise = null;

function appError(message, statusCode, code) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

function signToken(user) {
  return jwt.sign(
    { userId: user.id, ...(user.isGuest ? { isGuest: true } : {}) },
    process.env.JWT_SECRET,
    { expiresIn: user.isGuest ? "1d" : "7d" },
  );
}

async function signup(email, password) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw appError("An account with this email already exists", 409, "EMAIL_EXISTS");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { email, passwordHash },
  });

  return { id: user.id, email: user.email };
}

async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw appError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  return {
    token: signToken(user),
    user: { id: user.id, email: user.email, isGuest: user.isGuest },
  };
}

async function cleanupExpiredGuests() {
  if (guestCleanupPromise) return guestCleanupPromise;
  if (Date.now() - lastGuestCleanupAt < CLEANUP_INTERVAL_MS) return;

  guestCleanupPromise = (async () => {
    const expiredGuests = await prisma.user.findMany({
      where: {
        isGuest: true,
        createdAt: { lt: new Date(Date.now() - GUEST_RETENTION_MS) },
      },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: { id: true },
    });
    const userIds = expiredGuests.map(({ id }) => id);
    if (userIds.length === 0) return;

    await prisma.$transaction(async (tx) => {
      await tx.workoutSessionSet.deleteMany({
        where: { session: { is: { userId: { in: userIds } } } },
      });
      await tx.workoutSession.deleteMany({
        where: { userId: { in: userIds } },
      });
      await tx.workoutPlanExercise.deleteMany({
        where: { plan: { is: { userId: { in: userIds } } } },
      });
      await tx.workoutPlan.deleteMany({
        where: { userId: { in: userIds } },
      });
      await tx.mealLogItem.deleteMany({
        where: { mealLog: { is: { userId: { in: userIds } } } },
      });
      await tx.mealLog.deleteMany({
        where: { userId: { in: userIds } },
      });
      await tx.aiMealPlan.deleteMany({
        where: { userId: { in: userIds } },
      });
      await tx.bodyMetric.deleteMany({
        where: { userId: { in: userIds } },
      });
      await tx.userInjury.deleteMany({
        where: { userId: { in: userIds } },
      });
      await tx.userEquipment.deleteMany({
        where: { userId: { in: userIds } },
      });
      await tx.userProfile.deleteMany({
        where: { userId: { in: userIds } },
      });
      await tx.user.deleteMany({
        where: { id: { in: userIds } },
      });
    });
  })();

  try {
    await guestCleanupPromise;
    lastGuestCleanupAt = Date.now();
  } finally {
    guestCleanupPromise = null;
  }
}

function utcDateDaysAgo(daysAgo) {
  const date = new Date(Date.now() - daysAgo * DAY_MS);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function buildWorkoutPlan(exercisesByName) {
  const days = [
    { dayIndex: 0, label: "Upper A", isRestDay: false },
    { dayIndex: 1, label: "Lower A", isRestDay: false },
    { dayIndex: 2, label: "Rest", isRestDay: true },
    { dayIndex: 3, label: "Upper B", isRestDay: false },
    { dayIndex: 4, label: "Lower B", isRestDay: false },
    { dayIndex: 5, label: "Rest", isRestDay: true },
    { dayIndex: 6, label: "Rest", isRestDay: true },
  ];
  const dayExercises = [
    ["Barbell Bench Press", "Barbell Row", "Dumbbell Lateral Raise", "Barbell Curl"],
    ["Barbell Back Squat", "Romanian Deadlift", "Leg Press"],
    [],
    ["Incline Dumbbell Press", "Lat Pulldown", "Hammer Curl", "Tricep Pushdown"],
    ["Bodyweight Squat", "Walking Lunge", "Leg Press"],
    [],
    [],
  ];
  const planExercises = [];

  const missingExercises = [
    ...new Set(dayExercises.flat().filter((name) => !exercisesByName.has(name))),
  ];
  if (missingExercises.length > 0) {
    throw appError(
      "The exercise catalog is missing the exercises needed for the demo. Please seed the catalog and retry.",
      503,
      "DEMO_DATA_UNAVAILABLE",
    );
  }

  dayExercises.forEach((names, dayIndex) => {
    names.forEach((name, orderIndex) => {
      const exercise = exercisesByName.get(name);
      planExercises.push({
        exerciseId: exercise.id,
        dayIndex,
        orderIndex,
        targetSets: 3,
        targetRepsMin: 8,
        targetRepsMax: 12,
        targetRpe: 7,
      });
    });
  });

  return { splitType: "upper_lower", days, exercises: planExercises };
}

function selectSessionExercises(exercises, exercisesByName) {
  const preferred = [
    "Barbell Bench Press",
    "Barbell Row",
    "Barbell Back Squat",
    "Romanian Deadlift",
  ]
    .map((name) => exercisesByName.get(name))
    .filter(Boolean);
  const selectedIds = new Set(preferred.map(({ id }) => id));
  const selected = [...preferred];

  for (const exercise of exercises) {
    if (selected.length >= 4) break;
    if (!selectedIds.has(exercise.id)) {
      selected.push(exercise);
      selectedIds.add(exercise.id);
    }
  }
  return selected.slice(0, Math.min(4, exercises.length));
}

async function seedGuestData(tx, userId, exercises, foods) {
  const exercisesByName = new Map(exercises.map((exercise) => [exercise.name, exercise]));
  const foodsByName = new Map(foods.map((food) => [food.name, food]));

  await tx.user.update({
    where: { id: userId },
    data: {
      profile: {
        create: {
          displayName: "Demo",
          age: 29,
          gender: "male",
          heightCm: 175,
          weightKg: 77.6,
          goal: "general_fitness",
          gymExperience: "intermediate",
          activityLevel: "moderate",
          foodPreference: "non_vegetarian",
        },
      },
      equipment: {
        create: GUEST_EQUIPMENT.map((equipmentTag) => ({ equipmentTag })),
      },
    },
  });

  const planJson = buildWorkoutPlan(exercisesByName);
  const plan = await tx.workoutPlan.create({
    data: {
      userId,
      goal: "general_fitness",
      planJson,
    },
  });

  const sessionExercises = selectSessionExercises(exercises, exercisesByName);
  if (sessionExercises.length < 3) {
    throw appError(
      "The exercise catalog needs at least three exercises before demo access can be created.",
      503,
      "DEMO_DATA_UNAVAILABLE",
    );
  }

  const bestEstimatedMax = new Map();
  for (let sessionIndex = 0; sessionIndex < 6; sessionIndex += 1) {
    const daysAgo = 18 - sessionIndex * 3;
    const completedAt = new Date(Date.now() - daysAgo * DAY_MS);
    const startedAt = new Date(completedAt.getTime() - 60 * 60 * 1000);
    const session = await tx.workoutSession.create({
      data: { userId, planId: plan.id, startedAt, completedAt },
    });

    const sets = [];
    sessionExercises.forEach((exercise, exerciseIndex) => {
      const baseWeight = 25 + exerciseIndex * 10;
      const weightKg = baseWeight + sessionIndex * 1.25;
      [10, 8, 8].forEach((reps, setIndex) => {
        const estimatedMax = weightKg * (1 + reps / 30);
        const previousBest = bestEstimatedMax.get(exercise.id) || 0;
        sets.push({
          sessionId: session.id,
          exerciseId: exercise.id,
          setIndex,
          weightKg,
          reps,
          isPr: estimatedMax > previousBest,
        });
        if (estimatedMax > previousBest) {
          bestEstimatedMax.set(exercise.id, estimatedMax);
        }
      });
    });
    await tx.workoutSessionSet.createMany({ data: sets });
  }

  for (let index = 0; index < 8; index += 1) {
    const weeksAgo = 7 - index;
    const weightKg = 80.4 - index * 0.4;
    await tx.bodyMetric.create({
      data: {
        userId,
        weightKg,
        recordedAt: new Date(Date.now() - (weeksAgo * 7 + 1) * DAY_MS),
      },
    });
  }

  const mealSlots = ["breakfast", "lunch", "dinner", "snack"];
  const quantitiesG = { breakfast: 150, lunch: 220, dinner: 200, snack: 100 };
  for (let daysAgo = 6; daysAgo >= 0; daysAgo -= 1) {
    for (const mealSlot of mealSlots) {
      const mealLog = await tx.mealLog.create({
        data: { userId, logDate: utcDateDaysAgo(daysAgo), mealSlot },
      });
      const foodNames = mealRotations[mealSlot];
      const food =
        foodsByName.get(foodNames[(6 - daysAgo) % foodNames.length]) ??
        foodsByName.get(fallbackFoods[mealSlot]);
      if (!food) {
        throw appError(
          "The food catalog is missing the foods needed for the demo. Please seed the catalog and retry.",
          503,
          "DEMO_DATA_UNAVAILABLE",
        );
      }

      const quantityG = quantitiesG[mealSlot];
      const factor = quantityG / 100;
      await tx.mealLogItem.create({
        data: {
          mealLogId: mealLog.id,
          foodId: food.id,
          foodNameSnapshot: food.name,
          quantityG,
          caloriesSnapshot: food.caloriesPer100g * factor,
          proteinSnapshot: food.proteinPer100g * factor,
          carbsSnapshot: food.carbsPer100g * factor,
          fatSnapshot: food.fatPer100g * factor,
        },
      });
    }
  }
}

async function guestLogin() {
  const [exercises, foods] = await Promise.all([
    prisma.exercise.findMany({ orderBy: { name: "asc" } }),
    prisma.food.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (exercises.length === 0 || foods.length === 0) {
    throw appError(
      "Demo access is not available until the exercise and food catalogs are seeded.",
      503,
      "DEMO_DATA_UNAVAILABLE",
    );
  }

  await cleanupExpiredGuests();
  const suffix = crypto.randomBytes(24).toString("hex");
  const email = `guest-${suffix}@guest.spartan.local`;
  const passwordHash = await bcrypt.hash(
    crypto.randomBytes(32).toString("hex"),
    SALT_ROUNDS,
  );
  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: { email, passwordHash, isGuest: true },
    });
    await seedGuestData(tx, createdUser.id, exercises, foods);
    return createdUser;
  });

  return {
    token: signToken(user),
    user: { id: user.id, email: user.email, isGuest: true },
  };
}

module.exports = { signup, login, guestLogin };
