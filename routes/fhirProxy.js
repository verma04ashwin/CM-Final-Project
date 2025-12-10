const express = require("express");
const router = express.Router();
const axios = require("axios");

const FHIR_BASE = process.env.FHIR_SERVER_URL;

router.get("/:resource", async (req, res) => {
  try {
    const url = `${FHIR_BASE}/${req.params.resource}`;
    const resp = await axios.get(url, { params: req.query });
    res.type("application/fhir+json").status(resp.status).send(resp.data);
  } catch (err) {
    console.error(err.message || err);
    res.status(500).json({ error: err.toString() });
  }
});

router.get("/:resource/:id", async (req, res) => {
  try {
    const url = `${FHIR_BASE}/${req.params.resource}/${req.params.id}`;
    const resp = await axios.get(url);
    res.type("application/fhir+json").status(resp.status).send(resp.data);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

module.exports = router;
