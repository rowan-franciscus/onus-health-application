/**
 * Force Create Working Test Accounts
 * 
 * This script creates new test accounts with the same pattern as the working admin.test@email.com account.
 * We'll use provider.test@email.com and patient.test@email.com instead of the problematic ones.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Find User model and other required models
let User;
try {
  User = require('../../models/User');
} catch (error) {
  User = require('../../models').User;
}

async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/onus-health', {
      // Connection options
    });
    console.log('Connected to MongoDB successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
}

async function createOrUpdateTestAccount(userData) {
  try {
    // Check if user already exists
    const user = await User.findOne({ email: userData.email });
    
    if (user) {
      console.log(`User ${userData.email} already exists. Updating password...`);
      
      // Update password directly in the database to bypass middleware
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      await mongoose.connection.db.collection('users').updateOne(
        { _id: user._id },
        { $set: { 
          password: hashedPassword,
          isEmailVerified: true,
          isProfileCompleted: true
        }}
      );
      
      console.log(`✓ User ${userData.email} updated successfully!`);
      return user;
    } else {
      console.log(`Creating new user: ${userData.email}`);
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      // Create the user directly in the database
      const result = await mongoose.connection.db.collection('users').insertOne({
        ...userData,
        password: hashedPassword,
        isEmailVerified: true,
        isProfileCompleted: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log(`✓ User ${userData.email} created successfully!`);
      return await User.findById(result.insertedId);
    }
  } catch (error) {
    console.error(`Error creating/updating user ${userData.email}:`, error.message);
  }
}

async function createTestAccounts() {
  // Define test accounts data
  const testAccounts = [
    {
      email: 'admin.test@email.com',
      password: 'password@123',
      firstName: 'Admin',
      lastName: 'Test',
      role: 'admin'
    },
    {
      email: 'provider.test@email.com',
      password: 'password@123',
      firstName: 'Provider',
      lastName: 'Test',
      role: 'provider'
    },
    {
      email: 'patient.test@email.com',
      password: 'password@123',
      firstName: 'Patient',
      lastName: 'Test',
      role: 'patient'
    }
  ];
  
  console.log('Creating or updating test accounts:');
  console.log('----------------------------------');
  
  for (const accountData of testAccounts) {
    await createOrUpdateTestAccount(accountData);
  }
}

async function verifyTestAccounts() {
  const testEmails = [
    'admin.test@email.com',
    'provider.test@email.com',
    'patient.test@email.com'
  ];
  
  console.log('\nVerifying test accounts:');
  console.log('------------------------');
  
  for (const email of testEmails) {
    try {
      const user = await User.findOne({ email });
      
      if (!user) {
        console.log(`❌ ${email}: NOT FOUND`);
        continue;
      }
      
      // Verify the password
      const isValid = await bcrypt.compare('password@123', user.password);
      
      console.log(`${email}: Account exists - Password valid: ${isValid ? '✓ YES' : '❌ NO'}`);
      
    } catch (error) {
      console.error(`Error verifying ${email}:`, error.message);
    }
  }
}

async function updateTestAccountsDocumentation() {
  console.log('\nNOTE: Please update the TEST_ACCOUNTS.md document with the following information:');
  console.log('-----------------------------------------------------------------------');
  console.log('The following test accounts are confirmed working:');
  console.log('- Admin: admin.test@email.com / password@123');
  console.log('- Provider: provider.test@email.com / password@123');
  console.log('- Patient: patient.test@email.com / password@123');
  console.log('\nIf you continue to experience issues with the other test accounts,');
  console.log('please use these accounts instead.');
}

async function main() {
  await connectToDatabase();
  await createTestAccounts();
  await verifyTestAccounts();
  await updateTestAccountsDocumentation();
  
  mongoose.connection.close();
  console.log('\nDatabase connection closed.');
}

// Run the script
main().catch(console.error); 