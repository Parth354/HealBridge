import admin from 'firebase-admin';
import { initializeFirebase } from '../config/firebase.js';

/**
 * Firestore Service - Read patient data directly from Firebase Firestore
 * Firestore is the source of truth for patient profile data
 */
class FirestoreService {
  constructor() {
    initializeFirebase();
    this.db = null;
    
    try {
      if (admin.apps.length > 0) {
        this.db = admin.firestore();
        console.log('✅ Firestore client initialized');
      } else {
        console.warn('⚠️  Firebase not initialized, Firestore service disabled');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Firestore:', error.message);
    }
  }

  /**
   * Get patient profile from Firestore by Firebase UID
   * @param {string} firebaseUid - Firebase user UID
   * @returns {Promise<Object|null>} Patient profile data
   */
  async getPatientProfile(firebaseUid) {
    try {
      if (!this.db) {
        throw new Error('Firestore not initialized');
      }

      const docRef = this.db.collection('users').doc(firebaseUid);
      const doc = await docRef.get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      
      // Transform Firestore data to our backend format
      return {
        firebase_uid: firebaseUid,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Patient',
        email: data.email || null,
        phoneNumber: data.phoneNumber || null,
        dob: data.dob || null,
        gender: data.gender || null,
        allergies: Array.isArray(data.allergies) ? data.allergies : [],
        conditions: Array.isArray(data.conditions) ? data.conditions : [],
        chronicConditions: Array.isArray(data.conditions) ? data.conditions.join(', ') : '',
        emergencyContactName: data.emergencyContactName || null,
        emergencyContactPhone: data.emergencyContactPhone || null,
        emergencyContact: data.emergencyContactPhone || null,
        address: data.address || null,
        language: data.language || 'en',
        consentDataUse: data.consentDataUse || false,
        consentNotifications: data.consentNotifications || false,
        fcmToken: data.fcmToken || null,
        updatedAt: data.updatedAt || Date.now(),
        createdAt: data.createdAt || Date.now()
      };
    } catch (error) {
      console.error('Error fetching patient profile from Firestore:', error);
      throw new Error(`Failed to fetch patient profile: ${error.message}`);
    }
  }

  /**
   * Update patient profile in Firestore
   * @param {string} firebaseUid - Firebase user UID
   * @param {Object} profileData - Profile data to update
   * @returns {Promise<Object>} Updated profile
   */
  async updatePatientProfile(firebaseUid, profileData) {
    try {
      if (!this.db) {
        throw new Error('Firestore not initialized');
      }

      const docRef = this.db.collection('users').doc(firebaseUid);
      
      // Prepare update data
      const updateData = {
        ...profileData,
        updatedAt: Date.now()
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      await docRef.set(updateData, { merge: true });
      
      return await this.getPatientProfile(firebaseUid);
    } catch (error) {
      console.error('Error updating patient profile in Firestore:', error);
      throw new Error(`Failed to update patient profile: ${error.message}`);
    }
  }

  /**
   * Create patient profile in Firestore
   * @param {string} firebaseUid - Firebase user UID
   * @param {Object} profileData - Profile data
   * @returns {Promise<Object>} Created profile
   */
  async createPatientProfile(firebaseUid, profileData) {
    try {
      if (!this.db) {
        throw new Error('Firestore not initialized');
      }

      const docRef = this.db.collection('users').doc(firebaseUid);
      
      const createData = {
        uid: firebaseUid,
        firebase_uid: firebaseUid,
        ...profileData,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await docRef.set(createData);
      
      return await this.getPatientProfile(firebaseUid);
    } catch (error) {
      console.error('Error creating patient profile in Firestore:', error);
      throw new Error(`Failed to create patient profile: ${error.message}`);
    }
  }

  /**
   * Check if patient profile exists in Firestore
   * @param {string} firebaseUid - Firebase user UID
   * @returns {Promise<boolean>} True if profile exists
   */
  async patientProfileExists(firebaseUid) {
    try {
      if (!this.db) {
        return false;
      }

      const docRef = this.db.collection('users').doc(firebaseUid);
      const doc = await docRef.get();
      
      return doc.exists;
    } catch (error) {
      console.error('Error checking patient profile existence:', error);
      return false;
    }
  }

  /**
   * Get patient's medical documents from Firestore (if stored there)
   * @param {string} firebaseUid - Firebase user UID
   * @returns {Promise<Array>} List of documents
   */
  async getPatientDocuments(firebaseUid) {
    try {
      if (!this.db) {
        return [];
      }

      const docsRef = this.db.collection('users').doc(firebaseUid).collection('documents');
      const snapshot = await docsRef.orderBy('createdAt', 'desc').get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching patient documents from Firestore:', error);
      return [];
    }
  }

  /**
   * Batch get multiple patient profiles
   * @param {Array<string>} firebaseUids - Array of Firebase UIDs
   * @returns {Promise<Object>} Map of UID to profile
   */
  async batchGetPatientProfiles(firebaseUids) {
    try {
      if (!this.db || !firebaseUids || firebaseUids.length === 0) {
        return {};
      }

      const profiles = {};
      
      // Firestore allows max 10 documents per batch get
      const chunks = [];
      for (let i = 0; i < firebaseUids.length; i += 10) {
        chunks.push(firebaseUids.slice(i, i + 10));
      }

      for (const chunk of chunks) {
        const docs = await Promise.all(
          chunk.map(uid => this.db.collection('users').doc(uid).get())
        );

        docs.forEach((doc, index) => {
          if (doc.exists) {
            const uid = chunk[index];
            const data = doc.data();
            profiles[uid] = {
              firebase_uid: uid,
              firstName: data.firstName || '',
              lastName: data.lastName || '',
              name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Patient',
              ...data
            };
          }
        });
      }

      return profiles;
    } catch (error) {
      console.error('Error batch fetching patient profiles:', error);
      return {};
    }
  }

  /**
   * Update FCM token for push notifications
   * @param {string} firebaseUid - Firebase user UID
   * @param {string} fcmToken - FCM token
   */
  async updateFcmToken(firebaseUid, fcmToken) {
    try {
      if (!this.db) {
        throw new Error('Firestore not initialized');
      }

      await this.db.collection('users').doc(firebaseUid).update({
        fcmToken,
        updatedAt: Date.now()
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating FCM token:', error);
      throw new Error(`Failed to update FCM token: ${error.message}`);
    }
  }

  /**
   * Get patient data in PostgreSQL-compatible format for legacy services
   * Maps Firestore structure to old PostgreSQL Patient model structure
   * @param {string} firebaseUid - Firebase user UID
   * @returns {Promise<Object>} Patient data in legacy format
   */
  async getPatientLegacyFormat(firebaseUid) {
    try {
      const profile = await this.getPatientProfile(firebaseUid);
      
      if (!profile) {
        return null;
      }

      // Map to legacy PostgreSQL Patient structure
      return {
        id: firebaseUid, // Use firebase_uid as id
        firebase_uid: firebaseUid,
        name: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Patient',
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        dob: profile.dob ? new Date(profile.dob) : null,
        gender: profile.gender || null,
        // Convert arrays to strings for legacy compatibility
        allergies: Array.isArray(profile.allergies) 
          ? profile.allergies.join(', ') 
          : (profile.allergies || ''),
        chronicConditions: Array.isArray(profile.conditions)
          ? profile.conditions.join(', ')
          : (profile.conditions || ''),
        emergencyContact: profile.emergencyContactPhone || '',
        emergencyContactName: profile.emergencyContactName || '',
        emergencyContactPhone: profile.emergencyContactPhone || '',
        phoneNumber: profile.phoneNumber || '',
        email: profile.email || '',
        address: profile.address || null,
        language: profile.language || 'en',
        updatedAt: profile.updatedAt ? new Date(profile.updatedAt) : new Date(),
        createdAt: profile.createdAt ? new Date(profile.createdAt) : new Date()
      };
    } catch (error) {
      console.error('Error getting patient in legacy format:', error);
      throw error;
    }
  }

  /**
   * Get multiple patients in legacy format
   * @param {Array<string>} firebaseUids - Array of Firebase UIDs
   * @returns {Promise<Object>} Map of UID to legacy format patient
   */
  async batchGetPatientsLegacyFormat(firebaseUids) {
    try {
      const profiles = await this.batchGetPatientProfiles(firebaseUids);
      const legacyProfiles = {};

      for (const [uid, profile] of Object.entries(profiles)) {
        legacyProfiles[uid] = {
          id: uid,
          firebase_uid: uid,
          name: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Patient',
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
          dob: profile.dob ? new Date(profile.dob) : null,
          gender: profile.gender || null,
          allergies: Array.isArray(profile.allergies) 
            ? profile.allergies.join(', ') 
            : (profile.allergies || ''),
          chronicConditions: Array.isArray(profile.conditions)
            ? profile.conditions.join(', ')
            : (profile.conditions || ''),
          emergencyContact: profile.emergencyContactPhone || '',
          emergencyContactName: profile.emergencyContactName || '',
          emergencyContactPhone: profile.emergencyContactPhone || '',
          phoneNumber: profile.phoneNumber || '',
          email: profile.email || ''
        };
      }

      return legacyProfiles;
    } catch (error) {
      console.error('Error batch getting patients in legacy format:', error);
      return {};
    }
  }

  /**
   * Get patient by User record (finds firebase_uid from user)
   * @param {Object} user - User record with firebase_uid
   * @returns {Promise<Object|null>} Patient data in legacy format
   */
  async getPatientByUser(user) {
    if (!user || !user.firebase_uid) {
      console.warn('User does not have firebase_uid:', user?.id);
      return null;
    }

    return await this.getPatientLegacyFormat(user.firebase_uid);
  }

  /**
   * Check if Firestore is available
   * @returns {boolean} True if Firestore is initialized
   */
  isAvailable() {
    return this.db !== null;
  }
}

export default new FirestoreService();

