/**
 * Test Login Endpoint Script
 * 
 * This script directly tests the login endpoint using axios to identify
 * any issues with the login process.
 */

require('dotenv').config();
const axios = require('axios');

// Define API base URL
const API_URL = process.env.API_URL || 'http://localhost:5000/api';

async function testLogin(email, password, isAdmin = false) {
  try {
    const endpoint = isAdmin ? `${API_URL}/auth/admin/login` : `${API_URL}/auth/login`;
    console.log(`Testing login for ${email} using ${isAdmin ? 'ADMIN' : 'REGULAR'} endpoint...`);
    
    const response = await axios.post(endpoint, {
      email,
      password
    });
    
    console.log('✓ Login successful!');
    console.log(`  User: ${response.data.user.firstName} ${response.data.user.lastName}`);
    console.log(`  Role: ${response.data.user.role}`);
    console.log(`  Auth token received: ${response.data.tokens.authToken ? 'Yes' : 'No'}`);
    
    return true;
  } catch (error) {
    console.log('❌ Login failed!');
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.log(`  Status: ${error.response.status}`);
      console.log(`  Error: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      // The request was made but no response was received
      console.log('  No response received from server');
    } else {
      // Something happened in setting up the request
      console.log(`  Error: ${error.message}`);
    }
    
    return false;
  }
}

// Check if server is running
async function checkServerStatus() {
  try {
    console.log('Checking if API server is running...');
    
    // Try to connect to a simple endpoint (health check or similar)
    await axios.get(`${API_URL}/health`);
    
    console.log('✓ API server is running!\n');
    return true;
  } catch (error) {
    console.log('❌ API server may not be running.');
    console.log('Please ensure the server is running at ' + API_URL);
    
    // If connection refused, server is likely not running
    if (error.code === 'ECONNREFUSED') {
      console.log('Connection refused. Is the server running?');
    }
    
    console.log('\nTrying to continue anyway...\n');
    return false;
  }
}

async function main() {
  // Check if server is running
  await checkServerStatus();
  
  const testAccounts = [
    { email: 'admin.test@email.com', password: 'password@123', adminTest: true },
    { email: 'provider.test@email.com', password: 'password@123', adminTest: false },
    { email: 'patient.test@email.com', password: 'password@123', adminTest: false }
  ];
  
  console.log('Testing login endpoints for test accounts:');
  console.log('---------------------------------------');
  
  for (const account of testAccounts) {
    // Test regular login for all accounts
    await testLogin(account.email, account.password);
    
    // Also test admin login endpoint for admin accounts
    if (account.adminTest) {
      await testLogin(account.email, account.password, true);
    }
    
    console.log(''); // Empty line for better readability
  }
  
  console.log('All tests completed!');
}

// Run the script
main().catch(console.error); 