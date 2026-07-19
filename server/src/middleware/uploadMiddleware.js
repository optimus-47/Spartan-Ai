const multer = require("multer");

// memoryStorage = file stays in RAM only, never written to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB max
});

module.exports = upload;