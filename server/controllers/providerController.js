/**
 * Provider Controller
 * Handles provider-specific operations
 */

const User = require('../models/User');
const Consultation = require('../models/Consultation');
const Connection = require('../models/Connection');
const logger = require('../utils/logger');

/**
 * Get provider dashboard data
 */
exports.getDashboard = async (req, res) => {
  try {
    // Get provider data
    const providerId = req.user.id;
    
    // Get basic statistics
    const [
      patientCount,
      consultationCount,
      recentConsultations
    ] = await Promise.all([
      // Count patients with active connections to this provider
      Connection.countDocuments({ provider: providerId }),
      
      // Count consultations created by this provider
      Consultation.countDocuments({ provider: providerId }),
      
      // Get recent consultations
      Consultation.find({ provider: providerId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('patient', 'firstName lastName')
    ]);

    res.json({
      success: true,
      dashboardData: {
        patientCount,
        consultationCount,
        recentConsultations
      }
    });
  } catch (error) {
    logger.error('Error getting provider dashboard:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
  }
};

/**
 * Get provider's patients
 */
exports.getPatients = async (req, res) => {
  try {
    const providerId = req.user.id;
    
    // Find all connections for this provider
    const connections = await Connection.find({ 
      provider: providerId
    }).populate('patient', 'firstName lastName email patientProfile.dateOfBirth patientProfile.gender');
    
    // Extract patient data from connections
    const patients = connections.map(conn => ({
      ...conn.patient.toObject(),
      connectionInfo: {
        accessLevel: conn.accessLevel,
        fullAccessStatus: conn.fullAccessStatus,
        connectionId: conn._id,
        initiatedAt: conn.initiatedAt
      }
    }));
    
    res.json({
      success: true,
      patients
    });
  } catch (error) {
    logger.error('Error getting provider patients:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch patients' });
  }
};

/**
 * Add a new patient
 */
exports.addPatient = async (req, res) => {
  try {
    const providerId = req.user.id;
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Patient email is required' });
    }
    
    // Find patient by email
    const patient = await User.findOne({ email, role: 'patient' });
    
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    
    // Check if connection already exists
    const existingConnection = await Connection.findOne({
      provider: providerId,
      patient: patient._id
    });
    
    if (existingConnection) {
      // If connection exists but access was revoked (limited access), 
      // allow provider to request full access again
      if (existingConnection.accessLevel === 'limited' && 
          (existingConnection.fullAccessStatus === 'denied' || 
           existingConnection.fullAccessStatus === 'none')) {
        
        // Provider can request full access again
        return res.status(200).json({ 
          success: true, 
          message: 'You have limited access to this patient. You can request full access.',
          connection: existingConnection,
          canRequestFullAccess: true
        });
      }
      
      return res.status(400).json({ 
        success: false, 
        message: 'Patient connection already exists',
        connection: existingConnection
      });
    }
    
    // Create new connection with limited access (patient can upgrade to full access if needed)
    const connection = new Connection({
      provider: providerId,
      patient: patient._id,
      accessLevel: 'limited',
      fullAccessStatus: 'none',
      initiatedBy: providerId,
      initiatedAt: Date.now()
    });
    
    await connection.save();
    
    // Send email notification to patient
    // (Implementation depends on your email service)
    
    res.status(201).json({
      success: true,
      message: 'Patient connection created successfully',
      connection
    });
  } catch (error) {
    logger.error('Error adding patient:', error);
    res.status(500).json({ success: false, message: 'Failed to add patient' });
  }
};

/**
 * Get patient by ID
 */
exports.getPatientById = async (req, res) => {
  try {
    const providerId = req.user.id;
    const { patientId } = req.params;
    
    // Check if provider has a connection to this patient
    const connection = await Connection.findOne({
      provider: providerId,
      patient: patientId
    });
    
    if (!connection) {
      return res.status(403).json({ success: false, message: 'No connection to this patient' });
    }
    
    // Determine what data to return based on access level and status
    let patientData;
    
    if (connection.accessLevel === 'full' && connection.fullAccessStatus === 'approved') {
      // Full access approved - return all patient data
      patientData = await User.findById(patientId)
        .select('-password -resetPasswordToken -resetPasswordExpires');
    } else {
      // Limited access or pending/denied full access - return only basic info
      patientData = await User.findById(patientId)
        .select('firstName lastName email _id');
    }
    
    if (!patientData) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    
    res.json({
      success: true,
      patient: patientData,
      connectionInfo: {
        accessLevel: connection.accessLevel,
        fullAccessStatus: connection.fullAccessStatus,
        connectionId: connection._id
      }
    });
  } catch (error) {
    logger.error('Error getting patient by ID:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch patient' });
  }
};

/**
 * Get consultations
 */
exports.getConsultations = async (req, res) => {
  try {
    const providerId = req.user.id;
    const { patientId, page = 1, limit = 20 } = req.query;
    
    const query = { provider: providerId };
    
    // If patientId is provided, filter by patient
    if (patientId) {
      query.patient = patientId;
    }
    
    const skip = (page - 1) * limit;
    
    const [consultations, total] = await Promise.all([
      Consultation.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('patient', 'firstName lastName'),
      
      Consultation.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      consultations,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error getting consultations:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch consultations' });
  }
};

/**
 * Create consultation
 */
exports.createConsultation = async (req, res) => {
  try {
    const providerId = req.user.id;
    const { patientId, consultationData } = req.body;
    
    if (!patientId || !consultationData) {
      return res.status(400).json({ success: false, message: 'Patient ID and consultation data are required' });
    }
    
    // Check if provider has a connection to this patient
    const connection = await Connection.findOne({
      provider: providerId,
      patient: patientId
    });
    
    if (!connection) {
      return res.status(403).json({ success: false, message: 'No connection to this patient' });
    }
    
    // Create consultation
    const consultation = new Consultation({
      patient: patientId,
      provider: providerId,
      ...consultationData
    });
    
    await consultation.save();
    
    // Send email notification to patient
    // (Implementation depends on your email service)
    
    res.status(201).json({
      success: true,
      message: 'Consultation created successfully',
      consultation
    });
  } catch (error) {
    logger.error('Error creating consultation:', error);
    res.status(500).json({ success: false, message: 'Failed to create consultation' });
  }
};

/**
 * Get consultation by ID
 */
exports.getConsultationById = async (req, res) => {
  try {
    const providerId = req.user.id;
    const { consultationId } = req.params;
    
    // Get consultation with check for provider access
    const consultation = await Consultation.findOne({
      _id: consultationId,
      provider: providerId
    }).populate('patient', 'firstName lastName');
    
    if (!consultation) {
      return res.status(404).json({ success: false, message: 'Consultation not found' });
    }
    
    res.json({
      success: true,
      consultation
    });
  } catch (error) {
    logger.error('Error getting consultation by ID:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch consultation' });
  }
};

/**
 * Update consultation
 */
exports.updateConsultation = async (req, res) => {
  try {
    const providerId = req.user.id;
    const { consultationId } = req.params;
    const updateData = req.body;
    
    // Find consultation and check provider access
    const consultation = await Consultation.findOne({
      _id: consultationId,
      provider: providerId
    });
    
    if (!consultation) {
      return res.status(404).json({ success: false, message: 'Consultation not found' });
    }
    
    // Update fields
    Object.assign(consultation, updateData);
    consultation.updatedAt = Date.now();
    
    await consultation.save();
    
    res.json({
      success: true,
      message: 'Consultation updated successfully',
      consultation
    });
  } catch (error) {
    logger.error('Error updating consultation:', error);
    res.status(500).json({ success: false, message: 'Failed to update consultation' });
  }
};

/**
 * Get provider profile
 */
exports.getProfile = async (req, res) => {
  try {
    const providerId = req.user.id;
    
    const provider = await User.findById(providerId)
      .select('-password -resetPasswordToken -resetPasswordExpires');
    
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }
    
    res.json({
      success: true,
      provider
    });
  } catch (error) {
    logger.error('Error getting provider profile:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};

/**
 * Update provider profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const providerId = req.user.id;
    const updateData = req.body;
    
    logger.debug('Profile update request for provider:', providerId);
    logger.debug('Update data:', JSON.stringify(updateData, null, 2));
    
    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updateData.password;
    delete updateData.role;
    delete updateData.isEmailVerified;
    
    // Get current provider to preserve verification status
    const currentProvider = await User.findById(providerId);
    if (!currentProvider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }
    
    logger.debug('Current provider verification status:', currentProvider.providerProfile?.isVerified);
    
    // Preserve the verification status when updating provider profile
    if (updateData.providerProfile) {
      // Always preserve the current verification status if it exists
      const currentVerificationStatus = currentProvider.providerProfile?.isVerified || false;
      updateData.providerProfile.isVerified = currentVerificationStatus;
      
      logger.debug('Preserving verification status as:', currentVerificationStatus);
    }
    
    logger.debug('Final update data with preserved verification:', JSON.stringify(updateData.providerProfile, null, 2));
    
    const provider = await User.findByIdAndUpdate(
      providerId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password -resetPasswordToken -resetPasswordExpires');
    
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }
    
    logger.debug('Updated provider verification status:', provider.providerProfile?.isVerified);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      provider
    });
  } catch (error) {
    logger.error('Error updating provider profile:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

/**
 * Change password
 */
exports.changePassword = async (req, res) => {
  try {
    const providerId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }
    
    // Find provider
    const provider = await User.findById(providerId);
    
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }
    
    // Verify current password
    const isMatch = await provider.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }
    
    // Update password
    provider.password = newPassword;
    await provider.save();
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Error changing password:', error);
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
}; 