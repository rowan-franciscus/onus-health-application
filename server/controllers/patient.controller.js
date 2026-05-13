const User = require('../models/User');
const Connection = require('../models/Connection');
const config = require('../config/environment');
const logger = require('../utils/logger');

/**
 * Register a new (non-Onus) patient on behalf of a provider.
 * Creates a placeholder User + Connection, optionally sends an invite email.
 */
exports.registerNewPatient = async (req, res) => {
  try {
    const { firstName, lastName, gender, dateOfBirth, phone, email, medicalAidProvider, plan } = req.body;

    // Validate required fields
    if (!firstName || !firstName.trim()) {
      return res.status(400).json({ message: 'First name is required' });
    }
    if (!lastName || !lastName.trim()) {
      return res.status(400).json({ message: 'Last name is required' });
    }
    if (!gender) {
      return res.status(400).json({ message: 'Gender is required' });
    }
    if (!dateOfBirth) {
      return res.status(400).json({ message: 'Date of birth is required' });
    }

    const validGenders = ['male', 'female', 'other', 'prefer not to say'];
    if (!validGenders.includes(gender)) {
      return res.status(400).json({ message: 'Invalid gender value' });
    }

    // Validate email format if provided
    const trimmedEmail = email ? email.trim().toLowerCase() : null;
    if (trimmedEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        return res.status(400).json({ message: 'Invalid email address' });
      }

      // Check if a real Onus user already exists with this email
      const existing = await User.findOne({ email: trimmedEmail });
      if (existing) {
        if (existing.isOnusUser) {
          return res.status(409).json({
            message: 'A user with this email already exists on Onus. Use the Invite Existing Patient tab instead.',
          });
        }
        // Non-Onus placeholder already exists — check if provider already connected
        const existingConn = await Connection.findOne({ patient: existing._id, provider: req.user._id });
        if (existingConn) {
          return res.status(409).json({ message: 'You already have a connection with this patient.' });
        }
      }
    }

    // Create placeholder patient user
    const patientData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: 'patient',
      isOnusUser: false,
      isEmailVerified: false,
      isProfileCompleted: false,
      registeredBy: req.user._id,
      patientProfile: {
        dateOfBirth: new Date(dateOfBirth),
        gender,
        insurance: {
          provider: medicalAidProvider ? medicalAidProvider.trim() : undefined,
          plan: plan ? plan.trim() : undefined,
        },
      },
    };

    if (phone) patientData.phone = phone.trim();
    if (trimmedEmail) patientData.email = trimmedEmail;

    const patient = new User(patientData);
    await patient.save();

    logger.info(`Non-Onus patient ${patient._id} registered by provider ${req.user._id}`);

    // Create connection between provider and new patient
    const connection = new Connection({
      patient: patient._id,
      provider: req.user._id,
      initiatedBy: req.user._id,
      accessLevel: 'limited',
      fullAccessStatus: 'none',
      patientNotified: false,
    });
    await connection.save();

    logger.info(`Connection created between provider ${req.user._id} and patient ${patient._id}`);

    // Send invite email if email was provided
    if (trimmedEmail) {
      try {
        const emailService = require('../services/email.service');
        const providerUser = req.user;
        const providerName = `${providerUser.firstName} ${providerUser.lastName}`;
        const signUpUrl = `${config.frontendUrl}/sign-up?email=${encodeURIComponent(trimmedEmail)}`;

        await emailService.sendTemplateEmail(
          trimmedEmail,
          'registerNewPatientInvite',
          {
            patientFirstName: patient.firstName,
            providerName,
            signUpUrl,
            title: 'You\'ve Been Invited to Onus Health',
          },
          {
            subject: "You've Been Invited to Onus Health",
            userId: patient._id,
            queue: true,
          }
        );
      } catch (emailError) {
        logger.error(`Failed to send invite email for patient ${patient._id}:`, emailError);
        // Non-fatal — registration still succeeds
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Patient registered successfully.',
      patient: {
        _id: patient._id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email || null,
      },
    });
  } catch (error) {
    logger.error(`Register new patient error: ${error.message}`, { error });
    return res.status(500).json({ message: 'Server error while registering patient' });
  }
};
