const mongoose = require('mongoose');
const User = require('./models/User');
const database = require('./utils/database');
require('dotenv').config();
const config = require('./config/environment');

async function checkUsers() {
  try {
    console.log(`Connecting to MongoDB: ${config.mongoUri.replace(/\/\/(.+?):(.+?)@/, '//***:***@')}`);
    await database.connect();
    
    console.log(`Connected to MongoDB database: ${mongoose.connection.name}`);
    
    if (mongoose.connection.name !== 'onus-health') {
      console.warn(`WARNING: Connected to "${mongoose.connection.name}" database instead of "onus-health" database`);
      console.warn('Please check your connection string in the .env file');
      console.warn('Run npm run consolidate:db to fix this issue');
    }
    
    const users = await User.find({}).select('email role firstName lastName isEmailVerified isProfileCompleted');
    
    console.log('\nUsers in database:');
    if (users.length === 0) {
      console.log('No users found. Run npm run seed to create test accounts.');
    } else {
      users.forEach(user => {
        console.log(`- ${user.email} (${user.role}): ${user.firstName || 'N/A'} ${user.lastName || 'N/A'}`);
        console.log(`  Email Verified: ${user.isEmailVerified ? 'Yes' : 'No'}, Profile Completed: ${user.isProfileCompleted ? 'Yes' : 'No'}`);
      });
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await database.disconnect();
    console.log('\nMongoDB connection closed');
  }
}

// Run the check
checkUsers(); 