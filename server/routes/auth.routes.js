const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const passport = require('passport');
const { authenticateJWT, authRateLimiter, passwordResetLimiter, consentLinkLimiter } = require('../middleware/auth.middleware');
const { validatePassword } = require('../utils/passwordPolicy');

// Reusable strong-password rule. Delegates to the shared password policy so the
// complexity rule stays identical across every entry point (see utils/passwordPolicy).
const strongPassword = (field = 'password') =>
  body(field).custom((value) => {
    const error = validatePassword(value);
    if (error) {
      throw new Error(error);
    }
    return true;
  });

// Validation middleware
const registerValidation = [
  body('email').isEmail().withMessage('Enter a valid email'),
  strongPassword('password'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  // Self-registration may only create patient or provider accounts.
  // Admin and practice_admin accounts are provisioned through privileged, authenticated flows only.
  body('role').optional().isIn(['patient', 'provider']).withMessage('Invalid role')
];

const loginValidation = [
  body('email').isEmail().withMessage('Enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

// Regular user authentication
router.post('/register', registerValidation, authController.register);
router.post('/login', authRateLimiter, loginValidation, authController.login);
router.post('/logout', authenticateJWT, authController.logout);
router.get('/me', authenticateJWT, authController.getCurrentUser);

// Practice Admin invite acceptance (public)
router.get('/practice-admin-invite/:token', authController.getPracticeAdminInvite);
router.post('/practice-admin-invite/:token/accept', authController.acceptPracticeAdminInvite);

// Claim a provider-created patient record (link from the consent email)
router.get('/claim/:token', consentLinkLimiter, authController.getClaim);
router.post('/claim/:token', consentLinkLimiter, authController.claimProfile);

// Social authentication

// Runs a social strategy without sessions; on failure sends the person back
// to the frontend with a reason (e.g. record_exists: sign up with email to
// link a provider-created record) instead of an API-relative redirect.
const socialCallback = (strategy) => (req, res, next) => {
  passport.authenticate(strategy, { session: false }, (err, user, info) => {
    if (err || !user) {
      const reason = (info && info.code) || 'auth_failed';
      const page = reason === 'record_exists' ? 'sign-up' : 'sign-in';
      return res.redirect(`${process.env.FRONTEND_URL}/${page}?error=${reason}`);
    }
    req.user = user;
    return next();
  })(req, res, next);
};

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', 
  socialCallback('google'),
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
  socialCallback('facebook'),
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
    strongPassword('newPassword')
  ],
  authController.resetPassword
);

// Token refresh
router.post('/refresh-token', authController.refreshToken);

// Session status check
router.get('/session-status', authenticateJWT, authController.checkSessionStatus);

module.exports = router; 