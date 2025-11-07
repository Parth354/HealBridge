import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testSetup() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Check existing data
    const userCount = await prisma.user.count();
    const doctorCount = await prisma.doctor.count();
    const patientCount = await prisma.patient.count();
    
    console.log(`📊 Current data:
    - Users: ${userCount}
    - Doctors: ${doctorCount}
    - Patients: ${patientCount}`);
    
    // If no doctors exist, create test data
    if (doctorCount === 0) {
      console.log('🏥 Creating test doctor data...');
      
      // Create test doctor user
      const doctorUser = await prisma.user.create({
        data: {
          email: 'dr.smith@example.com',
          role: 'DOCTOR',
          language: 'en'
        }
      });
      
      // Create doctor profile
      const doctor = await prisma.doctor.create({
        data: {
          user_id: doctorUser.id,
          specialties: ['General Medicine', 'Internal Medicine'],
          rating: 4.8,
          avgConsultMin: 30,
          verifiedStatus: 'VERIFIED'
        }
      });
      
      // Create clinic
      const clinic = await prisma.clinic.create({
        data: {
          name: 'City Medical Center',
          address: '123 Main St, City, State 12345',
          lat: 40.7128,
          lon: -74.0060,
          phone: '+1-555-0123',
          doctor_id: doctor.id
        }
      });
      
      // Create schedule blocks for next 7 days
      const today = new Date();
      for (let i = 1; i <= 7; i++) {
        const scheduleDate = new Date(today);
        scheduleDate.setDate(today.getDate() + i);
        scheduleDate.setHours(9, 0, 0, 0); // 9 AM
        
        const endTime = new Date(scheduleDate);
        endTime.setHours(17, 0, 0, 0); // 5 PM
        
        await prisma.scheduleBlock.create({
          data: {
            doctor_id: doctor.id,
            clinic_id: clinic.id,
            startTs: scheduleDate,
            endTs: endTime,
            type: 'work',
            slotMinutes: 30,
            bufferMinutes: 5
          }
        });
      }
      
      console.log('✅ Test doctor data created successfully');
      console.log(`   - Doctor: Dr. Smith (ID: ${doctor.id})`);
      console.log(`   - Clinic: ${clinic.name} (ID: ${clinic.id})`);
      console.log(`   - Schedule: 7 days, 9 AM - 5 PM`);
    }
    
    // Test doctor search
    console.log('\n🔍 Testing doctor search...');
    const doctors = await prisma.doctor.findMany({
      include: {
        user: true,
        clinics: true,
        schedules: {
          where: {
            startTs: { gte: new Date() }
          },
          take: 3
        }
      }
    });
    
    console.log(`✅ Found ${doctors.length} doctors available for search`);
    doctors.forEach(doc => {
      console.log(`   - ${doc.user?.email || 'Unknown'}: ${doc.specialties?.join(', ') || 'No specialties'}`);
    });
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSetup();