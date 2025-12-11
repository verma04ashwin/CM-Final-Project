const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const csv = require("csv-parse/sync");
const { v4: uuidv4 } = require("uuid");

const Patient = require("../models/Patient");
const Observation = require("../models/Observation");
const Condition = require("../models/Condition");

const upload = multer({ dest: "uploads/" });

/**
 * POST /upload
 * multipart/form-data with `file` field (CSV)
 * Expected CSV columns: id,gender,age,hypertension,heart_disease,ever_married,work_type,Residence_type,avg_glucose_level,bmi,smoking_status,stroke
 * Creates FHIR-compliant Patient, Observation, and Condition resources
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

    const created = {
      patients: 0,
      observations: 0,
      conditions: 0,
    };

    for (const row of records) {
      const pid = String(row.id || uuidv4());
      const patientReference = `Patient/${pid}`;

      // Calculate birth year from age
      const birthYear = row.age ? new Date().getFullYear() - Number(row.age) : null;
      const birthDate = birthYear ? `${birthYear}-01-01` : null;

      // Create or update FHIR Patient resource
      const patientData = {
        id: pid,
        resourceType: "Patient",
        identifier: [
          {
            use: "usual",
            system: "http://hospital.example.org/patients",
            value: pid,
          },
        ],
        active: true,
        gender: (row.gender || "unknown").toLowerCase(),
        birthDate: birthDate,
        meta: {
          source: "csv-upload",
          lastUpdated: new Date(),
        },
      };

      // Add marital status if available
      if (row.ever_married) {
        const marriedCode = row.ever_married.toLowerCase() === "yes" ? "M" : "S";
        const marriedDisplay = row.ever_married.toLowerCase() === "yes" ? "Married" : "Never Married";
        patientData.maritalStatus = {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus",
              code: marriedCode,
              display: marriedDisplay,
            },
          ],
        };
      }

      // Add extensions for work type and residence
      if (row.work_type || row.Residence_type) {
        patientData.extension = [];
        if (row.work_type) {
          patientData.extension.push({
            url: "http://example.org/fhir/StructureDefinition/work-type",
            valueString: row.work_type,
          });
        }
        if (row.Residence_type) {
          patientData.extension.push({
            url: "http://example.org/fhir/StructureDefinition/residence-type",
            valueString: row.Residence_type,
          });
        }
      }

      await Patient.findOneAndUpdate(
        { id: pid },
        patientData,
        { upsert: true, new: true }
      );
      created.patients++;

      // Create BMI Observation
      if (row.bmi && row.bmi !== "") {
        const bmiObs = new Observation({
          id: `obs-bmi-${uuidv4()}`,
          resourceType: "Observation",
          status: "final",
          category: [
            {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/observation-category",
                  code: "vital-signs",
                  display: "Vital Signs",
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: "http://loinc.org",
                code: "39156-5",
                display: "Body mass index (BMI) [Ratio]",
              },
            ],
            text: "BMI",
          },
          subject: {
            reference: patientReference,
            type: "Patient",
          },
          effectiveDateTime: new Date(),
          valueQuantity: {
            value: Number(row.bmi),
            unit: "kg/m2",
            system: "http://unitsofmeasure.org",
            code: "kg/m2",
          },
          meta: {
            source: "csv-upload",
            lastUpdated: new Date(),
          },
        });
        await bmiObs.save();
        created.observations++;
      }

      // Create Glucose Observation
      if (row.avg_glucose_level && row.avg_glucose_level !== "") {
        const glucoseObs = new Observation({
          id: `obs-glucose-${uuidv4()}`,
          resourceType: "Observation",
          status: "final",
          category: [
            {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/observation-category",
                  code: "laboratory",
                  display: "Laboratory",
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: "http://loinc.org",
                code: "2339-0",
                display: "Glucose [Mass/volume] in Blood",
              },
            ],
            text: "Average Glucose Level",
          },
          subject: {
            reference: patientReference,
            type: "Patient",
          },
          effectiveDateTime: new Date(),
          valueQuantity: {
            value: Number(row.avg_glucose_level),
            unit: "mg/dL",
            system: "http://unitsofmeasure.org",
            code: "mg/dL",
          },
          meta: {
            source: "csv-upload",
            lastUpdated: new Date(),
          },
        });
        await glucoseObs.save();
        created.observations++;
      }

      // Create Smoking Status Observation
      if (row.smoking_status && row.smoking_status !== "") {
        const smokingObs = new Observation({
          id: `obs-smoking-${uuidv4()}`,
          resourceType: "Observation",
          status: "final",
          category: [
            {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/observation-category",
                  code: "social-history",
                  display: "Social History",
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: "http://loinc.org",
                code: "72166-2",
                display: "Tobacco smoking status",
              },
            ],
            text: "Smoking Status",
          },
          subject: {
            reference: patientReference,
            type: "Patient",
          },
          effectiveDateTime: new Date(),
          valueCodeableConcept: {
            coding: [
              {
                system: "http://snomed.info/sct",
                display: row.smoking_status,
              },
            ],
            text: row.smoking_status,
          },
          meta: {
            source: "csv-upload",
            lastUpdated: new Date(),
          },
        });
        await smokingObs.save();
        created.observations++;
      }

      // Create Hypertension Condition
      if (row.hypertension && row.hypertension === "1") {
        const hyperCond = new Condition({
          id: `cond-hypertension-${uuidv4()}`,
          resourceType: "Condition",
          clinicalStatus: {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
                code: "active",
                display: "Active",
              },
            ],
          },
          verificationStatus: {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/condition-ver-status",
                code: "confirmed",
                display: "Confirmed",
              },
            ],
          },
          category: [
            {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/condition-category",
                  code: "problem-list-item",
                  display: "Problem List Item",
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: "http://snomed.info/sct",
                code: "38341003",
                display: "Hypertensive disorder",
              },
              {
                system: "http://hl7.org/fhir/sid/icd-10",
                code: "I10",
                display: "Essential (primary) hypertension",
              },
            ],
            text: "Hypertension",
          },
          subject: {
            reference: patientReference,
            type: "Patient",
          },
          recordedDate: new Date(),
          meta: {
            source: "csv-upload",
            lastUpdated: new Date(),
          },
        });
        await hyperCond.save();
        created.conditions++;
      }

      // Create Heart Disease Condition
      if (row.heart_disease && row.heart_disease === "1") {
        const heartCond = new Condition({
          id: `cond-heart-${uuidv4()}`,
          resourceType: "Condition",
          clinicalStatus: {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
                code: "active",
                display: "Active",
              },
            ],
          },
          verificationStatus: {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/condition-ver-status",
                code: "confirmed",
                display: "Confirmed",
              },
            ],
          },
          category: [
            {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/condition-category",
                  code: "problem-list-item",
                  display: "Problem List Item",
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: "http://snomed.info/sct",
                code: "56265001",
                display: "Heart disease",
              },
              {
                system: "http://hl7.org/fhir/sid/icd-10",
                code: "I51.9",
                display: "Heart disease, unspecified",
              },
            ],
            text: "Heart Disease",
          },
          subject: {
            reference: patientReference,
            type: "Patient",
          },
          recordedDate: new Date(),
          meta: {
            source: "csv-upload",
            lastUpdated: new Date(),
          },
        });
        await heartCond.save();
        created.conditions++;
      }

      // Create Stroke Condition
      if (row.stroke && row.stroke === "1") {
        const strokeCond = new Condition({
          id: `cond-stroke-${uuidv4()}`,
          resourceType: "Condition",
          clinicalStatus: {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
                code: "active",
                display: "Active",
              },
            ],
          },
          verificationStatus: {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/condition-ver-status",
                code: "confirmed",
                display: "Confirmed",
              },
            ],
          },
          category: [
            {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/condition-category",
                  code: "encounter-diagnosis",
                  display: "Encounter Diagnosis",
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: "http://snomed.info/sct",
                code: "230690007",
                display: "Cerebrovascular accident",
              },
              {
                system: "http://hl7.org/fhir/sid/icd-10",
                code: "I63.9",
                display: "Cerebral infarction, unspecified",
              },
            ],
            text: "Stroke",
          },
          subject: {
            reference: patientReference,
            type: "Patient",
          },
          recordedDate: new Date(),
          meta: {
            source: "csv-upload",
            lastUpdated: new Date(),
          },
        });
        await strokeCond.save();
        created.conditions++;
      }
    }

    fs.unlinkSync(req.file.path);
    res.json({
      success: true,
      created: created,
      message: `Created ${created.patients} patients, ${created.observations} observations, and ${created.conditions} conditions`,
    });
  } catch (err) {
    console.error(err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: err.toString() });
  }
});

module.exports = router;
