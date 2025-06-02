/**
 * Reset Admin User Script
 * 
 * This script will check for any existing admin users and reset or create them
 * with known credentials for testing purposes.
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

// Reset or create admin user
const resetAdminUser = async () => {
  try {
    // Define admin credentials
    const adminCredentials = {
      email: 'admin.test@email.com',
      password: 'password@123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isEmailVerified: true,
      isProfileCompleted: true,
      adminProfile: {
        department: 'Administration',
        adminLevel: 'super'
      }
    };

    // Check if admin user exists
    const existingAdmin = await User.findOne({ email: adminCredentials.email });
    
    if (existingAdmin) {
      console.log(`Admin user ${adminCredentials.email} exists, resetting password...`);
      
      // Hash password
      const hashedPassword = await bcrypt.hash(adminCredentials.password, 12);
      
      // Update admin user
      await User.findByIdAndUpdate(existingAdmin._id, {
        password: hashedPassword,
        isEmailVerified: true,
        isProfileCompleted: true
      });
      
      console.log('Admin user password reset successfully');
    } else {
      console.log(`Admin user ${adminCredentials.email} does not exist, creating...`);
      
      // Hash password
      const hashedPassword = await bcrypt.hash(adminCredentials.password, 12);
      
      // Create admin user
      const newAdmin = await User.create({
        ...adminCredentials,
        password: hashedPassword
      });
      
      console.log(`Admin user created with ID: ${newAdmin._id}`);
    }

    // Create a test admin for development instead
    const testAdmin = {
      email: 'admin.test@email.com',
      password: 'password@123',
      firstName: 'Admin',
      lastName: 'Test',
      role: 'admin',
      isEmailVerified: true,
      isProfileCompleted: true
    };

    const existingTestAdmin = await User.findOne({ email: testAdmin.email });
    
    if (existingTestAdmin) {
      console.log(`Test admin user ${testAdmin.email} exists, resetting password...`);
      
      // Hash password
      const hashedPassword = await bcrypt.hash(testAdmin.password, 12);
      
      // Update admin user
      await User.findByIdAndUpdate(existingTestAdmin._id, {
        password: hashedPassword,
        isEmailVerified: true,
        isProfileCompleted: true
      });
      
      console.log('Test admin user password reset successfully');
    } else {
      console.log(`Test admin user ${testAdmin.email} does not exist, creating...`);
      
      // Hash password
      const hashedPassword = await bcrypt.hash(testAdmin.password, 12);
      
      // Create admin user
      const newTestAdmin = await User.create({
        ...testAdmin,
        password: hashedPassword
      });
      
      console.log(`Test admin user created with ID: ${newTestAdmin._id}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error resetting admin user:', error);
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
    
    // Reset admin user
    const reset = await resetAdminUser();
    
    if (!reset) {
      console.error('Failed to reset admin user. Exiting...');
      process.exit(1);
    }
    
    console.log('Admin user(s) reset successfully');
    
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