const express = require("express");
const requireAuth = require("../middleware/authMiddleware");
const { weightTrend, caloriesTrend } = require("../controllers/analyticsController");

const router = express.Router();

router.use(requireAuth);

router.get("/weight-trend", weightTrend);
router.get("/calories-trend", caloriesTrend);

module.exports = router;