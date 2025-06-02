/**
 * Check Sign In Issues
 * 
 * This script checks for potential issues with the sign-in process and page loading problems.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const config = require('../config/environment');

console.log('=== Check Sign In Issues ===\n');

async function main() {
  try {
    // Connect to MongoDB
    console.log(`Connecting to MongoDB: ${config.mongoUri.replace(/\/\/(.+?):(.+?)@/, '//***:***@')}`);
    await mongoose.connect(config.mongoUri);
    console.log(`Connected to database: ${mongoose.connection.name}\n`);
    
    // Test account information
    const testEmail = 'patient.test@email.com';
    const testPassword = 'password@123';
    
    // Find test patient
    console.log(`Checking test patient account: ${testEmail}`);
    const user = await User.findOne({ email: testEmail });
    
    if (!user) {
      console.error(`❌ Test patient not found. Please run the seed script first.`);
      return;
    }
    
    console.log(`✅ Test patient found: ${user.email}`);
    console.log(`- Role: ${user.role}`);
    console.log(`- isEmailVerified: ${user.isEmailVerified}`);
    console.log(`- isProfileCompleted: ${user.isProfileCompleted}`);
    
    // Check password
    console.log('\nTesting password authentication...');
    const passwordMatches = await user.comparePassword(testPassword);
    console.log(`- Password authentication: ${passwordMatches ? '✅ Success' : '❌ Failed'}`);
    
    // Check JWT token generation
    console.log('\nTesting JWT token generation...');
    const token = user.generateAuthToken();
    console.log(`- Token generation: ${token ? '✅ Success' : '❌ Failed'}`);
    
    // Decode token to verify payload
    if (token) {
      try {
        const decoded = jwt.decode(token);
        console.log('- Token payload:');
        console.log(`  - id: ${decoded.id}`);
        console.log(`  - role: ${decoded.role}`);
        console.log(`  - email: ${decoded.email}`);
        console.log(`  - isProfileCompleted: ${decoded.isProfileCompleted}`);
        console.log(`  - onboardingCompleted: ${decoded.onboardingCompleted}`);
        
        if (decoded.isProfileCompleted !== user.isProfileCompleted) {
          console.error('❌ isProfileCompleted mismatch between database and token!');
        }
      } catch (error) {
        console.error('❌ Error decoding token:', error.message);
      }
    }
    
    // Update isProfileCompleted for testing
    console.log('\nUpdating isProfileCompleted status for testing...');
    user.isProfileCompleted = true;
    await user.save();
    console.log(`✅ Updated isProfileCompleted to: ${user.isProfileCompleted}`);
    
    // Generate new token after update
    const updatedToken = user.generateAuthToken();
    const decoded = jwt.decode(updatedToken);
    console.log('- Updated token payload:');
    console.log(`  - isProfileCompleted: ${decoded.isProfileCompleted}`);
    console.log(`  - onboardingCompleted: ${decoded.onboardingCompleted}`);
    
    console.log('\n✅ Checks completed. Please restart the server for changes to take effect.');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the script
main().catch(console.error); 