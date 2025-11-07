/**
 * Firebase Cloud Messaging (FCM) Service
 * 
 * Purpose:
 * - Send push notifications to mobile devices
 * - Manage FCM tokens for users
 * - Handle notification topics and subscriptions
 * - Generate deep links for in-app navigation
 * - Track notification delivery status
 */

import admin from 'firebase-admin';
import prisma from '../config/prisma.js';
import firestoreService from './firestore.service.js';

class FCMService {
  constructor() {
    this.initialized = false;
    this.checkInitialization();
  }

  /**
   * Check if Firebase Admin is initialized
   */
  checkInitialization() {
    try {
      if (admin.apps.length > 0) {
        this.initialized = true;
        console.log('✅ FCM Service initialized');
      } else {
        console.warn('⚠️  Firebase Admin not initialized - FCM disabled');
      }
    } catch (error) {
      console.error('Error checking FCM initialization:', error);
    }
  }

  /**
   * Send push notification to a single device
   * @param {string} fcmToken - Device FCM token
   * @param {Object} notification - Notification data
   * @returns {Promise<Object>} Send result
   */
  async sendToDevice(fcmToken, notification) {
    if (!this.initialized) {
      console.warn('FCM not initialized, skipping notification');
      return { success: false, error: 'FCM not initialized' };
    }

    try {
      const message = {
        token: fcmToken,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl || undefined
        },
        data: {
          ...notification.data,
          clickAction: notification.clickAction || 'FLUTTER_NOTIFICATION_CLICK',
          timestamp: new Date().toISOString()
        },
        android: {
          priority: notification.priority || 'high',
          notification: {
            sound: 'default',
            color: '#4CAF50', // HealBridge green
            channelId: notification.channelId || 'default'
          }
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body
              },
              sound: 'default',
              badge: notification.badge || 1
            }
          }
        }
      };

      const response = await admin.messaging().send(message);
      
      console.log(`✅ FCM notification sent to device: ${fcmToken.substring(0, 10)}...`);
      
      return {
        success: true,
        messageId: response,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error sending FCM notification:', error);
      
      // Handle invalid token
      if (error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered') {
        await this.removeInvalidToken(fcmToken);
      }
      
      return {
        success: false,
        error: error.message,
        errorCode: error.code
      };
    }
  }

  /**
   * Send notification to multiple devices
   * @param {Array<string>} fcmTokens - Array of FCM tokens
   * @param {Object} notification - Notification data
   * @returns {Promise<Object>} Send result with success/failure counts
   */
  async sendToMultipleDevices(fcmTokens, notification) {
    if (!this.initialized) {
      return { success: false, error: 'FCM not initialized' };
    }

    if (!fcmTokens || fcmTokens.length === 0) {
      return { success: false, error: 'No FCM tokens provided' };
    }

    try {
      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl || undefined
        },
        data: {
          ...notification.data,
          clickAction: notification.clickAction || 'FLUTTER_NOTIFICATION_CLICK',
          timestamp: new Date().toISOString()
        },
        android: {
          priority: notification.priority || 'high',
          notification: {
            sound: 'default',
            color: '#4CAF50'
          }
        },
        tokens: fcmTokens
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      
      console.log(`✅ FCM batch sent: ${response.successCount}/${fcmTokens.length} successful`);
      
      // Remove invalid tokens
      if (response.failureCount > 0) {
        const invalidTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success && (
            resp.error.code === 'messaging/invalid-registration-token' ||
            resp.error.code === 'messaging/registration-token-not-registered'
          )) {
            invalidTokens.push(fcmTokens[idx]);
          }
        });
        
        if (invalidTokens.length > 0) {
          await this.removeBatchInvalidTokens(invalidTokens);
        }
      }
      
      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses
      };
    } catch (error) {
      console.error('Error sending batch FCM notifications:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send notification to a user (looks up FCM token from Firestore)
   * @param {string} firebaseUid - User's Firebase UID
   * @param {Object} notification - Notification data
   * @returns {Promise<Object>} Send result
   */
  async sendToUser(firebaseUid, notification) {
    try {
      // Get user's FCM token from Firestore
      const profile = await firestoreService.getPatientProfile(firebaseUid);
      
      if (!profile || !profile.fcmToken) {
        console.warn(`No FCM token found for user ${firebaseUid}`);
        return { success: false, error: 'No FCM token found' };
      }

      return await this.sendToDevice(profile.fcmToken, notification);
    } catch (error) {
      console.error('Error sending FCM to user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification to multiple users
   * @param {Array<string>} firebaseUids - Array of Firebase UIDs
   * @param {Object} notification - Notification data
   * @returns {Promise<Object>} Send result
   */
  async sendToUsers(firebaseUids, notification) {
    try {
      // Get all users' FCM tokens
      const profiles = await firestoreService.batchGetPatientProfiles(firebaseUids);
      
      const fcmTokens = Object.values(profiles)
        .filter(profile => profile && profile.fcmToken)
        .map(profile => profile.fcmToken);

      if (fcmTokens.length === 0) {
        return { success: false, error: 'No valid FCM tokens found' };
      }

      return await this.sendToMultipleDevices(fcmTokens, notification);
    } catch (error) {
      console.error('Error sending FCM to users:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Subscribe user to a topic
   * @param {string} fcmToken - Device FCM token
   * @param {string} topic - Topic name
   * @returns {Promise<Object>} Subscribe result
   */
  async subscribeToTopic(fcmToken, topic) {
    if (!this.initialized) {
      return { success: false, error: 'FCM not initialized' };
    }

    try {
      await admin.messaging().subscribeToTopic([fcmToken], topic);
      console.log(`✅ Subscribed device to topic: ${topic}`);
      return { success: true, topic };
    } catch (error) {
      console.error('Error subscribing to topic:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Unsubscribe user from a topic
   * @param {string} fcmToken - Device FCM token
   * @param {string} topic - Topic name
   * @returns {Promise<Object>} Unsubscribe result
   */
  async unsubscribeFromTopic(fcmToken, topic) {
    if (!this.initialized) {
      return { success: false, error: 'FCM not initialized' };
    }

    try {
      await admin.messaging().unsubscribeFromTopic([fcmToken], topic);
      console.log(`✅ Unsubscribed device from topic: ${topic}`);
      return { success: true, topic };
    } catch (error) {
      console.error('Error unsubscribing from topic:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification to a topic
   * @param {string} topic - Topic name
   * @param {Object} notification - Notification data
   * @returns {Promise<Object>} Send result
   */
  async sendToTopic(topic, notification) {
    if (!this.initialized) {
      return { success: false, error: 'FCM not initialized' };
    }

    try {
      const message = {
        topic,
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: notification.data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            color: '#4CAF50'
          }
        }
      };

      const response = await admin.messaging().send(message);
      console.log(`✅ Notification sent to topic ${topic}`);
      
      return {
        success: true,
        messageId: response
      };
    } catch (error) {
      console.error('Error sending to topic:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update FCM token for a user in Firestore
   * @param {string} firebaseUid - User's Firebase UID
   * @param {string} fcmToken - New FCM token
   * @returns {Promise<Object>} Update result
   */
  async updateUserToken(firebaseUid, fcmToken) {
    try {
      await firestoreService.updateFcmToken(firebaseUid, fcmToken);
      console.log(`✅ FCM token updated for user ${firebaseUid}`);
      return { success: true };
    } catch (error) {
      console.error('Error updating FCM token:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove invalid FCM token from Firestore
   * @param {string} fcmToken - Invalid FCM token
   */
  async removeInvalidToken(fcmToken) {
    try {
      // Find user with this token and remove it
      console.log(`🗑️  Removing invalid FCM token: ${fcmToken.substring(0, 10)}...`);
      // Note: This requires a query which isn't efficient in Firestore
      // In production, maintain a separate FCM token → UID mapping in Redis
    } catch (error) {
      console.error('Error removing invalid token:', error);
    }
  }

  /**
   * Remove multiple invalid tokens
   * @param {Array<string>} fcmTokens - Array of invalid tokens
   */
  async removeBatchInvalidTokens(fcmTokens) {
    console.log(`🗑️  Removing ${fcmTokens.length} invalid FCM tokens`);
    // Implementation depends on your token storage strategy
  }

  /**
   * Generate deep link for notification action
   * @param {string} screen - Target screen name
   * @param {Object} params - Screen parameters
   * @returns {string} Deep link URL
   */
  generateDeepLink(screen, params = {}) {
    const baseUrl = 'healbridge://';
    const queryParams = new URLSearchParams(params).toString();
    return `${baseUrl}${screen}${queryParams ? '?' + queryParams : ''}`;
  }

  /**
   * Create appointment notification data
   * @param {Object} appointment - Appointment object
   * @param {string} type - Notification type (booking, reminder, etc.)
   * @returns {Object} Notification data
   */
  createAppointmentNotification(appointment, type) {
    const notifications = {
      booking: {
        title: '🎉 Appointment Confirmed',
        body: `Your appointment with Dr. ${appointment.doctor.name || 'Doctor'} is confirmed for ${new Date(appointment.startTs).toLocaleString()}`,
        data: {
          type: 'appointment',
          action: 'view_appointment',
          appointmentId: appointment.id,
          screen: 'AppointmentDetails'
        },
        clickAction: this.generateDeepLink('appointment', { id: appointment.id })
      },
      reminder_24h: {
        title: '⏰ Appointment Tomorrow',
        body: `Don't forget your appointment with Dr. ${appointment.doctor.name || 'Doctor'} tomorrow at ${new Date(appointment.startTs).toLocaleTimeString()}`,
        data: {
          type: 'reminder',
          action: 'view_appointment',
          appointmentId: appointment.id
        }
      },
      reminder_1h: {
        title: '🚨 Appointment in 1 Hour',
        body: `Your appointment is in 1 hour. Navigate to ${appointment.clinic.name}`,
        data: {
          type: 'reminder',
          action: 'navigate',
          appointmentId: appointment.id,
          latitude: appointment.clinic.lat?.toString(),
          longitude: appointment.clinic.lon?.toString()
        },
        priority: 'high'
      },
      cancelled: {
        title: '❌ Appointment Cancelled',
        body: `Your appointment on ${new Date(appointment.startTs).toLocaleDateString()} has been cancelled`,
        data: {
          type: 'cancellation',
          appointmentId: appointment.id
        }
      },
      rescheduled: {
        title: '📅 Appointment Rescheduled',
        body: `Your appointment has been rescheduled to ${new Date(appointment.startTs).toLocaleString()}`,
        data: {
          type: 'reschedule',
          appointmentId: appointment.id
        }
      }
    };

    return notifications[type] || notifications.booking;
  }

  /**
   * Check if FCM is available
   * @returns {boolean} True if FCM is available
   */
  isAvailable() {
    return this.initialized;
  }
}

export default new FCMService();

