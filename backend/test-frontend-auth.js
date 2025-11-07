import dotenv from 'dotenv';
dotenv.config();

async function testFrontendAuth() {
  const baseURL = 'http://localhost:3000/api';
  
  console.log('🧪 Testing Frontend Authentication Flow\n');
  
  try {
    // Step 1: Send OTP
    console.log('1️⃣ Sending OTP...');
    const otpResponse = await fetch(`${baseURL}/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '9315036427',
        role: 'DOCTOR'
      })
    });
    
    const otpResult = await otpResponse.json();
    console.log('OTP Response:', otpResult);
    
    if (!otpResponse.ok) {
      console.log('❌ OTP Send failed');
      return;
    }
    
    // Step 2: Get OTP from Redis
    const { default: redisClient } = await import('./src/config/redis.js');
    const storedOTP = await redisClient.get('otp:+919315036427');
    
    if (!storedOTP) {
      console.log('❌ No OTP found in Redis');
      return;
    }
    
    console.log(`✅ Found OTP: ${storedOTP}`);
    
    // Step 3: Verify OTP
    console.log('\n2️⃣ Verifying OTP...');
    const verifyResponse = await fetch(`${baseURL}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '9315036427',
        otp: storedOTP,
        role: 'DOCTOR'
      })
    });
    
    const verifyResult = await verifyResponse.json();
    console.log('Verify Response:', verifyResult);
    
    if (!verifyResponse.ok) {
      console.log('❌ OTP Verification failed');
      return;
    }
    
    const token = verifyResult.token;
    console.log(`✅ Got token: ${token.substring(0, 30)}...`);
    
    // Step 4: Check user profile
    console.log('\n3️⃣ Checking user profile...');
    const meResponse = await fetch(`${baseURL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const meResult = await meResponse.json();
    console.log('User Profile:', {
      id: meResult.user?.id,
      role: meResult.user?.role,
      hasDoctor: !!meResult.user?.doctor,
      doctorId: meResult.user?.doctor?.id
    });
    
    // Step 5: Create doctor profile if needed
    if (!meResult.user?.doctor) {
      console.log('\n4️⃣ Creating doctor profile...');
      const profileResponse = await fetch(`${baseURL}/auth/doctor/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          specialties: ['General Medicine'],
          licenseNo: `DOC${Date.now()}`
        })
      });
      
      const profileResult = await profileResponse.json();
      
      if (profileResponse.ok) {
        console.log('✅ Doctor profile created!');
      } else {
        console.log('❌ Failed to create doctor profile:', profileResult);
      }
    }
    
    // Step 6: Test doctor API endpoints
    console.log('\n5️⃣ Testing doctor API endpoints...');
    
    const endpoints = [
      { name: 'Clinics', url: '/doctor/clinics' },
      { name: 'Appointments', url: '/doctor/appointments' },
      { name: 'Statistics', url: '/doctor/statistics' }
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${baseURL}${endpoint.url}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          console.log(`✅ ${endpoint.name}: Working`);
        } else {
          const errorData = await response.json();
          console.log(`❌ ${endpoint.name}: ${response.status} - ${errorData.error}`);
        }
      } catch (error) {
        console.log(`❌ ${endpoint.name}: Network error`);
      }
    }
    
    console.log('\n🎉 Authentication flow test completed!');
    console.log('\n📋 Frontend Setup Instructions:');
    console.log('1. Login with phone: 9315036427');
    console.log(`2. Use OTP: ${storedOTP}`);
    console.log('3. The debug panel should show successful authentication');
    console.log('4. All API calls should now work');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFrontendAuth();