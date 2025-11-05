import prisma from '../config/prisma.js';
import notificationService from './notification.service.js';
import doctorService from './doctor.service.js';

class EmergencyService {
  // Handle doctor emergency leave
  async handleEmergencyLeave(doctorId, startTime, endTime, reason) {
    const start = new Date(startTime);
    const end = new Date(endTime);

    // Get affected appointments
    const affectedAppointments = await prisma.appointment.findMany({
      where: {
        doctor_id: doctorId,
        startTs: { gte: start, lte: end },
        status: { in: ['CONFIRMED', 'HOLD'] }
      },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true, clinics: true } },
        clinic: true
      }
    });

    if (affectedAppointments.length === 0) {
      return {
        message: 'No appointments to reschedule',
        affectedCount: 0
      };
    }

    // Mark schedule as unavailable
    await prisma.scheduleBlock.create({
      data: {
        doctor_id: doctorId,
        clinic_id: affectedAppointments[0].clinic_id,
        startTs: start,
        endTs: end,
        type: 'holiday',
        slotMinutes: 0,
        bufferMinutes: 0
      }
    });

    // Process each affected appointment
    const rescheduleResults = [];

    for (const appointment of affectedAppointments) {
      try {
        const result = await this.rescheduleEmergencyAppointment(appointment);
        rescheduleResults.push(result);
      } catch (error) {
        console.error(`Failed to reschedule appointment ${appointment.id}:`, error);
        rescheduleResults.push({
          appointmentId: appointment.id,
          success: false,
          error: error.message
        });
      }
    }

    return {
      message: 'Emergency leave processed',
      affectedCount: affectedAppointments.length,
      rescheduleResults,
      reason
    };
  }

  // Reschedule emergency appointment
  async rescheduleEmergencyAppointment(appointment) {
    // Find alternative doctors
    const alternatives = await this.findAlternativeDoctors(
      appointment.doctor.specialties[0],
      appointment.clinic.lat,
      appointment.clinic.lon,
      appointment.startTs
    );

    // Prepare options for patient
    const options = {
      original: {
        appointmentId: appointment.id,
        doctor: appointment.doctor,
        clinic: appointment.clinic,
        time: appointment.startTs
      },
      alternatives: alternatives.slice(0, 3), // Top 3 alternatives
      actions: ['reschedule', 'switch_doctor', 'cancel_refund']
    };

    // Send notification to patient with options
    await this.notifyPatientEmergency(appointment, options);

    // Store pending decision
    // In production, create a pending_reschedule table
    
    return {
      appointmentId: appointment.id,
      patientId: appointment.patient_id,
      optionsProvided: options.alternatives.length,
      status: 'pending_patient_decision'
    };
  }

  // Find alternative doctors
  async findAlternativeDoctors(specialty, lat, lon, originalTime) {
    // Search for doctors with same specialty within 5-8 km
    const doctors = await doctorService.searchDoctors({
      specialty,
      lat,
      lon,
      maxDistance: 8,
      sortBy: 'distance',
      limit: 10
    });

    const alternatives = [];

    for (const doctor of doctors) {
      // Get available slots around the original time
      const targetDate = new Date(originalTime);
      
      for (const clinic of doctor.clinics) {
        try {
          const availability = await doctorService.getDoctorAvailability(
            doctor.doctorId,
            clinic.id,
            targetDate
          );

          if (availability.availableSlots.length > 0) {
            // Find slot closest to original time
            const closestSlot = availability.availableSlots.reduce((prev, curr) => {
              const prevDiff = Math.abs(new Date(prev.startTs) - new Date(originalTime));
              const currDiff = Math.abs(new Date(curr.startTs) - new Date(originalTime));
              return currDiff < prevDiff ? curr : prev;
            });

            alternatives.push({
              doctorId: doctor.doctorId,
              doctorName: `Dr. ${doctor.userId}`,
              clinicId: clinic.id,
              clinicName: clinic.name,
              distance: clinic.distance,
              specialty: specialty,
              rating: doctor.rating,
              availableSlot: closestSlot,
              timeDifference: Math.abs(new Date(closestSlot.startTs) - new Date(originalTime)) / (1000 * 60) // minutes
            });
          }
        } catch (error) {
          console.error(`Error checking availability for doctor ${doctor.doctorId}:`, error);
        }
      }
    }

    // Sort by time difference and distance
    alternatives.sort((a, b) => {
      const timeDiff = a.timeDifference - b.timeDifference;
      if (Math.abs(timeDiff) > 60) return timeDiff; // Prioritize time if difference > 1 hour
      return a.distance - b.distance; // Otherwise prioritize distance
    });

    return alternatives;
  }

  // Notify patient about emergency
  async notifyPatientEmergency(appointment, options) {
    const patient = appointment.patient;
    const message = this.generateEmergencyMessage(appointment, options);

    // Send via multiple channels
    const notifications = [];

    // Email
    if (patient.user.email) {
      notifications.push(
        notificationService.sendEmail({
          to: patient.user.email,
          subject: 'Urgent: Appointment Rescheduling Required',
          html: message.html
        })
      );
    }

    // SMS
    notifications.push(
      this.sendSMS(patient.user.phone, message.sms)
    );

    // Push notification
    notifications.push(
      this.sendPushNotification(patient.user_id, message.push)
    );

    await Promise.allSettled(notifications);

    // Create notification records
    await prisma.notification.create({
      data: {
        user_id: patient.user_id,
        appointment_id: appointment.id,
        type: 'emergency_reschedule',
        channel: 'EMAIL',
        scheduledAt: new Date(),
        sentAt: new Date(),
        status: 'sent',
        metadata: JSON.stringify(options)
      }
    });
  }

  // Generate emergency message
  generateEmergencyMessage(appointment, options) {
    const alternativesList = options.alternatives
      .map((alt, idx) => `
        ${idx + 1}. Dr. ${alt.doctorName} at ${alt.clinicName}
           Time: ${new Date(alt.availableSlot.startTs).toLocaleString()}
           Distance: ${alt.distance.toFixed(1)} km away
      `)
      .join('\n');

    const sms = `Urgent: Your appointment on ${new Date(appointment.startTs).toLocaleString()} has been affected due to an emergency. Please check your email or app for rescheduling options. - HealBridge`;

    const push = {
      title: 'Appointment Rescheduling Required',
      body: 'Your appointment needs to be rescheduled due to an emergency. Tap to view options.',
      data: {
        appointmentId: appointment.id,
        type: 'emergency_reschedule'
      }
    };

    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #FF5722; color: white; padding: 20px; text-align: center;">
            <h2>Urgent: Appointment Rescheduling Required</h2>
          </div>
          
          <div style="padding: 30px;">
            <p>Dear ${appointment.patient.name},</p>
            
            <p>We sincerely apologize for the inconvenience. Your appointment scheduled for:</p>
            
            <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #FF5722;">
              <strong>Original Appointment</strong><br>
              Doctor: Dr. ${appointment.doctor.user_id}<br>
              Clinic: ${appointment.clinic.name}<br>
              Time: ${new Date(appointment.startTs).toLocaleString()}
            </div>
            
            <p>needs to be rescheduled due to an emergency situation with the doctor.</p>
            
            <h3>Alternative Options:</h3>
            
            ${options.alternatives.length > 0 ? `
              <p>We've found the following alternative doctors and time slots for you:</p>
              <div style="margin: 20px 0;">
                ${options.alternatives.map((alt, idx) => `
                  <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;">
                    <strong>Option ${idx + 1}</strong><br>
                    Doctor: ${alt.doctorName}<br>
                    Clinic: ${alt.clinicName}<br>
                    Time: ${new Date(alt.availableSlot.startTs).toLocaleString()}<br>
                    Distance: ${alt.distance.toFixed(1)} km from original clinic<br>
                    Rating: ${alt.rating.toFixed(1)} ⭐
                  </div>
                `).join('')}
              </div>
            ` : `
              <p>Unfortunately, we couldn't find immediate alternatives. You can:</p>
              <ul>
                <li>Choose to reschedule for a later date</li>
                <li>Request a refund (if applicable)</li>
              </ul>
            `}
            
            <div style="margin: 30px 0; text-align: center;">
              <a href="#" style="background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View & Choose Option in App
              </a>
            </div>
            
            <p>Please respond within 24 hours to secure your preferred alternative.</p>
            
            <p>We deeply regret this situation and appreciate your understanding.</p>
            
            <p>Best regards,<br>HealBridge Team</p>
          </div>
          
          <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666;">
            Need help? Contact us at support@healbridge.com
          </div>
        </body>
      </html>
    `;

    return { sms, push, html };
  }

  // Send SMS (placeholder)
  async sendSMS(phone, message) {
    // TODO: Integrate with SMS provider (Twilio, AWS SNS)
    console.log(`SMS to ${phone}: ${message}`);
    return { success: true };
  }

  // Send push notification (placeholder)
  async sendPushNotification(userId, notification) {
    // TODO: Integrate with push notification service (Firebase, OneSignal)
    console.log(`Push to user ${userId}:`, notification);
    return { success: true };
  }

  // Patient confirms reschedule choice
  async confirmReschedule(appointmentId, patientId, choice) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId }
    });

    if (!appointment || appointment.patient_id !== patientId) {
      throw new Error('Appointment not found or unauthorized');
    }

    if (choice.action === 'cancel_refund') {
      // Cancel and issue refund
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'CANCELLED' }
      });

      return {
        success: true,
        action: 'cancelled',
        message: 'Appointment cancelled. Refund will be processed.'
      };
    }

    if (choice.action === 'switch_doctor') {
      // Create new appointment with alternative doctor
      const newAppointment = await prisma.appointment.create({
        data: {
          doctor_id: choice.newDoctorId,
          clinic_id: choice.newClinicId,
          patient_id: patientId,
          startTs: new Date(choice.newStartTs),
          endTs: new Date(choice.newEndTs),
          status: 'CONFIRMED',
          visitType: appointment.visitType,
          address: appointment.address,
          feeMock: appointment.feeMock
        }
      });

      // Cancel old appointment
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'RESCHEDULED' }
      });

      return {
        success: true,
        action: 'switched',
        newAppointmentId: newAppointment.id,
        message: 'Successfully switched to new doctor'
      };
    }

    throw new Error('Invalid reschedule choice');
  }
}

export default new EmergencyService();

