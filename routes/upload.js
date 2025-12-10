const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const csv = require("csv-parse/sync");
const { v4: uuidv4 } = require("uuid");

const Patient = require("../models/Patient");
const Observation = require("../models/Observation");

const upload = multer({ dest: "uploads/" });

/**
 * POST /upload
 * multipart/form-data with `file` field (CSV)
 * Expected CSV columns (example): id,gender,age,hypertension,heart_disease,ever_married,work_type,Residence_type,avg_glucose_level,bmi,smoking_status,stroke
 */
router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const content = fs.readFileSync(req.file.path);
    const records = csv.parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const created = [];
    for (const row of records) {
      const pid = String(row.id || uuidv4());

      // upsert Patient
      await Patient.updateOne(
        { patientId: pid },
        {
          patientId: pid,
          gender: (row.gender || "").toLowerCase(),
          birthDate: row.age
            ? `${new Date().getFullYear() - Number(row.age)}-01-01`
            : undefined,
          extensions: {
            residence: row.Residence_type,
            work_type: row.work_type,
            ever_married: row.ever_married,
          },
          meta: {
            source: "csv-upload",
          },
        },
        { upsert: true }
      );

      // BMI observation
      if (row.bmi && row.bmi !== "") {
        const obs = new Observation({
          observationId: `obs-${uuidv4()}`,
          patientId: pid,
          code: { system: "http://loinc.org", code: "39156-5", display: "BMI" },
          value: Number(row.bmi),
          unit: "kg/m2",
          category: "vital-signs",
          raw: row,
        });
        await obs.save();
      }

      // avg_glucose_level observation
      if (row.avg_glucose_level && row.avg_glucose_level !== "") {
        const obs2 = new Observation({
          observationId: `obs-${uuidv4()}`,
          patientId: pid,
          code: {
            system: "http://loinc.org",
            code: "2339-0",
            display: "Glucose",
          },
          value: Number(row.avg_glucose_level),
          unit: "mg/dL",
          category: "laboratory",
          raw: row,
        });
        await obs2.save();
      }

      // add small observation for smoking_status (store as text)
      if (row.smoking_status) {
        const obs3 = new Observation({
          observationId: `obs-${uuidv4()}`,
          patientId: pid,
          code: { text: "Smoking status" },
          value: row.smoking_status,
          category: "social-history",
          raw: row,
        });
        await obs3.save();
      }

      // You can add Conditions for hypertension/heart_disease similarly in future

      created.push(pid);
    }

    fs.unlinkSync(req.file.path);
    res.json({ created, count: created.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.toString() });
  }
});

module.exports = router;
