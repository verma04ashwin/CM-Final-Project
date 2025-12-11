# Quick Start Guide - FHIR R4 Prototype

## 🚀 Get Started in 5 Minutes

### 1. Start the Server

```bash
# Make sure MongoDB is running first
# Then start the server
npm run dev
```

You should see:
```
╔═══════════════════════════════════════════════════╗
║   FHIR R4 Prototype Server                        ║
║   Server: http://localhost:3001                   ║
║   FHIR API: http://localhost:3001/fhir            ║
║   Metadata: http://localhost:3001/fhir/metadata  ║
╚═══════════════════════════════════════════════════╝
  
✓ MongoDB connected
```

### 2. Access the Web Interface

Open your browser and navigate to: **http://localhost:3001**

### 3. Upload Sample Data

1. Click "Choose File" under "Upload CSV (Bulk Import)"
2. Select `sample-data.csv` from the project root
3. Click "Upload CSV"
4. You should see: "✓ Success! Created 5 patients, 15 observations, and X conditions"

### 4. View Patients

1. Click "👥 View All Patients" link
2. You'll see a table with all uploaded patients
3. Click on any patient ID to view detailed information

### 5. Run Risk Prediction

**Option A: From Patient Detail Page**
1. Go to any patient detail page
2. Click "🔮 Run Risk Assessment" button
3. View the prediction results

**Option B: From Home Page**
1. Go to home page
2. Enter a patient ID (e.g., "P001")
3. Optionally add feature overrides
4. Click "🔍 Predict Risk"

### 6. Explore FHIR API

#### Get Capability Statement
```bash
curl http://localhost:3001/fhir/metadata
```

#### Search All Patients
```bash
curl http://localhost:3001/fhir/Patient
```

#### Get Specific Patient
```bash
curl http://localhost:3001/fhir/Patient/P001
```

#### Search Observations for Patient
```bash
curl "http://localhost:3001/fhir/Observation?patient=P001"
```

#### Create New Patient
```bash
curl -X POST http://localhost:3001/fhir/Patient \
  -H "Content-Type: application/fhir+json" \
  -d '{
    "resourceType": "Patient",
    "gender": "female",
    "birthDate": "1985-03-15",
    "name": [{
      "use": "official",
      "family": "Smith",
      "given": ["Jane"]
    }]
  }'
```

#### Create New Observation
```bash
curl -X POST http://localhost:3001/fhir/Observation \
  -H "Content-Type: application/fhir+json" \
  -d '{
    "resourceType": "Observation",
    "status": "final",
    "code": {
      "coding": [{
        "system": "http://loinc.org",
        "code": "39156-5",
        "display": "Body mass index (BMI)"
      }]
    },
    "subject": {
      "reference": "Patient/P001"
    },
    "valueQuantity": {
      "value": 28.5,
      "unit": "kg/m2",
      "system": "http://unitsofmeasure.org",
      "code": "kg/m2"
    }
  }'
```

## 📊 Sample Workflows

### Workflow 1: Complete Patient Management

1. **Create Patient** → POST to `/fhir/Patient`
2. **Add Observations** → POST to `/fhir/Observation`
3. **Record Conditions** → POST to `/fhir/Condition`
4. **Assess Risk** → POST to `/predict/{patientId}`
5. **View Results** → GET `/api/patient/{id}`

### Workflow 2: Bulk Data Import

1. **Prepare CSV** → Format with required columns
2. **Upload CSV** → POST to `/upload` with multipart/form-data
3. **Verify Import** → GET `/fhir/Patient` to see new patients
4. **Check Data** → GET `/fhir/Observation?patient={id}`

### Workflow 3: Search and Filter

1. **Search Patients** → `/fhir/Patient?gender=female`
2. **Filter by Date** → `/fhir/Observation?date=ge2025-01-01`
3. **Category Search** → `/fhir/Observation?category=vital-signs`
4. **Status Filter** → `/fhir/Condition?clinical-status=active`

## 🎯 Key Features to Try

### ✅ Patient Management
- Create, read, update, delete patients
- Store demographics, contacts, identifiers
- Track marital status and extensions

### ✅ Clinical Observations
- Record vital signs (BMI, blood pressure)
- Laboratory results (glucose levels)
- Social history (smoking status)

### ✅ Condition Tracking
- Document diagnoses (hypertension, heart disease)
- Track clinical status (active, resolved)
- Record verification status

### ✅ Risk Assessment
- ML-powered stroke risk prediction
- Probability scores with qualitative levels
- Basis tracking to source observations

### ✅ FHIR Compliance
- RESTful API with standard operations
- Bundle resources for search results
- OperationOutcome for errors
- Proper FHIR media types

## 🔍 Testing Tips

### Check Server Health
```bash
curl http://localhost:3001/health
```

### Validate FHIR Resources
Use the web UI - it provides validation feedback

### Monitor MongoDB
```bash
mongosh
use fhir_prototype
db.patients.countDocuments()
db.observations.countDocuments()
```

### Debug Issues
Check server console output for errors and warnings

## 📝 Common Issues

**Port already in use?**
```powershell
# Kill process on port 3001
Get-NetTCPConnection -LocalPort 3001 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
```

**MongoDB not connected?**
- Ensure MongoDB service is running
- Check `MONGO_URI` in `.env` file

**ML predictions failing?**
- Server will use mock predictions if ML service unavailable
- This is expected behavior for development

## 🎓 Learn More

- Read `README.md` for comprehensive documentation
- Check `/fhir/metadata` for API capabilities
- Explore FHIR R4 spec at https://hl7.org/fhir/R4/

---

**Happy FHIR Development! 🏥**
