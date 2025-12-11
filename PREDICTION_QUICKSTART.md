# Quick Start: Stroke Risk Prediction

## 🚀 Quick Setup (5 Minutes)

### Step 1: Install Python Dependencies
```powershell
pip install -r requirements.txt
```

### Step 2: Start Model Service
```powershell
python model_service.py
```
Leave this terminal running. You should see:
```
✓ Model loaded successfully from stroke_model.h5
✓ Starting Flask server on http://localhost:5000
```

### Step 3: Start Node.js Server
Open a **new terminal**:
```powershell
node server.js
```
You should see:
```
✓ Connected to MongoDB
✓ Server listening on port 3001
```

### Step 4: Test the System
Open browser: **http://localhost:3001**

## 🧪 Quick Tests

### Test 1: Model Service Health
```powershell
curl http://localhost:5000/health
```

### Test 2: Upload Sample Data
1. Go to http://localhost:3001
2. Upload `sample-data.csv`
3. Wait for success message

### Test 3: Predict Risk
1. Click "View All Patients"
2. Click on any patient (e.g., John Smith)
3. Click "Predict Stroke Risk"
4. View the risk assessment

### Test 4: Automated Tests
```powershell
# Test model service
pip install requests
python test_model.py

# Test full system
npm test
```

## 📊 Expected Results

**High Risk Patient** (Age 67, Hypertension, High BMI):
- Probability: 0.65-0.85
- Risk Level: HIGH

**Low Risk Patient** (Age 30, No conditions, Normal BMI):
- Probability: 0.05-0.20
- Risk Level: LOW

## ⚠️ Troubleshooting

**"Model service is not running"**
→ Start Flask: `python model_service.py`

**"Model file not found"**
→ Ensure `stroke_model.h5` is in project root

**"Port already in use"**
→ Kill process:
```powershell
# For port 5000 (Flask)
$pid = (Get-NetTCPConnection -LocalPort 5000).OwningProcess
Stop-Process -Id $pid -Force

# For port 3001 (Node.js)
$pid = (Get-NetTCPConnection -LocalPort 3001).OwningProcess
Stop-Process -Id $pid -Force
```

## 📚 Full Documentation
See `MODEL_INTEGRATION.md` for complete details.
