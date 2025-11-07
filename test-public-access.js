// Test public access to backend endpoints
const BASE_URL = 'https://healbridgebackend.onrender.com';

async function testEndpoint(url, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    console.log(`${method} ${url}`);
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, data);
    console.log('---');
    
    return { status: response.status, data };
  } catch (error) {
    console.error(`Error testing ${url}:`, error.message);
    return { status: 'ERROR', data: { error: error.message } };
  }
}

async function runTests() {
  console.log('🔓 Testing Public Access to HealBridge Backend\n');
  
  // Test health check
  await testEndpoint(`${BASE_URL}/health`);
  
  // Test database
  await testEndpoint(`${BASE_URL}/api/test/db`);
  
  // Test auth (should work without token)
  await testEndpoint(`${BASE_URL}/api/test/auth`);
  
  // Test patient auth
  await testEndpoint(`${BASE_URL}/api/patient/test/auth`);
  
  // Test triage (the endpoint that was failing)
  await testEndpoint(`${BASE_URL}/api/patient/triage/analyze`, 'POST', {
    duration: "Few days",
    severity: "Moderate", 
    symptoms: "Headache"
  });
  
  // Test doctor search
  await testEndpoint(`${BASE_URL}/api/patient/doctors/search?limit=5`);
  
  console.log('✅ Public access tests completed!');
}

runTests();