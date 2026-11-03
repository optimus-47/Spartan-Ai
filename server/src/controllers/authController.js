const authService = require("../services/authService");
const { signupSchema, loginSchema } = require("../validators/authValidators");

function sendValidationError(err, res) {
  if (err && err.name === "ZodError") {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: (err.issues && err.issues[0] && err.issues[0].message) || "Invalid request",
      },
    });
    return true;
  }
  return false;
}

async function handleSignup(req, res, next) {
  try {
    const parsed = signupSchema.parse(req.body);
    const result = await authService.signup(parsed.email, parsed.password);
    res.status(201).json(result);
  } catch (err) {
    if (sendValidationError(err, res)) return;
    next(err);
  }
}

async function handleLogin(req, res, next) {
  try {
    const parsed = loginSchema.parse(req.body);
    const result = await authService.login(parsed.email, parsed.password);
    res.status(200).json(result);
  } catch (err) {
    if (sendValidationError(err, res)) return;
    next(err);
  }
}

async function handleGuest(req, res, next) {
  try {
    const result = await authService.guestLogin();
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleSignup,
  handleLogin,
  handleGuest,
};