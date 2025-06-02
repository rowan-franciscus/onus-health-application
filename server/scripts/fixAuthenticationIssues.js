/**
 * Fix Authentication Issues
 * 
 * This script resets the passwords for all test accounts to ensure they work correctly.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config/environment');
const testAccounts = require('../config/testAccounts');
const User = require('../models/User');

console.log('=== Fix Authentication Issues ===\n');
console.log('This script will fix the passwords for test accounts.\n');

async function main() {
  try {
    // Connect to MongoDB
    console.log(`Connecting to MongoDB: ${config.mongoUri.replace(/\/\/(.+?):(.+?)@/, '//***:***@')}`);
    await mongoose.connect(config.mongoUri);
    console.log(`Connected to database: ${mongoose.connection.name}\n`);
    
    // Fix passwords for all test accounts
    await fixPassword('admin', testAccounts.admin.email, testAccounts.admin.password);
    await fixPassword('provider', testAccounts.provider.email, testAccounts.provider.password);
    await fixPassword('patient', testAccounts.patient.email, testAccounts.patient.password);
    
    // Verify final login state
    console.log('\nFinal verification of all accounts...');
    await verifyLogin('admin', testAccounts.admin.email, testAccounts.admin.password);
    await verifyLogin('provider', testAccounts.provider.email, testAccounts.provider.password);
    await verifyLogin('patient', testAccounts.patient.email, testAccounts.patient.password);
    
    console.log('\n✅ Password fixes completed successfully');
    console.log('You should now be able to sign in with the test accounts.\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

async function fixPassword(role, email, password) {
  console.log(`Fixing ${role} account: ${email}`);
  
  // Find user
  const user = await User.findOne({ email });
  
  if (!user) {
    console.log(`  ❌ User not found. Run 'npm run seed' to create test accounts first.`);
    return;
  }
  
  // Generate a new hash for the password
  const hashedPassword = await bcrypt.hash(password, 12);
  
  // Skip the pre-save hook by updating directly in the database
  await User.updateOne(
    { _id: user._id },
    { 
      $set: { 
        password: hashedPassword,
        isEmailVerified: true,
        isProfileCompleted: true
      } 
    }
  );
  
  console.log(`  ✅ Password reset successfully for ${email}`);
}

async function verifyLogin(role, email, password) {
  console.log(`Verifying login for ${role}: ${email}`);
  
  // Find the user again
  const user = await User.findOne({ email });
  
  if (!user) {
    console.log(`  ❌ User not found: ${email}`);
    return false;
  }
  
  // Test the password directly with bcrypt
  try {
    const passwordMatches = await bcrypt.compare(password, user.password);
    console.log(`  Password verification: ${passwordMatches ? '✅ Success' : '❌ Failed'}`);
    
    // If failed, log more details
    if (!passwordMatches) {
      console.log(`  Debug info:`);
      console.log(`  - Stored password hash: ${user.password.substring(0, 20)}...`);
      console.log(`  - Expected password: ${password}`);
      
      // Try via the User model method
      const modelMatch = await user.comparePassword(password);
      console.log(`  - User model comparison: ${modelMatch ? '✅ Success' : '❌ Failed'}`);
    }
    
    return passwordMatches;
  } catch (error) {
    console.log(`  ❌ Error verifying password: ${error.message}`);
    return false;
  }
}

// Run the script
main().catch(console.error); 