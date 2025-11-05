import prisma from '../config/prisma.js';
import axios from 'axios';
import Queue from 'bull';

class LicenseVerificationService {
  constructor() {
    // Create verification queue
    this.verificationQueue = new Queue('license-verification', process.env.REDIS_URL || 'redis://localhost:6379');
    this.setupQueueProcessor();
  }

  setupQueueProcessor() {
    this.verificationQueue.process(async (job) => {
      const { doctorId } = job.data;
      return await this.verifyDoctorLicense(doctorId);
    });
  }

  // Request license verification
  async requestVerification(doctorId) {
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId }
    });

    if (!doctor) {
      throw new Error('Doctor not found');
    }

    if (doctor.verifiedStatus === 'VERIFIED') {
      return { message: 'Doctor is already verified', status: 'VERIFIED' };
    }

    // Queue verification job
    await this.verificationQueue.add({ doctorId });

    return {
      message: 'Verification request submitted',
      status: 'PENDING',
      doctorId
    };
  }

  // Verify doctor license
  async verifyDoctorLicense(doctorId) {
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      include: { user: true }
    });

    if (!doctor) {
      throw new Error('Doctor not found');
    }

    try {
      // Step 1: Check license number format
      const formatValid = this.validateLicenseFormat(doctor.licenseNo);
      
      if (!formatValid) {
        await this.updateVerificationStatus(doctorId, 'REJECTED', 'Invalid license number format');
        return { success: false, reason: 'Invalid format' };
      }

      // Step 2: Check against medical council registry (simulated)
      const registryCheck = await this.checkMedicalRegistry(doctor.licenseNo, doctor.specialties);
      
      if (!registryCheck.found) {
        await this.updateVerificationStatus(doctorId, 'REJECTED', 'License not found in registry');
        return { success: false, reason: 'Not found in registry' };
      }

      // Step 3: Verify specialties match
      const specialtiesMatch = this.verifySpecialties(doctor.specialties, registryCheck.registeredSpecialties);
      
      if (!specialtiesMatch) {
        await this.updateVerificationStatus(doctorId, 'PENDING', 'Specialties mismatch - manual review required');
        return { success: false, reason: 'Specialties mismatch', requiresManualReview: true };
      }

      // Step 4: Check for suspensions or disciplinary actions
      const goodStanding = await this.checkDisciplinaryStatus(doctor.licenseNo);
      
      if (!goodStanding) {
        await this.updateVerificationStatus(doctorId, 'REJECTED', 'Disciplinary issues found');
        return { success: false, reason: 'Disciplinary issues' };
      }

      // All checks passed
      await this.updateVerificationStatus(doctorId, 'VERIFIED', 'Successfully verified');
      
      return {
        success: true,
        doctorId,
        verifiedAt: new Date(),
        message: 'Doctor successfully verified'
      };

    } catch (error) {
      console.error('License verification failed:', error);
      await this.updateVerificationStatus(doctorId, 'PENDING', 'Verification error - manual review required');
      return { success: false, reason: error.message, requiresManualReview: true };
    }
  }

  // Validate license number format
  validateLicenseFormat(licenseNo) {
    // Basic format validation (adjust based on actual requirements)
    // Example: Must be alphanumeric, 6-15 characters
    const regex = /^[A-Z0-9]{6,15}$/i;
    return regex.test(licenseNo);
  }

  // Check medical council registry
  // ⚠️ PATCH FIX: Simulated registry check
  // 🔧 ROOT FIX REQUIRED: Integrate with actual medical council APIs
  async checkMedicalRegistry(licenseNo, specialties) {
    // TODO: Replace with actual medical council API integration
    //
    // ROOT FIX Options by Country:
    // -----------------------------------------
    //
    // INDIA: National Medical Commission (NMC)
    // -----------------------------------------
    // Website: https://www.nmc.org.in/information-desk/indian-medical-register/
    // 
    // try {
    //   // Check if NMC provides API (as of 2024, they have online verification)
    //   const response = await axios.get('https://www.nmc.org.in/MCIRest/open/getPaginatedData', {
    //     params: {
    //       service: 'searchDoctor',
    //       registrationNo: licenseNo
    //     },
    //     timeout: 10000
    //   });
    //   
    //   if (response.data && response.data.length > 0) {
    //     const doctor = response.data[0];
    //     return {
    //       found: true,
    //       licenseNo: doctor.registrationNo,
    //       doctorName: doctor.name,
    //       registeredSpecialties: doctor.qualifications || [],
    //       registrationDate: new Date(doctor.registrationDate),
    //       status: doctor.status === 'Permanent' ? 'active' : 'inactive'
    //     };
    //   }
    //   return { found: false };
    // } catch (error) {
    //   console.error('NMC API failed:', error);
    //   // Fallback to manual verification queue
    //   return { found: null, requiresManualReview: true };
    // }
    //
    // USA: National Provider Identifier (NPI) Registry
    // -----------------------------------------
    // API: https://npiregistry.cms.hhs.gov/api/
    // 
    // try {
    //   const response = await axios.get('https://npiregistry.cms.hhs.gov/api/', {
    //     params: {
    //       number: licenseNo,
    //       version: '2.1'
    //     }
    //   });
    //   
    //   if (response.data.result_count > 0) {
    //     const provider = response.data.results[0];
    //     return {
    //       found: true,
    //       licenseNo: provider.number,
    //       doctorName: `${provider.basic.first_name} ${provider.basic.last_name}`,
    //       registeredSpecialties: provider.taxonomies.map(t => t.desc),
    //       status: provider.basic.status
    //     };
    //   }
    //   return { found: false };
    // } catch (error) {
    //   console.error('NPI Registry failed:', error);
    //   return { found: false };
    // }
    //
    // UK: General Medical Council (GMC)
    // -----------------------------------------
    // Website: https://www.gmc-uk.org/
    // Note: GMC provides online verification but may require scraping
    //
    // ALTERNATIVE: Manual Verification Workflow
    // -----------------------------------------
    // If no API is available, implement manual verification:
    // 1. Create verification ticket in database
    // 2. Admin reviews license document
    // 3. Admin checks medical council website manually
    // 4. Admin approves/rejects with notes
    
    try {
      // ⚠️ PATCH FIX: Simulated successful verification
      // This will pass ALL license numbers - NOT SAFE FOR PRODUCTION
      console.log(`⚠️ Simulated registry check for license: ${licenseNo}`);
      
      const simulatedRegistry = {
        found: true,
        licenseNo: licenseNo,
        doctorName: 'Dr. Example',
        registeredSpecialties: specialties,
        registrationDate: new Date('2015-01-01'),
        expiryDate: new Date('2030-12-31'),
        status: 'active'
      };

      return simulatedRegistry;
      
    } catch (error) {
      console.error('Registry check failed:', error);
      return { found: false };
    }
  }

  // Verify specialties match
  verifySpecialties(claimedSpecialties, registeredSpecialties) {
    if (!registeredSpecialties || registeredSpecialties.length === 0) {
      return true; // No registered specialties to compare
    }

    // Check if all claimed specialties are in registered specialties
    return claimedSpecialties.every(claimed =>
      registeredSpecialties.some(registered =>
        registered.toLowerCase() === claimed.toLowerCase()
      )
    );
  }

  // Check disciplinary status
  async checkDisciplinaryStatus(licenseNo) {
    // In production, check against disciplinary databases
    // For now, simulate a check
    
    try {
      // Simulated check - in production, call actual API
      // const response = await axios.get(`https://nmc.org.in/api/disciplinary/${licenseNo}`);
      
      // Simulate good standing
      return true;
      
    } catch (error) {
      console.error('Disciplinary check failed:', error);
      return false;
    }
  }

  // Update verification status
  async updateVerificationStatus(doctorId, status, notes = '') {
    return await prisma.doctor.update({
      where: { id: doctorId },
      data: {
        verifiedStatus: status,
        updatedAt: new Date()
      }
    });
  }

  // Manual verification by admin
  async manualVerification(doctorId, adminId, status, notes) {
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId }
    });

    if (!doctor) {
      throw new Error('Doctor not found');
    }

    if (!['VERIFIED', 'REJECTED'].includes(status)) {
      throw new Error('Invalid status. Must be VERIFIED or REJECTED');
    }

    await this.updateVerificationStatus(doctorId, status, notes);

    // Log manual verification
    // In production, create an audit log entry
    console.log(`Manual verification by ${adminId}: Doctor ${doctorId} ${status}`);

    return {
      success: true,
      doctorId,
      status,
      verifiedBy: adminId,
      notes
    };
  }

  // Get verification status
  async getVerificationStatus(doctorId) {
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      include: { user: true }
    });

    if (!doctor) {
      throw new Error('Doctor not found');
    }

    return {
      doctorId,
      licenseNo: doctor.licenseNo,
      verifiedStatus: doctor.verifiedStatus,
      specialties: doctor.specialties,
      updatedAt: doctor.updatedAt
    };
  }

  // Get doctors pending verification
  async getPendingVerifications() {
    return await prisma.doctor.findMany({
      where: {
        verifiedStatus: 'PENDING'
      },
      include: {
        user: true,
        clinics: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
  }

  // Revalidate license (periodic check)
  async revalidateAllLicenses() {
    const verifiedDoctors = await prisma.doctor.findMany({
      where: {
        verifiedStatus: 'VERIFIED'
      }
    });

    const results = [];

    for (const doctor of verifiedDoctors) {
      try {
        const result = await this.verifyDoctorLicense(doctor.id);
        results.push({ doctorId: doctor.id, result });
      } catch (error) {
        results.push({ doctorId: doctor.id, error: error.message });
      }
    }

    return {
      total: verifiedDoctors.length,
      processed: results.length,
      results
    };
  }
}

export default new LicenseVerificationService();

