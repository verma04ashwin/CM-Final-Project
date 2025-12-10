const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PatientSchema = new Schema({
  patientId: { type: String, required: true, unique: true },
  gender: { type: String },
  birthDate: { type: String },
  extensions: Schema.Types.Mixed,
  meta: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Patient", PatientSchema);
