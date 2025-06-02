/**
 * Server Debug Script
 * 
 * This script checks server health and API accessibility.
 * Run with: node scripts/debugServer.js
 */

const http = require('http');
const config = require('../config/environment');

console.log('=== Server Debug Tool ===');
console.log(`Server environment: ${config.env}`);
console.log(`Port configured: ${config.port}`);
console.log(`Frontend URL: ${config.frontendUrl}`);
console.log(`CORS will allow origin: ${config.env === 'development' ? 'ANY (*) in development mode' : config.frontendUrl}`);
console.log();

// Check server health
function checkServerHealth() {
  console.log('Checking server health...');
  
  const options = {
    hostname: 'localhost',
    port: config.port,
    path: '/api/status/db',
    method: 'GET',
    timeout: 5000
  };
  
  const req = http.request(options, (res) => {
    console.log(`Status code: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('✅ Server is responding correctly');
        try {
          const response = JSON.parse(data);
          console.log('Database connection status:', response.isConnected ? 'Connected' : 'Disconnected');
        } catch (e) {
          console.log('Response:', data);
        }
      } else {
        console.log('❌ Server responded with error status');
        console.log('Response:', data);
      }
      
      // Test auth endpoint
      testAuthEndpoint();
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Error connecting to server:', error.message);
    console.log(`Make sure the server is running on port ${config.port}`);
    process.exit(1);
  });
  
  req.end();
}

// Test auth endpoint
function testAuthEndpoint() {
  console.log('\nTesting auth registration endpoint...');
  
  const testData = JSON.stringify({
    email: 'debug.test@example.com',
    password: 'password123',
    firstName: 'Debug',
    lastName: 'Test',
    role: 'patient'
  });
  
  const options = {
    hostname: 'localhost',
    port: config.port,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': testData.length
    },
    timeout: 5000
  };
  
  const req = http.request(options, (res) => {
    console.log(`Status code: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response headers:', res.headers);
      
      try {
        const response = JSON.parse(data);
        console.log('Response body:', response);
        
        if (res.statusCode === 201) {
          console.log('✅ Registration endpoint is working correctly');
        } else if (res.statusCode === 400 && response.message === 'User already exists') {
          console.log('✅ Registration endpoint is working correctly (user already exists)');
        } else {
          console.log('⚠️ Registration endpoint returned unexpected status code');
        }
      } catch (e) {
        console.log('Could not parse response as JSON:', data);
      }
      
      console.log('\nDebug complete!');
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Error testing auth endpoint:', error.message);
  });
  
  req.write(testData);
  req.end();
}

// Start checks
checkServerHealth(); 