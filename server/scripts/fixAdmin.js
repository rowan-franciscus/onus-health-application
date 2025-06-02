/**
 * Fix Admin Account Script
 * 
 * This script creates or updates the admin test account with the proper credentials
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const database = require('../utils/database');

async function fixAdminAccount() {
  console.log('=== Fixing Admin Account ===');
  
  try {
    // Connect to database
    await database.connect();
    console.log('Connected to MongoDB');
    
    // Check if admin test account exists
    let adminUser = await User.findOne({ email: 'admin.test@email.com' });
    
    if (adminUser) {
      console.log('Admin test account exists, updating...');
    } else {
      console.log('Admin test account does not exist, creating...');
      adminUser = new User({
        email: 'admin.test@email.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isEmailVerified: true,
        isProfileCompleted: true
      });
    }
    
    // Update admin account with correct credentials
    const passwordHash = await bcrypt.hash('password@123', 12);
    adminUser.password = passwordHash;
    adminUser.isEmailVerified = true;
    adminUser.isProfileCompleted = true;
    
    await adminUser.save();
    
    console.log('✅ Admin account fixed successfully:');
    console.log('- Email:', adminUser.email);
    console.log('- Role:', adminUser.role);
    console.log('- Password: password@123');
    console.log('- Email Verified:', adminUser.isEmailVerified);
    console.log('- Profile Completed:', adminUser.isProfileCompleted);
    
  } catch (error) {
    console.error('❌ Error fixing admin account:', error);
  } finally {
    // Disconnect from database
    await database.disconnect();
    console.log('MongoDB connection closed');
  }
}

// Run the script
fixAdminAccount(); 