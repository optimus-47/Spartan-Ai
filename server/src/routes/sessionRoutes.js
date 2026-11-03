const express = require("express");
const requireAuth = require("../middleware/authMiddleware");
const { start, addSet, finish, history, getOne } = require("../controllers/sessionController");

const router = express.Router();

router.use(requireAuth);

router.post("/", start);
router.post("/:id/sets", addSet);
router.post("/:id/finish", finish);
router.get("/", history);
router.get("/:id", getOne);

module.exports = router;