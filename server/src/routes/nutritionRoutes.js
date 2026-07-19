const express = require("express");
const requireAuth = require("../middleware/authMiddleware");
const { search, logMeal, getMeals, scanMeal,confirmScan } = require("../controllers/nutritionController");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.use(requireAuth);

router.get("/foods", search);
router.post("/meals", logMeal);
router.get("/meals", getMeals);
router.post("/meals/scan", upload.single("image"), scanMeal);
router.post("/meals/confirm", confirmScan);

module.exports = router;