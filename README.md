# FHIR R4 Prototype Server

A fully functional FHIR R4-compliant healthcare data server built with Node.js, Express, MongoDB, and Mongoose. This system manages patient records, clinical observations, conditions, and risk assessments with machine learning integration for stroke risk prediction.

## 🌟 Features

### FHIR R4 Compliance
- ✅ **Patient Resource**: Complete FHIR R4 Patient implementation with demographics, contacts, identifiers
- ✅ **Observation Resource**: Vital signs, laboratory results, social history observations
- ✅ **Condition Resource**: Problem list items, diagnoses (hypertension, heart disease, stroke)
- ✅ **RiskAssessment Resource**: ML-powered stroke risk predictions with probability scores
- ✅ **Bundle Resource**: Search results wrapped in FHIR Bundle format
- ✅ **CapabilityStatement**: Server metadata at `/fhir/metadata`

### RESTful FHIR API
- Full CRUD operations: `GET`, `POST`, `PUT`, `DELETE`
- Search parameters for all resources
- FHIR-compliant error handling with OperationOutcome
- Proper FHIR media types (`application/fhir+json`)

### Web Interface
- 📤 CSV bulk upload for patient data import
- 👥 Patient list with search/filter capabilities
- 📋 Detailed patient views with observations, conditions, and risk assessments
- 🔮 Manual risk prediction interface
- 📊 Beautiful, responsive UI with modern design

### Machine Learning Integration
- 🤖 **Real TensorFlow/Keras Model**: Uses your trained `stroke_model.h5` for predictions
- 🔬 **Flask Model Service**: Python service for model inference
- 📊 **Automatic Feature Extraction**: Extracts features from FHIR resources (demographics, conditions, observations)
- 🎯 **Risk Stratification**: Low (< 40%), Moderate (40-70%), High (≥ 70%)
- 📈 **Real-time Predictions**: API endpoint for patient risk assessment

## 📋 Prerequisites

- **Node.js** v14 or higher
- **MongoDB** v4.0 or higher
- **Python** 3.8 or higher (for model service)
- **npm** or **yarn**
- **TensorFlow** 2.15.0 (for stroke_model.h5)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CM-Final-Project
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Install Python dependencies** (for model service)
   ```powershell
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   
   Edit `.env` file:
   ```env
   PORT=3001
   BASE_URL=http://localhost:3001
   MONGO_URI=mongodb://localhost:27017/fhir_prototype
   MODEL_SERVICE_URL=http://localhost:5000/predict
   FHIR_SERVER_URL=http://localhost:8080/hapi-fhir-jpaserver/fhir
   ```

5. **Start MongoDB**
   ```bash
   # Windows (if installed as service)
   net start MongoDB
   
   # Mac/Linux
   sudo systemctl start mongod
   # or
   mongod --dbpath /path/to/data/db
   ```

6. **Start the model service** (Python Flask)
   ```powershell
   python model_service.py
   ```
   Leave this terminal running. The service runs on port 5000.

7. **Start the Node.js server** (in a new terminal)
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

8. **Or use the automated startup script** (Windows)
   ```powershell
   .\start-services.ps1
   ```
   This starts both Flask and Node.js services automatically!

9. **Access the application**
   - Web UI: http://localhost:3001
   - FHIR API: http://localhost:3001/fhir
   - Metadata: http://localhost:3001/fhir/metadata
   - Health Check: http://localhost:3001/health
   - Model Service: http://localhost:5000/health

## 📖 API Documentation

### FHIR Endpoints

#### Patient Resource

**Search Patients**
```http
GET /fhir/Patient
GET /fhir/Patient?gender=female
GET /fhir/Patient?birthdate=1990-01-01
GET /fhir/Patient?name=John
GET /fhir/Patient?identifier=12345
```

**Read Patient**
```http
GET /fhir/Patient/{id}
```

**Create Patient**
```http
POST /fhir/Patient
Content-Type: application/fhir+json

{
  "resourceType": "Patient",
  "identifier": [{
    "system": "http://hospital.example.org/patients",
    "value": "12345"
  }],
  "name": [{
    "use": "official",
    "family": "Doe",
    "given": ["John"]
  }],
  "gender": "male",
  "birthDate": "1990-01-01"
}
```

**Update Patient**
```http
PUT /fhir/Patient/{id}
Content-Type: application/fhir+json

{
  "resourceType": "Patient",
  "id": "{id}",
  ...
}
```

**Delete Patient**
```http
DELETE /fhir/Patient/{id}
```

#### Observation Resource

**Search Observations**
```http
GET /fhir/Observation
GET /fhir/Observation?patient={patientId}
GET /fhir/Observation?code=39156-5
GET /fhir/Observation?category=vital-signs
GET /fhir/Observation?_sort=date
```

**Create Observation**
```http
POST /fhir/Observation
Content-Type: application/fhir+json

{
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
    "reference": "Patient/12345"
  },
  "valueQuantity": {
    "value": 25.5,
    "unit": "kg/m2",
    "system": "http://unitsofmeasure.org",
    "code": "kg/m2"
  },
  "effectiveDateTime": "2025-12-10T10:00:00Z"
}
```

#### Condition Resource

**Search Conditions**
```http
GET /fhir/Condition?patient={patientId}
GET /fhir/Condition?code=38341003
GET /fhir/Condition?clinical-status=active
```

**Create Condition**
```http
POST /fhir/Condition
Content-Type: application/fhir+json

{
  "resourceType": "Condition",
  "clinicalStatus": {
    "coding": [{
      "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
      "code": "active"
    }]
  },
  "code": {
    "coding": [{
      "system": "http://snomed.info/sct",
      "code": "38341003",
      "display": "Hypertensive disorder"
    }]
  },
  "subject": {
    "reference": "Patient/12345"
  }
}
```

#### RiskAssessment Resource

**Search Risk Assessments**
```http
GET /fhir/RiskAssessment?patient={patientId}
GET /fhir/RiskAssessment?status=final
```

**Predict Stroke Risk**
```http
POST /predict/{patientId}
Content-Type: application/json

# Optional: override features extracted from FHIR data
{
  "features": {
    "age": 65,
    "bmi": 28.5,
    "avg_glucose_level": 120
  }
}
```

Response:
```json
{
  "success": true,
  "patientId": "P001",
  "probability": 0.734,
  "qualitativeRisk": "High risk",
  "riskId": "risk-abc123",
  "basisCount": 8
}
```

### Legacy UI API Endpoints

```http
GET /api/patients           # List all patients (simplified)
GET /api/patient/{id}       # Get patient details with observations/conditions/risks
```

## 🤖 Machine Learning Model Integration

### Architecture
The system uses a **microservices architecture** for ML predictions:
- **Node.js Server** (Port 3001): Handles web requests, FHIR API, data management
- **Flask Model Service** (Port 5000): Loads `stroke_model.h5` and serves predictions

### Model Features
The `stroke_model.h5` uses these features (automatically extracted from FHIR data):

| Feature | Source | FHIR Resource |
|---------|--------|---------------|
| `age` | Calculated from birthDate | Patient |
| `gender` | Patient gender | Patient |
| `hypertension` | SNOMED: 38341003, ICD-10: I10 | Condition |
| `heart_disease` | SNOMED: 56265001, ICD-10: I51.9 | Condition |
| `ever_married` | Marital status | Patient |
| `work_type` | Custom extension | Patient |
| `Residence_type` | Address (urban/rural) | Patient |
| `avg_glucose_level` | LOINC: 2339-0 | Observation |
| `bmi` | LOINC: 39156-5 | Observation |
| `smoking_status` | LOINC: 72166-2 | Observation |

### Quick Start for Predictions

**Option 1: Automated Startup (Recommended)**
```powershell
.\start-services.ps1
```

**Option 2: Manual Startup**
```powershell
# Terminal 1: Start model service
python model_service.py

# Terminal 2: Start Node.js server
node server.js
```

**Test the Model Service**
```powershell
# Health check
curl http://localhost:5000/health

# Model info
curl http://localhost:5000/model/info

# Direct prediction
curl -X POST http://localhost:5000/predict -H "Content-Type: application/json" -d '{
  "features": {
    "age": 67,
    "hypertension": 1,
    "heart_disease": 1,
    "ever_married": 1,
    "work_type": 0,
    "Residence_type": 1,
    "avg_glucose_level": 228.69,
    "bmi": 36.6,
    "gender": "male",
    "smoking_status": "smokes"
  }
}'
```

**Run Automated Tests**
```powershell
# Test model service
pip install requests
python test_model.py

# Test full system
npm test
```

### Prediction Workflow
1. User uploads CSV or enters patient data
2. System creates FHIR Patient, Observation, Condition resources
3. User clicks "Predict Stroke Risk"
4. Node.js extracts features from FHIR resources
5. Sends features to Flask model service
6. TensorFlow model predicts stroke probability
7. Creates FHIR RiskAssessment resource
8. Displays result with risk level (Low/Moderate/High)

### Customization
See `MODEL_INTEGRATION.md` for:
- Adjusting feature extraction
- Modifying risk thresholds
- Updating the model
- Production deployment

### Legacy UI API Endpoints

```http
GET /api/patients           # List all patients (simplified)
GET /api/patient/{id}       # Get patient details with observations/conditions/risks
```

## 📁 Project Structure

```
CM-Final-Project/
├── models/
│   ├── Patient.js           # FHIR R4 Patient schema
│   ├── Observation.js       # FHIR R4 Observation schema
│   ├── Condition.js         # FHIR R4 Condition schema
│   └── RiskAssessment.js    # FHIR R4 RiskAssessment schema
├── routes/
│   ├── fhirApi.js           # Main FHIR RESTful API endpoints
│   ├── upload.js            # CSV bulk upload handler
│   ├── predict.js           # ML prediction service integration
│   └── fhirProxy.js         # Proxy to external FHIR server
├── views/
│   ├── index.ejs            # Home page with upload/predict forms
│   ├── patients.ejs         # Patient list view
│   └── patient.ejs          # Patient detail view
├── public/
│   └── style.css            # Modern responsive styles
├── utils/
│   └── fhirValidation.js    # FHIR validation helpers
├── model_service.py         # Flask service for stroke_model.h5
├── stroke_model.h5          # Trained TensorFlow/Keras model
├── test_model.py            # Model service test suite
├── start-services.ps1       # Automated startup script
├── stop-services.ps1        # Service shutdown script
├── server.js                # Main Express application
├── package.json             # Node.js dependencies and scripts
├── requirements.txt         # Python dependencies
├── .env                     # Environment configuration
├── README.md                # This file
├── MODEL_INTEGRATION.md     # Detailed ML integration guide
└── PREDICTION_QUICKSTART.md # Quick start for predictions
```

## 🧪 Testing

### Test CSV Upload

Create a test CSV file (`test-data.csv`):

```csv
id,gender,age,hypertension,heart_disease,ever_married,work_type,Residence_type,avg_glucose_level,bmi,smoking_status,stroke
P001,Male,67,1,1,Yes,Private,Urban,228.69,36.6,formerly smoked,1
P002,Female,58,0,0,Yes,Private,Rural,87.96,21.49,never smoked,0
P003,Male,45,1,0,Yes,Self-employed,Urban,105.92,27.3,smokes,0
```

Upload via web UI at http://localhost:3001

### Test FHIR API

```bash
# Get capability statement
curl http://localhost:3001/fhir/metadata

# Search patients
curl http://localhost:3001/fhir/Patient

# Get specific patient
curl http://localhost:3001/fhir/Patient/P001

# Create patient
curl -X POST http://localhost:3001/fhir/Patient \
  -H "Content-Type: application/fhir+json" \
  -d '{"resourceType":"Patient","gender":"male","birthDate":"1990-01-01"}'

# Search observations for patient
curl http://localhost:3001/fhir/Observation?patient=P001

# Predict risk
curl -X POST http://localhost:3001/predict/P001 \
  -H "Content-Type: application/json" \
  -d '{"features":{"age":65}}'
```

## 🔧 Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
mongosh
# or
mongo

# Check connection string in .env
MONGO_URI=mongodb://localhost:27017/fhir_prototype
```

### Port Already in Use
```powershell
# Windows PowerShell
Get-NetTCPConnection -LocalPort 3001 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
```

```bash
# Mac/Linux
lsof -ti:3001 | xargs kill -9
```

### Model Service Unavailable
The system will automatically use mock predictions if the ML service at `MODEL_SERVICE_URL` is unavailable. This is expected behavior for development.

## 🎯 FHIR Compliance Checklist

- ✅ RESTful API with proper HTTP methods
- ✅ FHIR JSON format for all resources
- ✅ Search parameters on resources
- ✅ Bundle resource for search results
- ✅ OperationOutcome for error responses
- ✅ Proper FHIR media types (`application/fhir+json`)
- ✅ Resource metadata (meta.lastUpdated, meta.source)
- ✅ Reference integrity between resources
- ✅ Standard code systems (LOINC, SNOMED CT, ICD-10)
- ✅ CapabilityStatement endpoint
- ✅ Resource identifiers and versioning

## 🚀 Next Steps

### Planned Enhancements
- [ ] Authentication & Authorization (OAuth2/SMART on FHIR)
- [ ] Practitioner and Organization resources
- [ ] Encounter resource for clinical visits
- [ ] Medication and MedicationRequest resources
- [ ] Search with _include and _revinclude parameters
- [ ] FHIR subscriptions for real-time updates
- [ ] Bulk data export ($export operation)
- [ ] Clinical Decision Support hooks
- [ ] Integration with actual ML model service
- [ ] Docker containerization
- [ ] Unit and integration tests

## 📚 References

- [FHIR R4 Specification](https://hl7.org/fhir/R4/)
- [FHIR RESTful API](https://hl7.org/fhir/R4/http.html)
- [LOINC Codes](https://loinc.org/)
- [SNOMED CT](https://www.snomed.org/)

## 📝 License

MIT License - feel free to use this project for learning and development.

## 👥 Contributors

Developed as a prototype FHIR-compliant healthcare data management system.

---

**Status**: ✅ Fully Functional FHIR R4 Server

**Version**: 1.0.0

**Last Updated**: December 10, 2025
