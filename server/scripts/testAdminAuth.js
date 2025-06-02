/**
 * Test Admin Authentication Script
 * 
 * This script tests admin authentication and API endpoint access
 * Run it with: node scripts/testAdminAuth.js
 */

require('dotenv').config();
const axios = require('axios');

const API_URL = 'http://localhost:5001/api';
const ADMIN_EMAIL = 'admin.test@email.com';
const ADMIN_PASSWORD = 'password@123';

async function testAdminAuth() {
  console.log('=== Testing Admin Authentication ===');
  
  try {
    // Step 1: Login as admin
    console.log('\n1. Attempting admin login...');
    const loginResponse = await axios.post(`${API_URL}/auth/admin/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    if (!loginResponse.data.tokens || !loginResponse.data.tokens.authToken) {
      console.error('❌ Admin login failed: No auth token received');
      return;
    }
    
    console.log('✅ Admin login successful!');
    console.log('User details:', {
      id: loginResponse.data.user.id,
      email: loginResponse.data.user.email,
      role: loginResponse.data.user.role,
      isProfileCompleted: loginResponse.data.user.isProfileCompleted
    });
    
    const authToken = loginResponse.data.tokens.authToken;
    
    // Step 2: Test admin endpoints
    const headers = { Authorization: `Bearer ${authToken}` };
    
    console.log('\n2. Testing admin endpoints...');
    
    // Test analytics endpoint
    console.log('\nTesting /api/admin/analytics/dashboard');
    try {
      const analyticsResponse = await axios.get(
        `${API_URL}/admin/analytics/dashboard`, 
        { headers }
      );
      console.log('✅ Analytics endpoint accessible');
      console.log('Response data sample:', {
        totalUsers: analyticsResponse.data.totalUsers,
        totalPatients: analyticsResponse.data.totalPatients,
        totalProviders: analyticsResponse.data.totalProviders
      });
    } catch (error) {
      console.error('❌ Analytics endpoint error:', error.response?.status || error.message);
      console.error('Error details:', error.response?.data || 'No response data');
    }
    
    // Test provider verifications endpoint
    console.log('\nTesting /api/admin/provider-verifications?status=pending');
    try {
      const verificationsResponse = await axios.get(
        `${API_URL}/admin/provider-verifications?status=pending`, 
        { headers }
      );
      console.log('✅ Provider verifications endpoint accessible');
      console.log('Found', verificationsResponse.data.providers?.length || 0, 'pending verifications');
    } catch (error) {
      console.error('❌ Provider verifications endpoint error:', error.response?.status || error.message);
      console.error('Error details:', error.response?.data || 'No response data');
    }
    
    // Test users endpoint
    console.log('\nTesting /api/admin/users?role=patient');
    try {
      const usersResponse = await axios.get(
        `${API_URL}/admin/users?role=patient`, 
        { headers }
      );
      console.log('✅ Users endpoint accessible');
      console.log('Found', usersResponse.data.users?.length || 0, 'patient users');
    } catch (error) {
      console.error('❌ Users endpoint error:', error.response?.status || error.message);
      console.error('Error details:', error.response?.data || 'No response data');
    }
    
  } catch (error) {
    console.error('❌ Error during admin authentication test:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testAdminAuth(); 