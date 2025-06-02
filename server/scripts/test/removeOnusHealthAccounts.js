/**
 * Remove @onus-health.com Test Accounts
 * 
 * This script removes all test accounts with @onus-health.com domain from the database.
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Find User model
let User;
try {
  User = require('../../models/User');
} catch (error) {
  User = require('../../models').User;
}

// Find any other models we might need to clean up related records
let Connection, Consultation;
try {
  Connection = require('../../models/Connection');
  Consultation = require('../../models/Consultation');
} catch (error) {
  const models = require('../../models');
  Connection = models.Connection;
  Consultation = models.Consultation;
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

async function findOnusHealthAccounts() {
  try {
    const accounts = await User.find({ 
      email: { $regex: '@onus-health.com$' } 
    });
    
    if (accounts.length === 0) {
      console.log('No @onus-health.com accounts found in the database.');
      return [];
    }
    
    console.log(`Found ${accounts.length} @onus-health.com accounts:`);
    
    for (const account of accounts) {
      console.log(`- ${account.email} (${account.role})`);
    }
    
    return accounts;
  } catch (error) {
    console.error('Error finding @onus-health.com accounts:', error.message);
    return [];
  }
}

async function removeOnusHealthAccounts() {
  try {
    // First, find all onus-health.com accounts
    const accounts = await findOnusHealthAccounts();
    
    if (accounts.length === 0) {
      return;
    }
    
    console.log('\nRemoving related data and accounts...');
    
    // Get user IDs to delete related records
    const userIds = accounts.map(account => account._id);
    
    // Clean up related data: Connections
    const connectionResult = await Connection.deleteMany({
      $or: [
        { provider: { $in: userIds } },
        { patient: { $in: userIds } }
      ]
    });
    
    console.log(`Removed ${connectionResult.deletedCount} connections.`);
    
    // Clean up related data: Consultations
    const consultationResult = await Consultation.deleteMany({
      $or: [
        { provider: { $in: userIds } },
        { patient: { $in: userIds } }
      ]
    });
    
    console.log(`Removed ${consultationResult.deletedCount} consultations.`);
    
    // Clean up related data: Medical records
    // Note: We're assuming medical records are linked to consultations, which we've deleted
    
    // Finally, remove the user accounts
    const userResult = await User.deleteMany({
      email: { $regex: '@onus-health.com$' }
    });
    
    console.log(`Removed ${userResult.deletedCount} @onus-health.com user accounts.`);
    
  } catch (error) {
    console.error('Error removing @onus-health.com accounts:', error.message);
  }
}

async function main() {
  await connectToDatabase();
  await removeOnusHealthAccounts();
  
  mongoose.connection.close();
  console.log('\nDatabase connection closed.');
}

// Run the script
main().catch(console.error); 