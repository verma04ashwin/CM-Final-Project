/**
 * Script to fix MongoDB indexes
 * Run this once to drop old/problematic indexes
 * Usage: node fix-indexes.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/fhir_prototype';

async function fixIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Fix Patient collection
    console.log('Checking patients collection...');
    try {
      const patientIndexes = await db.collection('patients').indexes();
      console.log('Current indexes:', patientIndexes.map(i => i.name).join(', '));
      
      // Drop problematic patientId index if it exists
      const hasPatientIdIndex = patientIndexes.some(i => i.name === 'patientId_1');
      if (hasPatientIdIndex) {
        await db.collection('patients').dropIndex('patientId_1');
        console.log('✓ Dropped patientId_1 index from patients');
      } else {
        console.log('✓ No patientId_1 index found (already clean)');
      }
    } catch (err) {
      console.log('Note:', err.message);
    }

    // Fix Observation collection
    console.log('\nChecking observations collection...');
    try {
      const obsIndexes = await db.collection('observations').indexes();
      console.log('Current indexes:', obsIndexes.map(i => i.name).join(', '));
      
      const hasObsIdIndex = obsIndexes.some(i => i.name === 'observationId_1');
      if (hasObsIdIndex) {
        await db.collection('observations').dropIndex('observationId_1');
        console.log('✓ Dropped observationId_1 index from observations');
      }
      
      const hasPatientIdIndex2 = obsIndexes.some(i => i.name === 'patientId_1');
      if (hasPatientIdIndex2) {
        await db.collection('observations').dropIndex('patientId_1');
        console.log('✓ Dropped patientId_1 index from observations');
      }
      
      if (!hasObsIdIndex && !hasPatientIdIndex2) {
        console.log('✓ No problematic indexes found (already clean)');
      }
    } catch (err) {
      console.log('Note:', err.message);
    }

    // Fix Condition collection
    console.log('\nChecking conditions collection...');
    try {
      const condIndexes = await db.collection('conditions').indexes();
      console.log('Current indexes:', condIndexes.map(i => i.name).join(', '));
      
      const hasCondIdIndex = condIndexes.some(i => i.name === 'conditionId_1');
      if (hasCondIdIndex) {
        await db.collection('conditions').dropIndex('conditionId_1');
        console.log('✓ Dropped conditionId_1 index from conditions');
      } else {
        console.log('✓ No conditionId_1 index found (already clean)');
      }
    } catch (err) {
      console.log('Note:', err.message);
    }

    // Fix RiskAssessment collection
    console.log('\nChecking riskassessments collection...');
    try {
      const riskIndexes = await db.collection('riskassessments').indexes();
      console.log('Current indexes:', riskIndexes.map(i => i.name).join(', '));
      
      const hasRiskIdIndex = riskIndexes.some(i => i.name === 'riskId_1');
      if (hasRiskIdIndex) {
        await db.collection('riskassessments').dropIndex('riskId_1');
        console.log('✓ Dropped riskId_1 index from riskassessments');
      }
      
      const hasPatientIdIndex3 = riskIndexes.some(i => i.name === 'patientId_1');
      if (hasPatientIdIndex3) {
        await db.collection('riskassessments').dropIndex('patientId_1');
        console.log('✓ Dropped patientId_1 index from riskassessments');
      }
      
      if (!hasRiskIdIndex && !hasPatientIdIndex3) {
        console.log('✓ No problematic indexes found (already clean)');
      }
    } catch (err) {
      console.log('Note:', err.message);
    }

    console.log('\n✅ Index cleanup complete!');
    console.log('You can now restart your server and try predictions again.\n');

  } catch (error) {
    console.error('❌ Error fixing indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

fixIndexes();
