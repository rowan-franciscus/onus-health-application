const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const passport = require('passport');
const { authenticateJWT, authRateLimiter, passwordResetLimiter } = require('../middleware/auth.middleware');

// Validation middleware
const registerValidation = [
  body('email').isEmail().withMessage('Enter a valid email'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('role').isIn(['patient', 'provider', 'admin']).withMessage('Invalid role')
];

const loginValidation = [
  body('email').isEmail().withMessage('Enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

// Regular user authentication
router.post('/register', registerValidation, authController.register);
router.post('/login', authRateLimiter, loginValidation, authController.login);
router.get('/me', authenticateJWT, authController.getCurrentUser);

// Social authentication
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', 
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  async (req, res) => {
    try {
      const user = req.user;
      
      // Check if provider is verified by admin (for providers who have completed onboarding)
      if (user.role === 'provider' && user.isProfileCompleted) {
        const isVerified = user.providerProfile && user.providerProfile.isVerified;
        if (!isVerified) {
          // Redirect to sign-in with error message
          return res.redirect(`${process.env.FRONTEND_URL}/sign-in?error=provider_not_verified`);
        }
      }
      
      // Generate tokens after successful authentication
      const authToken = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken();
      
      // Redirect to frontend with tokens
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/social-callback?authToken=${authToken}&refreshToken=${refreshToken}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/sign-in?error=auth_failed`);
    }
  }
);

// Facebook authentication
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));

router.get('/facebook/callback', 
  passport.authenticate('facebook', { session: false, failureRedirect: '/login' }),
  async (req, res) => {
    try {
      const user = req.user;
      
      // Check if provider is verified by admin (for providers who have completed onboarding)
      if (user.role === 'provider' && user.isProfileCompleted) {
        const isVerified = user.providerProfile && user.providerProfile.isVerified;
        if (!isVerified) {
          // Redirect to sign-in with error message
          return res.redirect(`${process.env.FRONTEND_URL}/sign-in?error=provider_not_verified`);
        }
      }
      
      // Generate tokens after successful authentication
      const authToken = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken();
      
      // Redirect to frontend with tokens
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/social-callback?authToken=${authToken}&refreshToken=${refreshToken}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Facebook callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/sign-in?error=auth_failed`);
    }
  }
);

// Admin authentication
router.post('/admin/login', authRateLimiter, loginValidation, authController.adminLogin);

// Email verification
router.get('/verify/:token', authController.verifyEmail);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', passwordResetLimiter, authController.resendVerificationEmail);

// Password reset
router.post('/password-reset-request', 
  passwordResetLimiter,
  body('email').isEmail().withMessage('Enter a valid email'),
  authController.forgotPassword
);

router.post('/password-reset', 
  passwordResetLimiter,
  [
    body('token').notEmpty().withMessage('Token is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  ],
  authController.resetPassword
);

// Token refresh
router.post('/refresh-token', authController.refreshToken);

// Session status check
router.get('/session-status', authenticateJWT, authController.checkSessionStatus);

module.exports = router; 