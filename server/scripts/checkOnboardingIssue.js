/**
 * Check Onboarding Redirection Issues
 * 
 * This script checks for issues with onboarding redirection by comparing
 * database values to JWT token payload fields.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/environment');

console.log('=== Check Onboarding Redirection Issues ===\n');

async function main() {
  try {
    // Connect to MongoDB
    console.log(`Connecting to MongoDB: ${config.mongoUri.replace(/\/\/(.+?):(.+?)@/, '//***:***@')}`);
    await mongoose.connect(config.mongoUri);
    console.log(`Connected to database: ${mongoose.connection.name}\n`);
    
    // Test both patient and provider accounts
    const testAccounts = [
      { email: 'patient.test@email.com', role: 'patient' },
      { email: 'provider.test@email.com', role: 'provider' }
    ];
    
    for (const account of testAccounts) {
      console.log(`Checking ${account.role} account: ${account.email}`);
      
      // Find user
      const user = await User.findOne({ email: account.email });
      
      if (!user) {
        console.error(`❌ Test ${account.role} not found. Please run the seed script first.`);
        continue;
      }
      
      console.log(`✅ Test ${account.role} found: ${user.email}`);
      console.log(`- Role: ${user.role}`);
      console.log(`- Database isProfileCompleted: ${user.isProfileCompleted}`);
      
      // Generate token and decode it
      const token = user.generateAuthToken();
      const decoded = jwt.decode(token);
      
      console.log('\nToken payload:');
      console.log(`- id: ${decoded.id}`);
      console.log(`- role: ${decoded.role}`);
      console.log(`- email: ${decoded.email}`);
      console.log(`- isProfileCompleted: ${decoded.isProfileCompleted}`);
      console.log(`- onboardingCompleted: ${decoded.onboardingCompleted}`);
      
      // Check if values match
      if (decoded.isProfileCompleted !== user.isProfileCompleted) {
        console.error('❌ isProfileCompleted mismatch between database and token!');
      }
      
      if (decoded.onboardingCompleted !== user.isProfileCompleted) {
        console.error('❌ onboardingCompleted mismatch with database isProfileCompleted!');
      }
      
      // Update isProfileCompleted to ensure it's true
      if (!user.isProfileCompleted) {
        console.log('\nUpdating isProfileCompleted to true...');
        user.isProfileCompleted = true;
        await user.save();
        console.log(`✅ Updated isProfileCompleted to: ${user.isProfileCompleted}`);
        
        // Generate new token after update and check
        const updatedToken = user.generateAuthToken();
        const updatedDecoded = jwt.decode(updatedToken);
        console.log('\nUpdated token payload:');
        console.log(`- isProfileCompleted: ${updatedDecoded.isProfileCompleted}`);
        console.log(`- onboardingCompleted: ${updatedDecoded.onboardingCompleted}`);
      }
      
      console.log('\n-----------------------------------\n');
    }
    
    console.log('✅ Checks completed. Please restart the server for changes to take effect.');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the script
main().catch(console.error); 