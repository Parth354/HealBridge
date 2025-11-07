/**
 * Update Doctor Verification Status Script
 * 
 * Usage:
 * node scripts/update-verification.js <phone_number> <status>
 * 
 * Status options: PENDING, VERIFIED, REJECTED
 * 
 * Example:
 * node scripts/update-verification.js 8595511863 VERIFIED
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateVerification() {
  try {
    const args = process.argv.slice(2);

    if (args.length === 0) {
      console.log('\n🔐 Update Doctor Verification Status\n');
      console.log('Usage: node scripts/update-verification.js <phone_number> <status>');
      console.log('\nStatus options:');
      console.log('  - PENDING');
      console.log('  - VERIFIED');
      console.log('  - REJECTED');
      console.log('\nExample: node scripts/update-verification.js 8595511863 VERIFIED\n');
      process.exit(0);
    }

    const [phone, status] = args;

    if (!phone) {
      console.error('❌ Phone number is required');
      process.exit(1);
    }

    if (!status || !['PENDING', 'VERIFIED', 'REJECTED'].includes(status)) {
      console.error('❌ Invalid status. Use: PENDING, VERIFIED, or REJECTED');
      process.exit(1);
    }

    console.log('\n🔍 Searching for doctor with phone:', phone);

    // Find user by phone
    const user = await prisma.user.findUnique({
      where: { phone },
      include: { doctor: true }
    });

    if (!user) {
      console.error(`❌ No user found with phone: ${phone}`);
      process.exit(1);
    }

    if (!user.doctor) {
      console.error(`❌ User ${phone} is not a doctor`);
      process.exit(1);
    }

    console.log('✅ Found doctor:', user.doctor.id);
    console.log('   Current status:', user.doctor.verifiedStatus);

    // Update verification status
    const updated = await prisma.doctor.update({
      where: { id: user.doctor.id },
      data: { verifiedStatus: status }
    });

    console.log('\n✅ Verification status updated successfully!');
    console.log('   New status:', updated.verifiedStatus);
    console.log('   Doctor ID:', updated.id);
    console.log('   Doctor name: Dr.', updated.firstName, updated.lastName);
    
    if (status === 'VERIFIED') {
      console.log('\n🎉 Doctor is now VERIFIED and can access all features!');
    } else if (status === 'PENDING') {
      console.log('\n⏳ Doctor is now in PENDING status. Awaiting verification.');
    } else if (status === 'REJECTED') {
      console.log('\n❌ Doctor verification is REJECTED.');
    }
    
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

updateVerification();

