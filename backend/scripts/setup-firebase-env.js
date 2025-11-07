/**
 * Firebase Service Account Setup Script
 * 
 * This script helps you convert your Firebase service account JSON file
 * into the correct format for the .env file.
 * 
 * Usage:
 * 1. Download your Firebase service account JSON from Firebase Console
 * 2. Save it in this directory as 'firebase-service-account.json'
 * 3. Run: node scripts/setup-firebase-env.js
 * 4. Copy the output to your .env file
 */

import { readFileSync, existsSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FIREBASE_KEY_FILE = join(__dirname, 'firebase-service-account.json');
const ENV_FILE = join(__dirname, '..', '.env');

console.log('\n🔧 Firebase Service Account Setup\n');
console.log('====================================\n');

// Check if Firebase key file exists
if (!existsSync(FIREBASE_KEY_FILE)) {
  console.log('❌ firebase-service-account.json not found!\n');
  console.log('📋 Steps to get your Firebase service account:\n');
  console.log('1. Go to https://console.firebase.google.com/');
  console.log('2. Select your project');
  console.log('3. Click Settings (⚙️) → Project settings');
  console.log('4. Go to "Service accounts" tab');
  console.log('5. Click "Generate new private key"');
  console.log('6. Download the JSON file');
  console.log(`7. Save it as: ${FIREBASE_KEY_FILE}\n`);
  console.log('Then run this script again.\n');
  process.exit(1);
}

try {
  // Read and parse the Firebase service account JSON
  console.log('📖 Reading firebase-service-account.json...');
  const serviceAccount = JSON.parse(readFileSync(FIREBASE_KEY_FILE, 'utf8'));
  
  // Validate required fields
  const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
  const missingFields = requiredFields.filter(field => !serviceAccount[field]);
  
  if (missingFields.length > 0) {
    console.log('❌ Invalid service account JSON. Missing fields:', missingFields.join(', '));
    process.exit(1);
  }
  
  console.log('✅ Valid service account JSON\n');
  console.log('📝 Service Account Details:');
  console.log(`   Project ID: ${serviceAccount.project_id}`);
  console.log(`   Client Email: ${serviceAccount.client_email}`);
  console.log('');
  
  // Convert to single-line string
  const singleLineJson = JSON.stringify(serviceAccount);
  
  // Create environment variable format
  const envLine = `FIREBASE_SERVICE_ACCOUNT='${singleLineJson}'`;
  
  console.log('✅ Converted to environment variable format\n');
  console.log('====================================\n');
  console.log('📋 COPY THIS TO YOUR .env FILE:\n');
  console.log(envLine);
  console.log('\n====================================\n');
  
  // Ask if should append to .env
  console.log('💡 Options:\n');
  console.log('   A. Copy the line above and paste it into your .env file');
  console.log('   B. This script can append it automatically\n');
  
  // For automation, let's write to a separate file
  const outputFile = join(__dirname, '..', '.env.firebase');
  appendFileSync(outputFile, '\n# Firebase Configuration\n' + envLine + '\n');
  
  console.log(`✅ Also saved to: ${outputFile}`);
  console.log('   You can copy from there to your .env file\n');
  
  // Security warning
  console.log('⚠️  SECURITY WARNINGS:\n');
  console.log('   1. Never commit .env file to git!');
  console.log('   2. Add to .gitignore:');
  console.log('      .env');
  console.log('      .env.*');
  console.log('      firebase-service-account.json\n');
  console.log('   3. Keep your service account JSON file secure');
  console.log('   4. Delete the JSON file after setup if not needed\n');
  
  // Test the configuration
  console.log('🧪 Quick Test:\n');
  console.log('   To verify Firebase works, add the line to .env and run:');
  console.log('   npm start\n');
  console.log('   You should see:');
  console.log('   ✅ Firebase Admin initialized with service account\n');
  
  console.log('🎉 Setup complete!\n');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

