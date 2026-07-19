const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const textModel = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
const visionModel = genAI.getGenerativeModel({ model: "gemini-flash-latest" }); // same model, handles both

module.exports = { textModel, visionModel };