const prisma = require("./prismaClient");

// Mirrors migration 20261027000000_add_is_guest for hosts where `prisma migrate deploy` cannot be run.
async function ensureSchema() {
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isGuest" BOOLEAN NOT NULL DEFAULT false',
  );
}

module.exports = { ensureSchema };
