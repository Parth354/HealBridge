import prisma from '../config/prisma.js';
import notificationService from './notification.service.js';
import PDFDocument from 'pdfkit';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as s3Client from '../config/s3.js';
import config from '../config/env.js';

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

  // ✅ Generate prescription PDF using PDFKit
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

    try {
      // Create PDF using PDFKit
      await this.createPDFDocument(filePath, data);
      
      console.log(`✅ PDF generated: ${fileName}`);

      // Upload to S3 if configured
      const pdfUrl = await this.uploadPrescriptionToS3(filePath, fileName, appointment.patient_id);
      
      // Clean up local file after upload (keep if S3 not configured)
      if (pdfUrl.includes('s3.amazonaws.com')) {
        try {
          await fs.unlink(filePath);
          console.log(`🗑️  Cleaned up temp PDF: ${fileName}`);
        } catch (unlinkError) {
          console.warn('⚠️  Failed to clean up temp file:', unlinkError.message);
        }
      }

      return pdfUrl;

    } catch (error) {
      console.error('❌ PDF generation failed:', error);
      throw new Error(`Failed to generate prescription PDF: ${error.message}`);
    }
  }

  // Create PDF document using PDFKit
  async createPDFDocument(filePath, data) {
    const { appointment, medications, diagnosis, notes, labTests } = data;
    const doctor = appointment.doctor;
    const patient = appointment.patient;
    const clinic = appointment.clinic;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const stream = doc.pipe(require('fs').createWriteStream(filePath));

      // Header - Clinic Info
      doc.fontSize(22)
         .fillColor('#2196F3')
         .text(clinic.name, { align: 'center' });
      
      doc.moveDown(0.5);
      doc.fontSize(10)
         .fillColor('#000000')
         .text(clinic.address, { align: 'center' });
      
      doc.moveDown(0.3);
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .text(`Dr. ${doctor.user_id}`, { align: 'center' });
      
      doc.fontSize(10)
         .font('Helvetica')
         .text(doctor.specialties.join(', '), { align: 'center' });
      
      doc.fontSize(9)
         .text(`License No: ${doctor.licenseNo}`, { align: 'center' });

      // Horizontal line
      doc.moveDown(1);
      doc.strokeColor('#333333')
         .lineWidth(2)
         .moveTo(50, doc.y)
         .lineTo(545, doc.y)
         .stroke();

      // Patient Information Box
      doc.moveDown(1);
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Patient Information');
      
      doc.moveDown(0.5);
      doc.rect(50, doc.y, 495, 80)
         .fillAndStroke('#f5f5f5', '#cccccc');
      
      const patientInfoY = doc.y + 10;
      doc.fillColor('#000000')
         .fontSize(10)
         .font('Helvetica')
         .text(`Name: ${patient.name}`, 60, patientInfoY);
      
      doc.text(`Age: ${this.calculateAge(patient.dob)} years | Gender: ${patient.gender}`, 60, patientInfoY + 20);
      doc.text(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 60, patientInfoY + 40);
      doc.text(`Appointment ID: ${appointment.id}`, 60, patientInfoY + 60);

      // Move past the box
      doc.y = patientInfoY + 90;

      // Diagnosis
      if (diagnosis) {
        doc.moveDown(1);
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('Diagnosis');
        
        doc.moveDown(0.5);
        doc.fontSize(10)
           .font('Helvetica')
           .text(diagnosis, { align: 'justify' });
      }

      // Medications (Rx Symbol)
      doc.moveDown(1.5);
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .fillColor('#4CAF50')
         .text('℞', 50, doc.y);
      
      doc.fontSize(12)
         .fillColor('#000000')
         .text('Medications', 70, doc.y - 5);

      doc.moveDown(1);

      // Medications Table
      const tableTop = doc.y;
      const tableHeaders = ['Medicine', 'Dosage', 'Frequency', 'Route', 'Duration'];
      const colWidths = [150, 80, 80, 60, 75];
      let xPos = 50;

      // Table Headers
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor('#ffffff');
      
      doc.rect(50, tableTop, 495, 25)
         .fill('#4CAF50');

      tableHeaders.forEach((header, i) => {
        doc.fillColor('#ffffff')
           .text(header, xPos + 5, tableTop + 7, { width: colWidths[i], align: 'left' });
        xPos += colWidths[i];
      });

      // Table Rows
      let rowY = tableTop + 25;
      doc.fillColor('#000000')
         .font('Helvetica');

      medications.forEach((med, index) => {
        const isEvenRow = index % 2 === 0;
        
        // Row background
        if (isEvenRow) {
          doc.rect(50, rowY, 495, 30)
             .fill('#f9f9f9');
        }

        xPos = 50;
        const rowData = [
          med.name,
          `${med.strength} ${med.form}`,
          med.freq,
          med.route,
          med.durationDays ? `${med.durationDays} days` : '-'
        ];

        rowData.forEach((text, i) => {
          doc.fillColor('#000000')
             .text(text, xPos + 5, rowY + 7, { 
               width: colWidths[i] - 10, 
               align: 'left',
               lineBreak: false 
             });
          xPos += colWidths[i];
        });

        rowY += 30;
      });

      // Table border
      doc.rect(50, tableTop, 495, rowY - tableTop)
         .stroke('#cccccc');

      // Lab Tests
      if (labTests && labTests.length > 0) {
        doc.y = rowY + 20;
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('Recommended Lab Tests');
        
        doc.moveDown(0.5);
        doc.fontSize(10)
           .font('Helvetica');
        
        labTests.forEach(test => {
          doc.text(`• ${test}`);
        });
      }

      // Additional Notes
      if (notes) {
        doc.y = rowY + (labTests && labTests.length > 0 ? 80 : 20);
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('Additional Notes');
        
        doc.moveDown(0.5);
        doc.fontSize(10)
           .font('Helvetica')
           .text(notes, { align: 'justify' });
      }

      // Signature Area
      const signatureY = doc.page.height - 150;
      doc.y = signatureY;
      
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text("Doctor's Signature");
      
      doc.moveDown(2);
      doc.strokeColor('#000000')
         .lineWidth(1)
         .moveTo(50, doc.y)
         .lineTo(200, doc.y)
         .stroke();
      
      doc.moveDown(0.5);
      doc.fontSize(10)
         .font('Helvetica')
         .text(`Dr. ${doctor.user_id}`);
      
      doc.text(`License: ${doctor.licenseNo}`);
      doc.text(new Date().toLocaleDateString());

      // Footer
      doc.fontSize(8)
         .fillColor('#666666')
         .text(
           'This is a digitally generated prescription from HealBridge.',
           50,
           doc.page.height - 60,
           { align: 'center' }
         );
      
      doc.text(
        `Generated on ${new Date().toLocaleString()}`,
        50,
        doc.page.height - 45,
        { align: 'center' }
      );

      // Finalize PDF
      doc.end();

      stream.on('finish', () => resolve());
      stream.on('error', (error) => reject(error));
    });
  }

  // Upload prescription PDF to S3
  async uploadPrescriptionToS3(filePath, fileName, patientId) {
    // Check if S3 is configured
    if (!config.S3_BUCKET || !config.AWS_ACCESS_KEY || !config.AWS_SECRET_KEY) {
      console.warn('⚠️  S3 not configured, using local file path');
      return `file://temp/prescriptions/${fileName}`;
    }

    try {
      // Read PDF file
      const fileContent = await fs.readFile(filePath);

      // Prepare S3 key
      const key = `prescriptions/${patientId}/${fileName}`;

      // Upload to S3
      const params = {
        Bucket: config.S3_BUCKET,
        Key: key,
        Body: fileContent,
        ContentType: 'application/pdf',
        ACL: 'private', // HIPAA compliance
        ServerSideEncryption: 'AES256', // Encrypt at rest
        Metadata: {
          patientId: patientId,
          uploadedAt: new Date().toISOString(),
          documentType: 'prescription',
          generatedBy: 'prescription-service'
        }
      };

      console.log(`📤 Uploading prescription to S3: ${key}`);
      
      const uploadResult = await s3Client.s3.upload(params).promise();
      
      console.log(`✅ Prescription uploaded to S3: ${uploadResult.Location}`);
      
      return uploadResult.Location;

    } catch (error) {
      console.error('❌ S3 upload failed:', error);
      
      // Fallback to local file
      console.warn('⚠️  Using local file path as fallback');
      return `file://temp/prescriptions/${fileName}`;
    }
  }

  // Generate signed URL for prescription PDF
  async getSignedPrescriptionUrl(pdfUrl, expiresIn = 3600) {
    // Check if it's an S3 URL
    if (!pdfUrl.includes('s3.amazonaws.com')) {
      return pdfUrl; // Return original URL for non-S3 files
    }

    try {
      // Extract key from S3 URL
      const urlParts = pdfUrl.split('.s3.amazonaws.com/');
      if (urlParts.length < 2) {
        const urlParts2 = pdfUrl.split('.s3.');
        if (urlParts2.length >= 2) {
          const keyPart = urlParts2[1].split('/').slice(1).join('/');
          return this.generateSignedUrl(keyPart, expiresIn);
        }
        throw new Error('Invalid S3 URL format');
      }
      
      const key = urlParts[1];
      return this.generateSignedUrl(key, expiresIn);

    } catch (error) {
      console.error('❌ Failed to generate signed URL:', error);
      return pdfUrl; // Fallback to original URL
    }
  }

  // Generate signed URL helper
  generateSignedUrl(key, expiresIn) {
    const signedUrl = s3Client.s3.getSignedUrl('getObject', {
      Bucket: config.S3_BUCKET,
      Key: key,
      Expires: expiresIn
    });

    console.log(`🔐 Generated signed URL for: ${key} (expires in ${expiresIn}s)`);
    
    return signedUrl;
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

  // Get prescription details with signed URL
  async getPrescription(prescriptionId, includeSignedUrl = true) {
    const prescription = await prisma.prescription.findUnique({
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

    if (!prescription) {
      return null;
    }

    // Generate signed URL for PDF access if requested
    if (includeSignedUrl && prescription.pdfUrl) {
      prescription.signedPdfUrl = await this.getSignedPrescriptionUrl(prescription.pdfUrl);
    }

    return prescription;
  }

  // Get patient's prescription history with signed URLs
  async getPatientPrescriptions(patientId, includeSignedUrls = true) {
    const prescriptions = await prisma.prescription.findMany({
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

    // Generate signed URLs for all prescriptions if requested
    if (includeSignedUrls) {
      await Promise.all(
        prescriptions.map(async (prescription) => {
          if (prescription.pdfUrl) {
            prescription.signedPdfUrl = await this.getSignedPrescriptionUrl(prescription.pdfUrl);
          }
        })
      );
    }

    return prescriptions;
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

