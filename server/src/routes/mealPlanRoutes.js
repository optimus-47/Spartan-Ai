const express = require("express");
const requireAuth = require("../middleware/authMiddleware");
const { generate, latest } = require("../controllers/mealPlanController");
const { limitGuestAi } = require("../middleware/guestLimit");

const router = express.Router();
router.use(requireAuth);
router.get("/latest", latest);
router.post("/generate", limitGuestAi, generate);

module.exports = router;