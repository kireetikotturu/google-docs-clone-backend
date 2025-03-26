const mongoose = require("mongoose");

const LetterSchema = new mongoose.Schema({
  content: String,
  userId: String, // Store the user ID for each letter
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Letter", LetterSchema);
