/**
 * Script to list all users in the database
 * Run with: node server/scripts/list-all-users.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

// Import models
const User = require('../models/User');
const Connection = require('../models/Connection');

async function connectDB() {
  try {
    // Use the same logic as the main application to get the MongoDB URI
    const mongoUri = process.env.MONGODB_ATLAS_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/onus-health';
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');
    console.log(`📍 Database: ${mongoose.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function listAllUsers() {
  try {
    console.log('\n👥 Listing all users in the database...\n');
    
    // Get all users
    const users = await User.find({}, 'email firstName lastName role isEmailVerified isVerified').sort({ role: 1, email: 1 });
    
    if (users.length === 0) {
      console.log('❌ No users found in the database');
      return;
    }
    
    // Group users by role
    const usersByRole = {
      admin: [],
      provider: [],
      patient: []
    };
    
    users.forEach(user => {
      if (usersByRole[user.role]) {
        usersByRole[user.role].push(user);
      }
    });
    
    // Display admins
    if (usersByRole.admin.length > 0) {
      console.log('👩‍💼 ADMIN USERS:');
      usersByRole.admin.forEach(user => {
        console.log(`   - ${user.email} (${user.firstName} ${user.lastName})`);
        console.log(`     Email Verified: ${user.isEmailVerified ? '✅' : '❌'}`);
      });
      console.log('');
    }
    
    // Display providers
    if (usersByRole.provider.length > 0) {
      console.log('🧑‍⚕️ PROVIDER USERS:');
      usersByRole.provider.forEach(user => {
        console.log(`   - ${user.email} (${user.firstName} ${user.lastName})`);
        console.log(`     Email Verified: ${user.isEmailVerified ? '✅' : '❌'}, Provider Verified: ${user.isVerified ? '✅' : '❌'}`);
      });
      console.log('');
    }
    
    // Display patients
    if (usersByRole.patient.length > 0) {
      console.log('🧍 PATIENT USERS:');
      usersByRole.patient.forEach(user => {
        console.log(`   - ${user.email} (${user.firstName} ${user.lastName})`);
        console.log(`     Email Verified: ${user.isEmailVerified ? '✅' : '❌'}`);
      });
      console.log('');
    }
    
    console.log(`\n📊 Total users: ${users.length}`);
    
    // Check for users with rowan.franciscus in email
    console.log('\n🔍 Checking for users with "rowan.franciscus" in email...');
    const rowanUsers = users.filter(user => user.email.includes('rowan.franciscus'));
    
    if (rowanUsers.length > 0) {
      console.log(`Found ${rowanUsers.length} user(s):`);
      rowanUsers.forEach(user => {
        console.log(`   - ${user.email} (${user.role})`);
      });
      
      // Check connections for these users
      console.log('\n🔗 Checking connections for these users...');
      for (const user of rowanUsers) {
        if (user.role === 'provider') {
          const connections = await Connection.find({ provider: user._id }).populate('patient', 'email firstName lastName');
          if (connections.length > 0) {
            console.log(`\n   Provider ${user.email} has ${connections.length} patient(s):`);
            connections.forEach(conn => {
              console.log(`     - ${conn.patient.email} (${conn.patient.firstName} ${conn.patient.lastName})`);
            });
          } else {
            console.log(`\n   Provider ${user.email} has no patients`);
          }
        } else if (user.role === 'patient') {
          const connections = await Connection.find({ patient: user._id }).populate('provider', 'email firstName lastName');
          if (connections.length > 0) {
            console.log(`\n   Patient ${user.email} has ${connections.length} provider(s):`);
            connections.forEach(conn => {
              console.log(`     - ${conn.provider.email} (${conn.provider.firstName} ${conn.provider.lastName})`);
            });
          } else {
            console.log(`\n   Patient ${user.email} has no providers`);
          }
        }
      }
    } else {
      console.log('No users found with "rowan.franciscus" in their email');
    }
    
  } catch (error) {
    console.error('❌ Error listing users:', error);
  }
}

async function main() {
  try {
    await connectDB();
    await listAllUsers();
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
  }
}

// Run the script
main(); 