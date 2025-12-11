const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// FHIR R4 compliant Patient resource
const PatientSchema = new Schema({
  resourceType: { type: String, default: "Patient", immutable: true },
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
    use: String, // usual | official | temp | secondary | old
    type: Schema.Types.Mixed,
    system: String,
    value: String,
    period: Schema.Types.Mixed,
    assigner: Schema.Types.Mixed,
  }],
  active: { type: Boolean, default: true },
  name: [{
    use: String, // usual | official | temp | nickname | anonymous | old | maiden
    text: String,
    family: String,
    given: [String],
    prefix: [String],
    suffix: [String],
    period: Schema.Types.Mixed,
  }],
  telecom: [{
    system: String, // phone | fax | email | pager | url | sms | other
    value: String,
    use: String, // home | work | temp | old | mobile
    rank: Number,
    period: Schema.Types.Mixed,
  }],
  gender: { type: String, enum: ["male", "female", "other", "unknown"] },
  birthDate: String, // YYYY-MM-DD format
  deceasedBoolean: Boolean,
  deceasedDateTime: Date,
  address: [{
    use: String, // home | work | temp | old | billing
    type: String, // postal | physical | both
    text: String,
    line: [String],
    city: String,
    district: String,
    state: String,
    postalCode: String,
    country: String,
    period: Schema.Types.Mixed,
  }],
  maritalStatus: {
    coding: [{
      system: String,
      code: String,
      display: String,
    }],
    text: String,
  },
  contact: [{
    relationship: [{
      coding: [{
        system: String,
        code: String,
        display: String,
      }],
      text: String,
    }],
    name: Schema.Types.Mixed,
    telecom: [Schema.Types.Mixed],
    address: Schema.Types.Mixed,
    gender: String,
    organization: Schema.Types.Mixed,
    period: Schema.Types.Mixed,
  }],
  communication: [{
    language: {
      coding: [{
        system: String,
        code: String,
        display: String,
      }],
      text: String,
    },
    preferred: Boolean,
  }],
  generalPractitioner: [Schema.Types.Mixed],
  managingOrganization: Schema.Types.Mixed,
  link: [{
    other: Schema.Types.Mixed,
    type: String, // replaced-by | replaces | refer | seealso
  }],
  extension: [Schema.Types.Mixed],
  text: {
    status: String, // generated | extensions | additional | empty
    div: String, // xhtml narrative
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update timestamps on save
PatientSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  if (this.meta) {
    this.meta.lastUpdated = this.updatedAt;
  }
  next();
});

module.exports = mongoose.model("Patient", PatientSchema);
