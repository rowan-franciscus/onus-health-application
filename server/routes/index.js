const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const consultationRoutes = require('./consultation.routes');
const medicalRecordRoutes = require('./medicalRecord.routes');
const connectionRoutes = require('./connection.routes');
const adminRoutes = require('./admin.routes');
const providerRoutes = require('./provider.routes');
const fileRoutes = require('./file.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/consultations', consultationRoutes);
router.use('/medical-records', medicalRecordRoutes);
router.use('/connections', connectionRoutes);
router.use('/admin', adminRoutes);
router.use('/provider', providerRoutes);
router.use('/files', fileRoutes);

module.exports = router; 