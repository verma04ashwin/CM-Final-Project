"""
Test script for the stroke prediction model service
Usage: python test_model.py
"""
import requests
import json

BASE_URL = "http://localhost:5000"

def test_health():
    """Test health check endpoint"""
    print("=" * 60)
    print("TEST 1: Health Check")
    print("=" * 60)
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_model_info():
    """Test model info endpoint"""
    print("\n" + "=" * 60)
    print("TEST 2: Model Information")
    print("=" * 60)
    try:
        response = requests.get(f"{BASE_URL}/model/info")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_prediction_high_risk():
    """Test prediction with high-risk profile"""
    print("\n" + "=" * 60)
    print("TEST 3: High Risk Prediction")
    print("=" * 60)
    
    # High-risk patient profile
    features = {
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
    
    try:
        response = requests.post(
            f"{BASE_URL}/predict",
            json={"features": features},
            headers={"Content-Type": "application/json"}
        )
        print(f"Status: {response.status_code}")
        result = response.json()
        print(f"Response: {json.dumps(result, indent=2)}")
        
        if response.status_code == 200:
            prob = result.get('probability', 0)
            risk = result.get('risk_level', '')
            print(f"\n📊 Prediction: {prob:.4f} ({prob*100:.2f}%)")
            print(f"📈 Risk Level: {risk.upper()}")
            return True
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_prediction_low_risk():
    """Test prediction with low-risk profile"""
    print("\n" + "=" * 60)
    print("TEST 4: Low Risk Prediction")
    print("=" * 60)
    
    # Low-risk patient profile
    features = {
        "age": 30,
        "hypertension": 0,
        "heart_disease": 0,
        "ever_married": 1,
        "work_type": 0,
        "Residence_type": 1,
        "avg_glucose_level": 85,
        "bmi": 22.5,
        "gender": "female",
        "smoking_status": "never smoked"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/predict",
            json={"features": features},
            headers={"Content-Type": "application/json"}
        )
        print(f"Status: {response.status_code}")
        result = response.json()
        print(f"Response: {json.dumps(result, indent=2)}")
        
        if response.status_code == 200:
            prob = result.get('probability', 0)
            risk = result.get('risk_level', '')
            print(f"\n📊 Prediction: {prob:.4f} ({prob*100:.2f}%)")
            print(f"📈 Risk Level: {risk.upper()}")
            return True
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_prediction_moderate_risk():
    """Test prediction with moderate-risk profile"""
    print("\n" + "=" * 60)
    print("TEST 5: Moderate Risk Prediction")
    print("=" * 60)
    
    # Moderate-risk patient profile
    features = {
        "age": 52,
        "hypertension": 1,
        "heart_disease": 0,
        "ever_married": 1,
        "work_type": 0,
        "Residence_type": 1,
        "avg_glucose_level": 145,
        "bmi": 28.3,
        "gender": "male",
        "smoking_status": "formerly smoked"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/predict",
            json={"features": features},
            headers={"Content-Type": "application/json"}
        )
        print(f"Status: {response.status_code}")
        result = response.json()
        print(f"Response: {json.dumps(result, indent=2)}")
        
        if response.status_code == 200:
            prob = result.get('probability', 0)
            risk = result.get('risk_level', '')
            print(f"\n📊 Prediction: {prob:.4f} ({prob*100:.2f}%)")
            print(f"📈 Risk Level: {risk.upper()}")
            return True
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_invalid_request():
    """Test with invalid request"""
    print("\n" + "=" * 60)
    print("TEST 6: Invalid Request Handling")
    print("=" * 60)
    
    try:
        response = requests.post(
            f"{BASE_URL}/predict",
            json={},  # Missing features
            headers={"Content-Type": "application/json"}
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 400
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def run_all_tests():
    """Run all test cases"""
    print("\n🏥 STROKE MODEL SERVICE TEST SUITE 🏥\n")
    
    tests = [
        ("Health Check", test_health),
        ("Model Info", test_model_info),
        ("High Risk Prediction", test_prediction_high_risk),
        ("Low Risk Prediction", test_prediction_low_risk),
        ("Moderate Risk Prediction", test_prediction_moderate_risk),
        ("Invalid Request", test_invalid_request),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ Test '{name}' failed with exception: {e}")
            results.append((name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Model service is working correctly.")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Please check the service.")
    
    return passed == total

if __name__ == "__main__":
    try:
        success = run_all_tests()
        exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
        exit(1)
    except Exception as e:
        print(f"\n\n❌ Test suite failed: {e}")
        exit(1)
