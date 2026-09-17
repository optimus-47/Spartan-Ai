const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const textModel = genAI.getGenerativeModel({
  model: "gemini-flash-latest",
  generationConfig: { temperature: 0.3 },
});

const visionModel = genAI.getGenerativeModel({
  model: "gemini-flash-latest",
  generationConfig: { temperature: 0.2 }, // even lower — food ID should be as literal as possible
});
module.exports = { textModel, visionModel };