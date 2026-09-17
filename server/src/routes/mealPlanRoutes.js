const express = require("express");
const requireAuth = require("../middleware/authMiddleware");
const { generate } = require("../controllers/mealPlanController");

const router = express.Router();
router.use(requireAuth);
router.post("/generate", generate);

module.exports = router;