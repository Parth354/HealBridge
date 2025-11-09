/**
 * Script to verify that the Patient schema matches app requirements
 * 
 * Usage: node scripts/verify-schema.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifySchema() {
  try {
    console.log('🔍 Verifying Patient schema...\n');

    // Get schema information by trying to query the Patient model
    const samplePatient = await prisma.patient.findFirst();
    
    if (!samplePatient) {
      console.log('⚠️  No patients found in database. Creating a test patient to verify schema...');
      
      // Try to create a test patient to verify schema structure
      const testUser = await prisma.user.create({
        data: {
          role: 'PATIENT',
          phone: '9999999999',
          verified: true
        }
      });

      const testPatient = await prisma.patient.create({
        data: {
          user_id: testUser.id,
          name: 'Test Patient',
          dob: new Date('1990-01-01'),
          gender: 'Male',
          allergies: '',
          chronicConditions: '',
          emergencyContact: '1234567890'
        }
      });

      console.log('✅ Schema verification passed! Test patient created.');
      console.log('📋 Patient schema fields:');
      console.log(`   - id: ${typeof testPatient.id}`);
      console.log(`   - user_id: ${typeof testPatient.user_id}`);
      console.log(`   - name: ${typeof testPatient.name}`);
      console.log(`   - dob: ${testPatient.dob instanceof Date ? 'Date' : typeof testPatient.dob}`);
      console.log(`   - gender: ${typeof testPatient.gender}`);
      console.log(`   - allergies: ${typeof testPatient.allergies}`);
      console.log(`   - chronicConditions: ${typeof testPatient.chronicConditions}`);
      console.log(`   - emergencyContact: ${typeof testPatient.emergencyContact}`);
      
      // Clean up test data
      await prisma.patient.delete({ where: { id: testPatient.id } });
      await prisma.user.delete({ where: { id: testUser.id } });
      console.log('\n🧹 Test data cleaned up');
      
    } else {
      console.log('✅ Schema verification passed!');
      console.log('📋 Patient schema fields found:');
      console.log(`   - id: ${typeof samplePatient.id}`);
      console.log(`   - user_id: ${typeof samplePatient.user_id}`);
      console.log(`   - name: ${typeof samplePatient.name}`);
      console.log(`   - dob: ${samplePatient.dob instanceof Date ? 'Date' : typeof samplePatient.dob}`);
      console.log(`   - gender: ${typeof samplePatient.gender}`);
      console.log(`   - allergies: ${typeof samplePatient.allergies} (value: "${samplePatient.allergies || ''}")`);
      console.log(`   - chronicConditions: ${typeof samplePatient.chronicConditions} (value: "${samplePatient.chronicConditions || ''}")`);
      console.log(`   - emergencyContact: ${typeof samplePatient.emergencyContact}`);
    }

    // Verify required fields
    const requiredFields = [
      'id',
      'user_id',
      'name',
      'dob',
      'gender',
      'allergies',
      'chronicConditions',
      'emergencyContact'
    ];

    console.log('\n📝 Required fields check:');
    requiredFields.forEach(field => {
      if (samplePatient && field in samplePatient) {
        console.log(`   ✅ ${field}`);
      } else {
        console.log(`   ❌ ${field} - MISSING!`);
      }
    });

    console.log('\n✨ Schema verification complete!');

  } catch (error) {
    console.error('❌ Schema verification failed:', error.message);
    
    if (error.message.includes('Unknown arg')) {
      console.error('\n💡 Tip: The schema might be missing a field. Run:');
      console.error('   npm run prisma:generate');
      console.error('   npm run prisma:db:push');
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run verification
verifySchema();

