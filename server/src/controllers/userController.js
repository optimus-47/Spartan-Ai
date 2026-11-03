const userService = require("../services/userService");
const {
  updateProfileSchema,
  addInjurySchema,
  updateEquipmentSchema,
  addBodyMetricSchema,
} = require("../validators/userValidators");

function validationMessage(err) {
  return Array.isArray(err.issues) && err.issues[0]?.message
    ? err.issues[0].message
    : "Invalid request";
}

function handleZodError(err, res) {
  if (err?.name === "ZodError") {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: validationMessage(err) },
    });
    return true;
  }
  return false;
}

async function getMe(req, res, next) {
  try {
    const user = await userService.getFullProfile(req.userId);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const parsed = updateProfileSchema.parse(req.body);
    const profile = await userService.upsertProfile(req.userId, parsed);
    res.json(profile);
  } catch (err) {
    if (handleZodError(err, res)) return;
    next(err);
  }
}

async function addInjury(req, res, next) {
  try {
    const parsed = addInjurySchema.parse(req.body);
    const injury = await userService.addInjury(
      req.userId,
      parsed.injuryTag,
      parsed.affectedBodyPart
    );
    res.status(201).json(injury);
  } catch (err) {
    if (handleZodError(err, res)) return;
    next(err);
  }
}

async function updateEquipment(req, res, next) {
  try {
    const parsed = updateEquipmentSchema.parse(req.body);
    const equipment = await userService.setEquipment(req.userId, parsed.equipmentTags);
    res.json(equipment);
  } catch (err) {
    if (handleZodError(err, res)) return;
    next(err);
  }
}

async function addBodyMetric(req, res, next) {
  try {
    const parsed = addBodyMetricSchema.parse(req.body);
    const metric = await userService.addBodyMetric(req.userId, parsed.weightKg);
    res.status(201).json(metric);
  } catch (err) {
    if (handleZodError(err, res)) return;
    next(err);
  }
}

async function getBodyMetrics(req, res, next) {
  try {
    const metrics = await userService.getBodyMetrics(req.userId);
    res.json(metrics);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMe,
  updateProfile,
  addInjury,
  updateEquipment,
  addBodyMetric,
  getBodyMetrics,
};