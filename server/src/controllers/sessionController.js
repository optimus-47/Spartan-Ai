const sessionService = require("../services/sessionService");
const { startSessionSchema, logSetSchema } = require("../validators/sessionValidators");

async function start(req, res, next) {
  try {
    const parsed = startSessionSchema.parse(req.body || {});
    const session = await sessionService.startSession(req.userId, parsed.planId);
    res.status(201).json(session);
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: err.errors[0].message } });
    }
    next(err);
  }
}

async function addSet(req, res, next) {
  try {
    const parsed = logSetSchema.parse(req.body);
    const set = await sessionService.logSet(req.userId, req.params.id, parsed);
    res.status(201).json(set);
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: err.errors[0].message } });
    }
    next(err);
  }
}

async function finish(req, res, next) {
  try {
    const result = await sessionService.finishSession(req.userId, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function history(req, res, next) {
  try {
    const sessions = await sessionService.getHistory(req.userId);
    res.json(sessions);
  } catch (err) {
    next(err);
  }
}

module.exports = { start, addSet, finish, history };