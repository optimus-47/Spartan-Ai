const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
require("dotenv").config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const exercises = [
  { name: "Barbell Bench Press", muscleGroup: "chest", equipmentRequired: ["barbell", "bench"], instructions: "Lie on a flat bench, lower the bar to chest, press up.", contraindicationTags: ["shoulder"] },
  { name: "Push-Up", muscleGroup: "chest", equipmentRequired: [], instructions: "Hands shoulder-width, lower chest to floor, push back up.", contraindicationTags: ["wrist"] },
  { name: "Incline Dumbbell Press", muscleGroup: "chest", equipmentRequired: ["dumbbell", "bench"], instructions: "On an incline bench, press dumbbells up and together.", contraindicationTags: ["shoulder"] },
  { name: "Dumbbell Fly", muscleGroup: "chest", equipmentRequired: ["dumbbell", "bench"], instructions: "Lie flat, arms slightly bent, lower dumbbells out to sides.", contraindicationTags: ["shoulder"] },

  { name: "Pull-Up", muscleGroup: "back", equipmentRequired: ["pull_up_bar"], instructions: "Grip bar, pull chin above the bar, lower with control.", contraindicationTags: ["shoulder", "elbow"] },
  { name: "Barbell Row", muscleGroup: "back", equipmentRequired: ["barbell"], instructions: "Hinge at hips, row bar to lower ribs.", contraindicationTags: ["lower_back"] },
  { name: "Lat Pulldown", muscleGroup: "back", equipmentRequired: ["cable_machine"], instructions: "Pull bar down to upper chest, control the return.", contraindicationTags: ["shoulder"] },
  { name: "Seated Cable Row", muscleGroup: "back", equipmentRequired: ["cable_machine"], instructions: "Pull handle to torso, squeeze shoulder blades.", contraindicationTags: ["lower_back"] },

  { name: "Barbell Back Squat", muscleGroup: "legs", equipmentRequired: ["barbell", "squat_rack"], instructions: "Bar on upper back, squat to depth, drive up.", contraindicationTags: ["knee", "lower_back"] },
  { name: "Bodyweight Squat", muscleGroup: "legs", equipmentRequired: [], instructions: "Feet shoulder-width, squat down, stand back up.", contraindicationTags: ["knee"] },
  { name: "Romanian Deadlift", muscleGroup: "legs", equipmentRequired: ["barbell"], instructions: "Hinge at hips, lower bar along legs, return to standing.", contraindicationTags: ["lower_back", "hamstring"] },
  { name: "Walking Lunge", muscleGroup: "legs", equipmentRequired: ["dumbbell"], instructions: "Step forward into a lunge, alternate legs.", contraindicationTags: ["knee"] },
  { name: "Leg Press", muscleGroup: "legs", equipmentRequired: ["leg_press_machine"], instructions: "Press platform away using legs, control the return.", contraindicationTags: ["knee"] },

  { name: "Overhead Barbell Press", muscleGroup: "shoulders", equipmentRequired: ["barbell"], instructions: "Press bar overhead from shoulder height.", contraindicationTags: ["shoulder"] },
  { name: "Dumbbell Lateral Raise", muscleGroup: "shoulders", equipmentRequired: ["dumbbell"], instructions: "Raise dumbbells out to sides to shoulder height.", contraindicationTags: ["shoulder"] },
  { name: "Face Pull", muscleGroup: "shoulders", equipmentRequired: ["cable_machine"], instructions: "Pull rope to face, elbows high.", contraindicationTags: [] },

  { name: "Barbell Curl", muscleGroup: "arms", equipmentRequired: ["barbell"], instructions: "Curl bar up keeping elbows fixed.", contraindicationTags: ["elbow"] },
  { name: "Tricep Pushdown", muscleGroup: "arms", equipmentRequired: ["cable_machine"], instructions: "Push bar/rope down, extend elbows fully.", contraindicationTags: ["elbow"] },
  { name: "Hammer Curl", muscleGroup: "arms", equipmentRequired: ["dumbbell"], instructions: "Curl dumbbells with neutral grip.", contraindicationTags: ["elbow"] },
  { name: "Dips", muscleGroup: "arms", equipmentRequired: ["dip_bar"], instructions: "Lower body by bending elbows, press back up.", contraindicationTags: ["shoulder", "elbow"] },

  { name: "Plank", muscleGroup: "core", equipmentRequired: [], instructions: "Hold a straight line from head to heels on forearms.", contraindicationTags: ["lower_back"] },
  { name: "Hanging Leg Raise", muscleGroup: "core", equipmentRequired: ["pull_up_bar"], instructions: "Hang from bar, raise legs to hip height.", contraindicationTags: ["lower_back", "shoulder"] },
  { name: "Cable Crunch", muscleGroup: "core", equipmentRequired: ["cable_machine"], instructions: "Kneel, crunch down pulling rope toward floor.", contraindicationTags: ["lower_back"] },
  { name: "Russian Twist", muscleGroup: "core", equipmentRequired: [], instructions: "Seated, rotate torso side to side.", contraindicationTags: ["lower_back"] },
];

const foods = [
  { name: "Roti (whole wheat)", cuisineTag: "North Indian", caloriesPer100g: 297, proteinPer100g: 11, carbsPer100g: 58, fatPer100g: 4 },
  { name: "Basmati Rice (cooked)", cuisineTag: "Indian", caloriesPer100g: 121, proteinPer100g: 2.5, carbsPer100g: 25, fatPer100g: 0.4 },
  { name: "Dal Tadka", cuisineTag: "North Indian", caloriesPer100g: 116, proteinPer100g: 7, carbsPer100g: 16, fatPer100g: 3 },
  { name: "Paneer (raw)", cuisineTag: "Indian", caloriesPer100g: 265, proteinPer100g: 18, carbsPer100g: 3.6, fatPer100g: 21 },
  { name: "Chicken Breast (cooked)", cuisineTag: "General", caloriesPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6 },
  { name: "Egg (whole, boiled)", cuisineTag: "General", caloriesPer100g: 155, proteinPer100g: 13, carbsPer100g: 1.1, fatPer100g: 11 },
  { name: "Curd/Yogurt (plain)", cuisineTag: "Indian", caloriesPer100g: 61, proteinPer100g: 3.5, carbsPer100g: 4.7, fatPer100g: 3.3 },
  { name: "Chole (chickpea curry)", cuisineTag: "North Indian", caloriesPer100g: 164, proteinPer100g: 8, carbsPer100g: 27, fatPer100g: 3 },
  { name: "Rajma (kidney bean curry)", cuisineTag: "North Indian", caloriesPer100g: 140, proteinPer100g: 9, carbsPer100g: 22, fatPer100g: 1.5 },
  { name: "Idli", cuisineTag: "South Indian", caloriesPer100g: 156, proteinPer100g: 4, carbsPer100g: 32, fatPer100g: 0.5 },
  { name: "Dosa (plain)", cuisineTag: "South Indian", caloriesPer100g: 168, proteinPer100g: 3.9, carbsPer100g: 28, fatPer100g: 4.5 },
  { name: "Sambar", cuisineTag: "South Indian", caloriesPer100g: 70, proteinPer100g: 3.5, carbsPer100g: 11, fatPer100g: 1.5 },
  { name: "Banana", cuisineTag: "General", caloriesPer100g: 89, proteinPer100g: 1.1, carbsPer100g: 23, fatPer100g: 0.3 },
  { name: "Almonds", cuisineTag: "General", caloriesPer100g: 579, proteinPer100g: 21, carbsPer100g: 22, fatPer100g: 50 },
  { name: "Whey Protein (generic)", cuisineTag: "General", caloriesPer100g: 400, proteinPer100g: 80, carbsPer100g: 8, fatPer100g: 6 },
  { name: "Oats (dry)", cuisineTag: "General", caloriesPer100g: 389, proteinPer100g: 17, carbsPer100g: 66, fatPer100g: 7 },
  { name: "Milk (whole)", cuisineTag: "General", caloriesPer100g: 61, proteinPer100g: 3.2, carbsPer100g: 4.8, fatPer100g: 3.3 },
  { name: "Sweet Potato (boiled)", cuisineTag: "General", caloriesPer100g: 86, proteinPer100g: 1.6, carbsPer100g: 20, fatPer100g: 0.1 },
  { name: "Peanut Butter", cuisineTag: "General", caloriesPer100g: 588, proteinPer100g: 25, carbsPer100g: 20, fatPer100g: 50 },
  { name: "Brown Rice (cooked)", cuisineTag: "General", caloriesPer100g: 112, proteinPer100g: 2.6, carbsPer100g: 24, fatPer100g: 0.9 },
];



async function main() {
  console.log("Seeding exercises...");
  for (const ex of exercises) {
    await prisma.exercise.create({ data: ex });
  }

  console.log("Seeding foods...");
  for (const food of foods) {
    await prisma.food.create({ data: food });
  }

  console.log(`Done. Seeded ${exercises.length} exercises and ${foods.length} foods.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });