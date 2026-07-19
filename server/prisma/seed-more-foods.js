const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
require("dotenv").config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const moreFoods = [
  { name: "Pizza (cheese, regular crust)", cuisineTag: "General", caloriesPer100g: 266, proteinPer100g: 11, carbsPer100g: 33, fatPer100g: 10 },
  { name: "Chicken Tikka Pizza", cuisineTag: "Indian Fusion", caloriesPer100g: 250, proteinPer100g: 13, carbsPer100g: 28, fatPer100g: 9 },
  { name: "Burger (chicken)", cuisineTag: "General", caloriesPer100g: 250, proteinPer100g: 14, carbsPer100g: 24, fatPer100g: 11 },
  { name: "Burger (veg)", cuisineTag: "General", caloriesPer100g: 220, proteinPer100g: 6, carbsPer100g: 28, fatPer100g: 9 },
  { name: "French Fries", cuisineTag: "General", caloriesPer100g: 312, proteinPer100g: 3.4, carbsPer100g: 41, fatPer100g: 15 },
  { name: "Pasta (white sauce)", cuisineTag: "General", caloriesPer100g: 158, proteinPer100g: 5, carbsPer100g: 20, fatPer100g: 6.5 },
  { name: "Butter Chicken", cuisineTag: "North Indian", caloriesPer100g: 190, proteinPer100g: 12, carbsPer100g: 6, fatPer100g: 13 },
  { name: "Biryani (chicken)", cuisineTag: "Indian", caloriesPer100g: 165, proteinPer100g: 8, carbsPer100g: 20, fatPer100g: 5.5 },
  { name: "Paneer Butter Masala", cuisineTag: "North Indian", caloriesPer100g: 210, proteinPer100g: 9, carbsPer100g: 8, fatPer100g: 16 },
  { name: "Samosa", cuisineTag: "Indian", caloriesPer100g: 262, proteinPer100g: 4, carbsPer100g: 30, fatPer100g: 14 },
  { name: "Momos (chicken, steamed)", cuisineTag: "Indian/Tibetan", caloriesPer100g: 175, proteinPer100g: 9, carbsPer100g: 22, fatPer100g: 5 },
  { name: "Fried Rice (veg)", cuisineTag: "Indo-Chinese", caloriesPer100g: 163, proteinPer100g: 4, carbsPer100g: 25, fatPer100g: 5 },
  { name: "Noodles (chicken hakka)", cuisineTag: "Indo-Chinese", caloriesPer100g: 172, proteinPer100g: 8, carbsPer100g: 22, fatPer100g: 6 },
  { name: "Grilled Chicken Sandwich", cuisineTag: "General", caloriesPer100g: 190, proteinPer100g: 15, carbsPer100g: 18, fatPer100g: 6 },
  { name: "Apple", cuisineTag: "General", caloriesPer100g: 52, proteinPer100g: 0.3, carbsPer100g: 14, fatPer100g: 0.2 },
  { name: "Orange", cuisineTag: "General", caloriesPer100g: 47, proteinPer100g: 0.9, carbsPer100g: 12, fatPer100g: 0.1 },
  { name: "Mango", cuisineTag: "General", caloriesPer100g: 60, proteinPer100g: 0.8, carbsPer100g: 15, fatPer100g: 0.4 },
  { name: "Ice Cream (vanilla)", cuisineTag: "General", caloriesPer100g: 207, proteinPer100g: 3.5, carbsPer100g: 24, fatPer100g: 11 },
  { name: "Chocolate Bar (milk)", cuisineTag: "General", caloriesPer100g: 535, proteinPer100g: 7.6, carbsPer100g: 59, fatPer100g: 30 },
  { name: "Poha", cuisineTag: "Indian", caloriesPer100g: 130, proteinPer100g: 2.5, carbsPer100g: 24, fatPer100g: 3.5 },
  { name: "Upma", cuisineTag: "South Indian", caloriesPer100g: 132, proteinPer100g: 3, carbsPer100g: 20, fatPer100g: 4.5 },
  { name: "Paratha (aloo)", cuisineTag: "North Indian", caloriesPer100g: 260, proteinPer100g: 5, carbsPer100g: 35, fatPer100g: 11 },
  { name: "Fish Curry", cuisineTag: "Indian", caloriesPer100g: 120, proteinPer100g: 14, carbsPer100g: 4, fatPer100g: 5.5 },
  { name: "Cottage Cheese Salad", cuisineTag: "General", caloriesPer100g: 98, proteinPer100g: 11, carbsPer100g: 4, fatPer100g: 4 },
  { name: "Protein Shake (banana)", cuisineTag: "General", caloriesPer100g: 90, proteinPer100g: 8, carbsPer100g: 10, fatPer100g: 2 },
];

async function main() {
  console.log("Seeding additional foods...");
  for (const food of moreFoods) {
    await prisma.food.create({ data: food });
  }
  console.log(`Done. Added ${moreFoods.length} more foods.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });