/**
 * Authentication API Tests
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const { setupTestDB, teardownTestDB, clearDatabase } = require('./setup');

// Setup database before running tests
beforeAll(async () => {
  await setupTestDB();
});

// Clear data between tests
beforeEach(async () => {
  await clearDatabase();
});

// Disconnect after all tests
afterAll(async () => {
  await teardownTestDB();
});

describe('Authentication API', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password@123',
        firstName: 'Test',
        lastName: 'User',
        role: 'patient'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Check response structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', userData.email);
      expect(response.body.user).toHaveProperty('firstName', userData.firstName);
      expect(response.body.user).toHaveProperty('role', userData.role);
      
      // Password should not be returned
      expect(response.body.user).not.toHaveProperty('password');
      
      // Check user was saved in DB
      const savedUser = await User.findOne({ email: userData.email });
      expect(savedUser).toBeTruthy();
      expect(savedUser.email).toBe(userData.email);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'incomplete@example.com',
          // Missing other required fields
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    it('should not allow duplicate email', async () => {
      // Create a user
      const userData = {
        email: 'duplicate@example.com',
        password: 'Password@123',
        firstName: 'Test',
        lastName: 'User',
        role: 'patient'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Try to create another user with the same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Email already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      const hashedPassword = await require('bcryptjs').hash('Password@123', 12);
      await User.create({
        email: 'login.test@example.com',
        password: hashedPassword,
        firstName: 'Login',
        lastName: 'Test',
        role: 'patient',
        isEmailVerified: true
      });
    });

    it('should login a user with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login.test@example.com',
          password: 'Password@123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', 'login.test@example.com');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should reject login with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login.test@example.com',
          password: 'WrongPassword@123'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(response.body).not.toHaveProperty('token');
    });

    it('should reject login for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password@123'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
  });
}); 