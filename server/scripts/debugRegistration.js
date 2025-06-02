/**
 * Debug Registration Script
 * 
 * This script tests the user registration process with different input payloads
 * to identify validation issues.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/environment');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const { body } = require('express-validator');

// Mock the registration validations
const registerValidation = [
  body('email').isEmail().withMessage('Enter a valid email'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('role').isIn(['patient', 'provider', 'admin']).withMessage('Invalid role')
];

// Sample test payloads
const testPayloads = [
  {
    name: "Complete Provider",
    body: {
      email: "test.provider@example.com",
      password: "password123",
      firstName: "Test",
      lastName: "Provider",
      role: "provider"
    }
  },
  {
    name: "Missing Role",
    body: {
      email: "test.provider@example.com",
      password: "password123",
      firstName: "Test",
      lastName: "Provider"
    }
  },
  {
    name: "Invalid Role",
    body: {
      email: "test.provider@example.com",
      password: "password123",
      firstName: "Test",
      lastName: "Provider",
      role: "doctor" // Not in the allowed roles
    }
  },
  {
    name: "Short Password",
    body: {
      email: "test.provider@example.com",
      password: "pass",
      firstName: "Test",
      lastName: "Provider",
      role: "provider"
    }
  },
  {
    name: "Invalid Email",
    body: {
      email: "test.provider",
      password: "password123",
      firstName: "Test",
      lastName: "Provider",
      role: "provider"
    }
  },
  {
    name: "Empty First Name",
    body: {
      email: "test.provider@example.com",
      password: "password123",
      firstName: "",
      lastName: "Provider",
      role: "provider"
    }
  },
  {
    name: "Missing First Name",
    body: {
      email: "test.provider@example.com",
      password: "password123",
      lastName: "Provider",
      role: "provider"
    }
  }
];

// Mock request and response objects for express-validator
async function runValidation(payload) {
  console.log(`\nTesting: ${payload.name}`);
  console.log(`Payload: ${JSON.stringify(payload.body)}`);
  
  // Create a mock request
  const req = { body: payload.body };
  
  // Run all the validators
  const validationPromises = registerValidation.map(validation => validation(req, {}, () => {}));
  await Promise.all(validationPromises);
  
  // Check results
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    console.log("❌ Validation Failed:");
    console.log(errors.array());
    return false;
  } else {
    console.log("✅ Validation Passed");
    return true;
  }
}

async function main() {
  try {
    console.log("=== Debug Registration Validation ===\n");
    
    // Test each payload
    for (const payload of testPayloads) {
      await runValidation(payload);
    }
    
    console.log("\n=== Registration Validation Test Complete ===");
    
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the script
main().catch(console.error); 