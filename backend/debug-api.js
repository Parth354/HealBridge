import dotenv from 'dotenv';
dotenv.config();

// Test database connection
async function testDatabase() {
  try {
    const { default: prisma } = await import('./src/config/prisma.js');
    
    console.log('🔍 Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test user count
    const userCount = await prisma.user.count();
    console.log(`📊 Total users in database: ${userCount}`);
    
    // Test if tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    console.log('📋 Available tables:');
    tables.forEach(table => console.log(`  - ${table.table_name}`));
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    return false;
  }
  return true;
}

// Test Redis connection
async function testRedis() {
  try {
    const { default: redisClient } = await import('./src/config/redis.js');
    
    console.log('\n🔍 Testing Redis connection...');
    
    // Test basic connection
    await redisClient.ping();
    console.log('✅ Redis connected successfully');
    
    // Test set/get
    await redisClient.set('test:key', 'test-value', 'EX', 10);
    const value = await redisClient.get('test:key');
    console.log(`📊 Redis test value: ${value}`);
    
    await redisClient.del('test:key');
    
  } catch (error) {
    console.error('❌ Redis test failed:', error.message);
    return false;
  }
  return true;
}

// Test Firebase connection
async function testFirebase() {
  try {
    console.log('\n🔍 Testing Firebase connection...');
    
    const { admin } = await import('./src/config/firebase.js');
    
    // Test Firebase Admin
    const app = admin.app();
    console.log(`✅ Firebase Admin initialized with project: ${app.options.projectId}`);
    
  } catch (error) {
    console.error('❌ Firebase test failed:', error.message);
    return false;
  }
  return true;
}

// Test API endpoints
async function testAPIEndpoints() {
  try {
    console.log('\n🔍 Testing API endpoints...');
    
    const response = await fetch('http://localhost:3000/health');
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Health endpoint working:', data);
    } else {
      console.log('❌ Health endpoint failed:', response.status);
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    console.log('💡 Make sure the server is running with: npm run dev');
    return false;
  }
  return true;
}

// Main debug function
async function debugAPI() {
  console.log('🚀 Starting HealBridge API Debug...\n');
  
  const dbOk = await testDatabase();
  const redisOk = await testRedis();
  const firebaseOk = await testFirebase();
  const apiOk = await testAPIEndpoints();
  
  console.log('\n📋 Debug Summary:');
  console.log(`Database: ${dbOk ? '✅' : '❌'}`);
  console.log(`Redis: ${redisOk ? '✅' : '❌'}`);
  console.log(`Firebase: ${firebaseOk ? '✅' : '❌'}`);
  console.log(`API: ${apiOk ? '✅' : '❌'}`);
  
  if (dbOk && redisOk && firebaseOk) {
    console.log('\n🎉 All services are working! Your APIs should be functional.');
    console.log('\n📝 Next steps:');
    console.log('1. Start the server: npm run dev');
    console.log('2. Test OTP endpoint: POST /api/auth/otp/send');
    console.log('3. Check logs for any specific errors');
  } else {
    console.log('\n⚠️  Some services have issues. Check the errors above.');
  }
}

debugAPI().catch(console.error);