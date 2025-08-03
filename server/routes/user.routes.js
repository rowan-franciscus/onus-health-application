const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticateJWT, isProvider, isPatient } = require('../middleware/auth.middleware');
const multer = require('multer');
const upload = require('../middleware/upload.middleware');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

// Basic test route
router.get('/test', (req, res) => {
  res.json({ message: 'User routes test successful' });
});

// Get current user
router.get('/me', authenticateJWT, (req, res) => {
  // Forward to the correct controller function if it exists
  if (userController.getCurrentUser) {
    return userController.getCurrentUser(req, res);
  }
  // Fallback implementation
  res.json({ 
    message: 'Current user endpoint', 
    user: req.user ? {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    } : null 
  });
});

// Profile routes
router.get('/profile', authenticateJWT, userController.getUserProfile);
router.put('/profile', authenticateJWT, userController.updateUserProfile);

// Patient onboarding route
router.post('/onboarding', authenticateJWT, userController.completeOnboarding);

// Patient dashboard route
router.get('/patient/dashboard', authenticateJWT, isPatient, userController.getPatientDashboard);

// Patient recent consultations
router.get('/patient/consultations/recent', authenticateJWT, isPatient, userController.getPatientRecentConsultations);

// Patient recent vitals
router.get('/patient/vitals/recent', authenticateJWT, isPatient, userController.getPatientRecentVitals);

// Change password (all authenticated users)
router.put('/change-password', authenticateJWT, userController.changePassword);

// Update notification preferences
router.put('/notifications', authenticateJWT, userController.updateNotificationPreferences);

// Delete account
router.delete('/account', authenticateJWT, userController.deleteAccount);

// Search providers (for patients to connect with)
router.get('/providers/search', authenticateJWT, isPatient, userController.searchProviders);

// Determine base upload directory based on environment
const getBaseUploadDir = () => {
  // Check if running on Render with persistent storage
  if (process.env.RENDER && fs.existsSync('/mnt/data')) {
    return path.join('/mnt/data', 'uploads');
  }
  // Fall back to local uploads directory
  return path.join(__dirname, '../uploads');
};

// Set up storage for license files
const licenseStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(getBaseUploadDir(), 'licenses');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for license documents
const licenseFilter = (req, file, cb) => {
  // Accept only pdf, png, jpg and jpeg
  if (file.mimetype === 'application/pdf' || 
      file.mimetype === 'image/png' || 
      file.mimetype === 'image/jpeg' || 
      file.mimetype === 'image/jpg') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, PNG, JPG and JPEG files are allowed!'), false);
  }
};

// Create the upload middleware for licenses
const licenseUpload = multer({ 
  storage: licenseStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: licenseFilter
});

// Set up storage for profile pictures
const profilePictureStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(getBaseUploadDir(), 'profile-images');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for profile pictures
const profilePictureFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype === 'image/png' || 
      file.mimetype === 'image/jpeg' || 
      file.mimetype === 'image/jpg' ||
      file.mimetype === 'image/gif') {
    cb(null, true);
  } else {
    cb(new Error('Only PNG, JPG, JPEG and GIF image files are allowed!'), false);
  }
};

// Create the upload middleware for profile pictures
const profilePictureUpload = multer({ 
  storage: profilePictureStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit for profile pictures
  fileFilter: profilePictureFilter
});

// Upload profile picture endpoint
router.post('/profile-picture', 
  authenticateJWT, 
  profilePictureUpload.single('profilePicture'),
  userController.uploadProfilePicture
);

// Delete profile picture endpoint
router.delete('/profile-picture', 
  authenticateJWT, 
  userController.deleteProfilePicture
);

// Provider Onboarding with file upload support
router.post(
  '/provider-onboarding',
  authenticateJWT,
  // Add file upload middleware
  licenseUpload.single('licenseFile'),
  // Add logging and parse FormData
  (req, res, next) => {
    logger.info('Provider onboarding request received');
    logger.debug('Provider onboarding request body:', req.body);
    
    // Parse all stringified JSON fields
    const formFields = ['professionalInfo', 'practiceInfo', 'patientManagement', 'dataAccess', 'dataSharing', 'supportCommunication'];
    
    formFields.forEach(field => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        try {
          req.body[field] = JSON.parse(req.body[field]);
          logger.debug(`Parsed ${field}:`, req.body[field]);
        } catch (e) {
          logger.error(`Error parsing ${field} JSON`, e);
        }
      }
    });
    
    // Handle file upload if present
    if (req.file) {
      logger.info(`License file uploaded: ${req.file.filename}`);
      
      // Add file path to the body for the controller
      if (!req.body.professionalInfo) {
        req.body.professionalInfo = {};
      }
      
      // Set the license path
      req.body.professionalInfo.practiceLicense = `/uploads/licenses/${req.file.filename}`;
    } else {
      logger.info('No license file in request');
    }
    
    logger.debug('Processed provider onboarding data:', req.body);
    next();
  },
  userController.completeProviderOnboarding
);

module.exports = router; 