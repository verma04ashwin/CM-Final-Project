// server.js
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");

// Import models
const Patient = require("./models/Patient");
const Observation = require("./models/Observation");
const Condition = require("./models/Condition");
const RiskAssessment = require("./models/RiskAssessment");

// Import routes
const uploadRouter = require("./routes/upload");
const predictRouter = require("./routes/predict");
const fhirApiRouter = require("./routes/fhirApi");
const fhirProxy = require("./routes/fhirProxy");

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✓ MongoDB connected"))
  .catch((err) => {
    console.error("✗ MongoDB connection error:", err);
    process.exit(1);
  });

// ==================== UI Routes ====================

// Landing page with upload form
app.get("/", async (req, res) => {
  res.render("index");
});

// Patient list page
app.get("/patients", async (req, res) => {
  res.render("patients");
});

// Patient detail page
app.get("/patient/:id", async (req, res) => {
  res.render("patient");
});

// ==================== Legacy API Routes (for UI) ====================

// List patients for UI (legacy format)
app.get("/api/patients", async (req, res) => {
  try {
    const patients = await Patient.find({}).limit(200).lean();
    
    // Transform FHIR patients to simple format for UI
    const simplified = patients.map((p) => ({
      id: p.id,
      patientId: p.id, // Keep for backward compatibility
      gender: p.gender,
      birthDate: p.birthDate,
      name: p.name && p.name[0] ? p.name[0].given?.join(" ") + " " + (p.name[0].family || "") : p.id,
      active: p.active,
    }));
    
    res.json(simplified);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// Patient detail with observations and risks (legacy format)
app.get("/api/patient/:id", async (req, res) => {
  try {
    const pid = req.params.id;
    const patientReference = `Patient/${pid}`;
    
    const patient = await Patient.findOne({ id: pid }).lean();
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    const observations = await Observation.find({
      "subject.reference": patientReference,
    })
      .sort({ effectiveDateTime: -1 })
      .lean();

    const conditions = await Condition.find({
      "subject.reference": patientReference,
    })
      .sort({ recordedDate: -1 })
      .lean();

    const risks = await RiskAssessment.find({
      "subject.reference": patientReference,
    })
      .sort({ occurrenceDateTime: -1 })
      .lean();

    // Transform to UI-friendly format
    const simplifiedObs = observations.map((obs) => ({
      id: obs.id,
      code: obs.code,
      value:
        obs.valueQuantity?.value ||
        obs.valueString ||
        obs.valueCodeableConcept?.text ||
        obs.valueBoolean ||
        "N/A",
      unit: obs.valueQuantity?.unit || "",
      effectiveDateTime: obs.effectiveDateTime,
      category: obs.category && obs.category[0]?.coding?.[0]?.display,
      status: obs.status,
    }));

    const simplifiedConditions = conditions.map((cond) => ({
      id: cond.id,
      code: cond.code?.text || cond.code?.coding?.[0]?.display,
      clinicalStatus: cond.clinicalStatus?.coding?.[0]?.code,
      recordedDate: cond.recordedDate,
    }));

    const simplifiedRisks = risks.map((risk) => ({
      id: risk.id,
      probability: risk.prediction?.[0]?.probabilityDecimal,
      qualitative: risk.prediction?.[0]?.qualitativeRisk?.text,
      method: risk.method?.text || risk.method?.coding?.[0]?.display,
      occurrenceDateTime: risk.occurrenceDateTime,
    }));

    res.json({
      id: patient.id,
      patientId: patient.id, // backward compat
      gender: patient.gender,
      birthDate: patient.birthDate,
      name: patient.name && patient.name[0] ? patient.name[0].given?.join(" ") + " " + (patient.name[0].family || "") : patient.id,
      maritalStatus: patient.maritalStatus?.text || patient.maritalStatus?.coding?.[0]?.display,
      observations: simplifiedObs,
      conditions: simplifiedConditions,
      risks: simplifiedRisks,
    });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// ==================== Functional Routes ====================

// CSV Upload
app.use("/upload", uploadRouter);

// Prediction service
app.use("/predict", predictRouter);

// FHIR REST API (compliant with FHIR R4 spec)
app.use("/fhir", fhirApiRouter);

// Optional proxy to external FHIR server (if configured)
if (process.env.FHIR_SERVER_URL) {
  app.use("/fhir-proxy", fhirProxy);
}

// ==================== Health Check ====================

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    fhirVersion: "R4",
  });
});

// ==================== Error Handler ====================

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    resourceType: "OperationOutcome",
    issue: [
      {
        severity: "error",
        code: "exception",
        diagnostics: err.message,
      },
    ],
  });
});

// ==================== Start Server ====================

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║   FHIR R4 Prototype Server                        ║
║   Server: http://localhost:${PORT}                   ║
║   FHIR API: http://localhost:${PORT}/fhir            ║
║   Metadata: http://localhost:${PORT}/fhir/metadata  ║
╚═══════════════════════════════════════════════════╝
  `);
});
