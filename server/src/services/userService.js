const prisma = require("../config/prismaClient");

async function getFullProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      injuries: true,
      equipment: true,
    },
  });

  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

async function upsertProfile(userId, data) {
  return prisma.userProfile.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}

async function addInjury(userId, injuryTag, affectedBodyPart) {
  return prisma.userInjury.create({
    data: { userId, injuryTag, affectedBodyPart },
  });
}

async function setEquipment(userId, equipmentTags) {
  await prisma.userEquipment.deleteMany({ where: { userId } });

  if (equipmentTags.length === 0) return [];

  await prisma.userEquipment.createMany({
    data: equipmentTags.map((tag) => ({ userId, equipmentTag: tag })),
  });

  return prisma.userEquipment.findMany({ where: { userId } });
}

async function addBodyMetric(userId, weightKg) {
  return prisma.bodyMetric.create({
    data: { userId, weightKg },
  });
}

async function getBodyMetrics(userId) {
  return prisma.bodyMetric.findMany({
    where: { userId },
    orderBy: { recordedAt: "asc" },
  });
}

module.exports = {
  getFullProfile,
  upsertProfile,
  addInjury,
  setEquipment,
  addBodyMetric,
  getBodyMetrics,
};