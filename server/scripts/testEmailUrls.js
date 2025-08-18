/**
 * Test Email URL Configuration
 * 
 * This script tests what URLs will be generated for email verification
 * in different environments.
 */

require('dotenv').config();
const config = require('../config/environment');

console.log('=== Email URL Configuration Test ===\n');

console.log('Current Environment:', config.env);
console.log('Frontend URL:', config.frontendUrl || 'Not configured');
console.log('Backend URL:', config.backendUrl || 'Not configured');

// Simulate the email service logic
let backendUrl = config.backendUrl;

if (!backendUrl) {
  if (config.env === 'production') {
    if (config.frontendUrl && config.frontendUrl.includes('.onrender.com')) {
      backendUrl = 'https://onus-backend.onrender.com';
      console.log('\n✅ Will use Render backend URL:', backendUrl);
    } else if (config.frontendUrl) {
      backendUrl = config.frontendUrl;
      console.log('\n⚠️  Will use frontend URL as backend URL:', backendUrl);
    } else {
      backendUrl = 'https://onus-backend.onrender.com';
      console.log('\n⚠️  No URLs configured, using default:', backendUrl);
    }
  } else {
    backendUrl = (config.frontendUrl || 'http://localhost:3000').replace(':3000', ':5000');
    console.log('\n✅ Development mode, will use:', backendUrl);
  }
}

const verificationUrl = `${backendUrl}/api/auth/verify/sample-token-123`;
console.log('\nSample verification URL that would be sent in emails:');
console.log(verificationUrl);

console.log('\n📝 Notes:');
if (!config.backendUrl && config.env === 'production') {
  console.log('- BACKEND_URL is not set, using automatic detection');
  console.log('- For Render deployments, this will use https://onus-backend.onrender.com');
  console.log('- To override, set BACKEND_URL environment variable');
} else if (config.backendUrl) {
  console.log('- BACKEND_URL is explicitly configured');
} else {
  console.log('- Running in development mode');
}