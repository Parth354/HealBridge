/**
 * Test PostgreSQL database connection
 */

import dotenv from 'dotenv';
dotenv.config();

console.log('\n🔍 Testing Database Connection...\n');
console.log('================================================================================\n');

// Check if DATABASE_URL exists
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env file');
  console.error('   Please add DATABASE_URL to your .env file\n');
  process.exit(1);
}

// Parse and display connection details (hiding password)
try {
  const dbUrl = new URL(process.env.DATABASE_URL);
  
  console.log('📊 Connection Details:');
  console.log(`   Host: ${dbUrl.hostname}`);
  console.log(`   Port: ${dbUrl.port}`);
  console.log(`   Database: ${dbUrl.pathname.substring(1)}`);
  console.log(`   Username: ${dbUrl.username}`);
  console.log(`   Password: ${'*'.repeat(10)}\n`);
  
  // Try to connect using Prisma
  console.log('🔌 Attempting connection...\n');
  
  const { default: prisma } = await import('./src/config/prisma.js');
  
  await prisma.$connect();
  console.log('✅ Database connection successful!\n');
  
  // Test a simple query
  const result = await prisma.$queryRaw`SELECT current_database(), current_user, version()`;
  console.log('✅ Database query successful!');
  console.log(`   Database: ${result[0].current_database}`);
  console.log(`   User: ${result[0].current_user}`);
  console.log(`   Version: ${result[0].version.split(' ')[0]} ${result[0].version.split(' ')[1]}\n`);
  
  await prisma.$disconnect();
  
  console.log('================================================================================');
  console.log('✅ ALL CHECKS PASSED - Database is ready!\n');
  process.exit(0);
  
} catch (error) {
  console.error('❌ Connection Failed!\n');
  console.error('Error Details:', error.message);
  console.error('\n================================================================================');
  console.error('🔧 TROUBLESHOOTING STEPS:\n');
  console.error('1. Check if your database is running:');
  console.error('   - For Render.com: Go to https://dashboard.render.com');
  console.error('   - Check if the database status is "Available"\n');
  console.error('2. Verify DATABASE_URL in .env file:');
  console.error('   - It should look like:');
  console.error('   - postgresql://user:password@host:5432/database\n');
  console.error('3. Check firewall/network:');
  console.error('   - Make sure your IP is allowed to connect');
  console.error('   - Render.com allows connections from anywhere by default\n');
  console.error('4. Verify credentials:');
  console.error('   - Username and password are correct');
  console.error('   - Database name is correct\n');
  console.error('5. Try the internal connection string:');
  console.error('   - Render provides both external and internal URLs');
  console.error('   - Use the EXTERNAL connection string for development\n');
  console.error('================================================================================\n');
  process.exit(1);
}

