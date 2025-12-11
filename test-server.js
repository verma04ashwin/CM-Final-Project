#!/usr/bin/env node
/**
 * FHIR Server Test Script
 * Tests all major endpoints and features
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
const FHIR_URL = `${BASE_URL}/fhir`;

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name) {
  console.log(`\n${colors.blue}Testing: ${name}${colors.reset}`);
}

function logSuccess(message) {
  log(`  ✓ ${message}`, 'green');
}

function logError(message) {
  log(`  ✗ ${message}`, 'red');
}

let testsPassed = 0;
let testsFailed = 0;

async function runTest(name, testFn) {
  logTest(name);
  try {
    await testFn();
    testsPassed++;
  } catch (error) {
    logError(error.message || error);
    testsFailed++;
  }
}

// Test 1: Server Health Check
async function testHealth() {
  const response = await axios.get(`${BASE_URL}/health`);
  if (response.status === 200 && response.data.status === 'ok') {
    logSuccess('Server is healthy');
    logSuccess(`MongoDB: ${response.data.mongodb}`);
  } else {
    throw new Error('Health check failed');
  }
}

// Test 2: FHIR Metadata
async function testMetadata() {
  const response = await axios.get(`${FHIR_URL}/metadata`);
  if (response.status === 200 && response.data.resourceType === 'CapabilityStatement') {
    logSuccess('CapabilityStatement retrieved');
    logSuccess(`FHIR Version: ${response.data.fhirVersion}`);
  } else {
    throw new Error('Metadata endpoint failed');
  }
}

// Test 3: Create Patient
async function testCreatePatient() {
  const patient = {
    resourceType: 'Patient',
    gender: 'male',
    birthDate: '1980-05-15',
    name: [{
      use: 'official',
      family: 'TestPatient',
      given: ['Test', 'User']
    }],
    identifier: [{
      system: 'http://test.example.org/patients',
      value: 'TEST-001'
    }]
  };

  const response = await axios.post(`${FHIR_URL}/Patient`, patient, {
    headers: { 'Content-Type': 'application/fhir+json' }
  });

  if (response.status === 201 && response.data.id) {
    logSuccess(`Patient created with ID: ${response.data.id}`);
    global.testPatientId = response.data.id;
  } else {
    throw new Error('Failed to create patient');
  }
}

// Test 4: Search Patients
async function testSearchPatients() {
  const response = await axios.get(`${FHIR_URL}/Patient`);
  if (response.status === 200 && response.data.resourceType === 'Bundle') {
    logSuccess(`Found ${response.data.total} patient(s)`);
    logSuccess(`Bundle type: ${response.data.type}`);
  } else {
    throw new Error('Failed to search patients');
  }
}

// Test 5: Read Patient
async function testReadPatient() {
  if (!global.testPatientId) {
    throw new Error('No patient ID available');
  }

  const response = await axios.get(`${FHIR_URL}/Patient/${global.testPatientId}`);
  if (response.status === 200 && response.data.resourceType === 'Patient') {
    logSuccess('Patient retrieved successfully');
    logSuccess(`Gender: ${response.data.gender}, Birth Date: ${response.data.birthDate}`);
  } else {
    throw new Error('Failed to read patient');
  }
}

// Test 6: Create Observation
async function testCreateObservation() {
  if (!global.testPatientId) {
    throw new Error('No patient ID available');
  }

  const observation = {
    resourceType: 'Observation',
    status: 'final',
    code: {
      coding: [{
        system: 'http://loinc.org',
        code: '39156-5',
        display: 'Body mass index (BMI)'
      }]
    },
    subject: {
      reference: `Patient/${global.testPatientId}`
    },
    valueQuantity: {
      value: 26.5,
      unit: 'kg/m2',
      system: 'http://unitsofmeasure.org',
      code: 'kg/m2'
    },
    effectiveDateTime: new Date().toISOString()
  };

  const response = await axios.post(`${FHIR_URL}/Observation`, observation, {
    headers: { 'Content-Type': 'application/fhir+json' }
  });

  if (response.status === 201 && response.data.id) {
    logSuccess(`Observation created with ID: ${response.data.id}`);
    global.testObservationId = response.data.id;
  } else {
    throw new Error('Failed to create observation');
  }
}

// Test 7: Search Observations
async function testSearchObservations() {
  if (!global.testPatientId) {
    throw new Error('No patient ID available');
  }

  const response = await axios.get(`${FHIR_URL}/Observation?patient=${global.testPatientId}`);
  if (response.status === 200 && response.data.resourceType === 'Bundle') {
    logSuccess(`Found ${response.data.total} observation(s) for patient`);
  } else {
    throw new Error('Failed to search observations');
  }
}

// Test 8: Create Condition
async function testCreateCondition() {
  if (!global.testPatientId) {
    throw new Error('No patient ID available');
  }

  const condition = {
    resourceType: 'Condition',
    clinicalStatus: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
        code: 'active'
      }]
    },
    code: {
      coding: [{
        system: 'http://snomed.info/sct',
        code: '38341003',
        display: 'Hypertensive disorder'
      }]
    },
    subject: {
      reference: `Patient/${global.testPatientId}`
    }
  };

  const response = await axios.post(`${FHIR_URL}/Condition`, condition, {
    headers: { 'Content-Type': 'application/fhir+json' }
  });

  if (response.status === 201 && response.data.id) {
    logSuccess(`Condition created with ID: ${response.data.id}`);
    global.testConditionId = response.data.id;
  } else {
    throw new Error('Failed to create condition');
  }
}

// Test 9: Risk Prediction
async function testRiskPrediction() {
  if (!global.testPatientId) {
    throw new Error('No patient ID available');
  }

  const response = await axios.post(`${BASE_URL}/predict/${global.testPatientId}`, {
    features: {
      age: 45,
      bmi: 26.5,
      avg_glucose_level: 110
    }
  }, {
    headers: { 'Content-Type': 'application/json' }
  });

  if (response.status === 200 && response.data.success) {
    logSuccess(`Risk assessed: ${response.data.qualitativeRisk}`);
    logSuccess(`Probability: ${(response.data.probability * 100).toFixed(1)}%`);
    global.testRiskId = response.data.riskId;
  } else {
    throw new Error('Failed to predict risk');
  }
}

// Test 10: Search Risk Assessments
async function testSearchRiskAssessments() {
  if (!global.testPatientId) {
    throw new Error('No patient ID available');
  }

  const response = await axios.get(`${FHIR_URL}/RiskAssessment?patient=${global.testPatientId}`);
  if (response.status === 200 && response.data.resourceType === 'Bundle') {
    logSuccess(`Found ${response.data.total} risk assessment(s)`);
  } else {
    throw new Error('Failed to search risk assessments');
  }
}

// Test 11: Update Patient
async function testUpdatePatient() {
  if (!global.testPatientId) {
    throw new Error('No patient ID available');
  }

  const updatedPatient = {
    resourceType: 'Patient',
    id: global.testPatientId,
    gender: 'male',
    birthDate: '1980-05-15',
    name: [{
      use: 'official',
      family: 'UpdatedPatient',
      given: ['Updated', 'User']
    }]
  };

  const response = await axios.put(`${FHIR_URL}/Patient/${global.testPatientId}`, updatedPatient, {
    headers: { 'Content-Type': 'application/fhir+json' }
  });

  if (response.status === 200) {
    logSuccess('Patient updated successfully');
  } else {
    throw new Error('Failed to update patient');
  }
}

// Test 12: Delete Resources (Cleanup)
async function testDeleteResources() {
  const resourcesToDelete = [
    { type: 'Observation', id: global.testObservationId },
    { type: 'Condition', id: global.testConditionId },
    { type: 'RiskAssessment', id: global.testRiskId },
    { type: 'Patient', id: global.testPatientId }
  ];

  for (const resource of resourcesToDelete) {
    if (resource.id) {
      try {
        await axios.delete(`${FHIR_URL}/${resource.type}/${resource.id}`);
        logSuccess(`${resource.type} deleted`);
      } catch (error) {
        logError(`Failed to delete ${resource.type}: ${error.message}`);
      }
    }
  }
}

// Run all tests
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  log('FHIR R4 Server Test Suite', 'blue');
  console.log('='.repeat(60));

  await runTest('1. Server Health Check', testHealth);
  await runTest('2. FHIR Metadata', testMetadata);
  await runTest('3. Create Patient', testCreatePatient);
  await runTest('4. Search Patients', testSearchPatients);
  await runTest('5. Read Patient', testReadPatient);
  await runTest('6. Create Observation', testCreateObservation);
  await runTest('7. Search Observations', testSearchObservations);
  await runTest('8. Create Condition', testCreateCondition);
  await runTest('9. Risk Prediction', testRiskPrediction);
  await runTest('10. Search Risk Assessments', testSearchRiskAssessments);
  await runTest('11. Update Patient', testUpdatePatient);
  await runTest('12. Delete Resources (Cleanup)', testDeleteResources);

  console.log('\n' + '='.repeat(60));
  log(`Tests Passed: ${testsPassed}`, 'green');
  if (testsFailed > 0) {
    log(`Tests Failed: ${testsFailed}`, 'red');
  }
  console.log('='.repeat(60) + '\n');

  process.exit(testsFailed > 0 ? 1 : 0);
}

// Check if server is running
axios.get(`${BASE_URL}/health`)
  .then(() => {
    runAllTests();
  })
  .catch((error) => {
    log('\n✗ Error: Server is not running!', 'red');
    log('  Please start the server with: npm run dev', 'yellow');
    log('  Then run this test script again.\n', 'yellow');
    process.exit(1);
  });
