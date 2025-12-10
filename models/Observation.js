const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ObservationSchema = new Schema({
  observationId: { type: String, required: true, unique: true },
  patientId: { type: String, index: true },
  code: Schema.Types.Mixed,
  value: Schema.Types.Mixed,
  unit: String,
  category: String,
  effectiveDateTime: { type: Date, default: Date.now },
  raw: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Observation", ObservationSchema);
