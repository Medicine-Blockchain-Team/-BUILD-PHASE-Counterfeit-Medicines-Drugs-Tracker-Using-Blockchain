// ==================== Updated Drug Schema ====================

const mongoose = require("mongoose");

const drugSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  manufacturer: { type: String, required: true },
  currentOwner: { type: String, required: true },
  status: { type: String, default: "Manufactured" },
  isVerified: { type: Boolean, default: false },
  isFlagged: { type: Boolean, default: false },
  history: [
    {
      status: String,
      updatedBy: String,
      owner: String,
      timestamp: { type: Date, default: Date.now }
    }
  ]
});

module.exports = mongoose.model("Drug", drugSchema);
