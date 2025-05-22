const mongoose = require("mongoose");

const DrugSchema = new mongoose.Schema({
  id: Number,
  name: String,
  history: [String],
});

module.exports = mongoose.model("Drug", DrugSchema);
