const express = require("express");
const rateLimit = require("../middleware/rateLimit");
const {
  handleSignup,
  handleLogin,
  handleGuest,
} = require("../controllers/authController");

const router = express.Router();

const guestPerIpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  code: "GUEST_RATE_LIMITED",
  message: "Too many guest sessions from this network. Please try again later.",
});
const guestGlobalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  keyFn: () => "global",
  code: "GUEST_RATE_LIMITED",
  message: "Guest access is busy right now. Please try again later.",
});

router.post("/signup", handleSignup);
router.post("/login", handleLogin);
router.post("/guest", guestGlobalLimiter, guestPerIpLimiter, handleGuest);

module.exports = router;