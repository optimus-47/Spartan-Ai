const express = require("express");
const requireAuth = require("../middleware/authMiddleware");
const {
  getMe,
  updateProfile,
  addInjury,
  updateEquipment,
  addBodyMetric,
  getBodyMetrics,
} = require("../controllers/userController");

const router = express.Router();

router.use(requireAuth);

router.get("/me", getMe);
router.patch("/me/profile", updateProfile);
router.post("/me/injuries", addInjury);
router.patch("/me/equipment", updateEquipment);
router.post("/me/body-metrics", addBodyMetric);
router.get("/me/body-metrics", getBodyMetrics);

module.exports = router;