const express = require('express');
const router = express.Router();
const providerController = require('../controllers/providerController');
const { authenticateJWT, isVerifiedProvider } = require('../middleware/auth.middleware');

// Get verification status
router.get('/status', authenticateJWT, async (req, res) => {
  try {
    // Check if user is a provider
    if (req.user.role !== 'provider') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied: Provider role required' 
      });
    }
    
    // Load the full user to check verification status
    const User = require('../models/User');
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Check if provider is verified
    const isVerified = user.providerProfile && user.providerProfile.isVerified === true;
    
    if (!isVerified) {
      return res.status(403).json({ 
        success: false, 
        message: 'Provider account is pending verification',
        code: 'PROVIDER_NOT_VERIFIED',
        isVerified: false
      });
    }
    
    // Provider is verified
    res.json({ 
      success: true, 
      message: 'Provider is verified', 
      isVerified: true
    });
  } catch (error) {
    console.error('Error checking provider status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error checking verification status' 
    });
  }
});

// Protected provider routes requiring verification
router.get('/dashboard', authenticateJWT, isVerifiedProvider, providerController.getDashboard);
router.get('/patients', authenticateJWT, isVerifiedProvider, providerController.getPatients);
router.post('/patients', authenticateJWT, isVerifiedProvider, providerController.addPatient);
router.get('/patients/:patientId', authenticateJWT, isVerifiedProvider, providerController.getPatientById);

// Consultations
router.get('/consultations', authenticateJWT, isVerifiedProvider, providerController.getConsultations);
router.post('/consultations', authenticateJWT, isVerifiedProvider, providerController.createConsultation);
router.get('/consultations/:consultationId', authenticateJWT, isVerifiedProvider, providerController.getConsultationById);
router.put('/consultations/:consultationId', authenticateJWT, isVerifiedProvider, providerController.updateConsultation);

// Profile and settings (available to providers even before verification)
router.get('/profile', authenticateJWT, providerController.getProfile);
router.put('/profile', authenticateJWT, providerController.updateProfile);
router.put('/change-password', authenticateJWT, providerController.changePassword);

module.exports = router; 