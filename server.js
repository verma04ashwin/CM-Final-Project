// server.js
require("dotenv").config();

// ---- Models (add these near the top AFTER dotenv) ----
const Patient = require("./models/Patient");
const Observation = require("./models/Observation");
const RiskAssessment = require("./models/RiskAssessment");

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");

const uploadRouter = require("./routes/upload");
const predictRouter = require("./routes/predict");
const fhirProxy = require("./routes/fhirProxy");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// connect to Mongo
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// basic routes / UI
app.get("/", async (req, res) => {
  // show landing page with upload form + manual input link
  res.render("index");
});

app.get("/patients", async (req, res) => {
  // redirect to patient list page (frontend view)
  res.render("patients");
});

// mount functional routers
app.use("/upload", uploadRouter);
app.use("/predict", predictRouter);

// optional proxy to a real FHIR server (GET only)
app.use("/fhir", fhirProxy);

/* ---------------------------
   Small API endpoints used by EJS UI
   (Add these BEFORE app.listen)
   --------------------------- */

// List patients for UI
app.get("/api/patients", async (req, res) => {
  try {
    const patients = await Patient.find({}).limit(200).lean();
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// Patient detail
app.get("/api/patient/:id", async (req, res) => {
  try {
    const pid = req.params.id;
    const patient = await Patient.findOne({ patientId: pid }).lean();
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    const observations = await Observation.find({ patientId: pid })
      .sort({ effectiveDateTime: -1 })
      .lean();

    const risks = await RiskAssessment.find({ patientId: pid })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ ...patient, observations, risks });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

/* ---------------------------
   End small API endpoints
   --------------------------- */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server listening on http://localhost:${PORT}`)
);
