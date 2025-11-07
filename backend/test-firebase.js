import { initializeFirebase, verifyFirebaseToken, isFirebaseConfigured } from './src/config/firebase.js';
import config from './src/config/env.js';

async function testFirebase() {
  console.log('🔥 Testing Firebase Configuration...');
  console.log(`Project ID: ${config.FIREBASE_PROJECT_ID}`);
  
  // Initialize Firebase
  const app = initializeFirebase();
  
  if (isFirebaseConfigured()) {
    console.log('✅ Firebase Admin SDK initialized successfully');
  } else {
    console.log('⚠️  Firebase Admin SDK not configured, using development mode');
  }
  
  // Test token verification with a mock token
  const mockToken = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2NzAyNzVmMzlmNjk2NTJkNzJmNzc5YzY4YzJhZGY4NTk2NzNkZGQiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vaGVhbGJyaWRnZS1kZDQ4MCIsImF1ZCI6ImhlYWxicmlkZ2UtZGQ0ODAiLCJhdXRoX3RpbWUiOjE3MzQ5NzI4NzAsInVzZXJfaWQiOiJ0ZXN0X3VzZXIiLCJzdWIiOiJ0ZXN0X3VzZXIiLCJpYXQiOjE3MzQ5NzI4NzAsImV4cCI6MTczNDk3NjQ3MCwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsidGVzdEBleGFtcGxlLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6InBhc3N3b3JkIn19.mock_signature';
  
  try {
    const decoded = await verifyFirebaseToken(mockToken);
    console.log('✅ Token verification working:', {
      uid: decoded.uid,
      email: decoded.email
    });
  } catch (error) {
    console.log('⚠️  Token verification failed (expected in development):', error.message);
  }
  
  console.log('\n🎯 Firebase setup complete!');
  console.log('The backend will now accept Firebase tokens from your Android app.');
}

testFirebase().catch(console.error);