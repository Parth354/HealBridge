import dotenv from 'dotenv';
dotenv.config();

async function testAuth() {
  try {
    console.log('🔍 Testing Authentication Flow...\n');
    
    // Test 1: Send OTP
    console.log('1️⃣ Testing OTP Send...');
    const otpResponse = await fetch('http://localhost:3000/api/auth/otp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
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
    
    // Test 2: Get OTP from console (you'll need to check your server logs)
    console.log('\n2️⃣ Check your server console for the OTP and enter it here...');
    console.log('💡 Look for a line like: "📱 DEV MODE - OTP for +919315036427: 123456"');
    
    // For testing, let's try a common OTP (you should replace this with the actual OTP from logs)
    const testOTP = '123456'; // Replace with actual OTP from server logs
    
    console.log(`\n3️⃣ Testing OTP Verify with OTP: ${testOTP}...`);
    const verifyResponse = await fetch('http://localhost:3000/api/auth/otp/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: '9315036427',
        otp: testOTP,
        role: 'DOCTOR'
      })
    });
    
    const verifyResult = await verifyResponse.json();
    console.log('Verify Response:', verifyResult);
    
    if (!verifyResponse.ok) {
      console.log('❌ OTP Verify failed');
      console.log('💡 Make sure to use the actual OTP from server logs');
      return;
    }
    
    const token = verifyResult.token;
    console.log('✅ Got JWT token:', token.substring(0, 20) + '...');
    
    // Test 3: Check if user has doctor profile
    console.log('\n4️⃣ Testing authenticated request...');
    const meResponse = await fetch('http://localhost:3000/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const meResult = await meResponse.json();
    console.log('User info:', meResult);
    
    if (meResult.user && !meResult.user.doctor) {
      console.log('\n5️⃣ User needs doctor profile. Creating one...');
      
      const profileResponse = await fetch('http://localhost:3000/api/auth/doctor/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          specialties: ['General Medicine'],
          licenseNo: 'DOC123456'
        })
      });
      
      const profileResult = await profileResponse.json();
      console.log('Doctor profile creation:', profileResult);
    }
    
    // Test 4: Try doctor API
    console.log('\n6️⃣ Testing doctor API access...');
    const clinicsResponse = await fetch('http://localhost:3000/api/doctor/clinics', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const clinicsResult = await clinicsResponse.json();
    console.log('Clinics response:', clinicsResult);
    
    if (clinicsResponse.status === 403) {
      console.log('❌ Still getting 403. Doctor might need verification.');
      console.log('💡 Check if doctor verification is required for this endpoint.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('💡 Make sure the server is running on port 3000');
  }
}

testAuth();