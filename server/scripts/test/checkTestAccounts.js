/**
 * Test Accounts Check Script
 * 
 * This script examines the test accounts in the database and
 * provides functionality to update their passwords if needed.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Find User model
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

async function listAllUsers() {
  try {
    console.log('All users in the database:');
    console.log('-------------------------');
    
    const users = await User.find({}).select('email role createdAt isEmailVerified');
    
    if (users.length === 0) {
      console.log('No users found in the database');
      return;
    }
    
    users.forEach(user => {
      console.log(`- Email: ${user.email}, Role: ${user.role}, Verified: ${user.isEmailVerified}, Created: ${user.createdAt}`);
    });
    
    return users;
  } catch (error) {
    console.error('Error listing users:', error.message);
  }
}

async function checkTestAccounts() {
  const testEmails = [
    'admin.test@email.com',
    'provider.test@email.com',
    'patient.test@email.com'
  ];
  
  console.log('\nChecking test accounts:');
  console.log('------------------------------');
  
  for (const email of testEmails) {
    try {
      const user = await User.findOne({ email });
      
      if (!user) {
        console.log(`❌ ${email}: NOT FOUND`);
        continue;
      }
      
      // Try to verify if password is 'password@123'
      const isPasswordValid = await bcrypt.compare('password@123', user.password);
      
      console.log(`✓ ${email}: EXISTS (Role: ${user.role}, Verified: ${user.isEmailVerified}, Password 'password@123' valid: ${isPasswordValid})`);
      
    } catch (error) {
      console.error(`Error checking ${email}:`, error.message);
    }
  }
}

async function fixTestAccounts() {
  const testAccounts = [
    { email: 'admin.test@email.com', role: 'admin' },
    { email: 'provider.test@email.com', role: 'provider' },
    { email: 'patient.test@email.com', role: 'patient' }
  ];
  
  console.log('\nFixing test accounts with invalid passwords:');
  console.log('------------------------------------------');
  
  for (const account of testAccounts) {
    try {
      const user = await User.findOne({ email: account.email });
      
      if (!user) {
        console.log(`❌ ${account.email}: NOT FOUND - cannot fix`);
        continue;
      }
      
      // Check if the password is already valid
      const isPasswordValid = await bcrypt.compare('password@123', user.password);
      
      if (isPasswordValid) {
        console.log(`✓ ${account.email}: Password already valid - no action needed`);
        continue;
      }
      
      // Fix the password
      const hashedPassword = await bcrypt.hash('password@123', 12);
      user.password = hashedPassword;
      await user.save();
      
      console.log(`✓ ${account.email}: Password has been updated to 'password@123'`);
      
    } catch (error) {
      console.error(`Error fixing ${account.email}:`, error.message);
    }
  }
}

async function main() {
  await connectToDatabase();
  await listAllUsers();
  await checkTestAccounts();
  
  // Ask if user wants to fix the invalid test accounts
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  readline.question('\nDo you want to fix test accounts with invalid passwords? (y/n): ', async (answer) => {
    if (answer.toLowerCase() === 'y') {
      await fixTestAccounts();
    } else {
      console.log('No changes were made to the database.');
    }
    
    readline.close();
    mongoose.connection.close();
    console.log('\nDatabase connection closed.');
  });
}

// Run the script
main().catch(console.error); 