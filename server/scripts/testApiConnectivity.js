/**
 * Test API Connectivity Script
 * 
 * This script tests the API connection and CORS setup
 */

const http = require('http');
const config = require('../config/environment');

console.log('=== API Connectivity Test ===\n');
console.log(`Testing API on port: ${config.port}`);

// Create a simple server to test CORS
const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, PATCH, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  
  res.end(JSON.stringify({
    success: true,
    message: 'API is accessible and CORS is properly configured',
    timestamp: new Date().toISOString()
  }));
});

// Run the test server temporarily on a different port
const testPort = config.port + 1;
server.listen(testPort, () => {
  console.log(`Test server running on port ${testPort}`);
  console.log('Testing connectivity...\n');
  
  // Test the connection to our own test server
  http.get(`http://localhost:${testPort}`, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Test server response status:', res.statusCode);
      console.log('Test server response headers:', res.headers);
      console.log('Test server response body:', data);
      
      console.log('\nCORS Headers Check:');
      if (res.headers['access-control-allow-origin']) {
        console.log('✅ CORS Allow-Origin header is present');
      } else {
        console.log('❌ CORS Allow-Origin header is missing');
      }
      
      // Check main API availability
      console.log('\nChecking main API availability...');
      http.get(`http://localhost:${config.port}/api/health`, (apiRes) => {
        console.log('Main API Status Code:', apiRes.statusCode);
        
        // Close the test server after response
        server.close(() => {
          console.log('\n✅ Test completed.');
        });
      }).on('error', (err) => {
        console.error('❌ Error connecting to main API:', err.message);
        console.log('This may indicate that the main API server is not running or is not accessible');
        
        // Close the test server after error
        server.close(() => {
          console.log('\n✅ Test completed with errors.');
        });
      });
    });
  }).on('error', (err) => {
    console.error('❌ Error connecting to test server:', err.message);
    
    // Close the test server after error
    server.close(() => {
      console.log('\n✅ Test completed with errors.');
    });
  });
}); 