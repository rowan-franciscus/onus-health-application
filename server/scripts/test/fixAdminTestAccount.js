/**
 * Fix Admin Test Account Script
 * 
 * This script ensures the admin.test@email.com account has the correct password.
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

async function fixAdminTestAccount() {
  try {
    const email = 'admin.test@email.com';
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`❌ ${email}: NOT FOUND`);
      return;
    }
    
    console.log(`Found user: ${email}, Role: ${user.role}`);
    
    // Update the password
    const hashedPassword = await bcrypt.hash('password@123', 12);
    user.password = hashedPassword;
    await user.save();
    
    console.log(`✓ ${email}: Password has been reset to 'password@123'`);
    
    // Verify the new password
    const isPasswordValid = await bcrypt.compare('password@123', user.password);
    console.log(`Password verification: ${isPasswordValid ? 'Successful' : 'Failed'}`);
    
  } catch (error) {
    console.error('Error fixing admin test account:', error.message);
  }
}

async function main() {
  await connectToDatabase();
  await fixAdminTestAccount();
  mongoose.connection.close();
  console.log('Database connection closed.');
}

// Run the script
main().catch(console.error); 