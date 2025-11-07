import prisma from '../config/prisma.js';
import mailTransporter from '../config/mail.js';
import Queue from 'bull';
import fcmService from './fcm.service.js';
import websocketService from './websocket.service.js';
import twilio from 'twilio';
import config from '../config/env.js';

class NotificationService {
  constructor() {
    // Create notification queue
    this.notificationQueue = new Queue('notifications', process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Initialize Twilio for SMS
    this.twilioClient = null;
    if (config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
      console.log('✅ Twilio SMS client initialized');
    } else {
      console.warn('⚠️  Twilio credentials not configured - SMS disabled');
    }
    
    this.setupQueueProcessor();
  }

  // Setup queue processor
  setupQueueProcessor() {
    this.notificationQueue.process(async (job) => {
      const { type, data } = job.data;
      
      switch (type) {
        case 'booking_instant':
          return await this.sendBookingConfirmation(data);
        case 'reminder_24h':
          return await this.send24HourReminder(data);
        case 'reminder_1h':
          return await this.send1HourReminder(data);
        case 'prescription_mail':
          return await this.sendPrescriptionMail(data);
        case 'med_reminder':
          return await this.sendMedicationReminder(data);
        default:
          console.error('Unknown notification type:', type);
      }
    });
  }

  // Queue notification
  async queueNotification(type, data, delay = 0) {
    return await this.notificationQueue.add({ type, data }, { delay });
  }

  // Send booking confirmation
  async sendBookingConfirmation(data) {
    const { appointment } = data;
    
    // Create notification records
    const channels = ['EMAIL', 'PUSH', 'SMS'];
    const notifications = [];
    const results = { email: null, push: null, sms: null };

    for (const channel of channels) {
      const notification = await prisma.notification.create({
        data: {
          user_id: appointment.patient.user_id,
          appointment_id: appointment.id,
          type: 'booking_instant',
          channel,
          scheduledAt: new Date(),
          metadata: JSON.stringify({
            doctorName: `Dr. ${appointment.doctor.user.phone}`,
            clinicName: appointment.clinic.name,
            startTs: appointment.startTs,
            visitType: appointment.visitType
          })
        }
      });
      notifications.push(notification);
    }

    // Send email
    if (appointment.patient.user.email) {
      try {
      await this.sendEmail({
        to: appointment.patient.user.email,
        subject: 'Appointment Confirmed - HealBridge',
        html: this.getBookingConfirmationTemplate(appointment)
      });

    // Mark email notification as sent
    await prisma.notification.update({
      where: { id: notifications.find(n => n.channel === 'EMAIL').id },
      data: { sentAt: new Date(), status: 'sent' }
    });
        results.email = { success: true };
      } catch (error) {
        console.error('Email send failed:', error);
        results.email = { success: false, error: error.message };
      }
    }

    // Send Push notification via FCM
    if (fcmService.isAvailable() && appointment.patient.user.firebase_uid) {
      try {
        const fcmNotification = fcmService.createAppointmentNotification(appointment, 'booking');
        const fcmResult = await fcmService.sendToUser(appointment.patient.user.firebase_uid, fcmNotification);
        
        if (fcmResult.success) {
          await prisma.notification.update({
            where: { id: notifications.find(n => n.channel === 'PUSH').id },
            data: { 
              sentAt: new Date(), 
              status: 'sent',
              metadata: JSON.stringify({ 
                ...JSON.parse(notifications.find(n => n.channel === 'PUSH').metadata),
                messageId: fcmResult.messageId 
              })
            }
          });
        }
        results.push = fcmResult;
      } catch (error) {
        console.error('FCM send failed:', error);
        results.push = { success: false, error: error.message };
      }
    }

    // Send SMS via Twilio
    if (this.twilioClient && appointment.patient.user.phone) {
      try {
        const smsResult = await this.sendSMS({
          to: appointment.patient.user.phone,
          message: `HealBridge: Your appointment with Dr. ${appointment.doctor.user.phone} is confirmed for ${new Date(appointment.startTs).toLocaleString()}. Booking ID: ${appointment.id}`
        });

        await prisma.notification.update({
          where: { id: notifications.find(n => n.channel === 'SMS').id },
          data: { 
            sentAt: new Date(), 
            status: smsResult.status,
            metadata: JSON.stringify({ 
              ...JSON.parse(notifications.find(n => n.channel === 'SMS').metadata),
              messageSid: smsResult.sid,
              twilioStatus: smsResult.status
            })
          }
        });
        results.sms = { success: true, sid: smsResult.sid };
      } catch (error) {
        console.error('SMS send failed:', error);
        results.sms = { success: false, error: error.message };
      }
    }

    // Send WebSocket notification
    if (websocketService.isUserConnected(appointment.patient.user_id)) {
      websocketService.sendNotification(appointment.patient.user_id, {
        type: 'booking_confirmed',
        title: 'Appointment Confirmed',
        message: `Your appointment with Dr. ${appointment.doctor.user.phone} is confirmed`,
        appointmentId: appointment.id,
        timestamp: new Date().toISOString()
      });
    }

    return { 
      success: true, 
      notificationIds: notifications.map(n => n.id),
      results 
    };
  }

  // Send 24-hour reminder
  async send24HourReminder(data) {
    const { appointmentId } = data;
    
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
        clinic: true
      }
    });

    if (!appointment || appointment.status !== 'CONFIRMED') {
      return { success: false, reason: 'Appointment not valid' };
    }

    const notification = await prisma.notification.create({
      data: {
        user_id: appointment.patient.user_id,
        appointment_id: appointmentId,
        type: 'reminder_24h',
        channel: 'EMAIL',
        scheduledAt: new Date(),
        metadata: JSON.stringify({
          appointmentTime: appointment.startTs
        })
      }
    });

    if (appointment.patient.user.email) {
      await this.sendEmail({
        to: appointment.patient.user.email,
        subject: 'Appointment Reminder - Tomorrow',
        html: this.get24HourReminderTemplate(appointment)
      });

      await prisma.notification.update({
        where: { id: notification.id },
        data: { sentAt: new Date(), status: 'sent' }
      });
    }

    return { success: true };
  }

  // Send 1-hour reminder with navigation
  async send1HourReminder(data) {
    const { appointmentId } = data;
    
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
        clinic: true
      }
    });

    if (!appointment || appointment.status !== 'CONFIRMED') {
      return { success: false, reason: 'Appointment not valid' };
    }

    // Generate navigation deep links
    const navigationLinks = this.generateNavigationLinks(appointment.clinic);

    const notification = await prisma.notification.create({
      data: {
        user_id: appointment.patient.user_id,
        appointment_id: appointmentId,
        type: 'reminder_1h',
        channel: 'PUSH',
        scheduledAt: new Date(),
        metadata: JSON.stringify({
          navigationLinks,
          clinicAddress: appointment.clinic.address
        })
      }
    });

    // Send push notification via FCM with navigation deep link
    if (fcmService.isAvailable() && appointment.patient.user.firebase_uid) {
      try {
        const fcmNotification = fcmService.createAppointmentNotification(appointment, 'reminder_1h');
        const fcmResult = await fcmService.sendToUser(appointment.patient.user.firebase_uid, fcmNotification);
        
        if (fcmResult.success) {
    await prisma.notification.update({
      where: { id: notification.id },
            data: { 
              sentAt: new Date(), 
              status: 'sent',
              metadata: JSON.stringify({ 
                navigationLinks,
                clinicAddress: appointment.clinic.address,
                messageId: fcmResult.messageId 
              })
            }
    });
        }
      } catch (error) {
        console.error('FCM 1-hour reminder failed:', error);
      }
    }

    // Send WebSocket notification
    if (websocketService.isUserConnected(appointment.patient.user_id)) {
      websocketService.sendNotification(appointment.patient.user_id, {
        type: 'appointment_reminder',
        title: 'Appointment in 1 Hour',
        message: `Your appointment is in 1 hour at ${appointment.clinic.name}`,
        appointmentId: appointment.id,
        navigationLinks,
        timestamp: new Date().toISOString()
      });
    }

    return { success: true, navigationLinks };
  }

  // Send prescription email
  async sendPrescriptionMail(data) {
    const { prescriptionId, patientEmail } = data;
    
    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        appointment: {
          include: {
            patient: { include: { user: true } },
            doctor: { include: { user: true } },
            clinic: true
          }
        },
        medications: true
      }
    });

    if (!prescription) {
      throw new Error('Prescription not found');
    }

    const notification = await prisma.notification.create({
      data: {
        user_id: prescription.appointment.patient.user_id,
        appointment_id: prescription.appointment_id,
        type: 'prescription_mail',
        channel: 'EMAIL',
        scheduledAt: new Date(),
        metadata: JSON.stringify({
          pdfUrl: prescription.pdfUrl
        })
      }
    });

    await this.sendEmail({
      to: patientEmail || prescription.appointment.patient.user.email,
      subject: 'Your Prescription - HealBridge',
      html: this.getPrescriptionTemplate(prescription),
      attachments: [
        {
          filename: 'prescription.pdf',
          path: prescription.pdfUrl
        }
      ]
    });

    await prisma.notification.updateMany({
      where: { id: notification.id },
      data: { sentAt: new Date(), status: 'sent' }
    });

    await prisma.prescription.update({
      where: { id: prescriptionId },
      data: { sentAt: new Date() }
    });

    return { success: true };
  }

  // Send medication reminder
  async sendMedicationReminder(data) {
    const { medicationId, patientId } = data;
    
    const medication = await prisma.medication.findUnique({
      where: { id: medicationId },
      include: {
        patient: { include: { user: true } }
      }
    });

    if (!medication || !medication.remindersEnabled) {
      return { success: false };
    }

    const notification = await prisma.notification.create({
      data: {
        user_id: medication.patient.user_id,
        type: 'med_reminder',
        channel: 'PUSH',
        scheduledAt: new Date(),
        metadata: JSON.stringify({
          medicationName: medication.name,
          dosage: `${medication.strength} ${medication.form}`,
          frequency: medication.freq
        })
      }
    });

    // TODO: Send push notification
    console.log(`Medication reminder: ${medication.name} for patient ${patientId}`);

    await prisma.notification.update({
      where: { id: notification.id },
      data: { sentAt: new Date(), status: 'sent' }
    });

    return { success: true };
  }

  // Generate navigation deep links
  generateNavigationLinks(clinic) {
    const { lat, lon, name, address } = clinic;
    
    return {
      google: `geo:0,0?q=${lat},${lon}(${encodeURIComponent(name)})`,
      apple: `http://maps.apple.com/?q=${encodeURIComponent(name)}&ll=${lat},${lon}`,
      waze: `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`,
      web: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
    };
  }

  // Send email helper
  async sendEmail({ to, subject, html, attachments = [] }) {
    try {
      const info = await mailTransporter.sendMail({
        from: process.env.MAIL_USER,
        to,
        subject,
        html,
        attachments
      });
      console.log(`✅ Email sent to ${to}: ${subject}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Email send failed:', error);
      throw error;
    }
  }

  // Send SMS helper
  async sendSMS({ to, message }) {
    if (!this.twilioClient) {
      throw new Error('Twilio not initialized');
    }

    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        from: config.TWILIO_PHONE_NUMBER,
        to: to
      });

      console.log(`✅ SMS sent to ${to}: ${result.sid}`);
      
      return {
        success: true,
        sid: result.sid,
        status: result.status,
        to: result.to,
        dateCreated: result.dateCreated
      };
    } catch (error) {
      console.error('SMS send failed:', error);
      throw error;
    }
  }

  // Get SMS delivery status
  async getSMSStatus(messageSid) {
    if (!this.twilioClient) {
      return { error: 'Twilio not initialized' };
    }

    try {
      const message = await this.twilioClient.messages(messageSid).fetch();
      return {
        sid: message.sid,
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated
      };
    } catch (error) {
      console.error('Failed to fetch SMS status:', error);
      return { error: error.message };
    }
  }

  // Email templates
  getBookingConfirmationTemplate(appointment) {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">Appointment Confirmed!</h2>
          <p>Your appointment has been successfully booked.</p>
          <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h3>Appointment Details</h3>
            <p><strong>Date & Time:</strong> ${new Date(appointment.startTs).toLocaleString()}</p>
            <p><strong>Doctor:</strong> Dr. ${appointment.doctor.user.phone}</p>
            <p><strong>Clinic:</strong> ${appointment.clinic.name}</p>
            <p><strong>Address:</strong> ${appointment.clinic.address}</p>
            <p><strong>Visit Type:</strong> ${appointment.visitType}</p>
            <p><strong>Booking ID:</strong> ${appointment.id}</p>
          </div>
          <p>Please arrive 10 minutes early for check-in.</p>
          <p>Thank you for choosing HealBridge!</p>
        </body>
      </html>
    `;
  }

  get24HourReminderTemplate(appointment) {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2196F3;">Appointment Reminder - Tomorrow</h2>
          <p>This is a reminder that you have an appointment tomorrow.</p>
          <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <p><strong>Date & Time:</strong> ${new Date(appointment.startTs).toLocaleString()}</p>
            <p><strong>Doctor:</strong> Dr. ${appointment.doctor.user.phone}</p>
            <p><strong>Clinic:</strong> ${appointment.clinic.name}</p>
          </div>
          <p>You will receive another reminder 1 hour before your appointment with navigation details.</p>
        </body>
      </html>
    `;
  }

  getPrescriptionTemplate(prescription) {
    const medications = prescription.medications.map(med => `
      <li><strong>${med.name}</strong> - ${med.strength} ${med.form}, ${med.freq}, ${med.route}</li>
    `).join('');

    return `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">Your Prescription</h2>
          <p>Dear Patient,</p>
          <p>Please find your prescription attached as a PDF.</p>
          <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h3>Medications</h3>
            <ul>${medications}</ul>
          </div>
          <p>If you have any questions, please contact your doctor.</p>
          <p>Stay healthy!</p>
        </body>
      </html>
    `;
  }

  // Schedule reminder jobs for appointment
  async scheduleAppointmentReminders(appointmentId) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId }
    });

    if (!appointment) return;

    const appointmentTime = new Date(appointment.startTs);
    const now = new Date();

    // Schedule 24-hour reminder
    const twentyFourHoursBefore = new Date(appointmentTime.getTime() - 24 * 60 * 60 * 1000);
    if (twentyFourHoursBefore > now) {
      const delay = twentyFourHoursBefore.getTime() - now.getTime();
      await this.queueNotification('reminder_24h', { appointmentId }, delay);
    }

    // Schedule 1-hour reminder
    const oneHourBefore = new Date(appointmentTime.getTime() - 60 * 60 * 1000);
    if (oneHourBefore > now) {
      const delay = oneHourBefore.getTime() - now.getTime();
      await this.queueNotification('reminder_1h', { appointmentId }, delay);
    }
  }
}

export default new NotificationService();

