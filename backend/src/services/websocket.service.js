/**
 * WebSocket Service - Real-time Updates
 * 
 * Purpose:
 * - Manage WebSocket connections for real-time updates
 * - Send live appointment status updates to doctors and patients
 * - Broadcast queue position changes
 * - Notify about doctor availability changes
 * - Handle emergency notifications
 * 
 * Events:
 * - appointment:updated - Appointment status changed
 * - appointment:created - New appointment booked
 * - appointment:cancelled - Appointment cancelled
 * - queue:updated - Queue position changed
 * - doctor:availability - Doctor availability changed
 * - emergency:notification - Emergency alert
 * - notification:new - New notification for user
 */

import { Server } from 'socket.io';
import { verifyToken } from '../config/auth.js';
import prisma from '../config/prisma.js';

class WebSocketService {
  constructor() {
    this.io = null;
    this.connections = new Map(); // userId -> socketId mapping
    this.doctorSockets = new Map(); // doctorId -> [socketIds]
    this.patientSockets = new Map(); // patientId -> [socketIds]
  }

  /**
   * Initialize WebSocket server
   * @param {Object} server - HTTP server instance
   */
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication required'));
        }

        // Verify JWT token
        const decoded = verifyToken(token);
        
        // Get user details
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          include: {
            doctor: true,
            patient: true
          }
        });

        if (!user) {
          return next(new Error('User not found'));
        }

        // Attach user info to socket
        socket.userId = user.id;
        socket.userRole = user.role;
        socket.doctorId = user.doctor?.id;
        socket.patientId = user.patient?.id;

        next();
      } catch (error) {
        console.error('WebSocket authentication error:', error);
        next(new Error('Invalid token'));
      }
    });

    // Connection event
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    console.log('✅ WebSocket service initialized');
  }

  /**
   * Handle new socket connection
   */
  handleConnection(socket) {
    console.log(`🔌 Client connected: ${socket.id} (User: ${socket.userId}, Role: ${socket.userRole})`);

    // Store connection
    this.connections.set(socket.userId, socket.id);

    // Store by role
    if (socket.doctorId) {
      if (!this.doctorSockets.has(socket.doctorId)) {
        this.doctorSockets.set(socket.doctorId, []);
      }
      this.doctorSockets.get(socket.doctorId).push(socket.id);
      
      // Join doctor-specific rooms
      socket.join(`doctor:${socket.doctorId}`);
    }

    if (socket.patientId) {
      if (!this.patientSockets.has(socket.patientId)) {
        this.patientSockets.set(socket.patientId, []);
      }
      this.patientSockets.get(socket.patientId).push(socket.id);
      
      // Join patient-specific rooms
      socket.join(`patient:${socket.patientId}`);
    }

    // Join user-specific room
    socket.join(`user:${socket.userId}`);

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to HealBridge real-time server',
      userId: socket.userId,
      role: socket.userRole,
      timestamp: new Date().toISOString()
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });

    // Handle subscription to specific events
    socket.on('subscribe', (data) => {
      this.handleSubscription(socket, data);
    });

    // Handle unsubscription
    socket.on('unsubscribe', (data) => {
      this.handleUnsubscription(socket, data);
    });
  }

  /**
   * Handle socket disconnection
   */
  handleDisconnection(socket) {
    console.log(`🔌 Client disconnected: ${socket.id}`);

    // Remove from connections
    this.connections.delete(socket.userId);

    // Remove from doctor sockets
    if (socket.doctorId && this.doctorSockets.has(socket.doctorId)) {
      const sockets = this.doctorSockets.get(socket.doctorId);
      const index = sockets.indexOf(socket.id);
      if (index > -1) {
        sockets.splice(index, 1);
      }
      if (sockets.length === 0) {
        this.doctorSockets.delete(socket.doctorId);
      }
    }

    // Remove from patient sockets
    if (socket.patientId && this.patientSockets.has(socket.patientId)) {
      const sockets = this.patientSockets.get(socket.patientId);
      const index = sockets.indexOf(socket.id);
      if (index > -1) {
        sockets.splice(index, 1);
      }
      if (sockets.length === 0) {
        this.patientSockets.delete(socket.patientId);
      }
    }
  }

  /**
   * Handle room subscription
   */
  handleSubscription(socket, data) {
    const { room } = data;
    if (room) {
      socket.join(room);
      socket.emit('subscribed', { room, success: true });
      console.log(`Socket ${socket.id} subscribed to room: ${room}`);
    }
  }

  /**
   * Handle room unsubscription
   */
  handleUnsubscription(socket, data) {
    const { room } = data;
    if (room) {
      socket.leave(room);
      socket.emit('unsubscribed', { room, success: true });
      console.log(`Socket ${socket.id} unsubscribed from room: ${room}`);
    }
  }

  /**
   * Send appointment update to doctor and patient
   */
  async sendAppointmentUpdate(appointmentId, eventType, data) {
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          doctor: true,
          patient: true,
          clinic: true
        }
      });

      if (!appointment) {
        console.warn(`Appointment ${appointmentId} not found for WebSocket update`);
        return;
      }

      const payload = {
        event: eventType,
        appointment: {
          id: appointment.id,
          status: appointment.status,
          startTs: appointment.startTs,
          endTs: appointment.endTs,
          visitType: appointment.visitType,
          clinic: {
            id: appointment.clinic.id,
            name: appointment.clinic.name
          }
        },
        data,
        timestamp: new Date().toISOString()
      };

      // Send to doctor
      if (appointment.doctor_id) {
        this.io.to(`doctor:${appointment.doctor_id}`).emit('appointment:updated', payload);
      }

      // Send to patient
      if (appointment.patient_id) {
        this.io.to(`patient:${appointment.patient_id}`).emit('appointment:updated', payload);
      }

      console.log(`✅ Appointment update sent: ${appointmentId} (${eventType})`);
    } catch (error) {
      console.error('Error sending appointment update:', error);
    }
  }

  /**
   * Send queue position update to patient
   */
  async sendQueueUpdate(patientId, appointmentId, queueData) {
    try {
      const payload = {
        appointmentId,
        position: queueData.position,
        totalInQueue: queueData.totalInQueue,
        estimatedWaitTime: queueData.estimatedWaitTime,
        timestamp: new Date().toISOString()
      };

      this.io.to(`patient:${patientId}`).emit('queue:updated', payload);
      console.log(`✅ Queue update sent to patient ${patientId}: Position ${queueData.position}`);
    } catch (error) {
      console.error('Error sending queue update:', error);
    }
  }

  /**
   * Broadcast doctor availability change
   */
  async broadcastDoctorAvailability(doctorId, availabilityData) {
    try {
      const payload = {
        doctorId,
        ...availabilityData,
        timestamp: new Date().toISOString()
      };

      // Broadcast to all clients (for doctor search updates)
      this.io.emit('doctor:availability', payload);
      console.log(`✅ Doctor availability broadcast: ${doctorId}`);
    } catch (error) {
      console.error('Error broadcasting doctor availability:', error);
    }
  }

  /**
   * Send emergency notification
   */
  async sendEmergencyNotification(userId, notificationData) {
    try {
      const payload = {
        type: 'emergency',
        ...notificationData,
        timestamp: new Date().toISOString()
      };

      this.io.to(`user:${userId}`).emit('emergency:notification', payload);
      console.log(`✅ Emergency notification sent to user ${userId}`);
    } catch (error) {
      console.error('Error sending emergency notification:', error);
    }
  }

  /**
   * Send notification to specific user
   */
  async sendNotification(userId, notification) {
    try {
      this.io.to(`user:${userId}`).emit('notification:new', {
        ...notification,
        timestamp: new Date().toISOString()
      });
      console.log(`✅ Notification sent to user ${userId}`);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  /**
   * Send notification to multiple users (batch)
   */
  async sendBatchNotifications(userIds, notification) {
    try {
      for (const userId of userIds) {
        await this.sendNotification(userId, notification);
      }
      console.log(`✅ Batch notifications sent to ${userIds.length} users`);
    } catch (error) {
      console.error('Error sending batch notifications:', error);
    }
  }

  /**
   * Broadcast message to all connected doctors
   */
  broadcastToDoctors(event, data) {
    for (const doctorId of this.doctorSockets.keys()) {
      this.io.to(`doctor:${doctorId}`).emit(event, data);
    }
    console.log(`✅ Broadcast to all doctors: ${event}`);
  }

  /**
   * Broadcast message to all connected patients
   */
  broadcastToPatients(event, data) {
    for (const patientId of this.patientSockets.keys()) {
      this.io.to(`patient:${patientId}`).emit(event, data);
    }
    console.log(`✅ Broadcast to all patients: ${event}`);
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      totalConnections: this.connections.size,
      connectedDoctors: this.doctorSockets.size,
      connectedPatients: this.patientSockets.size,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId) {
    return this.connections.has(userId);
  }

  /**
   * Check if doctor is connected
   */
  isDoctorConnected(doctorId) {
    return this.doctorSockets.has(doctorId);
  }

  /**
   * Check if patient is connected
   */
  isPatientConnected(patientId) {
    return this.patientSockets.has(patientId);
  }

  /**
   * Get IO instance (for external use)
   */
  getIO() {
    return this.io;
  }
}

export default new WebSocketService();

