const express = require("express");
const router = express.Router();
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

const Observation = require("../models/Observation");
const RiskAssessment = require("../models/RiskAssessment");

/**
 * POST /predict/:patientId
 * Body: optional { features: { ... } } to override or supply missing features
 * Response: { patientId, probability, riskId }
 */
router.post("/:patientId", async (req, res) => {
  try {
    const patientId = req.params.patientId;

    // fetch latest observations for patient
    const obsDocs = await Observation.find({ patientId })
      .sort({ effectiveDateTime: -1 })
      .limit(200);

    // map observation docs into feature names expected by your model
    const features = {}; // build according to your model's training order
    obsDocs.forEach((o) => {
      const code = (o.code && (o.code.code || o.code.text)) || "";
      // mapping examples (adjust to your model)
      if (code === "39156-5") features.bmi = o.value;
      if (code === "2339-0") features.avg_glucose_level = o.value;
      if (
        /blood pressure|systolic/i.test(
          o.code && (o.code.display || o.code.text || "")
        )
      ) {
        // example: if you have systolic and diastolic stored with specific codes map them
      }
      // if smoking status stored as text
      if ((o.code && o.code.text) === "Smoking status")
        features.smoking_status = o.value;
    });

    // apply overrides from request body (manual entry)
    if (req.body.features && typeof req.body.features === "object") {
      Object.assign(features, req.body.features);
    }

    // call model service
    const modelUrl = process.env.MODEL_SERVICE_URL;
    if (!modelUrl)
      return res
        .status(500)
        .json({ error: "MODEL_SERVICE_URL not configured in .env" });

    const resp = await axios.post(modelUrl, { features });
    const probability = Number(resp.data.probability);
    const modelName = resp.data.model || "external-model";

    // store RiskAssessment document
    const basis = obsDocs.map((o) => o.observationId);
    const riskDoc = new RiskAssessment({
      riskId: `risk-${uuidv4()}`,
      patientId,
      probability,
      qualitative:
        probability >= 0.7 ? "high" : probability >= 0.4 ? "moderate" : "low",
      basis,
      method: modelName,
    });
    await riskDoc.save();

    res.json({ patientId, probability, riskId: riskDoc.riskId });
  } catch (err) {
    console.error(err.response ? err.response.data : err);
    res.status(500).json({ error: err.toString() });
  }
});

module.exports = router;
