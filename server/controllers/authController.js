/**
 * Authentication Controller
 * Handles user authentication-related operations
 */

const User = require('../models/User');
const jwt = require('jsonwebtoken');
const config = require('../config/environment');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Register a new user
 */
exports.register = async (req, res) => {
  try {
    // Log the incoming request for debugging
    logger.debug(`Registration attempt with payload: ${JSON.stringify(req.body)}`);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn(`Registration validation failed: ${JSON.stringify(errors.array())}`);
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, role } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      logger.warn(`Registration failed: User already exists with email ${email}`);
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    user = new User({
      email,
      password,
      firstName,
      lastName,
      role: role || 'patient'
    });

    await user.save();
    logger.info(`User created with ID ${user._id} and email ${email}`);

    // Generate verification token
    const verificationToken = jwt.sign(
      { id: user._id },
      config.jwtSecret,
      { expiresIn: '24h' }
    );
    logger.debug(`Generated verification token for ${email}`);

    // Send verification email
    try {
      const emailService = require('../services/email.service');
      const emailSent = await emailService.sendVerificationEmail(user, verificationToken);
      logger.info(`Verification email sent to ${email}: ${emailSent ? 'SUCCESS' : 'FAILED'}`);
      
      // For debugging: log verification URL
      if (config.env === 'development') {
        const verificationUrl = `${config.frontendUrl}/verify-email/${verificationToken}`;
        logger.debug(`Development verification URL: ${verificationUrl}`);
      }
    } catch (emailError) {
      logger.error(`Failed to send verification email to ${email}:`, emailError);
      // Continue with the registration process even if email sending fails
    }

    // Generate tokens
    const authToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    logger.info(`User registered successfully: ${email} (${role || 'patient'})`);
    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email for verification.',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      tokens: {
        authToken,
        refreshToken
      }
    });
  } catch (error) {
    logger.error(`Registration error: ${error.message}`, { error });
    res.status(500).json({ message: 'Server error during registration' });
  }
};

/**
 * Login user
 */
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn(`Login attempt failed: user not found with email ${email}`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logger.warn(`Login attempt failed: invalid password for user ${email}`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if email is verified
    if (!user.isEmailVerified && !user.googleId && !user.facebookId) {
      logger.info(`Login attempt failed: unverified email for user ${email}`);
      return res.status(403).json({ 
        message: 'Email not verified. Please verify your email before logging in.',
        code: 'EMAIL_NOT_VERIFIED' 
      });
    }

    // Check if provider is verified by admin
    if (user.role === 'provider' && user.isProfileCompleted) {
      // Only check verification status after onboarding is completed
      const isVerified = user.providerProfile && user.providerProfile.isVerified;
      if (!isVerified) {
        logger.info(`Login attempt failed: provider account not verified by admin for user ${email}`);
        return res.status(403).json({
          message: 'Your provider account is pending verification. Please wait for admin approval.',
          code: 'PROVIDER_NOT_VERIFIED'
        });
      }
    }

    // Update last login timestamp
    user.lastLogin = Date.now();
    await user.save();

    // Generate tokens
    const authToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    logger.info(`User ${email} logged in successfully`);

    // Prepare user data for response
    const userData = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isProfileCompleted: user.isProfileCompleted,
      onboardingCompleted: user.isProfileCompleted // Include this for frontend compatibility
    };

    // Add isVerified flag for providers
    if (user.role === 'provider') {
      userData.isVerified = user.providerProfile && user.providerProfile.isVerified === true;
    }

    res.json({
      user: userData,
      tokens: {
        authToken,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

/**
 * Refresh access token using refresh token
 */
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    // Verify refresh token
    let user;
    try {
      user = await User.verifyRefreshToken(refreshToken);
    } catch (error) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Generate new tokens
    const newAuthToken = user.generateAuthToken();
    const newRefreshToken = user.generateRefreshToken();

    res.json({
      tokens: {
        authToken: newAuthToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ message: 'Server error during token refresh' });
  }
};

/**
 * Get current user profile
 */
exports.getCurrentUser = async (req, res) => {
  try {
    // User is available from auth middleware
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Server error while fetching user data' });
  }
};

/**
 * Verify email
 */
exports.verifyEmail = async (req, res) => {
  try {
    // Get token from either params (GET request) or body (POST request)
    const token = req.params.token || (req.body && req.body.token);
    
    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }

    // Verify the token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (error) {
      // For GET requests, redirect to error page
      if (req.method === 'GET') {
        return res.redirect(`${config.frontendUrl}/verification-error`);
      }
      // For POST requests, return JSON error
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired verification token' 
      });
    }

    // Find and update user
    const user = await User.findById(decoded.id);
    
    if (!user) {
      // For GET requests, redirect to error page
      if (req.method === 'GET') {
        return res.redirect(`${config.frontendUrl}/verification-error`);
      }
      // For POST requests, return JSON error
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    if (user.isEmailVerified) {
      // If already verified
      
      // For GET requests, redirect to app
      if (req.method === 'GET') {
        const redirectUrl = user.isProfileCompleted ? 
          `${config.frontendUrl}/dashboard` : 
          `${config.frontendUrl}/onboarding?role=${user.role}`;
        
        return res.redirect(redirectUrl);
      }
      
      // For POST requests, return success
      return res.json({
        success: true,
        message: 'Email already verified',
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          onboardingCompleted: user.isProfileCompleted
        }
      });
    }

    // Update user as verified
    user.isEmailVerified = true;
    await user.save();

    logger.info(`Email verified successfully for user: ${user.email}`);
    
    // Generate new token for auto-login
    const authToken = user.generateAuthToken();
    
    // For GET requests, redirect to onboarding
    if (req.method === 'GET') {
      const redirectUrl = `${config.frontendUrl}/onboarding?role=${user.role}&token=${authToken}`;
      return res.redirect(redirectUrl);
    }
    
    // For POST requests, return success JSON
    return res.json({
      success: true,
      message: 'Email verified successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        onboardingCompleted: user.isProfileCompleted
      },
      token: authToken
    });
  } catch (error) {
    logger.error('Email verification error:', error);
    
    // For GET requests, redirect to error page
    if (req.method === 'GET') {
      return res.redirect(`${config.frontendUrl}/verification-error`);
    }
    
    // For POST requests, return error JSON
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during email verification' 
    });
  }
};

/**
 * Admin login
 */
exports.adminLogin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find admin user by email
    const user = await User.findOne({ email, role: 'admin' });
    if (!user) {
      logger.warn(`Admin login attempt failed: admin not found with email ${email}`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logger.warn(`Admin login attempt failed: invalid password for admin ${email}`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update last login timestamp
    user.lastLogin = Date.now();
    await user.save();

    // Generate tokens
    const authToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    logger.info(`Admin ${email} logged in successfully`);
    res.json({
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isProfileCompleted: user.isProfileCompleted,
        onboardingCompleted: user.isProfileCompleted // Include this for frontend compatibility
      },
      tokens: {
        authToken,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error during admin login' });
  }
};

/**
 * Request password reset
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({ message: 'If the email exists, a password reset link will be sent' });
    }

    // Generate password reset token
    const resetToken = jwt.sign(
      { id: user._id },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // Store token hash in user document
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Import email service
    const emailService = require('../services/email.service');
    
    // Send password reset email using the email service
    await emailService.sendPasswordResetEmail(user, resetToken, {
      queue: true // Queue the email
    });

    return res.status(200).json({ message: 'If the email exists, a password reset link will be sent' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ message: 'Server error during password reset request' });
  }
};

/**
 * Reset password using token
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (error) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Find user by ID and token
    const user = await User.findOne({
      _id: decoded.id,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Set new password
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Import email service
    const emailService = require('../services/email.service');
    
    // Send confirmation email using the email service
    await emailService.sendTemplateEmail(
      user.email,
      'passwordResetSuccess',
      {
        firstName: user.firstName,
        frontendUrl: config.frontendUrl
      },
      {
        subject: 'Password Reset Successful',
        userId: user._id,
        queue: true
      }
    );

    return res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
};

/**
 * Check session status (used for keeping session alive)
 */
exports.checkSessionStatus = async (req, res) => {
  try {
    // User is already verified by auth middleware
    res.json({ 
      success: true, 
      message: 'Session is active',
      userId: req.user._id
    });
  } catch (error) {
    console.error('Session status check error:', error);
    res.status(500).json({ message: 'Error checking session status' });
  }
};

/**
 * Resend verification email
 */
exports.resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      // For security reasons, don't reveal that the user doesn't exist
      return res.status(200).json({ 
        success: true,
        message: 'If the email exists, a verification link will be sent' 
      });
    }
    
    // Don't resend if already verified
    if (user.isEmailVerified) {
      return res.status(200).json({ 
        success: true,
        message: 'Email already verified. Please sign in.' 
      });
    }
    
    // Generate a new verification token
    const verificationToken = jwt.sign(
      { id: user._id },
      config.jwtSecret,
      { expiresIn: '24h' }
    );
    
    // Send the verification email
    try {
      const emailService = require('../services/email.service');
      const emailSent = await emailService.sendVerificationEmail(user, verificationToken);
      
      logger.info(`Resent verification email to ${email}: ${emailSent ? 'SUCCESS' : 'FAILED'}`);
      
      // For debugging: log verification URL
      if (config.env === 'development') {
        const verificationUrl = `${config.frontendUrl}/verify-email/${verificationToken}`;
        logger.debug(`Development verification URL: ${verificationUrl}`);
      }
      
      return res.status(200).json({
        success: true,
        message: 'Verification email has been sent'
      });
    } catch (emailError) {
      logger.error(`Failed to resend verification email to ${email}:`, emailError);
      return res.status(500).json({ 
        success: false,
        message: 'Failed to send verification email. Please try again later.' 
      });
    }
  } catch (error) {
    logger.error('Resend verification email error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Server error during email verification' 
    });
  }
}; 