/**
 * Update Doctor Name Script
 * 
 * Usage:
 * node scripts/update-doctor-name.js <phone_number> <firstName> <lastName>
 * 
 * Example:
 * node scripts/update-doctor-name.js 8595511863 "John" "Doe"
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateDoctorName() {
  try {
    const args = process.argv.slice(2);

    if (args.length === 0) {
      console.log('\n📝 Update Doctor Name\n');
      console.log('Usage: node scripts/update-doctor-name.js <phone_number> <firstName> <lastName>');
      console.log('\nExample: node scripts/update-doctor-name.js 8595511863 "John" "Doe"\n');
      process.exit(0);
    }

    const [phone, firstName, lastName] = args;

    if (!phone) {
      console.error('❌ Phone number is required');
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
    console.log('   Current name:', user.doctor.firstName, user.doctor.lastName);

    // Update doctor name
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;

    if (Object.keys(updateData).length === 0) {
      console.log('ℹ️  No name provided, exiting...');
      process.exit(0);
    }

    const updated = await prisma.doctor.update({
      where: { id: user.doctor.id },
      data: updateData
    });

    console.log('\n✅ Doctor name updated successfully!');
    console.log('   New name: Dr.', updated.firstName, updated.lastName);
    console.log('   Doctor ID:', updated.id);
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

updateDoctorName();

