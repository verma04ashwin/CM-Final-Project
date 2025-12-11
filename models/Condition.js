const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// FHIR R4 compliant Condition resource
const ConditionSchema = new Schema({
  resourceType: { type: String, default: "Condition", immutable: true },
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
  clinicalStatus: {
    coding: [{
      system: { type: String, default: "http://terminology.hl7.org/CodeSystem/condition-clinical" },
      code: String, // active | recurrence | relapse | inactive | remission | resolved
      display: String,
    }],
    text: String,
  },
  verificationStatus: {
    coding: [{
      system: { type: String, default: "http://terminology.hl7.org/CodeSystem/condition-ver-status" },
      code: String, // unconfirmed | provisional | differential | confirmed | refuted | entered-in-error
      display: String,
    }],
    text: String,
  },
  category: [{
    coding: [{
      system: String,
      code: String, // problem-list-item | encounter-diagnosis
      display: String,
    }],
    text: String,
  }],
  severity: {
    coding: [{
      system: String,
      code: String, // severe | moderate | mild
      display: String,
    }],
    text: String,
  },
  code: { // Condition/problem/diagnosis code (ICD-10, SNOMED CT, etc.)
    coding: [{
      system: String,
      code: String,
      display: String,
      version: String,
      userSelected: Boolean,
    }],
    text: String,
  },
  bodySite: [{
    coding: [{
      system: String,
      code: String,
      display: String,
    }],
    text: String,
  }],
  subject: Schema.Types.Mixed, // Reference to Patient - using Mixed type for nested object
  encounter: Schema.Types.Mixed, // Reference to Encounter when diagnosed
  onsetDateTime: Date,
  onsetAge: Schema.Types.Mixed,
  onsetPeriod: {
    start: Date,
    end: Date,
  },
  onsetRange: Schema.Types.Mixed,
  onsetString: String,
  abatementDateTime: Date,
  abatementAge: Schema.Types.Mixed,
  abatementPeriod: {
    start: Date,
    end: Date,
  },
  abatementRange: Schema.Types.Mixed,
  abatementString: String,
  recordedDate: { type: Date, default: Date.now },
  recorder: Schema.Types.Mixed, // Reference to Practitioner who recorded
  asserter: Schema.Types.Mixed, // Reference to who asserted the condition
  stage: [{
    summary: {
      coding: [{
        system: String,
        code: String,
        display: String,
      }],
      text: String,
    },
    assessment: [Schema.Types.Mixed], // References to observations
    type: Schema.Types.Mixed,
  }],
  evidence: [{
    code: [{
      coding: [{
        system: String,
        code: String,
        display: String,
      }],
      text: String,
    }],
    detail: [Schema.Types.Mixed], // References to supporting information
  }],
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
ConditionSchema.index({ "subject.reference": 1 });
ConditionSchema.index({ "clinicalStatus.coding.code": 1 });
ConditionSchema.index({ recordedDate: -1 });

// Update timestamps on save
ConditionSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  if (this.meta) {
    this.meta.lastUpdated = this.updatedAt;
  }
  next();
});

module.exports = mongoose.model("Condition", ConditionSchema);
