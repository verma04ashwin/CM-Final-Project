const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const RiskAssessmentSchema = new Schema({
  riskId: { type: String, required: true, unique: true },
  patientId: { type: String, index: true },
  probability: Number,
  qualitative: String,
  basis: [String],
  method: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("RiskAssessment", RiskAssessmentSchema);
