import dotenv from 'dotenv';
dotenv.config();

async function quickSetup() {
  const baseURL = 'http://localhost:3000';
  
  console.log('🚀 HealBridge Quick Setup for Doctor Dashboard\n');
  
  try {
    // Step 1: Send OTP
    console.log('1️⃣ Sending OTP to +919315036427...');
    const otpResponse = await fetch(`${baseURL}/api/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '9315036427',
        role: 'DOCTOR'
      })
    });
    
    const otpResult = await otpResponse.json();
    console.log('✅ OTP sent:', otpResult.message);
    
    if (!otpResponse.ok) {
      console.log('❌ Failed to send OTP:', otpResult.error);
      return;
    }
    
    // Step 2: Wait for user to enter OTP
    console.log('\n2️⃣ Check your server console for the OTP...');
    console.log('Look for: "📱 DEV MODE - OTP for +919315036427: XXXXXX"');
    console.log('Or check SMS if Twilio is configured.');
    
    // For demo, let's try to get the OTP from Redis
    const { default: redisClient } = await import('./src/config/redis.js');
    const storedOTP = await redisClient.get('otp:+919315036427');
    
    if (storedOTP) {
      console.log(`💡 Found OTP in Redis: ${storedOTP}`);
      
      // Step 3: Verify OTP
      console.log('\n3️⃣ Verifying OTP...');
      const verifyResponse = await fetch(`${baseURL}/api/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '9315036427',
          otp: storedOTP,
          role: 'DOCTOR'
        })
      });
      
      const verifyResult = await verifyResponse.json();
      
      if (!verifyResponse.ok) {
        console.log('❌ OTP verification failed:', verifyResult.error);
        return;
      }
      
      const token = verifyResult.token;
      console.log('✅ Authentication successful!');
      console.log(`🔑 JWT Token: ${token.substring(0, 30)}...`);
      
      // Step 4: Check user profile
      console.log('\n4️⃣ Checking user profile...');
      const meResponse = await fetch(`${baseURL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const meResult = await meResponse.json();
      console.log('👤 User info:', {
        id: meResult.user?.id,
        role: meResult.user?.role,
        hasDoctor: !!meResult.user?.doctor
      });
      
      // Step 5: Create doctor profile if needed
      if (!meResult.user?.doctor) {
        console.log('\n5️⃣ Creating doctor profile...');
        const profileResponse = await fetch(`${baseURL}/api/auth/doctor/profile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            specialties: ['General Medicine', 'Internal Medicine'],
            licenseNo: `DOC${Date.now()}`
          })
        });
        
        const profileResult = await profileResponse.json();
        
        if (profileResponse.ok) {
          console.log('✅ Doctor profile created successfully!');
        } else {
          console.log('❌ Failed to create doctor profile:', profileResult.error);
        }
      }
      
      // Step 6: Test doctor API
      console.log('\n6️⃣ Testing doctor API access...');
      const clinicsResponse = await fetch(`${baseURL}/api/doctor/clinics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const clinicsResult = await clinicsResponse.json();
      
      if (clinicsResponse.ok) {
        console.log('✅ Doctor API working! Clinics:', clinicsResult.count || 0);
      } else {
        console.log('❌ Doctor API failed:', clinicsResult.error);
      }
      
      // Step 7: Create a test clinic
      console.log('\n7️⃣ Creating a test clinic...');
      const addClinicResponse = await fetch(`${baseURL}/api/doctor/clinics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: 'HealBridge Test Clinic',
          lat: 28.6139,
          lon: 77.2090,
          address: 'New Delhi, India',
          houseVisitRadiusKm: 10
        })
      });
      
      const addClinicResult = await addClinicResponse.json();
      
      if (addClinicResponse.ok) {
        console.log('✅ Test clinic created successfully!');
      } else {
        console.log('❌ Failed to create clinic:', addClinicResult.error);
      }
      
      // Final instructions
      console.log('\n🎉 Setup Complete!');
      console.log('\n📋 Next Steps:');
      console.log('1. Save this token in your frontend localStorage:');
      console.log(`   localStorage.setItem('token', '${token}');`);
      console.log('\n2. Use this token in your API requests:');
      console.log(`   Authorization: Bearer ${token}`);
      console.log('\n3. Your doctor dashboard should now work!');
      
    } else {
      console.log('❌ Could not find OTP in Redis. Please check server logs manually.');
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n💡 Make sure:');
    console.log('- Server is running on port 3000');
    console.log('- Database is connected');
    console.log('- Redis is connected');
  }
}

quickSetup();