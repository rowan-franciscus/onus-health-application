/**
 * Consolidate to Onus Health Database
 * 
 * This script:
 * 1. Connects to MongoDB Atlas
 * 2. Ensures the connection is to the onus-health database
 * 3. Seeds test users and data into the onus-health database
 * 4. Optionally removes any test databases
 * 5. Fixes authentication issues with test accounts
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const config = require('../config/environment');

async function main() {
  try {
    console.log('=== Consolidate to Onus Health Database ===\n');
    
    // Step 1: Fix the database connection
    console.log('Step 1: Checking database connection string...');
    
    const envFilePath = path.join(__dirname, '../.env');
    if (!fs.existsSync(envFilePath)) {
      console.error('Error: .env file not found!');
      console.log('Create a .env file in the server directory with your MongoDB Atlas URI');
      process.exit(1);
    }
    
    let envContent = fs.readFileSync(envFilePath, 'utf8');
    const mongoDbAtlasUriPattern = /MONGODB_ATLAS_URI=(.+)/;
    const match = envContent.match(mongoDbAtlasUriPattern);
    
    if (!match) {
      console.error('Error: MONGODB_ATLAS_URI not found in .env file!');
      process.exit(1);
    }
    
    const currentUri = match[1];
    
    // Check if database name is already specified correctly
    const hasDatabaseName = currentUri.includes('/onus-health') || currentUri.includes('/onus-health?');
    
    if (!hasDatabaseName) {
      console.log('Database name is missing in the connection string. Fixing...');
      
      // Add database name to connection string
      let updatedUri;
      if (currentUri.includes('.net/?')) {
        updatedUri = currentUri.replace('.net/?', '.net/onus-health?');
      } else if (currentUri.includes('.net?')) {
        updatedUri = currentUri.replace('.net?', '.net/onus-health?');
      } else if (currentUri.includes('.net/')) {
        // Already has a database name, replace it
        updatedUri = currentUri.replace(/\.net\/[^?]+(\?|$)/, '.net/onus-health$1');
      } else {
        // No database name and no query parameters
        updatedUri = currentUri + '/onus-health';
      }
      
      // Update .env file
      envContent = envContent.replace(mongoDbAtlasUriPattern, `MONGODB_ATLAS_URI=${updatedUri}`);
      fs.writeFileSync(envFilePath, envContent, 'utf8');
      console.log('✅ Updated connection string with onus-health database name');
    } else {
      console.log('✅ Database name already set to onus-health');
    }
    
    // Step 2: Connect to MongoDB Atlas
    console.log('\nStep 2: Connecting to MongoDB Atlas...');
    
    await mongoose.connect(config.mongoUri);
    
    const dbName = mongoose.connection.name;
    if (dbName !== 'onus-health') {
      console.error(`❌ Connected to "${dbName}" database instead of "onus-health"`);
      console.log('Please check your connection string manually.');
      await mongoose.disconnect();
      process.exit(1);
    }
    
    console.log(`✅ Successfully connected to ${dbName} database`);
    
    // Step 3: Check for test database existence
    console.log('\nStep 3: Checking for test databases...');
    
    const admin = mongoose.connection.db.admin();
    const dbs = await admin.listDatabases();
    
    const testDbs = dbs.databases.filter(db => 
      db.name === 'onus-health-test' || 
      db.name === 'test' || 
      db.name.includes('test')
    );
    
    if (testDbs.length > 0) {
      console.log(`Found ${testDbs.length} test database(s):`);
      testDbs.forEach(db => console.log(`- ${db.name}`));
      
      // Optionally drop these databases
      const confirmDroppingTestDbs = true; // Set to true to automatically drop test databases
      
      if (confirmDroppingTestDbs) {
        console.log('\nRemoving test databases...');
        
        for (const db of testDbs) {
          try {
            await mongoose.connection.client.db(db.name).dropDatabase();
            console.log(`✅ Dropped database: ${db.name}`);
          } catch (error) {
            console.error(`❌ Failed to drop database ${db.name}:`, error.message);
          }
        }
      }
    } else {
      console.log('✅ No test databases found');
    }
    
    // Disconnect before running scripts
    await mongoose.disconnect();
    console.log('Temporary disconnected for clean execution of scripts');
    
    // Step 4: Seed the onus-health database
    console.log('\nStep 4: Seeding onus-health database with test users...');
    
    try {
      // Run the seed script using the updated connection string
      console.log('\nRunning seed script...');
      execSync('node scripts/seed/seedDatabase.js', { stdio: 'inherit' });
      console.log('✅ Seed script completed successfully');
    } catch (error) {
      console.error('❌ Failed to run seed script:', error.message);
    }
    
    // Step 5: Fix authentication issues
    console.log('\nStep 5: Fixing authentication issues...');
    
    try {
      // Run the auth fix script
      console.log('\nRunning authentication fix script...');
      execSync('node scripts/fixAuthenticationIssues.js', { stdio: 'inherit' });
      console.log('✅ Authentication fixes completed successfully');
    } catch (error) {
      console.error('❌ Failed to fix authentication issues:', error.message);
    }
    
    // Step 6: Verify test users have been created
    console.log('\nStep 6: Verifying test users in onus-health database...');
    
    try {
      // Run the check-users script to verify users
      console.log('\nRunning check-users script...');
      execSync('node check-users.js', { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ Failed to verify users:', error.message);
    }
    
    console.log('\n=== Database Consolidation Complete ===');
    console.log('Your application is now configured to use only the onus-health database');
    console.log('Test users have been seeded and fixed in the onus-health database');
    console.log('You should now be able to sign in with test accounts and start testing the application');
    
  } catch (error) {
    console.error('Error:', error.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

// Run the script
main().catch(console.error); 