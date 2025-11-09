/**
 * Script to update existing patient profiles
 * Ensures all patients have default values for allergies and chronicConditions
 * 
 * Usage: node scripts/update-patient-profiles.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updatePatientProfiles() {
  try {
    console.log('🔄 Starting patient profile update...');

    // Find all patients with null or empty allergies/chronicConditions
    const patients = await prisma.patient.findMany({
      where: {
        OR: [
          { allergies: null },
          { allergies: '' },
          { chronicConditions: null },
          { chronicConditions: '' }
        ]
      }
    });

    console.log(`📊 Found ${patients.length} patients to update`);

    if (patients.length === 0) {
      console.log('✅ All patient profiles are up to date!');
      return;
    }

    // Update each patient
    let updated = 0;
    for (const patient of patients) {
      const updateData = {};
      
      if (!patient.allergies || patient.allergies === '') {
        updateData.allergies = '';
      }
      
      if (!patient.chronicConditions || patient.chronicConditions === '') {
        updateData.chronicConditions = '';
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.patient.update({
          where: { id: patient.id },
          data: updateData
        });
        updated++;
        console.log(`✅ Updated patient: ${patient.name} (ID: ${patient.id})`);
      }
    }

    console.log(`\n✨ Successfully updated ${updated} patient profiles!`);
    
    // Verify updates
    const verify = await prisma.patient.findMany({
      where: {
        OR: [
          { allergies: null },
          { allergies: '' },
          { chronicConditions: null },
          { chronicConditions: '' }
        ]
      }
    });

    if (verify.length === 0) {
      console.log('✅ Verification passed: All patients have proper default values');
    } else {
      console.log(`⚠️  Warning: ${verify.length} patients still need updates`);
    }

  } catch (error) {
    console.error('❌ Error updating patient profiles:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updatePatientProfiles();

