/**
 * Test Environment Setup
 * Configures the environment for running tests
 */

// Set environment to test
process.env.NODE_ENV = 'test';

// Import dependencies
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const config = require('../config/environment');

let mongoServer;

/**
 * Connect to the in-memory database
 */
const setupTestDB = async () => {
  // Create an in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect mongoose to the MongoDB memory server
  await mongoose.connect(mongoUri);
};

/**
 * Disconnect and cleanup after tests
 */
const teardownTestDB = async () => {
  if (mongoServer) {
    await mongoose.disconnect();
    await mongoServer.stop();
  }
};

/**
 * Clear the database between tests
 */
const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};

module.exports = {
  setupTestDB,
  teardownTestDB,
  clearDatabase
}; 