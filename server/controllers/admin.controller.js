const User = require('../models/User');
const Consultation = require('../models/Consultation');
const Connection = require('../models/Connection');
const { ApiError } = require('../middleware/error.middleware');
const httpStatus = require('http-status');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Get all users with optional filtering
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { role, status, verified, search, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    const query = {};
    
    if (role) query.role = role;
    if (status) query.status = status;
    if (verified !== undefined) query.isEmailVerified = verified === 'true';
    
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
      
    const total = await User.countDocuments(query);
    
    res.json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return next(new ApiError(httpStatus.NOT_FOUND, 'User not found'));
    }
    
    res.json(user);
  } catch (error) {
    next(error);
  }
};

/**
 * Update user
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updateData.password;
    
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!updatedUser) {
      return next(new ApiError(httpStatus.NOT_FOUND, 'User not found'));
    }
    
    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByIdAndDelete(id);
    
    if (!user) {
      return next(new ApiError(httpStatus.NOT_FOUND, 'User not found'));
    }
    
    // Cleanup related data
    await Consultation.deleteMany({ patient: id });
    await Connection.deleteMany({ 
      $or: [{ patient: id }, { provider: id }] 
    });
    
    res.status(httpStatus.NO_CONTENT).send();
  } catch (error) {
    next(error);
  }
};

/**
 * Get provider verifications
 */
const getProviderVerifications = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    const query = { 
      role: 'provider',
      isProfileCompleted: true
    };
    
    if (status) {
      if (status === 'pending') {
        // For pending, look for unverified providers
        query.$or = [
          { 'providerProfile.isVerified': false },
          { 'providerProfile.isVerified': { $exists: false } }
        ];
      } else if (status === 'approved') {
        query['providerProfile.isVerified'] = true;
      } else if (status === 'rejected') {
        query['providerProfile.verificationRejected'] = true;
      }
    }
    
    logger.info(`Fetching providers with query: ${JSON.stringify(query)}`);
    
    // Ensure we're getting all fields by removing specific selection
    const providers = await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ updatedAt: -1 });
      
    const total = await User.countDocuments(query);
    
    // Log the first provider's data to see what fields are available
    if (providers.length > 0) {
      logger.debug(`First provider data sample: ${JSON.stringify({
        id: providers[0]._id,
        email: providers[0].email,
        name: `${providers[0].firstName} ${providers[0].lastName}`,
        providerProfile: providers[0].providerProfile || {}
      })}`);
    }
    
    logger.info(`Found ${providers.length} provider verifications with status: ${status || 'all'}`);
    
    res.json({
      providers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching provider verifications:', error);
    next(error);
  }
};

/**
 * Update provider verification
 */
const updateProviderVerification = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { status, notes } = req.body;
    
    const provider = await User.findById(userId);
    
    if (!provider) {
      return next(new ApiError(httpStatus.NOT_FOUND, 'Provider not found'));
    }
    
    if (provider.role !== 'provider') {
      return next(new ApiError(httpStatus.BAD_REQUEST, 'User is not a provider'));
    }
    
    provider.verificationStatus = status;
    provider.verificationNotes = notes;
    provider.verifiedAt = status === 'approved' ? new Date() : null;
    
    await provider.save();
    
    res.json(provider);
  } catch (error) {
    next(error);
  }
};

/**
 * Get analytics
 */
const getAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate, metric } = req.query;
    
    // Create date filters
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);
    
    let data = {};
    
    if (!metric || metric === 'users') {
      // User metrics
      const userQuery = startDate || endDate ? { createdAt: dateFilter } : {};
      
      const [
        totalUsers,
        totalPatients,
        totalProviders,
        newUsers,
        activeUsers,
        genderDistribution,
        deletedProfiles
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: 'patient' }),
        User.countDocuments({ role: 'provider' }),
        User.countDocuments({ ...userQuery, createdAt: dateFilter }),
        User.countDocuments({ lastLogin: dateFilter }),
        User.aggregate([
          { $match: { role: 'patient' } },
          { $group: { _id: '$patientProfile.gender', count: { $sum: 1 } } }
        ]),
        User.countDocuments({ ...userQuery, deleted: true })
      ]);
      
      // Calculate average age for patients
      const patientsWithDob = await User.find({ 
        role: 'patient', 
        'patientProfile.dateOfBirth': { $exists: true, $ne: null } 
      });
      
      let averageAge = 0;
      if (patientsWithDob.length > 0) {
        const totalAge = patientsWithDob.reduce((sum, patient) => {
          const birthDate = new Date(patient.patientProfile.dateOfBirth);
          const ageInMs = Date.now() - birthDate.getTime();
          const ageDate = new Date(ageInMs);
          const age = Math.abs(ageDate.getUTCFullYear() - 1970);
          return sum + age;
        }, 0);
        
        averageAge = Math.round(totalAge / patientsWithDob.length);
      }
      
      // Format gender distribution
      const formattedGenderDistribution = {};
      genderDistribution.forEach(item => {
        formattedGenderDistribution[item._id || 'unknown'] = item.count;
      });
      
      data.users = {
        totalUsers,
        totalPatients,
        totalProviders,
        newUsers,
        activeUsers,
        deletedProfiles,
        genderDistribution: formattedGenderDistribution,
        averageAge
      };
    }
    
    if (!metric || metric === 'consultations') {
      // Consultation metrics
      const consultationQuery = startDate || endDate ? { createdAt: dateFilter } : {};
      
      const [
        totalConsultations,
        newConsultations
      ] = await Promise.all([
        Consultation.countDocuments(),
        Consultation.countDocuments(consultationQuery)
      ]);
      
      data.consultations = {
        totalConsultations,
        newConsultations
      };
    }
    
    if (!metric || metric === 'connections') {
      // Connection metrics
      const connectionQuery = startDate || endDate ? { createdAt: dateFilter } : {};
      
      const [
        totalConnections,
        activeConnections,
        pendingConnections,
        newConnections
      ] = await Promise.all([
        Connection.countDocuments(),
        Connection.countDocuments({ status: 'active' }),
        Connection.countDocuments({ status: 'pending' }),
        Connection.countDocuments(connectionQuery)
      ]);
      
      data.connections = {
        totalConnections,
        activeConnections,
        pendingConnections,
        newConnections
      };
    }
    
    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Get dashboard analytics
 */
const getDashboardAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Create date filters
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);
    
    // Query database for all metrics needed on dashboard
    const [
      totalUsers,
      totalPatients,
      totalProviders,
      totalConsultations,
      genderDistribution,
      newUsers,
      newPatients,
      newProviders,
      activeUsers,
      activePatients,
      activeProviders,
      newConsultations,
      deletedProfiles
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'patient' }),
      User.countDocuments({ role: 'provider' }),
      Consultation.countDocuments(),
      User.aggregate([
        { $match: { role: 'patient' } },
        { $group: { _id: '$patientProfile.gender', count: { $sum: 1 } } }
      ]),
      User.countDocuments(startDate || endDate ? { createdAt: dateFilter } : {}),
      User.countDocuments(startDate || endDate ? { role: 'patient', createdAt: dateFilter } : { role: 'patient' }),
      User.countDocuments(startDate || endDate ? { role: 'provider', createdAt: dateFilter } : { role: 'provider' }),
      User.countDocuments(startDate || endDate ? { lastLogin: dateFilter } : {}),
      User.countDocuments(startDate || endDate ? { role: 'patient', lastLogin: dateFilter } : { role: 'patient' }),
      User.countDocuments(startDate || endDate ? { role: 'provider', lastLogin: dateFilter } : { role: 'provider' }),
      Consultation.countDocuments(startDate || endDate ? { createdAt: dateFilter } : {}),
      User.countDocuments(startDate || endDate ? { deleted: true, createdAt: dateFilter } : { deleted: true })
    ]);
    
    // Calculate average age for patients
    const patientsWithDob = await User.find({ 
      role: 'patient', 
      'patientProfile.dateOfBirth': { $exists: true, $ne: null } 
    });
    
    let averageAge = 0;
    if (patientsWithDob.length > 0) {
      const totalAge = patientsWithDob.reduce((sum, patient) => {
        if (patient.patientProfile && patient.patientProfile.dateOfBirth) {
          const birthDate = new Date(patient.patientProfile.dateOfBirth);
          const ageInMs = Date.now() - birthDate.getTime();
          const ageDate = new Date(ageInMs);
          const age = Math.abs(ageDate.getUTCFullYear() - 1970);
          return sum + age;
        }
        return sum;
      }, 0);
      
      // Only calculate average if we have valid ages
      const validPatients = patientsWithDob.filter(p => p.patientProfile && p.patientProfile.dateOfBirth);
      if (validPatients.length > 0) {
        averageAge = Math.round(totalAge / validPatients.length);
      }
    }
    
    // Format gender distribution
    const formattedGenderDistribution = {};
    genderDistribution.forEach(item => {
      formattedGenderDistribution[item._id || 'unknown'] = item.count;
    });
    
    // Get recent activities for activity log
    const recentActivities = await Promise.all([
      User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('firstName lastName role createdAt'),
      Consultation.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('patient provider', 'firstName lastName')
        .select('patient provider createdAt')
    ]);
    
    const activityLog = [
      ...recentActivities[0].map(user => ({
        type: 'user_created',
        user: user ? `${user.firstName || 'Unknown'} ${user.lastName || 'User'}` : 'Unknown User',
        role: user ? user.role : 'unknown',
        timestamp: user ? user.createdAt : new Date()
      })),
      ...recentActivities[1].map(consultation => ({
        type: 'consultation_created',
        provider: consultation.provider ? 
          `${consultation.provider.firstName || 'Unknown'} ${consultation.provider.lastName || 'Provider'}` : 
          'Unknown Provider',
        patient: consultation.patient ? 
          `${consultation.patient.firstName || 'Unknown'} ${consultation.patient.lastName || 'Patient'}` : 
          'Unknown Patient',
        timestamp: consultation.createdAt
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);
    
    res.json({
      // General analytics
      totalUsers,
      totalPatients,
      totalProviders,
      totalConsultations,
      
      // Demographics
      genderDistribution: formattedGenderDistribution,
      averagePatientAge: averageAge,
      
      // Activity metrics
      newUsers,
      newPatients,
      newProviders,
      activeUsers,
      activePatients,
      activeProviders,
      newConsultations,
      deletedProfiles,
      
      // Activity log
      activityLog
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all provider verification requests
 */
const getProviderVerificationRequests = async (req, res) => {
  try {
    // Set the query parameter for pending status and forward to getProviderVerifications
    req.query.status = 'pending';
    return getProviderVerifications(req, res, (error) => {
      if (error) {
        logger.error('Error forwarding to getProviderVerifications:', error);
        return res.status(500).json({
          success: false,
          message: 'Error fetching provider verification requests'
        });
      }
    });
  } catch (error) {
    logger.error('Error fetching provider verification requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching provider verification requests'
    });
  }
};

/**
 * Process provider verification request (approve or reject)
 */
const processProviderVerification = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { action, rejectionReason } = req.body;
    
    logger.info(`Processing provider verification - providerId: ${providerId}, action: ${action}`);
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be "approve" or "reject"'
      });
    }
    
    // Find the provider
    const provider = await User.findOne({
      _id: providerId,
      role: 'provider'
    });
    
    if (!provider) {
      logger.error(`Provider not found with ID: ${providerId}`);
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }
    
    // Import email service early to avoid requiring during a callback
    const emailService = require('../services/email.service');
    
    // Process based on action
    if (action === 'approve') {
      // Approve provider
      provider.providerProfile.isVerified = true;
      provider.providerProfile.verifiedAt = new Date();
      await provider.save();
      
      logger.info(`Provider ${provider.email} (${providerId}) has been approved`);
      
      // Send approval email
      try {
        const emailSent = await emailService.sendProviderVerificationApprovalEmail(provider);
        logger.info(`Provider verification approval email ${emailSent ? 'sent' : 'failed'} to ${provider.email}`);
      } catch (emailError) {
        logger.error(`Failed to send provider approval email to ${provider.email}:`, emailError);
      }
      
      return res.status(200).json({
        success: true,
        message: 'Provider has been approved successfully',
        provider: {
          id: provider._id,
          email: provider.email,
          name: `${provider.firstName} ${provider.lastName}`,
          isVerified: provider.providerProfile.isVerified
        }
      });
    } else {
      // Reject provider
      // Don't change the verification status to maintain history
      // Instead, add rejection info to the profile
      provider.providerProfile.verificationRejected = true;
      provider.providerProfile.rejectionReason = rejectionReason || 'No reason provided';
      provider.providerProfile.rejectionDate = new Date();
      
      await provider.save();
      
      logger.info(`Provider ${provider.email} (${providerId}) has been rejected. Reason: ${provider.providerProfile.rejectionReason}`);
      
      // Send rejection email
      try {
        const emailSent = await emailService.sendProviderVerificationRejectionEmail(
          provider, 
          provider.providerProfile.rejectionReason
        );
        logger.info(`Provider verification rejection email ${emailSent ? 'sent' : 'failed'} to ${provider.email}`);
      } catch (emailError) {
        logger.error(`Failed to send provider rejection email to ${provider.email}:`, emailError);
      }
      
      return res.status(200).json({
        success: true,
        message: 'Provider verification has been rejected',
        provider: {
          id: provider._id,
          email: provider.email,
          name: `${provider.firstName} ${provider.lastName}`,
          rejectionReason: provider.providerProfile.rejectionReason
        }
      });
    }
  } catch (error) {
    logger.error('Error processing provider verification:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing provider verification'
    });
  }
};

/**
 * Complete provider verification (improved version)
 * This function ensures all provider data is processed properly
 */
const completeProviderVerification = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { action, rejectionReason } = req.body;
    
    logger.info(`Processing provider verification with improved function - providerId: ${providerId}, action: ${action}`);
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be "approve" or "reject"'
      });
    }
    
    // Find the provider with full data
    const provider = await User.findOne({
      _id: providerId,
      role: 'provider'
    });
    
    if (!provider) {
      logger.error(`Provider not found with ID: ${providerId}`);
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }
    
    // Log provider profile data to help debug
    logger.info(`Provider profile data: ${JSON.stringify(provider.providerProfile || {})}`);
    
    // Import email service
    const emailService = require('../services/email.service');
    
    if (action === 'approve') {
      // Approve provider - ensure all fields are properly set
      if (!provider.providerProfile) {
        provider.providerProfile = {};
      }
      
      provider.providerProfile.isVerified = true;
      provider.providerProfile.verifiedAt = new Date();
      provider.providerProfile.verificationRejected = false;
      provider.providerProfile.rejectionReason = null;
      
      await provider.save();
      
      logger.info(`Provider ${provider.email} (${providerId}) has been approved successfully`);
      
      // Send approval email
      try {
        const emailSent = await emailService.sendProviderVerificationApprovalEmail(provider);
        logger.info(`Provider verification approval email ${emailSent ? 'sent' : 'failed'} to ${provider.email}`);
      } catch (emailError) {
        logger.error(`Failed to send provider approval email to ${provider.email}:`, emailError);
      }
      
      return res.status(200).json({
        success: true,
        message: 'Provider has been approved successfully',
        provider: {
          id: provider._id,
          email: provider.email,
          name: `${provider.firstName} ${provider.lastName}`,
          isVerified: true
        }
      });
    } else {
      // Reject provider
      if (!provider.providerProfile) {
        provider.providerProfile = {};
      }
      
      provider.providerProfile.isVerified = false;
      provider.providerProfile.verificationRejected = true;
      provider.providerProfile.rejectionReason = rejectionReason || 'No reason provided';
      provider.providerProfile.rejectionDate = new Date();
      
      await provider.save();
      
      logger.info(`Provider ${provider.email} (${providerId}) has been rejected. Reason: ${rejectionReason || 'No reason provided'}`);
      
      // Send rejection email
      try {
        const emailSent = await emailService.sendProviderVerificationRejectionEmail(
          provider, 
          provider.providerProfile.rejectionReason
        );
        logger.info(`Provider verification rejection email ${emailSent ? 'sent' : 'failed'} to ${provider.email}`);
      } catch (emailError) {
        logger.error(`Failed to send provider rejection email to ${provider.email}:`, emailError);
      }
      
      return res.status(200).json({
        success: true,
        message: 'Provider verification has been rejected',
        provider: {
          id: provider._id,
          email: provider.email,
          name: `${provider.firstName} ${provider.lastName}`,
          rejectionReason: provider.providerProfile.rejectionReason
        }
      });
    }
  } catch (error) {
    logger.error('Error in completeProviderVerification:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing provider verification'
    });
  }
};

/**
 * Change admin password
 */
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        message: 'Current password and new password are required' 
      });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({ 
        message: 'New password must be at least 8 characters long' 
      });
    }
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    return res.json({ 
      success: true,
      message: 'Password changed successfully' 
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Update admin profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const { firstName, lastName, email } = req.body;
    
    // Don't allow certain fields to be updated
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (email) updateData.email = email;
    
    const updatedAdmin = await User.findByIdAndUpdate(
      adminId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!updatedAdmin) {
      return next(new ApiError(httpStatus.NOT_FOUND, 'Admin not found'));
    }
    
    res.json(updatedAdmin);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getProviderVerifications,
  updateProviderVerification,
  getAnalytics,
  getDashboardAnalytics,
  getProviderVerificationRequests,
  processProviderVerification,
  completeProviderVerification,
  changePassword,
  updateProfile
}; 