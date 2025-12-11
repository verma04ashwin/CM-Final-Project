const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// FHIR R4 compliant RiskAssessment resource
const RiskAssessmentSchema = new Schema({
  resourceType: { type: String, default: "RiskAssessment", immutable: true },
  id: { type: String, required: true, unique: true }, // FHIR resource ID
  meta: {
    versionId: String,
    lastUpdated: { type: Date, default: Date.now },
    source: String,
    profile: [String],
    security: Schema.Types.Mixed,
    tag: Schema.Types.Mixed,
  },
  identifier: [{
    use: String,
    type: Schema.Types.Mixed,
    system: String,
    value: String,
    period: Schema.Types.Mixed,
    assigner: Schema.Types.Mixed,
  }],
  basedOn: Schema.Types.Mixed, // Reference to request
  parent: Schema.Types.Mixed, // Reference to parent assessment
  status: { 
    type: String, 
    required: true,
    enum: ["registered", "preliminary", "final", "amended", "corrected", "cancelled", "entered-in-error", "unknown"],
    default: "final"
  },
  method: {
    coding: [{
      system: String,
      code: String,
      display: String,
    }],
    text: String,
  },
  code: {
    coding: [{
      system: String,
      code: String,
      display: String,
    }],
    text: String,
  },
  subject: Schema.Types.Mixed, // Reference to Patient - using Mixed type for nested object
  encounter: Schema.Types.Mixed, // Reference to Encounter
  occurrenceDateTime: Date,
  occurrencePeriod: {
    start: Date,
    end: Date,
  },
  condition: Schema.Types.Mixed, // Reference to Condition being assessed
  performer: Schema.Types.Mixed, // Reference to who did assessment
  reasonCode: [{
    coding: [{
      system: String,
      code: String,
      display: String,
    }],
    text: String,
  }],
  reasonReference: [Schema.Types.Mixed],
  basis: [Schema.Types.Mixed], // References to Observations, etc. used as basis
  prediction: [{
    outcome: {
      coding: [{
        system: String,
        code: String,
        display: String,
      }],
      text: String,
    },
    probabilityDecimal: Number, // 0.0 to 1.0
    probabilityRange: {
      low: Schema.Types.Mixed,
      high: Schema.Types.Mixed,
    },
    qualitativeRisk: {
      coding: [{
        system: String,
        code: String,
        display: String,
      }],
      text: String,
    },
    relativeRisk: Number,
    whenPeriod: {
      start: Date,
      end: Date,
    },
    whenRange: Schema.Types.Mixed,
    rationale: String,
  }],
  mitigation: String, // How to reduce risk
  note: [{
    authorReference: Schema.Types.Mixed,
    authorString: String,
    time: Date,
    text: String,
  }],
  extension: [Schema.Types.Mixed],
  text: {
    status: String,
    div: String,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Index for faster queries
RiskAssessmentSchema.index({ "subject.reference": 1 });
RiskAssessmentSchema.index({ status: 1 });
RiskAssessmentSchema.index({ occurrenceDateTime: -1 });

// Update timestamps on save
RiskAssessmentSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  if (this.meta) {
    this.meta.lastUpdated = this.updatedAt;
  }
  next();
});

module.exports = mongoose.model("RiskAssessment", RiskAssessmentSchema);
