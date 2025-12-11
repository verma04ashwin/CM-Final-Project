"""
Flask service to load and serve predictions from stroke_model.h5
Run this service: python model_service.py
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import tensorflow as tf
from tensorflow import keras
import os

app = Flask(__name__)
CORS(app)

# Load the trained model
MODEL_PATH = 'stroke_model.h5'
model = None

def load_model():
    global model
    if os.path.exists(MODEL_PATH):
        try:
            model = keras.models.load_model(MODEL_PATH)
            print(f"✓ Model loaded successfully from {MODEL_PATH}")
            print(f"Model input shape: {model.input_shape}")
            print(f"Model output shape: {model.output_shape}")
            return True
        except Exception as e:
            print(f"✗ Error loading model: {e}")
            return False
    else:
        print(f"✗ Model file not found at {MODEL_PATH}")
        return False

# Feature names expected by the model (adjust based on your training)
# Your model expects 22 features based on the input shape
FEATURE_NAMES = [
    'age',
    'hypertension',
    'heart_disease',
    'ever_married',
    'work_type',
    'Residence_type',
    'avg_glucose_level',
    'bmi',
    'gender',
    'smoking_status',
    # Additional features to match your model (adjust these based on your actual training data)
    'feature_11', 'feature_12', 'feature_13', 'feature_14', 'feature_15',
    'feature_16', 'feature_17', 'feature_18', 'feature_19', 'feature_20',
    'feature_21', 'feature_22'
]

def preprocess_features(features):
    """
    Convert FHIR features to model input format
    Adjust this based on how you trained your model
    Your model expects 22 features - we'll pad with defaults for missing ones
    """
    # Initialize feature vector with 22 zeros
    feature_vector = [0.0] * 22
    
    # Age (index 0)
    feature_vector[0] = float(features.get('age', 50))
    
    # Hypertension (index 1) - binary: 0 or 1
    hypertension = features.get('hypertension', 0)
    feature_vector[1] = float(1 if hypertension else 0)
    
    # Heart disease (index 2) - binary: 0 or 1
    heart_disease = features.get('heart_disease', 0)
    feature_vector[2] = float(1 if heart_disease else 0)
    
    # Ever married (index 3) - binary: 1=Yes, 0=No
    ever_married = features.get('ever_married', 1)
    if isinstance(ever_married, str):
        ever_married = 1 if ever_married.lower() in ['yes', 'married'] else 0
    feature_vector[3] = float(ever_married)
    
    # Work type (index 4) - encoded: 0=Private, 1=Self-employed, 2=Govt_job, 3=children, 4=Never_worked
    work_type = features.get('work_type', 0)
    if isinstance(work_type, str):
        work_type_map = {
            'private': 0,
            'self-employed': 1,
            'govt_job': 2,
            'children': 3,
            'never_worked': 4
        }
        work_type = work_type_map.get(work_type.lower(), 0)
    feature_vector[4] = float(work_type)
    
    # Residence type (index 5) - binary: 1=Urban, 0=Rural
    residence = features.get('Residence_type', 1)
    if isinstance(residence, str):
        residence = 1 if residence.lower() == 'urban' else 0
    feature_vector[5] = float(residence)
    
    # Average glucose level (index 6)
    feature_vector[6] = float(features.get('avg_glucose_level', 100))
    
    # BMI (index 7)
    feature_vector[7] = float(features.get('bmi', 25))
    
    # Gender (index 8) - binary: 1=Male, 0=Female, 2=Other
    gender = features.get('gender', 0)
    if isinstance(gender, str):
        gender_map = {'male': 1, 'female': 0, 'other': 2}
        gender = gender_map.get(gender.lower(), 0)
    feature_vector[8] = float(gender)
    
    # Smoking status (index 9) - encoded: 0=never, 1=formerly, 2=smokes, 3=Unknown
    smoking = features.get('smoking_status', 0)
    if isinstance(smoking, str):
        smoking_map = {
            'never smoked': 0,
            'never': 0,
            'formerly smoked': 1,
            'formerly': 1,
            'smokes': 2,
            'regularly smoked': 2,
            'current': 2,
            'unknown': 3
        }
        smoking = smoking_map.get(smoking.lower(), 3)
    feature_vector[9] = float(smoking)
    
    # Indices 10-21: Additional features (set to defaults or extract if provided)
    # You should adjust these based on what your model was actually trained on
    # Common additional features might include:
    # - blood pressure values
    # - cholesterol levels
    # - other vitals
    # - encoded categorical variables
    
    # For now, using sensible defaults
    for i in range(10, 22):
        feature_vector[i] = 0.0
    
    print(f"Preprocessed feature vector length: {len(feature_vector)}")
    return np.array([feature_vector], dtype=np.float32)

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'model_path': MODEL_PATH
    })

@app.route('/predict', methods=['POST'])
def predict():
    """
    Prediction endpoint
    Expected JSON body:
    {
        "features": {
            "age": 45,
            "hypertension": true,
            "heart_disease": false,
            "ever_married": "Yes",
            "work_type": "Private",
            "Residence_type": "Urban",
            "avg_glucose_level": 120.5,
            "bmi": 28.5,
            "gender": "Male",
            "smoking_status": "formerly smoked"
        }
    }
    """
    if model is None:
        return jsonify({
            'error': 'Model not loaded',
            'message': 'stroke_model.h5 could not be loaded'
        }), 500
    
    try:
        data = request.get_json()
        if not data or 'features' not in data:
            return jsonify({
                'error': 'Invalid request',
                'message': 'Request body must contain "features" object'
            }), 400
        
        features = data['features']
        
        # Preprocess features
        input_data = preprocess_features(features)
        
        print(f"Input shape: {input_data.shape}")
        print(f"Input data: {input_data}")
        
        # Make prediction
        prediction = model.predict(input_data, verbose=0)
        print(f"Raw prediction output shape: {prediction.shape}")
        print(f"Raw prediction values: {prediction}")
        
        # Handle different output shapes
        if prediction.shape[1] == 5:
            # Multi-class classification (5 classes)
            # Get the predicted class and its probability
            predicted_class = int(np.argmax(prediction[0]))
            class_probabilities = prediction[0]
            
            # Map class to risk level (adjust based on your training)
            # Assuming classes 0-4 represent risk levels from lowest to highest
            risk_mapping = {
                0: ('very_low', 'Very Low risk', 0.1),
                1: ('low', 'Low risk', 0.3),
                2: ('moderate', 'Moderate risk', 0.5),
                3: ('high', 'High risk', 0.7),
                4: ('very_high', 'Very High risk', 0.9)
            }
            
            risk_level, risk_display, probability = risk_mapping.get(predicted_class, ('moderate', 'Moderate risk', 0.5))
            
            # Use the confidence of the predicted class as probability
            confidence = float(class_probabilities[predicted_class])
            
            # Adjust probability based on class and confidence
            probability = probability * confidence + (1 - confidence) * 0.3
            
        else:
            # Binary or single probability output
            probability = float(prediction[0][0])
            
            # Determine risk level
            if probability >= 0.7:
                risk_level = 'high'
                risk_display = 'High risk'
            elif probability >= 0.4:
                risk_level = 'moderate'
                risk_display = 'Moderate risk'
            else:
                risk_level = 'low'
                risk_display = 'Low risk'
        
        return jsonify({
            'probability': float(probability),
            'risk_level': risk_level,
            'model': 'stroke_model.h5',
            'features_used': list(features.keys()),
            'prediction_details': {
                'output_shape': str(prediction.shape),
                'raw_output': prediction.tolist()
            }
        })
        
    except Exception as e:
        return jsonify({
            'error': 'Prediction failed',
            'message': str(e)
        }), 500

@app.route('/model/info', methods=['GET'])
def model_info():
    """Get model information"""
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 500
    
    return jsonify({
        'model_path': MODEL_PATH,
        'input_shape': str(model.input_shape),
        'output_shape': str(model.output_shape),
        'expected_features': FEATURE_NAMES,
        'feature_count': len(FEATURE_NAMES)
    })

if __name__ == '__main__':
    print("=" * 60)
    print("🏥 Stroke Risk Prediction Model Service")
    print("=" * 60)
    
    # Load model on startup
    if load_model():
        print("\n✓ Starting Flask server on http://localhost:5000")
        print("  - Health check: http://localhost:5000/health")
        print("  - Model info: http://localhost:5000/model/info")
        print("  - Prediction: POST http://localhost:5000/predict")
        print("=" * 60)
        app.run(host='0.0.0.0', port=5000, debug=True)
    else:
        print("\n✗ Failed to load model. Please ensure stroke_model.h5 exists.")
        print("  Exiting...")
