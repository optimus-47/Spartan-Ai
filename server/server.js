require("dotenv").config();
const app = require("./src/app");
const { ensureSchema } = require("./src/config/ensureSchema");

const PORT = process.env.PORT || 5000;

ensureSchema()
  .catch((err) => {
    console.error("Schema check failed; guest access may be unavailable.", err);
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Spartan AI server running on port ${PORT}`);
    });
  });