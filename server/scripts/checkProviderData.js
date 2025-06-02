/**
 * Script to check provider data for a specific user
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const config = require('../config/environment');

async function checkProviderData() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    console.log(`MongoDB URI: ${config.mongoUri}`);
    
    await mongoose.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');
    
    // Find user by email
    const email = 'rowan.franciscus.3@gmail.com';
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`User with email ${email} not found`);
      process.exit(1);
    }

    console.log('=== USER DATA ===');
    console.log(`ID: ${user._id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.firstName} ${user.lastName}`);
    console.log(`Role: ${user.role}`);
    console.log(`Email Verified: ${user.isEmailVerified}`);
    console.log(`Profile Completed: ${user.isProfileCompleted}`);
    
    console.log('\n=== PROVIDER PROFILE DATA ===');
    if (user.providerProfile) {
      console.log('Provider Profile:', JSON.stringify(user.providerProfile, null, 2));
    } else {
      console.log('Provider profile not found');
    }

    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the function
checkProviderData(); 