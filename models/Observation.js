const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// FHIR R4 compliant Observation resource
const ObservationSchema = new Schema({
  resourceType: { type: String, default: "Observation", immutable: true },
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
  basedOn: [Schema.Types.Mixed], // Reference to CarePlan, ServiceRequest, etc.
  partOf: [Schema.Types.Mixed], // Reference to larger event
  status: { 
    type: String, 
    required: true,
    enum: ["registered", "preliminary", "final", "amended", "corrected", "cancelled", "entered-in-error", "unknown"],
    default: "final"
  },
  category: [{
    coding: [{
      system: String,
      code: String,
      display: String,
    }],
    text: String,
  }],
  code: { // What was observed (LOINC, SNOMED, etc.)
    coding: [{
      system: String,
      code: String,
      display: String,
      version: String,
      userSelected: Boolean,
    }],
    text: String,
  },
  subject: Schema.Types.Mixed, // Reference to Patient - using Mixed type for nested object
  focus: [Schema.Types.Mixed],
  encounter: Schema.Types.Mixed, // Reference to Encounter
  effectiveDateTime: Date,
  effectivePeriod: {
    start: Date,
    end: Date,
  },
  effectiveTiming: Schema.Types.Mixed,
  effectiveInstant: Date,
  issued: Date,
  performer: [Schema.Types.Mixed], // References to Practitioner, Organization, etc.
  // Value[x] - different types of values
  valueQuantity: {
    value: Number,
    comparator: String, // < | <= | >= | >
    unit: String,
    system: String,
    code: String,
  },
  valueCodeableConcept: {
    coding: [{
      system: String,
      code: String,
      display: String,
    }],
    text: String,
  },
  valueString: String,
  valueBoolean: Boolean,
  valueInteger: Number,
  valueRange: Schema.Types.Mixed,
  valueRatio: Schema.Types.Mixed,
  valueSampledData: Schema.Types.Mixed,
  valueTime: String,
  valueDateTime: Date,
  valuePeriod: Schema.Types.Mixed,
  dataAbsentReason: {
    coding: [{
      system: String,
      code: String,
      display: String,
    }],
    text: String,
  },
  interpretation: [{
    coding: [{
      system: String,
      code: String,
      display: String,
    }],
    text: String,
  }],
  note: [{
    authorReference: Schema.Types.Mixed,
    authorString: String,
    time: Date,
    text: String,
  }],
  bodySite: {
    coding: [{
      system: String,
      code: String,
      display: String,
    }],
    text: String,
  },
  method: {
    coding: [{
      system: String,
      code: String,
      display: String,
    }],
    text: String,
  },
  specimen: Schema.Types.Mixed, // Reference to Specimen
  device: Schema.Types.Mixed, // Reference to Device
  referenceRange: [{
    low: Schema.Types.Mixed,
    high: Schema.Types.Mixed,
    type: Schema.Types.Mixed,
    appliesTo: [Schema.Types.Mixed],
    age: Schema.Types.Mixed,
    text: String,
  }],
  hasMember: [Schema.Types.Mixed], // References to related observations
  derivedFrom: [Schema.Types.Mixed], // References to source observations
  component: [{
    code: Schema.Types.Mixed,
    valueQuantity: Schema.Types.Mixed,
    valueCodeableConcept: Schema.Types.Mixed,
    valueString: String,
    valueBoolean: Boolean,
    valueInteger: Number,
    valueDateTime: Date,
    valueTime: String,
    valuePeriod: Schema.Types.Mixed,
    dataAbsentReason: Schema.Types.Mixed,
    interpretation: [Schema.Types.Mixed],
    referenceRange: [Schema.Types.Mixed],
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
ObservationSchema.index({ "subject.reference": 1 });
ObservationSchema.index({ status: 1 });
ObservationSchema.index({ effectiveDateTime: -1 });

// Update timestamps on save
ObservationSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  if (this.meta) {
    this.meta.lastUpdated = this.updatedAt;
  }
  next();
});

module.exports = mongoose.model("Observation", ObservationSchema);
