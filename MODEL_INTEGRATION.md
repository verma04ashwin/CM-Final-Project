# 🏥 Stroke Risk Prediction Integration Guide

## Overview
Your FHIR prototype now uses your trained `stroke_model.h5` TensorFlow/Keras model for real stroke risk prediction!

## Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│                 │      │                  │      │                 │
│  Web Browser    │─────▶│  Node.js Server  │─────▶│  Flask Service  │
│  (EJS Views)    │      │  (Express)       │      │  (Python)       │
│                 │      │                  │      │                 │
└─────────────────┘      └──────────────────┘      └─────────────────┘
                                  │                         │
                                  │                         │
                                  ▼                         ▼
                         ┌──────────────┐          ┌──────────────┐
                         │   MongoDB    │          │stroke_model  │
                         │ (FHIR Data)  │          │    .h5       │
                         └──────────────┘          └──────────────┘
```

## Setup Instructions

### 1. Install Python Dependencies

```powershell
# Install required Python packages
pip install -r requirements.txt
```

The `requirements.txt` includes:
- Flask: Web service framework
- Flask-CORS: Cross-origin resource sharing
- TensorFlow: Deep learning model loading
- NumPy: Numerical computing

### 2. Start the Model Service

```powershell
# Start the Flask model service (runs on port 5000)
python model_service.py
```

Expected output:
```
============================================================
🏥 Stroke Risk Prediction Model Service
============================================================
✓ Model loaded successfully from stroke_model.h5
Model input shape: (None, 10)
Model output shape: (None, 1)

✓ Starting Flask server on http://localhost:5000
  - Health check: http://localhost:5000/health
  - Model info: http://localhost:5000/model/info
  - Prediction: POST http://localhost:5000/predict
============================================================
```

### 3. Start the Node.js Server

In a **separate terminal**:
```powershell
# Start the Node.js server (runs on port 3001)
npm start
# or
node server.js
```

## How It Works

### Feature Extraction
The system automatically extracts features from FHIR resources:

**From Patient Resource:**
- `age`: Calculated from birthDate
- `gender`: male/female/other
- `ever_married`: From maritalStatus
- `Residence_type`: Urban/Rural from address

**From Condition Resources:**
- `hypertension`: Detected from SNOMED 38341003 or ICD-10 I10
- `heart_disease`: Detected from SNOMED 56265001 or ICD-10 I51.9

**From Observation Resources:**
- `bmi`: LOINC code 39156-5 (Body Mass Index)
- `avg_glucose_level`: LOINC code 2339-0 (Glucose level)
- `smoking_status`: LOINC code 72166-2 (Smoking status)

### Model Input Format
The Flask service expects these features (adjust `model_service.py` if your model uses different features):

```python
[age, hypertension, heart_disease, ever_married, work_type, 
 Residence_type, avg_glucose_level, bmi, gender, smoking_status]
```

### Prediction Flow

1. **User Request**: POST to `/predict/:patientId` or via web UI
2. **Data Extraction**: Node.js fetches Patient, Condition, and Observation resources
3. **Feature Building**: Extracts relevant features from FHIR resources
4. **Model Call**: Sends features to Flask service at `http://localhost:5000/predict`
5. **Risk Calculation**: TensorFlow model returns probability (0-1)
6. **Risk Assessment**: Creates FHIR RiskAssessment resource with qualitative risk:
   - **High risk**: probability ≥ 0.7
   - **Moderate risk**: 0.4 ≤ probability < 0.7
   - **Low risk**: probability < 0.4
7. **Response**: Returns probability and saves RiskAssessment to MongoDB

## Testing the Integration

### Test 1: Check Model Service Health

```powershell
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_path": "stroke_model.h5"
}
```

### Test 2: Get Model Information

```powershell
curl http://localhost:5000/model/info
```

### Test 3: Direct Model Prediction

```powershell
curl -X POST http://localhost:5000/predict `
  -H "Content-Type: application/json" `
  -d '{
    "features": {
      "age": 67,
      "hypertension": 1,
      "heart_disease": 0,
      "ever_married": 1,
      "work_type": 0,
      "Residence_type": 1,
      "avg_glucose_level": 228.69,
      "bmi": 36.6,
      "gender": "male",
      "smoking_status": "formerly smoked"
    }
  }'
```

### Test 4: Patient Risk Prediction via Node.js

First, upload sample data:
```powershell
# Upload sample-data.csv via web UI at http://localhost:3001
```

Then predict for a patient:
```powershell
# Replace P001 with actual patient ID
curl -X POST http://localhost:3001/predict/P001 `
  -H "Content-Type: application/json"
```

### Test 5: Web UI Testing

1. Open browser: http://localhost:3001
2. Upload `sample-data.csv` using the upload form
3. Navigate to "View All Patients"
4. Click on a patient
5. Click "Predict Stroke Risk" button
6. View the risk assessment result

## Configuration

### Environment Variables (.env)

```env
PORT=3001
BASE_URL=http://localhost:3001
MONGO_URI=mongodb://localhost:27017/fhir_prototype
MODEL_SERVICE_URL=http://localhost:5000/predict
```

### Customizing Feature Extraction

If your model uses different features, update `model_service.py`:

1. Modify `FEATURE_NAMES` list
2. Update `preprocess_features()` function
3. Adjust feature encoding/normalization

### Customizing Risk Thresholds

Update in `routes/predict.js`:

```javascript
if (probability >= 0.7) {
  qualitativeCode = "high";
} else if (probability >= 0.4) {
  qualitativeCode = "moderate";
} else {
  qualitativeCode = "low";
}
```

## Troubleshooting

### Error: "Model service is not running"

**Solution**: Start the Flask service:
```powershell
python model_service.py
```

### Error: "Model file not found"

**Solution**: Ensure `stroke_model.h5` is in the project root directory.

### Error: "ECONNREFUSED"

**Cause**: Flask service not running or wrong port

**Solution**: 
1. Check Flask is running on port 5000
2. Verify `MODEL_SERVICE_URL` in `.env`

### Model Prediction Issues

**Check feature values**:
```javascript
// In routes/predict.js, features are logged:
console.log("Features extracted for prediction:", features);
```

**Check Flask logs**:
```
[2025-01-10 12:34:56] Received features: {...}
[2025-01-10 12:34:56] Preprocessed input: [[...]]
[2025-01-10 12:34:56] Prediction: 0.734
```

### Missing Features

The system uses defaults if features are missing:
- Default age: 50
- Default BMI: 25
- Default glucose: 100
- Default conditions: 0 (false)

**Best Practice**: Ensure patients have complete FHIR data before prediction.

## API Endpoints

### Model Service (Flask - Port 5000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/model/info` | GET | Model information |
| `/predict` | POST | Make prediction |

### Node.js Server (Express - Port 3001)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/predict/:patientId` | POST | Patient risk prediction |
| `/api/patients` | GET | List all patients |
| `/api/patient/:id` | GET | Get patient details |
| `/fhir/RiskAssessment` | GET | List risk assessments |
| `/fhir/RiskAssessment/:id` | GET | Get risk assessment |

## Performance Tips

1. **Caching**: Cache model predictions for unchanged patient data
2. **Batch Processing**: Process multiple patients in single model call
3. **Feature Caching**: Store extracted features in Patient resource
4. **Model Optimization**: Use TensorFlow Lite for faster inference

## Next Steps

1. ✅ Model integration complete
2. 📊 Add prediction visualization to patient view
3. 📈 Track prediction history over time
4. 🔄 Implement batch prediction for multiple patients
5. 📧 Add risk alerts/notifications
6. 📱 Create mobile-friendly prediction interface
7. 🔒 Add authentication for prediction endpoint
8. 📊 Create analytics dashboard for risk trends

## Model Retraining

When you retrain your model:

1. Replace `stroke_model.h5` with new model
2. Update `FEATURE_NAMES` if features changed
3. Update `preprocess_features()` if encoding changed
4. Restart Flask service: `python model_service.py`
5. Test with sample data

## Production Deployment

For production:

1. Use **gunicorn** instead of Flask development server:
   ```bash
   pip install gunicorn
   gunicorn -w 4 -b 0.0.0.0:5000 model_service:app
   ```

2. Add **error logging** and monitoring
3. Implement **rate limiting** for predictions
4. Add **authentication** to model service
5. Use **HTTPS** for secure communication
6. Deploy Node.js and Flask on separate servers
7. Use **load balancer** for high traffic

---

## Support

If you encounter issues:
1. Check both service logs (Node.js and Flask)
2. Verify `stroke_model.h5` exists and is valid
3. Ensure all Python dependencies installed
4. Check port availability (3001, 5000)
5. Test model service independently first
