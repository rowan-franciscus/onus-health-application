/**
 * Script to verify admin users are properly configured
 * 
 * Usage: node scripts/verifyAdminSetup.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const config = require('../config/environment');

// Connect to MongoDB
mongoose.connect(config.mongoUri)
  .then(() => {
    console.log(`MongoDB connected successfully to ${mongoose.connection.name} database`);
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

const verifyAdminSetup = async () => {
  try {
    console.log('Verifying admin users setup...\n');
    
    // List of expected admin users
    const adminEmails = [
      'rowan.franciscus.2@gmail.com',
      'julian@onus.health',
      'admin.test@email.com'
    ];
    
    console.log('Checking for admin users:');
    console.log('=' .repeat(50));
    
    for (const email of adminEmails) {
      const user = await User.findOne({ email });
      
      if (user) {
        console.log(`\n✓ ${email}`);
        console.log(`  - Name: ${user.firstName} ${user.lastName}`);
        console.log(`  - Role: ${user.role}`);
        console.log(`  - Admin Level: ${user.adminProfile?.adminLevel || 'Not set'}`);
        console.log(`  - Email Verified: ${user.isEmailVerified}`);
        console.log(`  - Profile Completed: ${user.isProfileCompleted}`);
        console.log(`  - Created: ${user.createdAt.toLocaleDateString()}`);
        
        if (user.role !== 'admin') {
          console.log(`  ⚠️  WARNING: User exists but is not an admin!`);
        }
      } else {
        console.log(`\n✗ ${email} - NOT FOUND`);
      }
    }
    
    // Count total admins
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    console.log('\n' + '=' .repeat(50));
    console.log(`Total admin users in database: ${totalAdmins}`);
    
    // List any other admins not in our expected list
    const allAdmins = await User.find({ role: 'admin' });
    const otherAdmins = allAdmins.filter(admin => !adminEmails.includes(admin.email));
    
    if (otherAdmins.length > 0) {
      console.log('\nOther admin users found:');
      otherAdmins.forEach(admin => {
        console.log(`- ${admin.email} (${admin.firstName} ${admin.lastName})`);
      });
    }
    
  } catch (error) {
    console.error('Error verifying admin setup:', error);
    throw error;
  }
};

// Run verification
verifyAdminSetup()
  .then(() => {
    console.log('\nAdmin verification completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nVerification failed:', error);
    process.exit(1);
  })
  .finally(() => {
    mongoose.connection.close();
  }); 