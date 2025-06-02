/**
 * Test Existing Admin Authentication Script
 * 
 * This script verifies that the JWT token for the existing admin account 
 * contains all necessary information for admin authorization
 */

require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const config = require('../config/environment');
const User = require('../models/User');
const database = require('../utils/database');
const axios = require('axios');

const API_URL = 'http://localhost:5001/api';
const ADMIN_EMAIL = 'rowan.franciscus.2@gmail.com';

async function testAdminToken() {
  console.log('=== Testing Existing Admin JWT Token ===');
  
  try {
    // Connect to database
    await database.connect();
    console.log('Connected to MongoDB');
    
    // Get the existing admin account
    const adminUser = await User.findOne({ email: ADMIN_EMAIL });
    
    if (!adminUser) {
      console.error(`❌ Error: Admin account ${ADMIN_EMAIL} not found in database!`);
      return;
    }
    
    console.log(`Found admin account: ${adminUser.email} (${adminUser.role})`);
    
    // Generate a token for testing
    const token = adminUser.generateAuthToken();
    console.log('\nGenerated test JWT token');
    
    // Decode the token to verify content
    const decoded = jwt.decode(token);
    console.log('Token payload contains:');
    console.log(JSON.stringify(decoded, null, 2));
    
    // Test if the token has all required fields
    const requiredFields = ['id', 'role', 'email', 'isEmailVerified', 'isProfileCompleted'];
    const missingFields = requiredFields.filter(field => !decoded[field]);
    
    if (missingFields.length > 0) {
      console.error(`❌ Token is missing required fields: ${missingFields.join(', ')}`);
    } else {
      console.log('✅ Token contains all required fields');
    }
    
    // Verify role is correct
    if (decoded.role !== 'admin') {
      console.error(`❌ Token has incorrect role: ${decoded.role} (should be admin)`);
    } else {
      console.log('✅ Token has correct admin role');
    }
    
    // Test endpoints using the token
    console.log('\nTesting admin API endpoints with generated token...');
    
    const headers = { Authorization: `Bearer ${token}` };
    
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
    console.error('❌ Error testing admin token:', error);
  } finally {
    // Disconnect from database
    await database.disconnect();
    console.log('MongoDB connection closed');
  }
}

// Run the script
testAdminToken(); 