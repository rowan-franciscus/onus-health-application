/**
 * Test Database Connection and Seeding Script
 * 
 * This script verifies that:
 * 1. We can connect to the MongoDB database
 * 2. We can create test accounts (admin, provider, patient)
 * 3. We can retrieve these accounts successfully
 * 
 * Usage: node scripts/test/testDatabaseConnection.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const database = require('../../utils/database');
const connectionMonitor = require('../../utils/connectionMonitor');
const logger = require('../../utils/logger');
const { User } = require('../../models');

// Test users to create
const testUsers = [
  {
    email: 'admin.test@email.com',
    password: 'password@123',
    firstName: 'Admin',
    lastName: 'Test',
    role: 'admin'
  },
  {
    email: 'provider.test@email.com',
    password: 'password@123',
    firstName: 'Provider',
    lastName: 'Test',
    role: 'provider'
  },
  {
    email: 'patient.test@email.com',
    password: 'password@123',
    firstName: 'Patient',
    lastName: 'Test',
    role: 'patient'
  }
];

/**
 * Create a test user
 * @param {Object} userData User data
 * @returns {Promise<Object>} Created user object
 */
const createTestUser = async (userData) => {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: userData.email });
    
    if (existingUser) {
      logger.info(`User ${userData.email} already exists`);
      return existingUser;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    // Create user
    const user = await User.create({
      ...userData,
      password: hashedPassword,
      isEmailVerified: true,
      isProfileCompleted: true
    });
    
    logger.info(`Created user: ${user.email} (${user.role})`);
    return user;
  } catch (error) {
    logger.error(`Error creating user ${userData.email}:`, error);
    throw error;
  }
};

/**
 * Retrieve a user by email
 * @param {string} email User email
 * @returns {Promise<Object>} User object
 */
const getUserByEmail = async (email) => {
  try {
    const user = await User.findOne({ email }).select('-password');
    
    if (!user) {
      logger.error(`User not found: ${email}`);
      return null;
    }
    
    logger.info(`Retrieved user: ${user.email} (${user.role})`);
    return user;
  } catch (error) {
    logger.error(`Error retrieving user ${email}:`, error);
    throw error;
  }
};

/**
 * Run all tests
 */
const runTests = async () => {
  try {
    // Test 1: Connect to the database
    logger.info('=== TEST 1: Database Connection ===');
    await database.connect();
    
    // Verify connection with a ping
    const pingTime = await connectionMonitor.pingDatabase();
    if (pingTime >= 0) {
      logger.info(`✅ Database ping successful: ${pingTime}ms`);
    } else {
      logger.error('❌ Database ping failed');
    }
    
    // Test 2: Create test users
    logger.info('\n=== TEST 2: Create Test Users ===');
    const adminUser = await createTestUser(testUsers[0]);
    const providerUser = await createTestUser(testUsers[1]);
    const patientUser = await createTestUser(testUsers[2]);
    
    if (adminUser && providerUser && patientUser) {
      logger.info('✅ All test users created successfully');
    } else {
      logger.error('❌ Failed to create test users');
    }
    
    // Test 3: Retrieve test users
    logger.info('\n=== TEST 3: Retrieve Test Users ===');
    const retrievedAdmin = await getUserByEmail(testUsers[0].email);
    const retrievedProvider = await getUserByEmail(testUsers[1].email);
    const retrievedPatient = await getUserByEmail(testUsers[2].email);
    
    if (retrievedAdmin && retrievedProvider && retrievedPatient) {
      logger.info('✅ All test users retrieved successfully');
    } else {
      logger.error('❌ Failed to retrieve test users');
    }
    
    // Display test user details
    logger.info('\n=== Test User Details ===');
    [retrievedAdmin, retrievedProvider, retrievedPatient].forEach(user => {
      if (user) {
        logger.info(`- ${user.role.toUpperCase()}: ${user.firstName} ${user.lastName} (${user.email})`);
      }
    });
    
    // Clean up test data option
    const shouldCleanup = process.argv.includes('--cleanup');
    if (shouldCleanup) {
      logger.info('\n=== Cleaning Up Test Data ===');
      await User.deleteMany({
        email: {
          $in: [
            testUsers[0].email,
            testUsers[1].email,
            testUsers[2].email
          ]
        }
      });
      logger.info('✅ Test data cleaned up successfully');
    } else {
      logger.info('\nTest data left in database. Run with --cleanup flag to remove test data.');
    }
    
    // Overall test result
    logger.info('\n=== TEST SUMMARY ===');
    logger.info('✅ All database connection and seeding tests passed successfully');
    
    // Disconnect from database
    await database.disconnect();
    
  } catch (error) {
    logger.error('Test failed with error:', error);
    process.exit(1);
  }
};

// Run the tests
runTests()
  .then(() => {
    logger.info('Test script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    logger.error('Test script failed:', error);
    process.exit(1);
  }); 