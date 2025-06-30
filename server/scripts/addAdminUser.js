/**
 * Script to add a new admin user to the Onus Health Application
 * 
 * Usage: node scripts/addAdminUser.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config/environment');
const User = require('../models/User');

// Admin user details
const newAdmin = {
  email: 'julian@onus.health',
  password: 'password@123',
  firstName: 'Julian',
  lastName: 'Admin',
  title: 'Mr.',
  phone: '0811234567',
  role: 'admin',
  isEmailVerified: true,
  isProfileCompleted: true,
  adminProfile: {
    department: 'Administration',
    adminLevel: 'super' // Full admin functionality
  }
};

// Connect to MongoDB
mongoose.connect(config.mongoUri)
  .then(() => {
    console.log(`MongoDB connected successfully to ${mongoose.connection.name} database`);
    if (mongoose.connection.name !== 'onus-health') {
      console.warn(`WARNING: Connected to "${mongoose.connection.name}" database instead of "onus-health"`);
      console.warn('Please check your connection string in .env file');
      console.warn('Exiting to prevent data being added to the wrong database');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

/**
 * Add the new admin user
 */
const addAdminUser = async () => {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: newAdmin.email });
    
    if (existingUser) {
      console.log(`Admin user ${newAdmin.email} already exists`);
      
      // Check if it's an admin
      if (existingUser.role !== 'admin') {
        console.log(`Updating ${newAdmin.email} role to admin...`);
        existingUser.role = 'admin';
        existingUser.adminProfile = newAdmin.adminProfile;
        await existingUser.save();
        console.log(`Successfully updated ${newAdmin.email} to admin role`);
      } else {
        console.log(`${newAdmin.email} is already an admin`);
      }
      
      // Verify password
      const passwordMatches = await bcrypt.compare(newAdmin.password, existingUser.password);
      if (!passwordMatches) {
        console.log(`Updating password for ${newAdmin.email}...`);
        const hashedPassword = await bcrypt.hash(newAdmin.password, 12);
        existingUser.password = hashedPassword;
        await existingUser.save();
        console.log(`Password updated successfully`);
      }
      
      return existingUser;
    }
    
    // Create new admin user
    console.log(`Creating new admin user: ${newAdmin.email}...`);
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(newAdmin.password, 12);
    
    // Create the user
    const adminUser = await User.create({
      ...newAdmin,
      password: hashedPassword
    });
    
    console.log(`Successfully created admin user: ${adminUser.email}`);
    console.log('Admin details:');
    console.log(`- Email: ${adminUser.email}`);
    console.log(`- Password: ${newAdmin.password}`);
    console.log(`- Name: ${adminUser.firstName} ${adminUser.lastName}`);
    console.log(`- Role: ${adminUser.role}`);
    console.log(`- Admin Level: ${adminUser.adminProfile.adminLevel}`);
    console.log(`- Email Verified: ${adminUser.isEmailVerified}`);
    console.log(`- Profile Completed: ${adminUser.isProfileCompleted}`);
    
    return adminUser;
    
  } catch (error) {
    console.error('Error adding admin user:', error);
    throw error;
  }
};

// Run the script
addAdminUser()
  .then((user) => {
    console.log('\nAdmin user setup completed successfully!');
    console.log(`You can now login with:`);
    console.log(`Email: ${newAdmin.email}`);
    console.log(`Password: ${newAdmin.password}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\nFatal error:', error);
    process.exit(1);
  })
  .finally(() => {
    mongoose.connection.close();
  }); 