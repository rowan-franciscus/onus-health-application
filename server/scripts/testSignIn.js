/**
 * Test Sign In Script
 * 
 * This script directly tests the login process using axios, bypassing the frontend
 */

require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const config = require('../config/environment');

console.log('=== Test Sign In Process ===\n');

const API_URL = `http://localhost:${config.port}/api`;

async function testSignIn() {
  try {
    console.log(`Testing login endpoint: ${API_URL}/auth/login`);
    
    // Test credentials
    const credentials = {
      email: 'patient.test@email.com',
      password: 'password@123'
    };
    
    console.log(`Attempting login with email: ${credentials.email}`);
    
    // Make the login request
    const response = await axios.post(`${API_URL}/auth/login`, credentials);
    
    console.log('\nResponse Status:', response.status);
    console.log('Response Headers:', response.headers);
    
    // Analyze the response
    const { data } = response;
    console.log('\nResponse Data:', {
      user: data.user ? {
        id: data.user.id ? 'present' : 'missing',
        email: data.user.email,
        role: data.user.role,
        isProfileCompleted: data.user.isProfileCompleted,
        onboardingCompleted: data.user.onboardingCompleted
      } : 'missing',
      tokens: data.tokens ? {
        authToken: data.tokens.authToken ? 'present' : 'missing',
        refreshToken: data.tokens.refreshToken ? 'present' : 'missing'
      } : 'missing'
    });
    
    // If we got a token, decode it to check the payload
    if (data.tokens && data.tokens.authToken) {
      const decoded = jwt.decode(data.tokens.authToken);
      console.log('\nDecoded JWT Payload:', {
        id: decoded.id,
        role: decoded.role,
        email: decoded.email,
        isProfileCompleted: decoded.isProfileCompleted,
        onboardingCompleted: decoded.onboardingCompleted,
        exp: new Date(decoded.exp * 1000).toISOString(),
        iat: new Date(decoded.iat * 1000).toISOString()
      });
      
      // Check if token contains required fields
      const requiredFields = ['id', 'role', 'email', 'isProfileCompleted', 'onboardingCompleted'];
      const missingFields = requiredFields.filter(field => decoded[field] === undefined);
      
      if (missingFields.length > 0) {
        console.error(`\n❌ Token is missing required fields: ${missingFields.join(', ')}`);
      } else {
        console.log('\n✅ Token contains all required fields');
      }
    } else {
      console.error('\n❌ No auth token in response');
    }
    
    console.log('\n✅ Test completed successfully');
  } catch (error) {
    console.error('\n❌ Error during test:');
    
    if (error.response) {
      // The request was made and the server responded with an error status
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received. Is the server running?');
    } else {
      // Something happened in setting up the request
      console.error('Error Message:', error.message);
    }
    
    console.error('\n❌ Test failed');
  }
}

// Run the test
testSignIn(); 