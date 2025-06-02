const jwt = require('jsonwebtoken');
const config = require('./config/environment');

// Test JWT verification
const testToken = process.argv[2];

if (!testToken) {
  console.log('Usage: node test-auth.js <token>');
  process.exit(1);
}

try {
  const decoded = jwt.verify(testToken, config.jwtSecret);
  console.log('Token is valid!');
  console.log('Decoded payload:', decoded);
} catch (error) {
  console.error('Token verification failed:', error.message);
  
  // Try to decode without verification to see the payload
  try {
    const decoded = jwt.decode(testToken);
    console.log('Token payload (unverified):', decoded);
  } catch (decodeError) {
    console.error('Failed to decode token:', decodeError.message);
  }
} 