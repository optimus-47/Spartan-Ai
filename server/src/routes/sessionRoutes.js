const express = require("express");
const requireAuth = require("../middleware/authMiddleware");
const { start, addSet, finish, history } = require("../controllers/sessionController");

const router = express.Router();

router.use(requireAuth);

router.post("/", start);
router.post("/:id/sets", addSet);
router.post("/:id/finish", finish);
router.get("/", history);

module.exports = router;