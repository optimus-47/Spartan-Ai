const rateLimit = require("./rateLimit");

const dailyLimit = process.env.GUEST_AI_DAILY_LIMIT === undefined
  ? 10
  : Number(process.env.GUEST_AI_DAILY_LIMIT);
if (!Number.isInteger(dailyLimit) || dailyLimit < 1) {
  throw new Error("GUEST_AI_DAILY_LIMIT must be a positive integer.");
}

const guestAiLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: dailyLimit,
  keyFn: (req) => req.userId,
  code: "GUEST_LIMIT",
  message: `The demo is limited to ${dailyLimit} AI actions per day. Create a free account to continue.`,
});

// Must run after requireAuth. Registered users pass straight through.
function limitGuestAi(req, res, next) {
  if (!req.isGuest) return next();
  return guestAiLimiter(req, res, next);
}

module.exports = { limitGuestAi };