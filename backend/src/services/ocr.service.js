import Tesseract from 'tesseract.js';
// ⚠️ PATCH FIX: Dynamic import to avoid pdf-parse test file issue
// pdf-parse has a bug where it tries to load test files on import
// We'll import it dynamically only when needed
import prisma from '../config/prisma.js';
import * as s3Client from '../config/s3.js';
import { promises as fs } from 'fs';

class OCRService {
  constructor() {
    // Drug patterns for extraction
    this.drugPatterns = {
      // Common drug name patterns
      name: /([A-Z][a-z]+(?:ol|in|ine|ide|ate|pam|azole|mycin|cillin|cycline))/g,
      // Dosage patterns: 500mg, 10 mg, 2.5mg
      dosage: /(\d+(?:\.\d+)?\s*(?:mg|g|ml|mcg|µg|IU))/gi,
      // Frequency patterns
      frequency: /(once|twice|thrice|1x|2x|3x|4x|daily|BD|TDS|QDS|OD|BID|TID|QID|PRN)/gi,
      // Route patterns
      route: /(oral|IV|IM|SC|topical|sublingual|rectal|inhalation)/gi,
      // Duration patterns
      duration: /(\d+\s*(?:day|days|week|weeks|month|months))/gi
    };

    // Common medicine catalog for normalization
    this.commonMedicines = [
      'Paracetamol', 'Ibuprofen', 'Aspirin', 'Amoxicillin', 'Azithromycin',
      'Omeprazole', 'Metformin', 'Amlodipine', 'Losartan', 'Atorvastatin',
      'Levothyroxine', 'Lisinopril', 'Metoprolol', 'Simvastatin', 'Gabapentin'
    ];
  }

  // Process uploaded document
  async processDocument(file, patientId, docType = 'PRESCRIPTION') {
    let text = '';
    let ocrConfidence = 0;

    try {
      // Extract text based on file type
      if (file.mimetype.includes('pdf')) {
        text = await this.extractTextFromPDF(file.path);
        ocrConfidence = 0.85; // PDF text extraction is generally reliable
      } else if (file.mimetype.includes('image')) {
        const result = await this.extractTextFromImage(file.path);
        text = result.text;
        ocrConfidence = result.confidence;
      } else {
        throw new Error('Unsupported file type');
      }

      // Upload to S3
      const fileUrl = await this.uploadToS3(file, patientId);

      // Extract structured data
      const structuredData = await this.extractMedicationData(text);

      // Save document
      const document = await prisma.document.create({
        data: {
          patient_id: patientId,
          type: docType,
          fileUrl,
          text,
          structuredJson: JSON.stringify(structuredData),
          ocrConfidence
        }
      });

      // Create medication entries if confidence is high enough
      if (ocrConfidence >= 0.7 && structuredData.medications.length > 0) {
        await this.createMedicationsFromOCR(patientId, document.id, structuredData.medications);
      }

      return {
        documentId: document.id,
        fileUrl,
        text,
        structuredData,
        confidence: ocrConfidence,
        needsReview: ocrConfidence < 0.7
      };

    } catch (error) {
      console.error('OCR processing failed:', error);
      throw error;
    }
  }

  // Extract text from image using Tesseract
  async extractTextFromImage(imagePath) {
    const result = await Tesseract.recognize(
      imagePath,
      'eng',
      {
        logger: m => console.log(m)
      }
    );

    return {
      text: result.data.text,
      confidence: result.data.confidence / 100
    };
  }

  // Extract text from PDF
  async extractTextFromPDF(pdfPath) {
    // 🔧 ROOT FIX: Dynamic import to avoid pdf-parse loading test files on startup
    // This loads pdf-parse only when actually processing a PDF
    const pdfParse = (await import('pdf-parse')).default;
    const dataBuffer = await fs.readFile(pdfPath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  }

  // Extract medication data from text
  async extractMedicationData(text) {
    const medications = [];
    const lines = text.split('\n').filter(line => line.trim().length > 0);

    for (const line of lines) {
      // Skip if line is too short or doesn't contain relevant info
      if (line.length < 5) continue;

      // Extract medication components
      const nameMatches = line.match(this.drugPatterns.name) || [];
      const dosageMatches = line.match(this.drugPatterns.dosage) || [];
      const frequencyMatches = line.match(this.drugPatterns.frequency) || [];
      const routeMatches = line.match(this.drugPatterns.route) || [];
      const durationMatches = line.match(this.drugPatterns.duration) || [];

      // If we found a potential medicine name
      if (nameMatches.length > 0 || dosageMatches.length > 0) {
        const medication = {
          name: this.normalizeMedicineName(nameMatches[0] || 'Unknown Medicine'),
          strength: dosageMatches[0] || '',
          form: this.inferForm(line),
          freq: this.normalizeFrequency(frequencyMatches[0] || 'as directed'),
          route: routeMatches[0] || 'oral',
          duration: durationMatches[0] || '',
          rawText: line,
          confidence: this.calculateConfidence(nameMatches, dosageMatches, frequencyMatches)
        };

        medications.push(medication);
      }
    }

    // Extract doctor info, date, etc.
    const metadata = this.extractMetadata(text);

    return {
      medications,
      metadata,
      rawText: text
    };
  }

  // Normalize medicine name
  normalizeMedicineName(name) {
    // Check against common medicines catalog
    const normalized = this.commonMedicines.find(
      med => med.toLowerCase() === name.toLowerCase()
    );
    return normalized || name;
  }

  // Normalize frequency
  normalizeFrequency(freq) {
    const freqMap = {
      'once': '1x daily',
      'twice': '2x daily',
      'thrice': '3x daily',
      'od': '1x daily',
      'bd': '2x daily',
      'bid': '2x daily',
      'tds': '3x daily',
      'tid': '3x daily',
      'qds': '4x daily',
      'qid': '4x daily',
      '1x': '1x daily',
      '2x': '2x daily',
      '3x': '3x daily',
      '4x': '4x daily'
    };

    return freqMap[freq.toLowerCase()] || freq;
  }

  // Infer medicine form
  inferForm(text) {
    const formMap = {
      'tablet': /tablet|tab/gi,
      'capsule': /capsule|cap/gi,
      'syrup': /syrup|liquid/gi,
      'injection': /injection|inj/gi,
      'cream': /cream|ointment/gi,
      'drops': /drops/gi,
      'inhaler': /inhaler|puff/gi
    };

    for (const [form, pattern] of Object.entries(formMap)) {
      if (pattern.test(text)) {
        return form;
      }
    }

    return 'tablet'; // Default
  }

  // Calculate confidence score
  calculateConfidence(nameMatches, dosageMatches, frequencyMatches) {
    let score = 0.5; // Base score
    
    if (nameMatches.length > 0) score += 0.3;
    if (dosageMatches.length > 0) score += 0.2;
    if (frequencyMatches.length > 0) score += 0.1;

    return Math.min(score, 1.0);
  }

  // Extract metadata from prescription
  extractMetadata(text) {
    const metadata = {
      doctorName: null,
      clinicName: null,
      date: null,
      licenseNo: null
    };

    // Try to extract doctor name (usually starts with Dr.)
    const doctorMatch = text.match(/Dr\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
    if (doctorMatch) {
      metadata.doctorName = doctorMatch[1];
    }

    // Try to extract date
    const dateMatch = text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/);
    if (dateMatch) {
      metadata.date = dateMatch[0];
    }

    // Try to extract license number
    const licenseMatch = text.match(/(?:License|Reg|Registration)[\s:#]*([A-Z0-9]+)/i);
    if (licenseMatch) {
      metadata.licenseNo = licenseMatch[1];
    }

    return metadata;
  }

  // Create medication entries from OCR data
  async createMedicationsFromOCR(patientId, documentId, medications) {
    const medicationRecords = [];

    for (const med of medications) {
      if (med.confidence >= 0.6) {
        const medication = await prisma.medication.create({
          data: {
            patient_id: patientId,
            name: med.name,
            strength: med.strength,
            form: med.form,
            freq: med.freq,
            route: med.route,
            durationDays: this.parseDuration(med.duration),
            startDate: new Date(),
            remindersEnabled: false // User should confirm first
          }
        });
        medicationRecords.push(medication);
      }
    }

    return medicationRecords;
  }

  // Parse duration string to days
  parseDuration(durationStr) {
    if (!durationStr) return null;

    const match = durationStr.match(/(\d+)\s*(day|week|month)/i);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    const multipliers = {
      'day': 1,
      'week': 7,
      'month': 30
    };

    return value * (multipliers[unit] || 1);
  }

  // ✅ ROOT FIX: Actual S3 upload implementation with security features
  async uploadToS3(file, patientId) {
    // Check if S3 is configured
    if (!process.env.S3_BUCKET || !process.env.AWS_ACCESS_KEY || !process.env.AWS_SECRET_KEY) {
      console.warn('⚠️  S3 not configured, using local file path');
      // Return local path as fallback for development
      return `file://temp/${file.filename}`;
    }

    try {
      // Generate unique key for S3
      const timestamp = Date.now();
      const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const key = `prescriptions/${patientId}/${timestamp}_${sanitizedFilename}`;

      // Read file content from temporary storage
      const fileContent = await fs.readFile(file.path);

      // Prepare S3 upload parameters with HIPAA/PHI compliance
      const params = {
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: fileContent,
        ContentType: file.mimetype,
        ACL: 'private', // ⚠️ CRITICAL: Keep private for PHI/HIPAA compliance
        ServerSideEncryption: 'AES256', // ⚠️ CRITICAL: Encrypt at rest for security
        Metadata: {
          patientId: patientId,
          uploadedAt: new Date().toISOString(),
          originalName: file.originalname,
          uploadedBy: 'ocr-service'
        },
        // Optional: Add tagging for lifecycle management and compliance
        Tagging: `Environment=production&DataType=PHI&PatientId=${patientId}`
      };

      console.log(`📤 Uploading file to S3: ${key}`);

      // Upload to S3 using AWS SDK
      const uploadResult = await s3Client.s3.upload(params).promise();
      
      console.log(`✅ File uploaded successfully to S3: ${key}`);
      console.log(`   URL: ${uploadResult.Location}`);
      console.log(`   ETag: ${uploadResult.ETag}`);

      // Clean up temporary file after successful upload
      try {
        await fs.unlink(file.path);
        console.log(`🗑️  Cleaned up temp file: ${file.path}`);
      } catch (unlinkError) {
        console.warn('⚠️  Failed to clean up temp file:', unlinkError.message);
        // Don't throw - upload was successful, cleanup is secondary
      }

      // Return the S3 URL
      return uploadResult.Location;

    } catch (error) {
      console.error('❌ S3 upload failed:', error);
      
      // Keep temp file on error for retry/debugging
      console.warn('⚠️  Temp file preserved at:', file.path);
      
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  // Generate signed URL for secure access to uploaded documents
  async generateSignedUrl(fileUrl, expiresIn = 3600) {
    // Check if S3 is configured
    if (!process.env.S3_BUCKET || !fileUrl.includes('s3.amazonaws.com')) {
      console.warn('⚠️  S3 not configured or URL is not an S3 URL');
      return fileUrl; // Return original URL for fallback
    }

    try {
      // Extract key from S3 URL
      const urlParts = fileUrl.split('.s3.amazonaws.com/');
      if (urlParts.length < 2) {
        throw new Error('Invalid S3 URL format');
      }
      
      const key = urlParts[1];

      // Generate signed URL
      const signedUrl = s3Client.s3.getSignedUrl('getObject', {
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Expires: expiresIn // Default: 1 hour
      });

      console.log(`🔐 Generated signed URL for: ${key} (expires in ${expiresIn}s)`);
      
      return signedUrl;

    } catch (error) {
      console.error('❌ Failed to generate signed URL:', error);
      return fileUrl; // Fallback to original URL
    }
  }

  // Delete file from S3 (for GDPR compliance / data deletion)
  async deleteFromS3(fileUrl) {
    // Check if S3 is configured
    if (!process.env.S3_BUCKET || !fileUrl.includes('s3.amazonaws.com')) {
      console.warn('⚠️  S3 not configured or URL is not an S3 URL');
      return { success: false, reason: 'Not an S3 file' };
    }

    try {
      // Extract key from S3 URL
      const urlParts = fileUrl.split('.s3.amazonaws.com/');
      if (urlParts.length < 2) {
        throw new Error('Invalid S3 URL format');
      }
      
      const key = urlParts[1];

      // Delete from S3
      await s3Client.s3.deleteObject({
        Bucket: process.env.S3_BUCKET,
        Key: key
      }).promise();

      console.log(`🗑️  Deleted file from S3: ${key}`);
      
      return { success: true, key };

    } catch (error) {
      console.error('❌ Failed to delete from S3:', error);
      return { success: false, error: error.message };
    }
  }

  // Confirm OCR extracted medications
  async confirmMedication(medicationId, corrections = {}) {
    return await prisma.medication.update({
      where: { id: medicationId },
      data: {
        ...corrections,
        remindersEnabled: true
      }
    });
  }
}

export default new OCRService();

