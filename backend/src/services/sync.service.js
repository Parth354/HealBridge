/**
 * Sync Service - Bridge between Firebase Firestore and PostgreSQL
 * 
 * Purpose:
 * - Synchronize patient data between Firestore (profile) and PostgreSQL (transactional)
 * - Maintain data consistency across databases
 * - Handle Firebase UID ←→ PostgreSQL User ID mapping
 * - Provide unified user lookup utilities
 * 
 * Architecture:
 * - Firestore: Patient profiles (name, dob, allergies, etc.)
 * - PostgreSQL: User records, appointments, medications, prescriptions
 * - Redis: Caching layer for frequent lookups
 */

import prisma from '../config/prisma.js';
import firestoreService from './firestore.service.js';
import redisClient from '../config/redis.js';

class SyncService {
  constructor() {
    this.CACHE_TTL = 300; // 5 minutes
    this.CACHE_PREFIX = 'sync:';
  }

  /**
   * Get user by Firebase UID with caching
   * Checks cache first, then PostgreSQL
   * 
   * @param {string} firebaseUid - Firebase user UID
   * @returns {Promise<Object|null>} User record from PostgreSQL
   */
  async getUserByFirebaseUid(firebaseUid) {
    try {
      // Check cache first
      const cacheKey = `${this.CACHE_PREFIX}uid:${firebaseUid}`;
      const cached = await redisClient.get(cacheKey);
      
      if (cached) {
        console.log(`✅ Cache hit for Firebase UID: ${firebaseUid}`);
        return JSON.parse(cached);
      }

      // Query PostgreSQL
      const user = await prisma.user.findUnique({
        where: { firebase_uid: firebaseUid },
        include: {
          patient: true,
          doctor: true
        }
      });

      // Cache the result
      if (user) {
        await redisClient.setex(cacheKey, this.CACHE_TTL, JSON.stringify(user));
      }

      return user;
    } catch (error) {
      console.error('Error getting user by Firebase UID:', error);
      throw error;
    }
  }

  /**
   * Get or create user from Firebase authentication
   * Creates PostgreSQL user if doesn't exist
   * 
   * @param {Object} firebaseUser - Firebase user object
   * @param {string} role - User role (PATIENT, DOCTOR, STAFF)
   * @returns {Promise<Object>} PostgreSQL user record
   */
  async getOrCreateUser(firebaseUser, role = 'PATIENT') {
    try {
      const { uid, email, email_verified } = firebaseUser;

      // Check if user exists
      let user = await this.getUserByFirebaseUid(uid);

      if (user) {
        console.log(`✅ User found: ${user.id}`);
        return user;
      }

      // Create new user
      user = await prisma.user.create({
        data: {
          firebase_uid: uid,
          email: email || null,
          role: role,
          verified: email_verified || false
        },
        include: {
          patient: true,
          doctor: true
        }
      });

      console.log(`✅ Created new user: ${user.id} for Firebase UID: ${uid}`);

      // Cache the new user
      const cacheKey = `${this.CACHE_PREFIX}uid:${uid}`;
      await redisClient.setex(cacheKey, this.CACHE_TTL, JSON.stringify(user));

      return user;
    } catch (error) {
      console.error('Error getting or creating user:', error);
      throw error;
    }
  }

  /**
   * Sync patient profile from Firestore to cache
   * Creates a unified patient view combining both databases
   * 
   * @param {string} firebaseUid - Firebase user UID
   * @returns {Promise<Object>} Complete patient profile
   */
  async syncPatientProfile(firebaseUid) {
    try {
      console.log(`🔄 Syncing patient profile for Firebase UID: ${firebaseUid}`);

      // Get PostgreSQL user
      const user = await this.getUserByFirebaseUid(firebaseUid);
      
      if (!user) {
        throw new Error(`User not found for Firebase UID: ${firebaseUid}`);
      }

      // Get Firestore profile
      const firestoreProfile = await firestoreService.getPatientProfile(firebaseUid);

      if (!firestoreProfile) {
        console.log(`⚠️  No Firestore profile found for: ${firebaseUid}`);
        return {
          user,
          profile: null,
          synced: false
        };
      }

      // Create unified profile
      const unifiedProfile = {
        // PostgreSQL data
        userId: user.id,
        firebaseUid: user.firebase_uid,
        email: user.email,
        role: user.role,
        verified: user.verified,
        
        // Firestore data
        firstName: firestoreProfile.firstName,
        lastName: firestoreProfile.lastName,
        name: firestoreProfile.name,
        dob: firestoreProfile.dob,
        gender: firestoreProfile.gender,
        phoneNumber: firestoreProfile.phoneNumber,
        address: firestoreProfile.address,
        allergies: firestoreProfile.allergies,
        conditions: firestoreProfile.conditions,
        emergencyContactName: firestoreProfile.emergencyContactName,
        emergencyContactPhone: firestoreProfile.emergencyContactPhone,
        language: firestoreProfile.language,
        
        // Metadata
        syncedAt: new Date().toISOString(),
        hasFirestoreProfile: true
      };

      // Cache the unified profile
      const cacheKey = `${this.CACHE_PREFIX}profile:${firebaseUid}`;
      await redisClient.setex(cacheKey, this.CACHE_TTL, JSON.stringify(unifiedProfile));

      console.log(`✅ Patient profile synced successfully`);

      return unifiedProfile;
    } catch (error) {
      console.error('Error syncing patient profile:', error);
      throw error;
    }
  }

  /**
   * Get complete patient data (PostgreSQL + Firestore)
   * Returns unified view of patient with all data
   * 
   * @param {string} firebaseUid - Firebase user UID
   * @returns {Promise<Object>} Complete patient data
   */
  async getCompletePatientData(firebaseUid) {
    try {
      // Check cache first
      const cacheKey = `${this.CACHE_PREFIX}complete:${firebaseUid}`;
      const cached = await redisClient.get(cacheKey);
      
      if (cached) {
        console.log(`✅ Cache hit for complete patient data`);
        return JSON.parse(cached);
      }

      // Get PostgreSQL user and relations
      const user = await this.getUserByFirebaseUid(firebaseUid);
      
      if (!user) {
        return null;
      }

      // Get Firestore profile
      const firestoreProfile = await firestoreService.getPatientProfile(firebaseUid);

      // Get appointments from PostgreSQL
      const appointments = await prisma.appointment.findMany({
        where: {
          patient: {
            user: { firebase_uid: firebaseUid }
          }
        },
        include: {
          doctor: { include: { user: true } },
          clinic: true,
          prescription: { include: { medications: true } }
        },
        orderBy: { startTs: 'desc' },
        take: 10
      });

      // Get medications from PostgreSQL
      const medications = await prisma.medication.findMany({
        where: {
          patient: {
            user: { firebase_uid: firebaseUid }
          }
        },
        orderBy: { startDate: 'desc' },
        take: 20
      });

      // Get documents from PostgreSQL
      const documents = await prisma.document.findMany({
        where: {
          patient: {
            user: { firebase_uid: firebaseUid }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      // Combine all data
      const completeData = {
        // User info
        userId: user.id,
        firebaseUid: user.firebase_uid,
        email: user.email,
        role: user.role,
        
        // Firestore profile
        profile: firestoreProfile,
        
        // PostgreSQL transactional data
        appointments,
        medications,
        documents,
        
        // Statistics
        stats: {
          totalAppointments: appointments.length,
          activeMedications: medications.filter(m => {
            const today = new Date();
            const start = new Date(m.startDate);
            const end = new Date(start);
            end.setDate(end.getDate() + m.durationDays);
            return today >= start && today <= end;
          }).length,
          totalDocuments: documents.length
        },
        
        // Metadata
        syncedAt: new Date().toISOString()
      };

      // Cache for 5 minutes
      await redisClient.setex(cacheKey, this.CACHE_TTL, JSON.stringify(completeData));

      return completeData;
    } catch (error) {
      console.error('Error getting complete patient data:', error);
      throw error;
    }
  }

  /**
   * Batch sync multiple patients
   * Useful for bulk operations or periodic sync jobs
   * 
   * @param {Array<string>} firebaseUids - Array of Firebase UIDs
   * @returns {Promise<Object>} Sync results summary
   */
  async batchSyncPatients(firebaseUids) {
    console.log(`🔄 Batch syncing ${firebaseUids.length} patients...`);

    const results = {
      success: [],
      failed: [],
      total: firebaseUids.length
    };

    for (const uid of firebaseUids) {
      try {
        await this.syncPatientProfile(uid);
        results.success.push(uid);
      } catch (error) {
        console.error(`Failed to sync ${uid}:`, error.message);
        results.failed.push({ uid, error: error.message });
      }
    }

    console.log(`✅ Batch sync complete: ${results.success.length}/${results.total} successful`);

    return results;
  }

  /**
   * Invalidate cache for a user
   * Call this when user data is updated
   * 
   * @param {string} firebaseUid - Firebase user UID
   */
  async invalidateUserCache(firebaseUid) {
    try {
      const keys = [
        `${this.CACHE_PREFIX}uid:${firebaseUid}`,
        `${this.CACHE_PREFIX}profile:${firebaseUid}`,
        `${this.CACHE_PREFIX}complete:${firebaseUid}`
      ];

      for (const key of keys) {
        await redisClient.del(key);
      }

      console.log(`✅ Cache invalidated for Firebase UID: ${firebaseUid}`);
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  }

  /**
   * Link existing phone-based account with Firebase UID
   * Used when user upgrades from OTP to Firebase auth
   * 
   * @param {string} phone - User's phone number
   * @param {string} firebaseUid - Firebase user UID
   * @returns {Promise<Object>} Updated user record
   */
  async linkPhoneToFirebase(phone, firebaseUid) {
    try {
      // Find user by phone
      const user = await prisma.user.findUnique({
        where: { phone }
      });

      if (!user) {
        throw new Error(`User not found with phone: ${phone}`);
      }

      if (user.firebase_uid && user.firebase_uid !== firebaseUid) {
        throw new Error('User already linked to different Firebase account');
      }

      // Update user with Firebase UID
      const updatedUser = await prisma.user.update({
        where: { phone },
        data: { firebase_uid: firebaseUid },
        include: {
          patient: true,
          doctor: true
        }
      });

      // Invalidate old cache
      await this.invalidateUserCache(firebaseUid);

      console.log(`✅ Linked phone ${phone} to Firebase UID: ${firebaseUid}`);

      return updatedUser;
    } catch (error) {
      console.error('Error linking phone to Firebase:', error);
      throw error;
    }
  }

  /**
   * Health check for sync service
   * Verifies connectivity to all data sources
   * 
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    const health = {
      service: 'SyncService',
      status: 'healthy',
      checks: {},
      timestamp: new Date().toISOString()
    };

    try {
      // Check PostgreSQL
      await prisma.$queryRaw`SELECT 1`;
      health.checks.postgresql = { status: 'up', latency: 0 };
    } catch (error) {
      health.checks.postgresql = { status: 'down', error: error.message };
      health.status = 'unhealthy';
    }

    try {
      // Check Firestore
      const isAvailable = firestoreService.isAvailable();
      health.checks.firestore = { status: isAvailable ? 'up' : 'down' };
      if (!isAvailable) health.status = 'degraded';
    } catch (error) {
      health.checks.firestore = { status: 'down', error: error.message };
      health.status = 'unhealthy';
    }

    try {
      // Check Redis
      await redisClient.ping();
      health.checks.redis = { status: 'up' };
    } catch (error) {
      health.checks.redis = { status: 'down', error: error.message };
      health.status = 'degraded';
    }

    return health;
  }

  /**
   * Get sync statistics
   * Useful for monitoring and debugging
   * 
   * @returns {Promise<Object>} Sync statistics
   */
  async getSyncStats() {
    try {
      const stats = {
        totalUsers: await prisma.user.count(),
        firebaseUsers: await prisma.user.count({ where: { firebase_uid: { not: null } } }),
        phoneUsers: await prisma.user.count({ where: { phone: { not: null } } }),
        patients: await prisma.user.count({ where: { role: 'PATIENT' } }),
        doctors: await prisma.user.count({ where: { role: 'DOCTOR' } }),
        timestamp: new Date().toISOString()
      };

      return stats;
    } catch (error) {
      console.error('Error getting sync stats:', error);
      throw error;
    }
  }
}

export default new SyncService();

