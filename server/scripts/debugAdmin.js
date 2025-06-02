/**
 * Debug Admin User Script
 * 
 * This script will test password comparison for admin users
 * to diagnose login issues
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Connect to MongoDB
const connectToDatabase = async () => {
  try {
    // Use MongoDB connection string from environment variable
    const uri = process.env.MONGODB_ATLAS_URI || 'mongodb://localhost:27017/onus-health';
    
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    return false;
  }
};

// Debug admin user password
const debugAdminPassword = async () => {
  try {
    // Get admin user
    const admin = await User.findOne({ email: 'admin.test@email.com' });
    
    if (!admin) {
      console.log('Admin user not found');
      return false;
    }
    
    console.log('Admin user found:');
    console.log('- ID:', admin._id);
    console.log('- Email:', admin.email);
    console.log('- Role:', admin.role);
    console.log('- Is email verified:', admin.isEmailVerified);
    
    // Test password comparison
    const password = 'password@123';
    const isMatch = await admin.comparePassword(password);
    
    console.log('Password comparison result:', isMatch);
    
    // Create a new hash with the same password for comparison
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log('New hashed password:', hashedPassword);
    
    // Test comparePassword manually
    const manualCompare = await bcrypt.compare(password, admin.password);
    console.log('Manual password comparison result:', manualCompare);
    
    // Create a completely new admin user for testing
    const newTestAdmin = new User({
      email: 'fresh.admin@example.com',
      password: password,
      firstName: 'Fresh',
      lastName: 'Admin',
      role: 'admin',
      isEmailVerified: true,
      isProfileCompleted: true
    });
    
    // Save the user to trigger the password hashing middleware
    await newTestAdmin.save();
    
    // Test password comparison with this new user
    const newAdminMatch = await newTestAdmin.comparePassword(password);
    console.log('New admin password comparison result:', newAdminMatch);
    
    // Clean up the test user
    await User.findByIdAndDelete(newTestAdmin._id);
    
    return true;
  } catch (error) {
    console.error('Error debugging admin password:', error);
    return false;
  }
};

// Main function
const main = async () => {
  try {
    // Connect to database
    const connected = await connectToDatabase();
    
    if (!connected) {
      console.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }
    
    // Debug admin password
    const debugged = await debugAdminPassword();
    
    if (!debugged) {
      console.error('Failed to debug admin password. Exiting...');
      process.exit(1);
    }
    
    // Disconnect from database
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
    process.exit(0);
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
};

// Run the script
main(); 