const express = require("express");
const requireAuth = require("../middleware/authMiddleware");
const { search, logMeal, getMeals, scanMeal,confirmScan } = require("../controllers/nutritionController");
const upload = require("../middleware/uploadMiddleware");
const { limitGuestAi } = require("../middleware/guestLimit");

const router = express.Router();

router.use(requireAuth);

router.get("/foods", search);
router.post("/meals", logMeal);
router.get("/meals", getMeals);
router.post("/meals/confirm", confirmScan);
router.post("/meals/scan", limitGuestAi, upload.single("image"), scanMeal);

module.exports = router;