const { signupSchema, loginSchema } = require("../validators/authValidators");
const authService = require("../services/authService");

async function handleSignup(req, res, next) {
  try {
    const parsed = signupSchema.parse(req.body);
    const user = await authService.signup(parsed.email, parsed.password);
    res.status(201).json({ user });
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: err.issues[0].message },
      });
    }
    next(err);
  }
}

async function handleLogin(req, res, next) {
  try {
    const parsed = loginSchema.parse(req.body);
    const result = await authService.login(parsed.email, parsed.password);
    res.status(200).json(result);
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: err.issues[0].message },
      });
    }
    next(err);
  }
}

module.exports = { handleSignup, handleLogin };