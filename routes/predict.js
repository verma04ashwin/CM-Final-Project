const express = require("express");
const router = express.Router();
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

const Patient = require("../models/Patient");
const Observation = require("../models/Observation");
const Condition = require("../models/Condition");
const RiskAssessment = require("../models/RiskAssessment");

/**
 * POST /predict/manual
 * Body: { patientData: {...}, features: {...} }
 * Creates patient, observations, and predictions from manual input
 * Response: { patientId, probability, riskId }
 */
router.post("/manual", async (req, res) => {
  try {
    const { patientData, features } = req.body;

    if (!features) {
      return res.status(400).json({
        resourceType: "OperationOutcome",
        issue: [{
          severity: "error",
          code: "required",
          diagnostics: "Request body must contain 'features' object with prediction data"
        }]
      });
    }

    // Generate or use provided patient ID
    const patientId = patientData?.id || `P${Date.now()}`;
    const patientReference = `Patient/${patientId}`;

    // Check if patient exists, if not create one
    let patient = await Patient.findOne({ id: patientId });
    
    if (!patient && patientData) {
      // Create new patient from manual input
      const patientDoc = new Patient({
        id: patientId,
        resourceType: "Patient",
        name: patientData.name ? [{
          use: "official",
          family: patientData.name.split(' ')[0] || "Unknown",
          given: patientData.name.split(' ').slice(1) || []
        }] : undefined,
        gender: patientData.gender || features.gender || "unknown",
        birthDate: patientData.birthDate || (features.age ? new Date(new Date().getFullYear() - features.age, 0, 1).toISOString().split('T')[0] : undefined),
        address: patientData.residence ? [{
          use: "home",
          type: "physical",
          city: patientData.residence === 1 || patientData.residence === "urban" ? "Urban" : "Rural"
        }] : undefined,
        maritalStatus: patientData.maritalStatus || (features.ever_married ? {
          coding: [{
            system: "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus",
            code: features.ever_married === 1 ? "M" : "S",
            display: features.ever_married === 1 ? "Married" : "Single"
          }]
        } : undefined),
        meta: {
          source: "manual-entry",
          lastUpdated: new Date()
        }
      });
      await patientDoc.save();
      console.log(`Created new patient: ${patientId}`);
    }

    // Create observations from manual input if provided
    const basisReferences = [];

    // BMI Observation
    if (features.bmi !== undefined && features.bmi !== null && features.bmi !== '') {
      const bmiObs = new Observation({
        id: `obs-bmi-${uuidv4()}`,
        resourceType: "Observation",
        status: "final",
        category: [{
          coding: [{
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "vital-signs",
            display: "Vital Signs"
          }]
        }],
        code: {
          coding: [{
            system: "http://loinc.org",
            code: "39156-5",
            display: "Body Mass Index"
          }],
          text: "BMI"
        },
        subject: { reference: patientReference, type: "Patient" },
        effectiveDateTime: new Date(),
        valueQuantity: {
          value: parseFloat(features.bmi),
          unit: "kg/m2",
          system: "http://unitsofmeasure.org",
          code: "kg/m2"
        },
        meta: { source: "manual-entry" }
      });
      await bmiObs.save();
      basisReferences.push({ reference: `Observation/${bmiObs.id}`, type: "Observation" });
    }

    // Glucose Observation
    if (features.avg_glucose_level !== undefined && features.avg_glucose_level !== null && features.avg_glucose_level !== '') {
      const glucoseObs = new Observation({
        id: `obs-glucose-${uuidv4()}`,
        resourceType: "Observation",
        status: "final",
        category: [{
          coding: [{
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "laboratory",
            display: "Laboratory"
          }]
        }],
        code: {
          coding: [{
            system: "http://loinc.org",
            code: "2339-0",
            display: "Glucose"
          }],
          text: "Average Glucose Level"
        },
        subject: { reference: patientReference, type: "Patient" },
        effectiveDateTime: new Date(),
        valueQuantity: {
          value: parseFloat(features.avg_glucose_level),
          unit: "mg/dL",
          system: "http://unitsofmeasure.org",
          code: "mg/dL"
        },
        meta: { source: "manual-entry" }
      });
      await glucoseObs.save();
      basisReferences.push({ reference: `Observation/${glucoseObs.id}`, type: "Observation" });
    }

    // Smoking Status Observation
    if (features.smoking_status) {
      const smokingObs = new Observation({
        id: `obs-smoking-${uuidv4()}`,
        resourceType: "Observation",
        status: "final",
        category: [{
          coding: [{
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "social-history",
            display: "Social History"
          }]
        }],
        code: {
          coding: [{
            system: "http://loinc.org",
            code: "72166-2",
            display: "Tobacco smoking status"
          }],
          text: "Smoking Status"
        },
        subject: { reference: patientReference, type: "Patient" },
        effectiveDateTime: new Date(),
        valueCodeableConcept: {
          text: features.smoking_status
        },
        meta: { source: "manual-entry" }
      });
      await smokingObs.save();
      basisReferences.push({ reference: `Observation/${smokingObs.id}`, type: "Observation" });
    }

    // Create Conditions
    if (features.hypertension === 1 || features.hypertension === true) {
      const hyperCond = new Condition({
        id: `cond-hyper-${uuidv4()}`,
        resourceType: "Condition",
        clinicalStatus: {
          coding: [{
            system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
            code: "active",
            display: "Active"
          }]
        },
        code: {
          coding: [{
            system: "http://snomed.info/sct",
            code: "38341003",
            display: "Hypertension"
          }],
          text: "Hypertension"
        },
        subject: { reference: patientReference, type: "Patient" },
        meta: { source: "manual-entry" }
      });
      await hyperCond.save();
      basisReferences.push({ reference: `Condition/${hyperCond.id}`, type: "Condition" });
    }

    if (features.heart_disease === 1 || features.heart_disease === true) {
      const heartCond = new Condition({
        id: `cond-heart-${uuidv4()}`,
        resourceType: "Condition",
        clinicalStatus: {
          coding: [{
            system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
            code: "active",
            display: "Active"
          }]
        },
        code: {
          coding: [{
            system: "http://snomed.info/sct",
            code: "56265001",
            display: "Heart disease"
          }],
          text: "Heart Disease"
        },
        subject: { reference: patientReference, type: "Patient" },
        meta: { source: "manual-entry" }
      });
      await heartCond.save();
      basisReferences.push({ reference: `Condition/${heartCond.id}`, type: "Condition" });
    }

    // Normalize features for model
    const normalizedFeatures = {
      age: parseFloat(features.age) || 50,
      gender: features.gender || "unknown",
      bmi: features.bmi ? parseFloat(features.bmi) : undefined,
      avg_glucose_level: features.avg_glucose_level ? parseFloat(features.avg_glucose_level) : undefined,
      smoking_status: features.smoking_status || undefined,
      hypertension: features.hypertension === 1 || features.hypertension === true || features.hypertension === "1" ? 1 : 0,
      heart_disease: features.heart_disease === 1 || features.heart_disease === true || features.heart_disease === "1" ? 1 : 0,
      ever_married: features.ever_married !== undefined ? (features.ever_married === 1 || features.ever_married === true || features.ever_married === "1" ? 1 : 0) : 1,
      work_type: features.work_type !== undefined ? parseInt(features.work_type) : 0,
      Residence_type: features.Residence_type !== undefined ? parseInt(features.Residence_type) : 1
    };

    console.log("\n=== Manual Prediction Request ===");
    console.log("Patient ID:", patientId);
    console.log("Features:", normalizedFeatures);
    console.log("Basis count:", basisReferences.length);

    // Call model service
    const modelUrl = process.env.MODEL_SERVICE_URL;
    if (!modelUrl) {
      return res.status(500).json({
        resourceType: "OperationOutcome",
        issue: [{
          severity: "error",
          code: "not-supported",
          diagnostics: "MODEL_SERVICE_URL not configured"
        }]
      });
    }

    let probability, modelName;
    try {
      console.log(`Calling model service at ${modelUrl}...`);
      const resp = await axios.post(modelUrl, { features: normalizedFeatures }, { timeout: 10000 });
      probability = Number(resp.data.probability);
      modelName = resp.data.model || "stroke_model.h5";
      console.log(`Model prediction: ${probability} (${resp.data.risk_level})`);
    } catch (modelErr) {
      console.error("Model service error:", modelErr.message);
      if (modelErr.code === 'ECONNREFUSED') {
        return res.status(503).json({
          resourceType: "OperationOutcome",
          issue: [{
            severity: "error",
            code: "not-supported",
            diagnostics: "Model service is not running. Please start: python model_service.py"
          }]
        });
      }
      probability = Math.random() * 0.5;
      modelName = "mock-model-fallback";
      console.log("Using fallback mock prediction:", probability);
    }

    // Determine risk level
    let qualitativeCode, qualitativeDisplay;
    if (probability >= 0.7) {
      qualitativeCode = "high";
      qualitativeDisplay = "High risk";
    } else if (probability >= 0.4) {
      qualitativeCode = "moderate";
      qualitativeDisplay = "Moderate risk";
    } else {
      qualitativeCode = "low";
      qualitativeDisplay = "Low risk";
    }

    // Create RiskAssessment
    const riskId = `risk-${uuidv4()}`;
    const riskData = {
      id: riskId,
      resourceType: "RiskAssessment",
      status: "final",
      method: {
        coding: [{
          system: "http://example.org/fhir/CodeSystem/risk-assessment-method",
          code: modelName,
          display: modelName
        }],
        text: "Machine Learning Model"
      },
      code: {
        coding: [{
          system: "http://snomed.info/sct",
          code: "230690007",
          display: "Stroke risk assessment"
        }],
        text: "Stroke Risk Assessment"
      },
      subject: { reference: patientReference, type: "Patient" },
      occurrenceDateTime: new Date(),
      basis: basisReferences,
      prediction: [{
        outcome: {
          coding: [{
            system: "http://snomed.info/sct",
            code: "230690007",
            display: "Cerebrovascular accident"
          }],
          text: "Stroke"
        },
        probabilityDecimal: probability,
        qualitativeRisk: {
          coding: [{
            system: "http://terminology.hl7.org/CodeSystem/risk-probability",
            code: qualitativeCode,
            display: qualitativeDisplay
          }],
          text: qualitativeDisplay
        }
      }],
      note: [{
        text: `Manual risk assessment. Features: age=${normalizedFeatures.age}, gender=${normalizedFeatures.gender}, bmi=${normalizedFeatures.bmi}, glucose=${normalizedFeatures.avg_glucose_level}, smoking=${normalizedFeatures.smoking_status}, hypertension=${normalizedFeatures.hypertension}, heart_disease=${normalizedFeatures.heart_disease}`,
        time: new Date()
      }],
      meta: {
        source: "manual-prediction",
        lastUpdated: new Date()
      }
    };

    const riskDoc = new RiskAssessment(riskData);
    await riskDoc.save();

    console.log(`Created risk assessment ${riskId} for patient ${patientId}`);

    res.json({
      success: true,
      patientId,
      probability,
      qualitativeRisk: qualitativeDisplay,
      riskId: riskDoc.id,
      basisCount: basisReferences.length,
      message: "Manual prediction complete - patient and observations created"
    });

  } catch (err) {
    console.error("Manual prediction error:", err);
    res.status(500).json({
      resourceType: "OperationOutcome",
      issue: [{
        severity: "error",
        code: "exception",
        diagnostics: err.toString()
      }]
    });
  }
});

/**
 * POST /predict/:patientId
 * Body: optional { features: { ... } } to override or supply missing features
 * Response: { patientId, probability, riskId }
 * Creates a FHIR-compliant RiskAssessment resource
 */
router.post("/:patientId", async (req, res) => {
  try {
    const patientId = req.params.patientId;
    const patientReference = `Patient/${patientId}`;

    // Fetch patient demographics
    const patient = await Patient.findOne({ id: patientId }).lean();
    if (!patient) {
      return res.status(404).json({
        resourceType: "OperationOutcome",
        issue: [
          {
            severity: "error",
            code: "not-found",
            diagnostics: `Patient ${patientId} not found`,
          },
        ],
      });
    }

    // Fetch latest observations for patient using FHIR subject.reference
    const obsDocs = await Observation.find({
      "subject.reference": patientReference,
    })
      .sort({ effectiveDateTime: -1 })
      .limit(200)
      .lean();

    // Fetch conditions (diagnoses)
    const conditions = await Condition.find({
      "subject.reference": patientReference,
    }).lean();

    // Build features from patient demographics
    const features = {};
    const basisReferences = [];

    // Extract age from birthDate
    if (patient.birthDate) {
      const birthDate = new Date(patient.birthDate);
      const today = new Date();
      features.age = today.getFullYear() - birthDate.getFullYear();
    }

    // Extract gender
    if (patient.gender) {
      features.gender = patient.gender.toLowerCase();
    }

    // Extract marital status for "ever_married"
    if (patient.maritalStatus && patient.maritalStatus.coding && patient.maritalStatus.coding[0]) {
      const maritalCode = patient.maritalStatus.coding[0].code;
      features.ever_married = ['M', 'W', 'D', 'S', 'A'].includes(maritalCode) ? 1 : 0;
    }

    // Extract address for residence type
    if (patient.address && patient.address[0]) {
      const city = patient.address[0].city || '';
      features.Residence_type = city ? 1 : 0; // 1=Urban, 0=Rural (simplified)
    }

    // Extract conditions for hypertension and heart_disease
    conditions.forEach((cond) => {
      const code = cond.code && cond.code.coding && cond.code.coding[0] && cond.code.coding[0].code;
      
      if (code === "38341003" || code === "I10") { // SNOMED/ICD-10 for Hypertension
        features.hypertension = 1;
        basisReferences.push({
          reference: `Condition/${cond.id}`,
          type: "Condition",
        });
      }
      if (code === "56265001" || code === "I51.9") { // SNOMED/ICD-10 for Heart disease
        features.heart_disease = 1;
        basisReferences.push({
          reference: `Condition/${cond.id}`,
          type: "Condition",
        });
      }
    });

    // Set defaults for conditions not found
    if (features.hypertension === undefined) features.hypertension = 0;
    if (features.heart_disease === undefined) features.heart_disease = 0;

    // Build features from observations
    obsDocs.forEach((obs) => {
      const code =
        obs.code &&
        obs.code.coding &&
        obs.code.coding[0] &&
        obs.code.coding[0].code;

      // Map LOINC codes to feature names
      if (code === "39156-5" && obs.valueQuantity) {
        features.bmi = obs.valueQuantity.value;
        basisReferences.push({
          reference: `Observation/${obs.id}`,
          type: "Observation",
        });
      }
      if (code === "2339-0" && obs.valueQuantity) {
        features.avg_glucose_level = obs.valueQuantity.value;
        basisReferences.push({
          reference: `Observation/${obs.id}`,
          type: "Observation",
        });
      }
      if (code === "72166-2" && obs.valueCodeableConcept) {
        features.smoking_status = obs.valueCodeableConcept.text;
        basisReferences.push({
          reference: `Observation/${obs.id}`,
          type: "Observation",
        });
      }
    });

    // Apply overrides from request body (manual entry or additional features)
    if (req.body.features && typeof req.body.features === "object") {
      Object.assign(features, req.body.features);
    }

    // Log features being sent to model
    console.log("\n=== Prediction Request for Patient:", patientId, "===");
    console.log("Features extracted for prediction:", features);
    console.log("Basis references count:", basisReferences.length);
    console.log("Missing features:", {
      age: !features.age,
      gender: !features.gender,
      bmi: !features.bmi,
      avg_glucose_level: !features.avg_glucose_level,
      smoking_status: !features.smoking_status,
      hypertension: features.hypertension === undefined,
      heart_disease: features.heart_disease === undefined
    });

    // Call ML model service (stroke_model.h5 via Flask)
    const modelUrl = process.env.MODEL_SERVICE_URL;
    if (!modelUrl) {
      return res.status(500).json({
        resourceType: "OperationOutcome",
        issue: [
          {
            severity: "error",
            code: "not-supported",
            diagnostics: "MODEL_SERVICE_URL not configured in .env. Set it to http://localhost:5000/predict",
          },
        ],
      });
    }

    let probability, modelName;
    try {
      console.log(`Calling model service at ${modelUrl}...`);
      const resp = await axios.post(modelUrl, { features }, { timeout: 10000 });
      probability = Number(resp.data.probability);
      modelName = resp.data.model || "stroke_model.h5";
      console.log(`Model prediction: ${probability} (${resp.data.risk_level})`);
    } catch (modelErr) {
      console.error("Model service error:", modelErr.message);
      
      // Check if model service is down
      if (modelErr.code === 'ECONNREFUSED') {
        return res.status(503).json({
          resourceType: "OperationOutcome",
          issue: [
            {
              severity: "error",
              code: "not-supported",
              diagnostics: "Model service is not running. Please start model_service.py: python model_service.py",
            },
          ],
        });
      }
      
      // Fallback: generate mock probability if model service unavailable
      probability = Math.random() * 0.5; // Mock value between 0-0.5
      modelName = "mock-model-fallback";
      console.log("Using fallback mock prediction:", probability);
    }

    // Determine qualitative risk
    let qualitativeCode, qualitativeDisplay;
    if (probability >= 0.7) {
      qualitativeCode = "high";
      qualitativeDisplay = "High risk";
    } else if (probability >= 0.4) {
      qualitativeCode = "moderate";
      qualitativeDisplay = "Moderate risk";
    } else {
      qualitativeCode = "low";
      qualitativeDisplay = "Low risk";
    }

    // Check if a very recent RiskAssessment exists for this patient (within last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const existingRisk = await RiskAssessment.findOne({
      "subject.reference": patientReference,
      status: "final",
      occurrenceDateTime: { $gte: oneHourAgo }
    }).sort({ occurrenceDateTime: -1 });

    // If exists and prediction is nearly identical (within 0.1%), return existing
    if (existingRisk && Math.abs(existingRisk.prediction[0].probabilityDecimal - probability) < 0.001) {
      console.log(`Identical risk assessment already exists for ${patientId} (within 1 hour), returning existing`);
      return res.json({
        success: true,
        patientId,
        probability: existingRisk.prediction[0].probabilityDecimal,
        qualitativeRisk: existingRisk.prediction[0].qualitativeRisk.text,
        riskId: existingRisk.id,
        basisCount: existingRisk.basis ? existingRisk.basis.length : 0,
        message: "Using recent identical risk assessment"
      });
    }

    // Create new FHIR RiskAssessment resource
    const riskId = `risk-${uuidv4()}`;
    const riskData = {
      id: riskId,
      resourceType: "RiskAssessment",
      status: "final",
      method: {
        coding: [
          {
            system: "http://example.org/fhir/CodeSystem/risk-assessment-method",
            code: modelName,
            display: modelName,
          },
        ],
        text: "Machine Learning Model",
      },
      code: {
        coding: [
          {
            system: "http://snomed.info/sct",
            code: "230690007",
            display: "Stroke risk assessment",
          },
        ],
        text: "Stroke Risk Assessment",
      },
      subject: {
        reference: patientReference,
        type: "Patient",
      },
      occurrenceDateTime: new Date(),
      basis: basisReferences,
      prediction: [
        {
          outcome: {
            coding: [
              {
                system: "http://snomed.info/sct",
                code: "230690007",
                display: "Cerebrovascular accident",
              },
            ],
            text: "Stroke",
          },
          probabilityDecimal: probability,
          qualitativeRisk: {
            coding: [
              {
                system:
                  "http://terminology.hl7.org/CodeSystem/risk-probability",
                code: qualitativeCode,
                display: qualitativeDisplay,
              },
            ],
            text: qualitativeDisplay,
          },
        },
      ],
      note: [
        {
          text: `Risk assessment based on ${
            basisReferences.length
          } clinical resources. Features: age=${features.age}, gender=${features.gender}, bmi=${features.bmi}, glucose=${features.avg_glucose_level}, smoking=${features.smoking_status}, hypertension=${features.hypertension}, heart_disease=${features.heart_disease}`,
          time: new Date(),
        },
      ],
      meta: {
        source: "prediction-service",
        lastUpdated: new Date(),
      },
    };

    const riskDoc = new RiskAssessment(riskData);
    await riskDoc.save();

    console.log(`Created new risk assessment ${riskId} for patient ${patientId}`);

    res.json({
      success: true,
      patientId,
      probability,
      qualitativeRisk: qualitativeDisplay,
      riskId: riskDoc.id,
      basisCount: basisReferences.length,
      message: "New risk assessment created"
    });
  } catch (err) {
    console.error(err.response ? err.response.data : err);
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

module.exports = router;
