const express = require('express');
const router = express.Router();
const providerController = require('../controllers/providerController');
const { authenticateJWT, isVerifiedProvider } = require('../middleware/auth.middleware');

// Get verification status
router.get('/status', authenticateJWT, (req, res) => {
  // If the user is not a provider or not verified, the isVerifiedProvider middleware will block
  // If we reach here, the provider is verified
  res.json({ 
    success: true, 
    message: 'Provider is verified', 
    isVerified: true
  });
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