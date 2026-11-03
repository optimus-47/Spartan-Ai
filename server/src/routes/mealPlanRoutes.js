const express = require("express");
const requireAuth = require("../middleware/authMiddleware");
const { generate } = require("../controllers/mealPlanController");
const { limitGuestAi } = require("../middleware/guestLimit");

const router = express.Router();
router.use(requireAuth);
router.post("/generate", limitGuestAi, generate);

module.exports = router;