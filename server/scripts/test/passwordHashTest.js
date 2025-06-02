/**
 * Password Hashing Test Script
 * 
 * This script tests bcrypt password hashing to demonstrate why
 * the same password produces different hashes each time.
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');

async function testPasswordHashing() {
  const password = 'password@123';
  
  console.log('Testing bcrypt password hashing:');
  console.log('-------------------------------');
  console.log(`Password: ${password}`);
  
  // Generate 3 different hashes of the same password
  console.log('\nGenerating 3 different hashes of the same password:');
  
  const hash1 = await bcrypt.hash(password, 12);
  const hash2 = await bcrypt.hash(password, 12);
  const hash3 = await bcrypt.hash(password, 12);
  
  console.log(`Hash 1: ${hash1}`);
  console.log(`Hash 2: ${hash2}`);
  console.log(`Hash 3: ${hash3}`);
  
  // Verify all three hashes against the original password
  console.log('\nVerifying all three hashes against the original password:');
  
  const isValid1 = await bcrypt.compare(password, hash1);
  const isValid2 = await bcrypt.compare(password, hash2);
  const isValid3 = await bcrypt.compare(password, hash3);
  
  console.log(`Hash 1 valid: ${isValid1}`);
  console.log(`Hash 2 valid: ${isValid2}`);
  console.log(`Hash 3 valid: ${isValid3}`);
  
  // Explanation of why this is secure
  console.log('\nExplanation:');
  console.log('bcrypt generates a random salt for each password hash.');
  console.log('This ensures that even when hashing the same password multiple times,');
  console.log('each hash is unique, preventing rainbow table attacks.');
  console.log('The compare function can still verify the password because the salt is');
  console.log('stored as part of the hash.');
}

testPasswordHashing().catch(console.error); 