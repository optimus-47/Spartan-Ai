const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
require("dotenv").config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const { ensureStarterCatalog } = require("../src/data/starterCatalog");

async function main() {
  console.log("Seeding missing starter exercises and foods...");
  const { exercisesAdded, foodsAdded } = await ensureStarterCatalog(prisma);
  console.log(`Done. Added ${exercisesAdded} exercises and ${foodsAdded} foods.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });