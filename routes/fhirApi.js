const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");

const Patient = require("../models/Patient");
const Observation = require("../models/Observation");
const Condition = require("../models/Condition");
const RiskAssessment = require("../models/RiskAssessment");

// Helper to build FHIR Bundle
function buildBundle(type, entries, total) {
  return {
    resourceType: "Bundle",
    type: type || "searchset",
    total: total || entries.length,
    link: [
      {
        relation: "self",
        url: `${process.env.BASE_URL || "http://localhost:3001"}/fhir`,
      },
    ],
    entry: entries.map((resource) => ({
      fullUrl: `${process.env.BASE_URL || "http://localhost:3001"}/fhir/${
        resource.resourceType
      }/${resource.id}`,
      resource: resource,
    })),
  };
}

// Helper to sanitize MongoDB doc to FHIR resource
function toFHIR(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  delete obj._id;
  delete obj.__v;
  delete obj.createdAt;
  delete obj.updatedAt;
  return obj;
}

// ==================== Patient Endpoints ====================

// Search Patients (GET /fhir/Patient)
router.get("/Patient", async (req, res) => {
  try {
    const query = {};
    
    // FHIR search parameters
    if (req.query.gender) query.gender = req.query.gender;
    if (req.query.birthdate) query.birthDate = req.query.birthdate;
    if (req.query.name) {
      query["name.given"] = new RegExp(req.query.name, "i");
    }
    if (req.query.identifier) {
      query["identifier.value"] = req.query.identifier;
    }
    if (req.query._id) query.id = req.query._id;

    const limit = parseInt(req.query._count) || 50;
    const skip = parseInt(req.query._offset) || 0;

    const patients = await Patient.find(query).limit(limit).skip(skip).lean();
    const total = await Patient.countDocuments(query);

    const bundle = buildBundle(
      "searchset",
      patients.map(toFHIR),
      total
    );
    res.type("application/fhir+json").json(bundle);
  } catch (err) {
    res.status(500).json({
      resourceType: "OperationOutcome",
      issue: [
        {
          severity: "error",
          code: "exception",
          diagnostics: err.toString(),
        },
      ],
    });
  }
});

// Read Patient (GET /fhir/Patient/:id)
router.get("/Patient/:id", async (req, res) => {
  try {
    const patient = await Patient.findOne({ id: req.params.id }).lean();
    if (!patient) {
      return res.status(404).json({
        resourceType: "OperationOutcome",
        issue: [
          {
            severity: "error",
            code: "not-found",
            diagnostics: `Patient/${req.params.id} not found`,
          },
        ],
      });
    }
    res.type("application/fhir+json").json(toFHIR(patient));
  } catch (err) {
    res.status(500).json({
      resourceType: "OperationOutcome",
      issue: [
        {
          severity: "error",
          code: "exception",
          diagnostics: err.toString(),
        },
      ],
    });
  }
});

// Create Patient (POST /fhir/Patient)
router.post("/Patient", async (req, res) => {
  try {
    const data = req.body;
    if (!data.id) data.id = uuidv4();
    
    data.resourceType = "Patient";
    data.meta = data.meta || {};
    data.meta.lastUpdated = new Date();

    const patient = new Patient(data);
    await patient.save();

    res
      .status(201)
      .type("application/fhir+json")
      .location(`/fhir/Patient/${patient.id}`)
      .json(toFHIR(patient));
  } catch (err) {
    res.status(400).json({
      resourceType: "OperationOutcome",
      issue: [
        {
          severity: "error",
          code: "invalid",
          diagnostics: err.toString(),
        },
      ],
    });
  }
});

// Update Patient (PUT /fhir/Patient/:id)
router.put("/Patient/:id", async (req, res) => {
  try {
    const data = req.body;
    data.id = req.params.id;
    data.resourceType = "Patient";
    data.meta = data.meta || {};
    data.meta.lastUpdated = new Date();

    const patient = await Patient.findOneAndUpdate(
      { id: req.params.id },
      data,
      { new: true, upsert: true, runValidators: true }
    );

    res
      .status(200)
      .type("application/fhir+json")
      .json(toFHIR(patient));
  } catch (err) {
    res.status(400).json({
      resourceType: "OperationOutcome",
      issue: [
        {
          severity: "error",
          code: "invalid",
          diagnostics: err.toString(),
        },
      ],
    });
  }
});

// Delete Patient (DELETE /fhir/Patient/:id)
router.delete("/Patient/:id", async (req, res) => {
  try {
    const result = await Patient.deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({
        resourceType: "OperationOutcome",
        issue: [
          {
            severity: "error",
            code: "not-found",
            diagnostics: `Patient/${req.params.id} not found`,
          },
        ],
      });
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({
      resourceType: "OperationOutcome",
      issue: [
        {
          severity: "error",
          code: "exception",
          diagnostics: err.toString(),
        },
      ],
    });
  }
});

// ==================== Observation Endpoints ====================

// Search Observations (GET /fhir/Observation)
router.get("/Observation", async (req, res) => {
  try {
    const query = {};
    
    if (req.query.patient) {
      query["subject.reference"] = `Patient/${req.query.patient}`;
    }
    if (req.query.subject) {
      query["subject.reference"] = req.query.subject;
    }
    if (req.query.code) {
      query["code.coding.code"] = req.query.code;
    }
    if (req.query.category) {
      query["category.coding.code"] = req.query.category;
    }
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query._id) query.id = req.query._id;

    const limit = parseInt(req.query._count) || 50;
    const skip = parseInt(req.query._offset) || 0;
    const sort = req.query._sort === "date" ? { effectiveDateTime: -1 } : {};

    const observations = await Observation.find(query)
      .sort(sort)
      .limit(limit)
      .skip(skip)
      .lean();
    const total = await Observation.countDocuments(query);

    const bundle = buildBundle(
      "searchset",
      observations.map(toFHIR),
      total
    );
    res.type("application/fhir+json").json(bundle);
  } catch (err) {
    res.status(500).json({
      resourceType: "OperationOutcome",
      issue: [
        {
          severity: "error",
          code: "exception",
          diagnostics: err.toString(),
        },
      ],
    });
  }
});

// Read Observation (GET /fhir/Observation/:id)
router.get("/Observation/:id", async (req, res) => {
  try {
    const observation = await Observation.findOne({ id: req.params.id }).lean();
    if (!observation) {
      return res.status(404).json({
        resourceType: "OperationOutcome",
        issue: [
          {
            severity: "error",
            code: "not-found",
            diagnostics: `Observation/${req.params.id} not found`,
          },
        ],
      });
    }
    res.type("application/fhir+json").json(toFHIR(observation));
  } catch (err) {
    res.status(500).json({
      resourceType: "OperationOutcome",
      issue: [
        {
          severity: "error",
          code: "exception",
          diagnostics: err.toString(),
        },
      ],
    });
  }
});

// Create Observation (POST /fhir/Observation)
router.post("/Observation", async (req, res) => {
  try {
    const data = req.body;
    if (!data.id) data.id = uuidv4();
    
    data.resourceType = "Observation";
    data.meta = data.meta || {};
    data.meta.lastUpdated = new Date();
    if (!data.status) data.status = "final";

    const observation = new Observation(data);
    await observation.save();

    res
      .status(201)
      .type("application/fhir+json")
      .location(`/fhir/Observation/${observation.id}`)
      .json(toFHIR(observation));
  } catch (err) {
    res.status(400).json({
      resourceType: "OperationOutcome",
      issue: [
        {
          severity: "error",
          code: "invalid",
          diagnostics: err.toString(),
        },
      ],
    });
  }
});

// Update Observation (PUT /fhir/Observation/:id)
router.put("/Observation/:id", async (req, res) => {
  try {
    const data = req.body;
    data.id = req.params.id;
    data.resourceType = "Observation";
    data.meta = data.meta || {};
    data.meta.lastUpdated = new Date();

    const observation = await Observation.findOneAndUpdate(
      { id: req.params.id },
      data,
      { new: true, upsert: true, runValidators: true }
    );

    res
      .status(200)
      .type("application/fhir+json")
      .json(toFHIR(observation));
  } catch (err) {
    res.status(400).json({
      resourceType: "OperationOutcome",
      issue: [
        {
          severity: "error",
          code: "invalid",
          diagnostics: err.toString(),
        },
      ],
    });
  }
});

// Delete Observation (DELETE /fhir/Observation/:id)
router.delete("/Observation/:id", async (req, res) => {
  try {
    const result = await Observation.deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({
        resourceType: "OperationOutcome",
        issue: [
          {
            severity: "error",
            code: "not-found",
            diagnostics: `Observation/${req.params.id} not found`,
          },
        ],
      });
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({
      resourceType: "OperationOutcome",
      issue: [
        {
          severity: "error",
          code: "exception",
          diagnostics: err.toString(),
        },
      ],
    });
  }
});

// ==================== Condition Endpoints ====================

// Search Conditions (GET /fhir/Condition)
router.get("/Condition", async (req, res) => {
  try {
    const query = {};
    
    if (req.query.patient) {
      query["subject.reference"] = `Patient/${req.query.patient}`;
    }
    if (req.query.subject) {
      query["subject.reference"] = req.query.subject;
    }
    if (req.query.code) {
      query["code.coding.code"] = req.query.code;
    }
    if (req.query["clinical-status"]) {
      query["clinicalStatus.coding.code"] = req.query["clinical-status"];
    }
    if (req.query._id) query.id = req.query._id;

    const limit = parseInt(req.query._count) || 50;
    const skip = parseInt(req.query._offset) || 0;

    const conditions = await Condition.find(query)
      .sort({ recordedDate: -1 })
      .limit(limit)
      .skip(skip)
      .lean();
    const total = await Condition.countDocuments(query);

    const bundle = buildBundle(
      "searchset",
      conditions.map(toFHIR),
      total
    );
    res.type("application/fhir+json").json(bundle);
  } catch (err) {
    res.status(500).json({
      resourceType: "OperationOutcome",
      issue: [
        {
          severity: "error",
          code: "exception",
          diagnostics: err.toString(),
        },
      ],
    });
  }
});

// Read Condition (GET /fhir/Condition/:id)
router.get("/Condition/:id", async (req, res) => {
  try {
    const condition = await Condition.findOne({ id: req.params.id }).lean();
    if (!condition) {
      return res.status(404).json({
        resourceType: "OperationOutcome",
        issue: [
          {
            severity: "error",
            code: "not-found",
            diagnostics: `Condition/${req.params.id} not found`,
          },
        ],
      });
    }
    res.type("application/fhir+json").json(toFHIR(condition));
  } catch (err) {
    res.status(500).json({
      resourceType: "OperationOutcome",
      issue: [
        {
          severity: "error",
          code: "exception",
          diagnostics: err.toString(),
        },
      ],
    });
  }
});

// Create Condition (POST /fhir/Condition)
router.post("/Condition", async (req, res) => {
  try {
    const data = req.body;
    if (!data.id) data.id = uuidv4();
    
    data.resourceType = "Condition";
    data.meta = data.meta || {};
    data.meta.lastUpdated = new Date();

    const condition = new Condition(data);
    await condition.save();

    res
      .status(201)
      .type("application/fhir+json")
      .location(`/fhir/Condition/${condition.id}`)
      .json(toFHIR(condition));
  } catch (err) {
    res.status(400).json({
      resourceType: "OperationOutcome",
      issue: [
        {
          severity: "error",
          code: "invalid",
          diagnostics: err.toString(),
        },
      ],
    });
  }
});

// Update Condition (PUT /fhir/Condition/:id)
router.put("/Condition/:id", async (req, res) => {
  try {
    const data = req.body;
    data.id = req.params.id;
    data.resourceType = "Condition";
    data.meta = data.meta || {};
    data.meta.lastUpdated = new Date();

    const condition = await Condition.findOneAndUpdate(
      { id: req.params.id },
      data,
      { new: true, upsert: true, runValidators: true }
    );

    res
      .status(200)
      .type("application/fhir+json")
      .json(toFHIR(condition));
  } catch (err) {
    res.status(400).json({
      resourceType: "OperationOutcome",
      issue: [
        {
          severity: "error",
          code: "invalid",
          diagnostics: err.toString(),
        },
      ],
    });
  }
});

// Delete Condition (DELETE /fhir/Condition/:id)
router.delete("/Condition/:id", async (req, res) => {
  try {
    const result = await Condition.deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({
        resourceType: "OperationOutcome",
        issue: [
          {
            severity: "error",
            code: "not-found",
            diagnostics: `Condition/${req.params.id} not found`,
          },
        ],
      });
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({
      resourceType: "OperationOutcome",
      issue: [
        {
          severity: "error",
          code: "exception",
          diagnostics: err.toString(),
        },
      ],
    });
  }
});

// ==================== RiskAssessment Endpoints ====================

// Search RiskAssessments (GET /fhir/RiskAssessment)
router.get("/RiskAssessment", async (req, res) => {
  try {
    const query = {};
    
    if (req.query.patient) {
      query["subject.reference"] = `Patient/${req.query.patient}`;
    }
    if (req.query.subject) {
      query["subject.reference"] = req.query.subject;
    }
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query._id) query.id = req.query._id;

    const limit = parseInt(req.query._count) || 50;
    const skip = parseInt(req.query._offset) || 0;

    const risks = await RiskAssessment.find(query)
      .sort({ occurrenceDateTime: -1 })
      .limit(limit)
      .skip(skip)
      .lean();
    const total = await RiskAssessment.countDocuments(query);

    const bundle = buildBundle(
      "searchset",
      risks.map(toFHIR),
      total
    );
    res.type("application/fhir+json").json(bundle);
  } catch (err) {
    res.status(500).json({
      resourceType: "OperationOutcome",
      issue: [
        {
          severity: "error",
          code: "exception",
          diagnostics: err.toString(),
        },
      ],
    });
  }
});

// Read RiskAssessment (GET /fhir/RiskAssessment/:id)
router.get("/RiskAssessment/:id", async (req, res) => {
  try {
    const risk = await RiskAssessment.findOne({ id: req.params.id }).lean();
    if (!risk) {
      return res.status(404).json({
        resourceType: "OperationOutcome",
        issue: [
          {
            severity: "error",
            code: "not-found",
            diagnostics: `RiskAssessment/${req.params.id} not found`,
          },
        ],
      });
    }
    res.type("application/fhir+json").json(toFHIR(risk));
  } catch (err) {
    res.status(500).json({
      resourceType: "OperationOutcome",
      issue: [
        {
          severity: "error",
          code: "exception",
          diagnostics: err.toString(),
        },
      ],
    });
  }
});

// Create RiskAssessment (POST /fhir/RiskAssessment)
router.post("/RiskAssessment", async (req, res) => {
  try {
    const data = req.body;
    if (!data.id) data.id = uuidv4();
    
    data.resourceType = "RiskAssessment";
    data.meta = data.meta || {};
    data.meta.lastUpdated = new Date();
    if (!data.status) data.status = "final";

    const risk = new RiskAssessment(data);
    await risk.save();

    res
      .status(201)
      .type("application/fhir+json")
      .location(`/fhir/RiskAssessment/${risk.id}`)
      .json(toFHIR(risk));
  } catch (err) {
    res.status(400).json({
      resourceType: "OperationOutcome",
      issue: [
        {
          severity: "error",
          code: "invalid",
          diagnostics: err.toString(),
        },
      ],
    });
  }
});

// Update RiskAssessment (PUT /fhir/RiskAssessment/:id)
router.put("/RiskAssessment/:id", async (req, res) => {
  try {
    const data = req.body;
    data.id = req.params.id;
    data.resourceType = "RiskAssessment";
    data.meta = data.meta || {};
    data.meta.lastUpdated = new Date();

    const risk = await RiskAssessment.findOneAndUpdate(
      { id: req.params.id },
      data,
      { new: true, upsert: true, runValidators: true }
    );

    res
      .status(200)
      .type("application/fhir+json")
      .json(toFHIR(risk));
  } catch (err) {
    res.status(400).json({
      resourceType: "OperationOutcome",
      issue: [
        {
          severity: "error",
          code: "invalid",
          diagnostics: err.toString(),
        },
      ],
    });
  }
});

// Delete RiskAssessment (DELETE /fhir/RiskAssessment/:id)
router.delete("/RiskAssessment/:id", async (req, res) => {
  try {
    const result = await RiskAssessment.deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({
        resourceType: "OperationOutcome",
        issue: [
          {
            severity: "error",
            code: "not-found",
            diagnostics: `RiskAssessment/${req.params.id} not found`,
          },
        ],
      });
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({
      resourceType: "OperationOutcome",
      issue: [
        {
          severity: "error",
          code: "exception",
          diagnostics: err.toString(),
        },
      ],
    });
  }
});

// ==================== Metadata/CapabilityStatement ====================

router.get("/metadata", (req, res) => {
  const capability = {
    resourceType: "CapabilityStatement",
    status: "active",
    date: new Date().toISOString(),
    publisher: "FHIR Prototype Server",
    kind: "instance",
    software: {
      name: "FHIR Prototype Node.js Server",
      version: "1.0.0",
    },
    implementation: {
      description: "FHIR R4 Prototype Server with MongoDB",
      url: process.env.BASE_URL || "http://localhost:3001/fhir",
    },
    fhirVersion: "4.0.1",
    format: ["application/fhir+json", "json"],
    rest: [
      {
        mode: "server",
        resource: [
          {
            type: "Patient",
            interaction: [
              { code: "read" },
              { code: "create" },
              { code: "update" },
              { code: "delete" },
              { code: "search-type" },
            ],
            searchParam: [
              { name: "_id", type: "token" },
              { name: "identifier", type: "token" },
              { name: "name", type: "string" },
              { name: "gender", type: "token" },
              { name: "birthdate", type: "date" },
            ],
          },
          {
            type: "Observation",
            interaction: [
              { code: "read" },
              { code: "create" },
              { code: "update" },
              { code: "delete" },
              { code: "search-type" },
            ],
            searchParam: [
              { name: "_id", type: "token" },
              { name: "patient", type: "reference" },
              { name: "subject", type: "reference" },
              { name: "code", type: "token" },
              { name: "category", type: "token" },
              { name: "status", type: "token" },
            ],
          },
          {
            type: "Condition",
            interaction: [
              { code: "read" },
              { code: "create" },
              { code: "update" },
              { code: "delete" },
              { code: "search-type" },
            ],
            searchParam: [
              { name: "_id", type: "token" },
              { name: "patient", type: "reference" },
              { name: "subject", type: "reference" },
              { name: "code", type: "token" },
              { name: "clinical-status", type: "token" },
            ],
          },
          {
            type: "RiskAssessment",
            interaction: [
              { code: "read" },
              { code: "create" },
              { code: "update" },
              { code: "delete" },
              { code: "search-type" },
            ],
            searchParam: [
              { name: "_id", type: "token" },
              { name: "patient", type: "reference" },
              { name: "subject", type: "reference" },
              { name: "status", type: "token" },
            ],
          },
        ],
      },
    ],
  };

  res.type("application/fhir+json").json(capability);
});

module.exports = router;
