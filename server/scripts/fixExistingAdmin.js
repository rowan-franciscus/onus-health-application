/**
 * Fix Existing Admin Account Script
 * 
 * This script verifies and fixes the existing admin account
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const database = require('../utils/database');

async function fixExistingAdmin() {
  console.log('=== Fixing Existing Admin Account ===');
  
  try {
    // Connect to database
    await database.connect();
    console.log('Connected to MongoDB');
    
    // Remove the test admin account if it exists
    const removedAdmin = await User.findOneAndDelete({ email: 'admin.test@email.com' });
    if (removedAdmin) {
      console.log('Removed incorrect admin.test@email.com account');
    }
    
    // Get the existing admin account
    const adminEmail = 'rowan.franciscus.2@gmail.com';
    let adminUser = await User.findOne({ email: adminEmail });
    
    if (!adminUser) {
      console.error(`❌ Error: Admin account ${adminEmail} not found in database!`);
      return;
    }
    
    console.log(`Found admin account: ${adminEmail}`);
    
    // Ensure the account has admin role and is email verified
    if (adminUser.role !== 'admin') {
      console.log(`Updating role from ${adminUser.role} to admin`);
      adminUser.role = 'admin';
    }
    
    if (!adminUser.isEmailVerified) {
      console.log('Setting email as verified');
      adminUser.isEmailVerified = true;
    }
    
    if (!adminUser.isProfileCompleted) {
      console.log('Setting profile as completed');
      adminUser.isProfileCompleted = true;
    }
    
    // Save changes if any were made
    await adminUser.save();
    
    console.log('✅ Admin account verified successfully:');
    console.log('- Email:', adminUser.email);
    console.log('- Role:', adminUser.role);
    console.log('- Email Verified:', adminUser.isEmailVerified);
    console.log('- Profile Completed:', adminUser.isProfileCompleted);
    
    // For debugging, let's show what gets included in the JWT token
    console.log('\nJWT token will include:');
    const tokenData = { 
      id: adminUser._id, 
      role: adminUser.role,
      email: adminUser.email,
      isProfileCompleted: adminUser.isProfileCompleted,
      onboardingCompleted: adminUser.isProfileCompleted,
      isEmailVerified: adminUser.isEmailVerified,
      firstName: adminUser.firstName,
      lastName: adminUser.lastName
    };
    console.log(JSON.stringify(tokenData, null, 2));
    
  } catch (error) {
    console.error('❌ Error fixing admin account:', error);
  } finally {
    // Disconnect from database
    await database.disconnect();
    console.log('MongoDB connection closed');
  }
}

// Run the script
fixExistingAdmin(); 