const express = require("express");
const requireAuth = require("../middleware/authMiddleware");
const { generatePlan, getActivePlan } = require("../controllers/workoutController");

const router = express.Router();

router.use(requireAuth);

router.post("/generate", generatePlan);
router.get("/plans/active", getActivePlan);

module.exports = router;