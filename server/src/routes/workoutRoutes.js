const express = require("express");
const requireAuth = require("../middleware/authMiddleware");
const { limitGuestAi } = require("../middleware/guestLimit");
const {
  generatePlan,
  getActivePlan,
  getExercises,
} = require("../controllers/workoutController");

const router = express.Router();

router.use(requireAuth);

router.get("/exercises", getExercises);
router.get("/plans/active", getActivePlan);
router.post("/generate", limitGuestAi, generatePlan);

module.exports = router;