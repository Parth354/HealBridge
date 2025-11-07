import admin from 'firebase-admin';
import config from './env.js';

let firebaseApp = null;

/**
 * Initialize Firebase Admin SDK
 * Supports two modes:
 * 1. Service Account JSON (recommended for production)
 * 2. Default credentials (for development)
 */
export const initializeFirebase = () => {
  try {
    if (firebaseApp) {
      return firebaseApp;
    }

    // Check if Firebase service account is provided
    if (config.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(config.FIREBASE_SERVICE_ACCOUNT);
      
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
      
      console.log('✅ Firebase Admin initialized with service account');
    } 
    // Fallback to project ID only (for development)
    else if (config.FIREBASE_PROJECT_ID) {
      firebaseApp = admin.initializeApp({
        projectId: config.FIREBASE_PROJECT_ID
      });
      
      console.log(`✅ Firebase Admin initialized with project ID: ${config.FIREBASE_PROJECT_ID}`);
    } 
    else {
      console.warn('⚠️  Firebase credentials not configured');
      console.warn('⚠️  Add FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID to .env');
      console.warn('⚠️  Firebase authentication will be disabled');
      return null;
    }

    return firebaseApp;
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
    return null;
  }
};

/**
 * Verify Firebase ID token
 * @param {string} idToken - Firebase ID token from client
 * @returns {Promise<admin.auth.DecodedIdToken>} Decoded token with user info
 */
export const verifyFirebaseToken = async (idToken) => {
  try {
    if (!firebaseApp) {
      // For development: decode token manually without verification
      console.warn('⚠️  Firebase Admin not configured, using development mode');
      const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
      return {
        uid: payload.user_id || payload.sub || 'dev_user',
        email: payload.email || 'dev@example.com',
        email_verified: true
      };
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Firebase token verification error:', error.message);
    throw new Error('Invalid Firebase token');
  }
};

/**
 * Get user by Firebase UID
 * @param {string} uid - Firebase user UID
 * @returns {Promise<admin.auth.UserRecord>} Firebase user record
 */
export const getFirebaseUser = async (uid) => {
  try {
    if (!firebaseApp) {
      throw new Error('Firebase Admin is not initialized');
    }

    const userRecord = await admin.auth().getUser(uid);
    return userRecord;
  } catch (error) {
    console.error('Get Firebase user error:', error.message);
    throw new Error('Failed to get Firebase user');
  }
};

/**
 * Get Firestore instance
 * @returns {admin.firestore.Firestore} Firestore instance
 */
export const getFirestore = () => {
  if (!firebaseApp) {
    throw new Error('Firebase Admin is not initialized');
  }
  return admin.firestore();
};

/**
 * Check if Firebase is configured
 * @returns {boolean} True if Firebase is configured
 */
export const isFirebaseConfigured = () => {
  return firebaseApp !== null;
};

// Initialize Firebase on module load
initializeFirebase();

export default {
  initializeFirebase,
  verifyFirebaseToken,
  getFirebaseUser,
  getFirestore,
  isFirebaseConfigured
};

