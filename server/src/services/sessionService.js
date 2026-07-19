const prisma = require("../config/prismaClient");

async function startSession(userId, planId) {
  return prisma.workoutSession.create({
    data: { userId, planId: planId || null },
  });
}

async function logSet(userId, sessionId, { exerciseId, weightKg, reps }) {
  const session = await prisma.workoutSession.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId) {
    const err = new Error("Session not found");
    err.statusCode = 404;
    err.code = "SESSION_NOT_FOUND";
    throw err;
  }

  // estimated 1RM using the Epley formula — a standard, well-known strength estimate
  const estimated1RM = weightKg * (1 + reps / 30);

  // check against this user's best-ever estimated 1RM for this exercise
  const previousSets = await prisma.workoutSessionSet.findMany({
    where: { exercise: { id: exerciseId }, session: { userId } },
  });

  let previousBest1RM = 0;
  for (const s of previousSets) {
    const est = s.weightKg * (1 + s.reps / 30);
    if (est > previousBest1RM) previousBest1RM = est;
  }

  const isPr = estimated1RM > previousBest1RM;

  const setIndex = await prisma.workoutSessionSet.count({
    where: { sessionId, exerciseId },
  });

  return prisma.workoutSessionSet.create({
    data: {
      sessionId,
      exerciseId,
      setIndex,
      weightKg,
      reps,
      isPr,
    },
  });
}

async function finishSession(userId, sessionId) {
  const session = await prisma.workoutSession.findUnique({
    where: { id: sessionId },
    include: { sets: true },
  });

  if (!session || session.userId !== userId) {
    const err = new Error("Session not found");
    err.statusCode = 404;
    err.code = "SESSION_NOT_FOUND";
    throw err;
  }

  const totalVolumeKg = session.sets.reduce((sum, s) => sum + s.weightKg * s.reps, 0);
  const prCount = session.sets.filter((s) => s.isPr).length;

  const updated = await prisma.workoutSession.update({
    where: { id: sessionId },
    data: { completedAt: new Date() },
  });

  return { session: updated, totalVolumeKg, prCount, setCount: session.sets.length };
}

async function getHistory(userId) {
  return prisma.workoutSession.findMany({
    where: { userId },
    include: { sets: { include: { exercise: true } } },
    orderBy: { startedAt: "desc" },
  });
}

module.exports = { startSession, logSet, finishSession, getHistory };