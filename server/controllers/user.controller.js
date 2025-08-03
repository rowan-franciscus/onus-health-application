const User = require('../models/User');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

/**
 * Get current user profile
 */
exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId)
      .select('-password')
      .populate('patientProfile')
      .populate('providerProfile');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    return res.json(user);
  } catch (error) {
    console.error('Error fetching current user:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Update current user profile
 */
exports.updateCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;
    
    // Don't allow role updates through this endpoint
    delete updates.role;
    delete updates.verified;
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .select('-password')
      .populate('patientProfile')
      .populate('providerProfile');
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    return res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get user profile
 */
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId)
      .select('-password -resetPasswordToken -resetPasswordExpires');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    return res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Update user profile
 */
exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;
    
    // Don't allow certain fields to be updated through this endpoint
    delete updateData.password;
    delete updateData.role;
    delete updateData.isEmailVerified;
    delete updateData.resetPasswordToken;
    delete updateData.resetPasswordExpires;
    
    // Get current user
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Handle different user types
    if (currentUser.role === 'patient' && updateData.patientProfile) {
      // Deep merge patient profile data
      currentUser.patientProfile = {
        ...currentUser.patientProfile,
        ...updateData.patientProfile
      };
      delete updateData.patientProfile;
    } else if (currentUser.role === 'provider' && updateData.providerProfile) {
      // Preserve verification status for providers
      if (currentUser.providerProfile?.isVerified) {
        updateData.providerProfile.isVerified = true;
      }
      // Deep merge provider profile data
      currentUser.providerProfile = {
        ...currentUser.providerProfile,
        ...updateData.providerProfile
      };
      delete updateData.providerProfile;
    }
    
    // Update basic fields
    Object.keys(updateData).forEach(key => {
      currentUser[key] = updateData[key];
    });
    
    // Save the updated user
    await currentUser.save();
    
    // Return updated user without sensitive fields
    const updatedUser = await User.findById(userId)
      .select('-password -resetPasswordToken -resetPasswordExpires');
    
    return res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get all users (admin only)
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { role, verified, active } = req.query;
    const query = {};
    
    if (role) {
      query.role = role;
    }
    
    if (verified !== undefined) {
      query.verified = verified === 'true';
    }
    
    if (active !== undefined) {
      query.active = active === 'true';
    }
    
    const users = await User.find(query)
      .select('-password')
      .populate('patientProfile')
      .populate('providerProfile')
      .sort({ createdAt: -1 });
    
    return res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get a specific user by ID (admin only)
 */
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    const user = await User.findById(id)
      .select('-password')
      .populate('patientProfile')
      .populate('providerProfile');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    return res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Update a specific user (admin only)
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .select('-password')
      .populate('patientProfile')
      .populate('providerProfile');
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    return res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Search for providers (for patients to connect with)
 */
exports.searchProviders = async (req, res) => {
  try {
    const { query } = req.query;
    const patientId = req.user.id;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    // Find verified providers that match the search query
    const providers = await User.find({
      role: 'provider',
      verified: true,
      active: true,
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { 'providerProfile.specialty': { $regex: query, $options: 'i' } },
        { 'providerProfile.practiceName': { $regex: query, $options: 'i' } }
      ]
    })
      .select('firstName lastName email providerProfile')
      .populate('providerProfile', 'specialty practiceName')
      .limit(10);
    
    // Get existing connections with these providers
    const connection = mongoose.model('Connection');
    const existingConnections = await connection.find({
      patient: patientId,
      provider: { $in: providers.map(p => p._id) }
    });
    
    // Add connection status to each provider
    const providersWithConnectionStatus = providers.map(provider => {
      const existingConnection = existingConnections.find(
        conn => conn.provider.toString() === provider._id.toString()
      );
      
      return {
        ...provider.toObject(),
        connectionStatus: existingConnection ? existingConnection.status : null
      };
    });
    
    return res.json(providersWithConnectionStatus);
  } catch (error) {
    console.error('Error searching providers:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Change user password
 */
exports.changePassword = async (req, res) => {
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
 * Delete current user account
 */
exports.deleteCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Soft delete by marking as inactive
    user.active = false;
    user.deletedAt = new Date();
    await user.save();
    
      return res.json({ message: 'User account has been deactivated successfully' });
} catch (error) {
  console.error('Error deleting user:', error);
  return res.status(500).json({ message: 'Server error', error: error.message });
}
};

/**
 * Update notification preferences
 */
exports.updateNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationPreferences = req.body;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { notificationPreferences } },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    return res.json({ 
      success: true,
      message: 'Notification preferences updated successfully',
      notificationPreferences: user.notificationPreferences
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Delete user account
 */
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Soft delete by marking as inactive
    user.active = false;
    user.deletedAt = new Date();
    await user.save();
    
    return res.json({ 
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Upload profile picture
 */
exports.uploadProfilePicture = async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Get current user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Delete old profile picture if exists
    if (user.profileImage) {
      const oldImagePath = path.join(
        process.env.RENDER && fs.existsSync('/mnt/data') 
          ? '/mnt/data/uploads' 
          : path.join(__dirname, '../uploads'),
        'profile-images',
        path.basename(user.profileImage)
      );
      
      if (fs.existsSync(oldImagePath)) {
        try {
          fs.unlinkSync(oldImagePath);
        } catch (error) {
          logger.error('Error deleting old profile picture:', error);
        }
      }
    }
    
    // Update user with new profile image path
    const profileImagePath = `/api/files/profile-images/${req.file.filename}`;
    user.profileImage = profileImagePath;
    await user.save();
    
    return res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      profileImage: profileImagePath
    });
  } catch (error) {
    logger.error('Error uploading profile picture:', error);
    return res.status(500).json({
      success: false,
      message: 'Error uploading profile picture'
    });
  }
};

/**
 * Delete profile picture
 */
exports.deleteProfilePicture = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get current user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user has a profile picture
    if (!user.profileImage) {
      return res.status(400).json({ message: 'No profile picture to delete' });
    }
    
    // Delete the profile picture file
    const imagePath = path.join(
      process.env.RENDER && fs.existsSync('/mnt/data') 
        ? '/mnt/data/uploads' 
        : path.join(__dirname, '../uploads'),
      'profile-images',
      path.basename(user.profileImage)
    );
    
    if (fs.existsSync(imagePath)) {
      try {
        fs.unlinkSync(imagePath);
      } catch (error) {
        logger.error('Error deleting profile picture file:', error);
      }
    }
    
    // Remove profile image from user
    user.profileImage = null;
    await user.save();
    
    return res.json({
      success: true,
      message: 'Profile picture deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting profile picture:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting profile picture'
    });
  }
};

/**
 * Complete user onboarding process
 */
exports.completeOnboarding = async (req, res) => {
  try {
    const userId = req.user.id;
    const { isProfileCompleted, ...profileData } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update user with profile completion status
    user.isProfileCompleted = true;
    
    // Update basic user fields if provided
    if (profileData.title) user.title = profileData.title;
    if (profileData.firstName) user.firstName = profileData.firstName;
    if (profileData.lastName) user.lastName = profileData.lastName;
    if (profileData.phone) user.phone = profileData.phone;
    
    // Handle profile data based on user role
    if (user.role === 'patient' && profileData.patientProfile) {
      // Update patient profile directly on the user document
      user.patientProfile = {
        ...user.patientProfile,
        ...profileData.patientProfile
      };
    } else if (user.role === 'provider' && profileData.providerProfile) {
      // Update provider profile directly on the user document
      user.providerProfile = {
        ...user.providerProfile,
        ...profileData.providerProfile
      };
      
      // For providers, also send an email to admin for verification
      try {
        const emailService = require('../services/email.service');
        await emailService.sendProviderVerificationRequestEmail(user);
      } catch (emailError) {
        console.error('Failed to send provider verification email:', emailError);
        // Continue despite email error
      }
    }
    
    await user.save();
    
    const updatedUser = await User.findById(userId)
      .select('-password -resetPasswordToken -resetPasswordExpires');
    
    return res.json({
      success: true,
      message: user.role === 'provider' 
        ? 'Profile submitted for verification' 
        : 'Onboarding completed successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error completing onboarding:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

/**
 * Complete provider onboarding
 * Updates provider profile and sends verification request to admin
 */
exports.completeProviderOnboarding = async (req, res) => {
  try {
    const userId = req.user.id;
    const providerData = req.body;
    
    logger.info(`Provider onboarding submission from user ${userId}`);
    logger.debug(`Provider onboarding raw data:`, providerData);
    
    // Log each section of the form data to debug what we're receiving
    ['professionalInfo', 'practiceInfo', 'patientManagement', 'dataAccess', 'dataSharing', 'supportCommunication'].forEach(section => {
      logger.debug(`${section} data:`, JSON.stringify(providerData[section] || {}));
    });
    
    // Validate that user exists and is a provider
    const user = await User.findById(userId);
    if (!user) {
      logger.error(`User not found: ${userId}`);
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (user.role !== 'provider') {
      logger.error(`User ${userId} is not a provider: ${user.role}`);
      return res.status(403).json({ success: false, message: 'Only providers can submit provider onboarding forms' });
    }
    
    // Ensure the user's email is verified
    if (!user.isEmailVerified) {
      logger.error(`User ${userId} email not verified`);
      return res.status(403).json({ 
        success: false, 
        message: 'Email verification required before completing onboarding' 
      });
    }
    
    logger.info(`Processing provider onboarding data for user ${userId}...`);
    
    // Initialize provider profile if it doesn't exist
    if (!user.providerProfile) {
      user.providerProfile = {};
    }
    
    // Update basic user fields from professionalInfo
    if (providerData.professionalInfo?.title) {
      user.title = providerData.professionalInfo.title;
    }
    
    // Update the provider profile, making sure to use the exact field structure from the User model
    // and exactly match what the admin verification view is looking for
    user.providerProfile = {
      // Professional Information
      specialty: String(providerData.professionalInfo?.specialty || ''),
      yearsOfExperience: Number(providerData.professionalInfo?.yearsOfExperience || 0),
      practiceLicense: String(providerData.professionalInfo?.practiceLicense || ''),
      
      // Practice Information
      practiceInfo: {
        name: String(providerData.practiceInfo?.practiceName || providerData.practiceInfo?.name || ''),
        location: String(providerData.practiceInfo?.practiceLocation || providerData.practiceInfo?.location || ''),
        phone: String(providerData.practiceInfo?.phone || ''),
        email: String(providerData.practiceInfo?.email || user.email || '')
      },
      
      // Patient Management
      patientManagement: {
        averagePatients: Number(providerData.patientManagement?.averagePatients || 0),
        collaboratesWithOthers: providerData.patientManagement?.collaboration === true || 
                                providerData.patientManagement?.collaboration === "true"
      },
      
      // Data Access Preferences
      dataPreferences: {
        criticalInformation: String(providerData.dataAccess?.criticalInfo || '').split(',').map(item => item.trim()).filter(item => item),
        requiresHistoricalData: Boolean(providerData.dataAccess?.historicalData && 
                                       String(providerData.dataAccess?.historicalData).trim().length > 0)
      },
      
      // Data Privacy Practices
      dataPrivacyPractices: String(providerData.dataSharing?.privacyPractices || ''),
      
      // Support & Communication
      supportPreferences: {
        technicalSupportPreference: String(providerData.supportCommunication?.technicalSupport || ''),
        requiresTraining: providerData.supportCommunication?.training ? 
          // Parse the training field - handles both select values and text responses
          /^(yes|y|true|1|require|need|would like|please)/i.test(String(providerData.supportCommunication?.training).trim()) :
          false,
        updatePreference: String(providerData.supportCommunication?.updates || '')
      },
      
      // Verification status (always false initially)
      isVerified: false,
      
      // Terms and conditions acceptance
      termsAccepted: providerData.termsAccepted === 'true' || providerData.termsAccepted === true
    };
    
    // For debugging - log the final provider profile that will be saved
    logger.info('Final provider profile to be saved:');
    logger.info(JSON.stringify(user.providerProfile, null, 2));
    
    // Mark profile as completed
    user.isProfileCompleted = true;
    
    // Save the changes
    await user.save();
    logger.info(`Provider profile saved successfully for user ${userId}`);
    
    // Send email to admin for verification
    try {
      const emailService = require('../services/email.service');
      
      // Ensure the email is sent to the correct admin
      const result = await emailService.sendProviderVerificationRequestEmail(user);
      
      if (result) {
        logger.info(`Provider verification request email sent for user ${userId} to admin`);
      } else {
        logger.warn(`Failed to send provider verification email for user ${userId}`);
      }
    } catch (emailError) {
      logger.error(`Failed to send provider verification email for user ${userId}:`, emailError);
      // Continue despite email error
    }
    
    res.status(200).json({
      success: true,
      message: 'Provider profile completed. Your account is pending verification by an administrator.',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isProfileCompleted: user.isProfileCompleted,
        isVerified: false
      }
    });
  } catch (error) {
    logger.error(`Provider onboarding completion error for user ${req.user?.id}:`, error);
    res.status(500).json({ success: false, message: 'Server error during provider onboarding completion' });
  }
};

/**
 * Get patient dashboard data
 */
exports.getPatientDashboard = async (req, res) => {
  try {
    const patientId = req.user.id;
    
    // Get recent consultations - only completed ones for patients
    const Consultation = require('../models/Consultation');
    const consultations = await Consultation.find({ 
      patient: patientId,
      status: 'completed'  // Only show completed consultations to patients
    })
      .populate('provider', 'firstName lastName providerProfile')
      .sort({ date: -1 })
      .limit(3);
    
    // Get recent vitals
    const Vitals = require('../models/VitalsRecord');
    const vitals = await Vitals.findOne({ patient: patientId })
      .sort({ date: -1 });
    
    // Get connection requests
    const Connection = require('../models/Connection');
    const requests = await Connection.find({ 
      patient: patientId, 
      status: 'pending' 
    })
      .populate('provider', 'firstName lastName providerProfile')
      .sort({ createdAt: -1 })
      .limit(3);
    
    return res.json({
      success: true,
      consultations: consultations.map(c => ({
        id: c._id,
        date: c.date || c.createdAt,
        type: c.general?.specialty || 'General',
        specialist: c.general?.specialistName || 
                   `${c.provider.firstName} ${c.provider.lastName}`,
        clinic: c.general?.practice || 
                c.provider.providerProfile?.practiceName || 'N/A',
        reason: c.general?.reasonForVisit || 'N/A'
      })),
      vitals: vitals ? {
        heartRate: vitals.heartRate?.value ? `${vitals.heartRate.value} ${vitals.heartRate.unit}` : 'N/A',
        bloodPressure: vitals.bloodPressure?.systolic ? 
          `${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic} ${vitals.bloodPressure.unit}` : 'N/A',
        bodyTemperature: vitals.bodyTemperature?.value ? 
          `${vitals.bodyTemperature.value} ${vitals.bodyTemperature.unit}` : 'N/A',
        bloodGlucose: vitals.bloodGlucose?.value ? 
          `${vitals.bloodGlucose.value} ${vitals.bloodGlucose.unit}` : 'N/A',
        respiratoryRate: vitals.respiratoryRate?.value ? 
          `${vitals.respiratoryRate.value} ${vitals.respiratoryRate.unit}` : 'N/A',
        lastUpdated: vitals.date || vitals.createdAt
      } : null,
      requests: requests.map(r => ({
        id: r._id,
        name: `Dr. ${r.provider.firstName} ${r.provider.lastName}`,
        specialty: r.provider.providerProfile?.specialty || 'N/A',
        practice: r.provider.providerProfile?.practiceInfo?.name || 'N/A',
        requestDate: r.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching patient dashboard data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load dashboard data'
    });
  }
};

/**
 * Get patient recent consultations
 */
exports.getPatientRecentConsultations = async (req, res) => {
  try {
    const patientId = req.user.id;
    const limit = parseInt(req.query.limit) || 3;
    
    const Consultation = require('../models/Consultation');
    const consultations = await Consultation.find({ 
      patient: patientId,
      status: 'completed'  // Only show completed consultations to patients
    })
      .populate('provider', 'firstName lastName providerProfile')
      .sort({ date: -1 })
      .limit(limit);
    
    return res.json({
      success: true,
      consultations: consultations.map(c => ({
        id: c._id,
        date: c.date || c.createdAt,
        type: c.general?.specialty || 'General',
        specialist: c.general?.specialistName || 
                   `${c.provider.firstName} ${c.provider.lastName}`,
        clinic: c.general?.practice || 
                c.provider.providerProfile?.practiceName || 'N/A',
        reason: c.general?.reasonForVisit || 'N/A'
      }))
    });
  } catch (error) {
    console.error('Error fetching recent consultations:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load recent consultations'
    });
  }
};

/**
 * Get patient recent vitals
 */
exports.getPatientRecentVitals = async (req, res) => {
  try {
    const patientId = req.user.id;
    
    const Vitals = require('../models/VitalsRecord');
    const vitals = await Vitals.findOne({ patient: patientId })
      .sort({ date: -1 });
    
    return res.json({
      success: true,
      vitals: vitals ? {
        heartRate: vitals.heartRate?.value ? `${vitals.heartRate.value} ${vitals.heartRate.unit}` : 'N/A',
        bloodPressure: vitals.bloodPressure?.systolic ? 
          `${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic} ${vitals.bloodPressure.unit}` : 'N/A',
        bodyTemperature: vitals.bodyTemperature?.value ? 
          `${vitals.bodyTemperature.value} ${vitals.bodyTemperature.unit}` : 'N/A',
        bloodGlucose: vitals.bloodGlucose?.value ? 
          `${vitals.bloodGlucose.value} ${vitals.bloodGlucose.unit}` : 'N/A',
        respiratoryRate: vitals.respiratoryRate?.value ? 
          `${vitals.respiratoryRate.value} ${vitals.respiratoryRate.unit}` : 'N/A',
        lastUpdated: vitals.date || vitals.createdAt
      } : null
    });
  } catch (error) {
    console.error('Error fetching recent vitals:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load recent vitals'
    });
  }
}; 