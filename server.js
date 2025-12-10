require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");

const uploadRouter = require("./routes/upload"); // create this file (see earlier upload route)
const predictRouter = require("./routes/predict"); // create this file (see earlier predict route)

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// connect to MongoDB
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

app.get("/", (req, res) => res.render("index")); // create views/index.ejs

app.use("/upload", uploadRouter);
app.use("/predict", predictRouter);

// optional: simple FHIR proxy for GETs
app.get("/fhir/:resource", async (req, res) => {
  const axios = require("axios");
  const url = `${process.env.FHIR_SERVER_URL}/${req.params.resource}`;
  try {
    const resp = await axios.get(url, { params: req.query });
    res.type("application/fhir+json").status(resp.status).send(resp.data);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server started on http://localhost:${PORT}`)
);
