/**
 * Fix User Onboarding Status
 * 
 * This script can fix users who have incorrect isProfileCompleted status,
 * particularly for users who haven't actually completed onboarding.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const config = require('../config/environment');

console.log('=== Fix User Onboarding Status ===\n');

// Get email from command line argument
const userEmail = process.argv[2];

if (!userEmail) {
  console.error('Usage: node fixUserOnboardingStatus.js <user-email>');
  console.error('Example: node fixUserOnboardingStatus.js rowan.franciscus.10@gmail.com');
  process.exit(1);
}

async function main() {
  try {
    // Connect to MongoDB
    console.log(`Connecting to MongoDB...`);
    await mongoose.connect(config.mongoUri);
    console.log(`Connected to database: ${mongoose.connection.name}\n`);
    
    // Find the user
    const user = await User.findOne({ email: userEmail });
    
    if (!user) {
      console.error(`❌ User not found: ${userEmail}`);
      return;
    }
    
    console.log(`Found user: ${user.email}`);
    console.log(`- Role: ${user.role}`);
    console.log(`- Current isProfileCompleted: ${user.isProfileCompleted}`);
    console.log(`- Email Verified: ${user.isEmailVerified}`);
    
    // Check if user has actual profile data
    let hasProfileData = false;
    
    if (user.role === 'patient') {
      hasProfileData = !!(
        user.patientProfile?.dateOfBirth || 
        user.patientProfile?.gender || 
        user.patientProfile?.address?.city ||
        user.patientProfile?.emergencyContact?.name
      );
      console.log(`- Has patient profile data: ${hasProfileData}`);
    } else if (user.role === 'provider') {
      hasProfileData = !!(
        user.providerProfile?.specialty || 
        user.providerProfile?.practiceLicense ||
        user.providerProfile?.yearsOfExperience ||
        user.providerProfile?.practiceInfo?.name
      );
      console.log(`- Has provider profile data: ${hasProfileData}`);
    }
    
    // If marked as completed but no profile data, fix it
    if (user.isProfileCompleted && !hasProfileData) {
      console.log('\n⚠️  User is marked as profile completed but has no profile data.');
      console.log('Setting isProfileCompleted to false...');
      
      user.isProfileCompleted = false;
      await user.save();
      
      console.log('✅ Updated isProfileCompleted to false');
      console.log('User will now be redirected to onboarding after signing in.');
    } else if (!user.isProfileCompleted && hasProfileData) {
      console.log('\n⚠️  User has profile data but isProfileCompleted is false.');
      console.log('This might be intentional if they haven\'t completed all onboarding steps.');
    } else if (user.isProfileCompleted && hasProfileData) {
      console.log('\n✅ User profile status appears correct.');
    } else {
      console.log('\n✅ User hasn\'t completed onboarding yet (correct status).');
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