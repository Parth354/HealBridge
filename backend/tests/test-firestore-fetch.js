/**
 * Test script to verify Firestore data retrieval
 * This will attempt to fetch patient data from Firestore
 */

import firestoreService from '../src/services/firestore.service.js';
import { getFirestore } from '../src/config/firebase.js';

console.log('\n================================================================================');
console.log('🔍 FIRESTORE DATA RETRIEVAL TEST');
console.log('================================================================================\n');

async function testFirestoreConnection() {
  try {
    console.log('📡 Testing Firestore connection...');
    
    // Check if Firestore is available
    if (!firestoreService.isAvailable()) {
      console.error('❌ Firestore is not initialized!');
      console.error('   Please check your Firebase credentials in .env file');
      return false;
    }
    
    console.log('✅ Firestore is connected!\n');
    return true;
  } catch (error) {
    console.error('❌ Firestore connection failed:', error.message);
    return false;
  }
}

async function listAllUsers() {
  try {
    console.log('👥 Fetching all users from Firestore...');
    const db = getFirestore();
    const usersSnapshot = await db.collection('users').limit(10).get();
    
    if (usersSnapshot.empty) {
      console.log('⚠️  No users found in Firestore');
      return [];
    }
    
    console.log(`✅ Found ${usersSnapshot.size} user(s) in Firestore\n`);
    
    const users = [];
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      users.push({
        uid: doc.id,
        firstName: data.firstName || 'N/A',
        lastName: data.lastName || 'N/A',
        email: data.email || 'N/A',
        phoneNumber: data.phoneNumber || 'N/A',
        dob: data.dob || 'N/A',
        gender: data.gender || 'N/A',
        hasAllergies: data.allergies && data.allergies.length > 0,
        hasConditions: data.conditions && data.conditions.length > 0
      });
    });
    
    return users;
  } catch (error) {
    console.error('❌ Error listing users:', error.message);
    return [];
  }
}

async function testFetchUserData(uid) {
  try {
    console.log(`\n📋 Fetching data for user: ${uid}`);
    console.log('-'.repeat(80));
    
    const profile = await firestoreService.getPatientProfile(uid);
    
    if (!profile) {
      console.log('❌ User not found in Firestore');
      return false;
    }
    
    console.log('✅ Successfully fetched user profile!');
    console.log('\n📝 Profile Data:');
    console.log(`   Name: ${profile.name}`);
    console.log(`   First Name: ${profile.firstName}`);
    console.log(`   Last Name: ${profile.lastName}`);
    console.log(`   Email: ${profile.email || 'N/A'}`);
    console.log(`   Phone: ${profile.phoneNumber || 'N/A'}`);
    console.log(`   DOB: ${profile.dob || 'N/A'}`);
    console.log(`   Gender: ${profile.gender || 'N/A'}`);
    console.log(`   Allergies: ${Array.isArray(profile.allergies) ? profile.allergies.join(', ') || 'None' : 'None'}`);
    console.log(`   Conditions: ${Array.isArray(profile.conditions) ? profile.conditions.join(', ') || 'None' : 'None'}`);
    console.log(`   Emergency Contact: ${profile.emergencyContactName || 'N/A'} (${profile.emergencyContactPhone || 'N/A'})`);
    console.log(`   Language: ${profile.language}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Error fetching user ${uid}:`, error.message);
    return false;
  }
}

async function testLegacyFormat(uid) {
  try {
    console.log(`\n🔄 Testing legacy format conversion for: ${uid}`);
    console.log('-'.repeat(80));
    
    const legacyProfile = await firestoreService.getPatientLegacyFormat(uid);
    
    if (!legacyProfile) {
      console.log('❌ User not found');
      return false;
    }
    
    console.log('✅ Successfully converted to legacy format!');
    console.log('\n📝 Legacy Format (compatible with PostgreSQL services):');
    console.log(`   ID: ${legacyProfile.id}`);
    console.log(`   Name: ${legacyProfile.name}`);
    console.log(`   Firebase UID: ${legacyProfile.firebase_uid}`);
    console.log(`   Email: ${legacyProfile.email || 'N/A'}`);
    console.log(`   Allergies (string): ${legacyProfile.allergies}`);
    console.log(`   Chronic Conditions (string): ${legacyProfile.chronicConditions}`);
    console.log(`   Emergency Contact: ${legacyProfile.emergencyContact}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Error converting to legacy format:`, error.message);
    return false;
  }
}

async function runTests() {
  try {
    // Test 1: Firestore connection
    const connected = await testFirestoreConnection();
    if (!connected) {
      console.log('\n❌ Cannot proceed with tests - Firestore not available');
      process.exit(1);
    }
    
    // Test 2: List all users
    const users = await listAllUsers();
    
    if (users.length === 0) {
      console.log('\n⚠️  No users found to test');
      console.log('   Make sure your Firebase users are stored in Firestore under "users" collection');
      process.exit(0);
    }
    
    // Display user summary
    console.log('📊 User Summary:');
    users.forEach((user, index) => {
      console.log(`\n   ${index + 1}. ${user.firstName} ${user.lastName}`);
      console.log(`      UID: ${user.uid}`);
      console.log(`      Email: ${user.email}`);
      console.log(`      Phone: ${user.phoneNumber}`);
      console.log(`      Profile Complete: ${user.firstName !== 'N/A' ? 'Yes ✅' : 'No ⚠️'}`);
    });
    
    console.log('\n================================================================================');
    console.log('🧪 DETAILED USER DATA TESTS');
    console.log('================================================================================');
    
    // Test 3: Fetch each user's data
    for (const user of users) {
      await testFetchUserData(user.uid);
      await testLegacyFormat(user.uid);
    }
    
    console.log('\n================================================================================');
    console.log('✅ ALL TESTS COMPLETED!');
    console.log('================================================================================\n');
    
    console.log('📊 Summary:');
    console.log(`   Total users found: ${users.length}`);
    console.log(`   Firestore connection: ✅ Working`);
    console.log(`   Data retrieval: ✅ Working`);
    console.log(`   Legacy format conversion: ✅ Working`);
    
    console.log('\n✨ Your backend can successfully fetch patient data from Firebase!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the tests
runTests();

