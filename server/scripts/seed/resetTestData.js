/**
 * Reset Test Data Script for Onus Health Application
 * 
 * This script removes all test accounts and their associated data.
 * Use this for cleaning up the database when needed.
 * 
 * Usage: npm run seed:reset
 */

require('dotenv').config();
const { exec } = require('child_process');

// Execute the seedDatabase script with the reset flag
console.log('Resetting test data...');

exec('node server/scripts/seed/seedDatabase.js --reset', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`Error: ${stderr}`);
    return;
  }
  
  console.log(stdout);
  console.log('Test data reset completed successfully!');
}); 