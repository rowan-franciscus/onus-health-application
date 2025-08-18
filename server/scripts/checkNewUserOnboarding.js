/**
 * Check New User Onboarding Status
 * 
 * This script checks for users who might have incorrect onboarding status,
 * particularly new users who should have isProfileCompleted = false
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const config = require('../config/environment');

console.log('=== Check New User Onboarding Status ===\n');

async function main() {
  try {
    // Connect to MongoDB
    console.log(`Connecting to MongoDB...`);
    await mongoose.connect(config.mongoUri);
    console.log(`Connected to database: ${mongoose.connection.name}\n`);
    
    // Find all users created in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentUsers = await User.find({
      createdAt: { $gte: sevenDaysAgo }
    }).select('email role isProfileCompleted isEmailVerified createdAt firstName lastName');
    
    console.log(`Found ${recentUsers.length} users created in the last 7 days:\n`);
    
    // Check each user
    for (const user of recentUsers) {
      console.log(`User: ${user.email}`);
      console.log(`- Role: ${user.role}`);
      console.log(`- Name: ${user.firstName} ${user.lastName}`);
      console.log(`- Created: ${user.createdAt.toISOString()}`);
      console.log(`- Email Verified: ${user.isEmailVerified}`);
      console.log(`- Profile Completed: ${user.isProfileCompleted}`);
      
      // Check for potential issues
      if (user.isEmailVerified && user.isProfileCompleted) {
        // Check if they have actual profile data
        if (user.role === 'patient') {
          const hasPatientData = user.patientProfile && 
            (user.patientProfile.dateOfBirth || 
             user.patientProfile.gender || 
             user.patientProfile.address?.city);
          
          if (!hasPatientData) {
            console.log('⚠️  WARNING: Patient marked as profile completed but missing profile data');
          }
        } else if (user.role === 'provider') {
          const hasProviderData = user.providerProfile && 
            (user.providerProfile.specialty || 
             user.providerProfile.practiceLicense);
          
          if (!hasProviderData) {
            console.log('⚠️  WARNING: Provider marked as profile completed but missing profile data');
          }
        }
      }
      
      console.log('-----------------------------------\n');
    }
    
    // Check specifically for the user mentioned
    const specificUser = await User.findOne({ email: 'rowan.franciscus.10@gmail.com' });
    if (specificUser) {
      console.log('\n=== Specific User Check ===');
      console.log(`User: ${specificUser.email}`);
      console.log(`- Role: ${specificUser.role}`);
      console.log(`- Created: ${specificUser.createdAt.toISOString()}`);
      console.log(`- Email Verified: ${specificUser.isEmailVerified}`);
      console.log(`- Profile Completed: ${specificUser.isProfileCompleted}`);
      
      if (specificUser.isProfileCompleted && !specificUser.providerProfile?.specialty) {
        console.log('\n⚠️  This user is marked as profile completed but may not have gone through onboarding.');
        console.log('Consider manually setting isProfileCompleted to false to force onboarding.');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the script
main().catch(console.error);