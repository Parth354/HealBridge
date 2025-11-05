import prisma from '../config/prisma.js';
import notificationService from './notification.service.js';
// import PDFDocument from 'pdfkit'; // We'll need to add this
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PrescriptionService {
  // Create prescription after consultation
  async createPrescription(data) {
    const {
      appointmentId,
      medications,
      diagnosis,
      notes,
      followUpDays,
      labTests
    } = data;

    // Get appointment details
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
        clinic: true
      }
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (appointment.status !== 'STARTED' && appointment.status !== 'COMPLETED') {
      throw new Error('Appointment must be in progress to create prescription');
    }

    // Generate PDF
    const pdfUrl = await this.generatePrescriptionPDF({
      appointment,
      medications,
      diagnosis,
      notes,
      labTests
    });

    // Create prescription record
    const prescription = await prisma.prescription.create({
      data: {
        appointment_id: appointmentId,
        pdfUrl,
        summaryJson: JSON.stringify({
          diagnosis,
          notes,
          followUpDays,
          labTests,
          medicationCount: medications.length
        })
      }
    });

    // Create medication records
    const medicationRecords = await Promise.all(
      medications.map(med =>
        prisma.medication.create({
          data: {
            patient_id: appointment.patient_id,
            prescription_id: prescription.id,
            name: med.name,
            strength: med.strength,
            form: med.form,
            freq: med.freq,
            route: med.route || 'oral',
            durationDays: med.durationDays,
            startDate: new Date(),
            remindersEnabled: false // User will enable after confirmation
          }
        })
      )
    );

    // Send prescription notifications
    await notificationService.queueNotification('prescription_mail', {
      prescriptionId: prescription.id,
      patientEmail: appointment.patient.user.email
    });

    return {
      prescriptionId: prescription.id,
      pdfUrl,
      medications: medicationRecords,
      message: 'Prescription created successfully'
    };
  }

  // Generate prescription PDF
  async generatePrescriptionPDF(data) {
    const { appointment, medications, diagnosis, notes, labTests } = data;
    
    // Create PDF directory if it doesn't exist
    const pdfDir = path.join(__dirname, '../../temp/prescriptions');
    try {
      await fs.mkdir(pdfDir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }

    const fileName = `prescription_${appointment.id}_${Date.now()}.pdf`;
    const filePath = path.join(pdfDir, fileName);

    // Create PDF (simplified version - would use PDFKit or similar)
    // For now, return a placeholder URL
    const pdfContent = this.generatePrescriptionHTML(data);
    
    // In production, this would:
    // 1. Generate actual PDF using PDFKit or Puppeteer
    // 2. Upload to S3
    // 3. Return S3 URL

    // Placeholder: Save HTML version
    await fs.writeFile(filePath.replace('.pdf', '.html'), pdfContent);

    // Return placeholder URL
    return `https://healbridge-bucket.s3.amazonaws.com/prescriptions/${fileName}`;
  }

  // Generate prescription HTML (for PDF generation)
  generatePrescriptionHTML(data) {
    const { appointment, medications, diagnosis, notes, labTests } = data;
    const doctor = appointment.doctor;
    const patient = appointment.patient;
    const clinic = appointment.clinic;

    const medicationRows = medications.map(med => `
      <tr>
        <td>${med.name}</td>
        <td>${med.strength} ${med.form}</td>
        <td>${med.freq}</td>
        <td>${med.route}</td>
        <td>${med.durationDays || '-'} days</td>
      </tr>
    `).join('');

    const labTestsList = labTests?.map(test => `<li>${test}</li>`).join('') || '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .clinic-name { font-size: 24px; font-weight: bold; color: #2196F3; }
          .doctor-info { margin-top: 10px; }
          .patient-info { background: #f5f5f5; padding: 15px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #4CAF50; color: white; }
          .section-title { font-size: 18px; font-weight: bold; margin-top: 30px; margin-bottom: 10px; color: #333; }
          .footer { margin-top: 50px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 12px; color: #666; }
          .signature { margin-top: 60px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="clinic-name">${clinic.name}</div>
          <div class="doctor-info">
            <strong>Dr. ${doctor.user_id}</strong><br>
            ${doctor.specialties.join(', ')}<br>
            License No: ${doctor.licenseNo}<br>
            ${clinic.address}
          </div>
        </div>

        <div class="patient-info">
          <strong>Patient Information</strong><br>
          Name: ${patient.name}<br>
          Age: ${this.calculateAge(patient.dob)} years | Gender: ${patient.gender}<br>
          Date: ${new Date().toLocaleDateString()}<br>
          Appointment ID: ${appointment.id}
        </div>

        ${diagnosis ? `
          <div class="section-title">Diagnosis</div>
          <p>${diagnosis}</p>
        ` : ''}

        <div class="section-title">Medications</div>
        <table>
          <thead>
            <tr>
              <th>Medicine Name</th>
              <th>Dosage</th>
              <th>Frequency</th>
              <th>Route</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            ${medicationRows}
          </tbody>
        </table>

        ${labTests && labTests.length > 0 ? `
          <div class="section-title">Recommended Lab Tests</div>
          <ul>${labTestsList}</ul>
        ` : ''}

        ${notes ? `
          <div class="section-title">Additional Notes</div>
          <p>${notes}</p>
        ` : ''}

        <div class="signature">
          <strong>Doctor's Signature</strong><br>
          Dr. ${doctor.user_id}<br>
          ${new Date().toLocaleDateString()}
        </div>

        <div class="footer">
          This is a digitally generated prescription from HealBridge.<br>
          For any queries, please contact the clinic at ${clinic.address}
        </div>
      </body>
      </html>
    `;
  }

  // Get prescription details
  async getPrescription(prescriptionId) {
    return await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        medications: true,
        appointment: {
          include: {
            doctor: { include: { user: true } },
            patient: { include: { user: true } },
            clinic: true
          }
        }
      }
    });
  }

  // Get patient's prescription history
  async getPatientPrescriptions(patientId) {
    return await prisma.prescription.findMany({
      where: {
        appointment: {
          patient_id: patientId
        }
      },
      include: {
        medications: true,
        appointment: {
          include: {
            doctor: true,
            clinic: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  // Helper: Calculate age
  calculateAge(dob) {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  // Resend prescription email
  async resendPrescription(prescriptionId) {
    const prescription = await this.getPrescription(prescriptionId);
    
    if (!prescription) {
      throw new Error('Prescription not found');
    }

    await notificationService.queueNotification('prescription_mail', {
      prescriptionId,
      patientEmail: prescription.appointment.patient.user.email
    });

    return { success: true, message: 'Prescription resent successfully' };
  }
}

export default new PrescriptionService();

