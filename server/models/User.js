const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/environment');

// Base User Schema that contains common fields for all user types
const UserSchema = new mongoose.Schema({
  // Common fields for all users
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId && !this.facebookId; // Only required if not using social auth
    },
    minlength: 8
  },
  role: {
    type: String,
    enum: ['patient', 'provider', 'admin'],
    required: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isProfileCompleted: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  },
  // Social login fields
  googleId: {
    type: String
  },
  facebookId: {
    type: String
  },
  
  // Patient-specific fields
  patientProfile: {
    dateOfBirth: {
      type: Date
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer not to say']
    },
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    },
    insurance: {
      provider: String,
      plan: String,
      insuranceNumber: String
    },
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String
    },
    medicalHistory: {
      chronicConditions: [String],
      significantIllnesses: [String],
      mentalHealthHistory: [String]
    },
    familyMedicalHistory: [String],
    currentMedications: [{
      name: String,
      dosage: String,
      frequency: String
    }],
    allergies: [String],
    lifestyle: {
      smoking: Boolean,
      alcohol: Boolean,
      exercise: String,
      dietaryPreferences: String
    },
    immunisationHistory: [String]
  },
  
  // Provider-specific fields
  providerProfile: {
    specialty: {
      type: String
    },
    yearsOfExperience: {
      type: Number
    },
    practiceLicense: {
      type: String
    },
    practiceInfo: {
      name: String,
      location: String,
      phone: String,
      email: String
    },
    patientManagement: {
      averagePatients: Number,
      collaboratesWithOthers: Boolean
    },
    dataPreferences: {
      criticalInformation: [String],
      requiresHistoricalData: Boolean
    },
    dataPrivacyPractices: String,
    supportPreferences: {
      technicalSupportPreference: String,
      requiresTraining: Boolean,
      updatePreference: String
    },
    isVerified: {
      type: Boolean,
      default: false
    }
  },
  
  // Admin-specific fields (minimal since most admin functions relate to platform management)
  adminProfile: {
    department: String,
    adminLevel: {
      type: String,
      enum: ['super', 'standard'],
      default: 'standard'
    }
  }
}, {
  timestamps: true
});

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    // Check if password is already a bcrypt hash to prevent double-hashing
    if (this.password && !this.password.startsWith('$2a$') && !this.password.startsWith('$2b$') && !this.password.startsWith('$2y$')) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }
  next();
});

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
UserSchema.methods.generateAuthToken = function() {
  const tokenData = { 
    id: this._id, 
    role: this.role,
    email: this.email,
    isProfileCompleted: this.isProfileCompleted,
    onboardingCompleted: this.isProfileCompleted, // Include this for frontend compatibility
    isEmailVerified: this.isEmailVerified,
    firstName: this.firstName,
    lastName: this.lastName
  };
  
  // Add provider verification status if this is a provider
  if (this.role === 'provider') {
    tokenData.isVerified = this.providerProfile && this.providerProfile.isVerified === true;
  }
  
  return jwt.sign(
    tokenData, 
    config.jwtSecret, 
    { 
      expiresIn: config.jwtExpiresIn 
    }
  );
};

// Generate refresh token
UserSchema.methods.generateRefreshToken = function() {
  return jwt.sign(
    { 
      id: this._id
    }, 
    config.jwtRefreshSecret, 
    { 
      expiresIn: config.jwtRefreshExpiresIn 
    }
  );
};

// Static method to verify JWT token
UserSchema.statics.verifyToken = async function(token) {
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await this.findById(decoded.id);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Static method to verify refresh token
UserSchema.statics.verifyRefreshToken = async function(token) {
  try {
    const decoded = jwt.verify(token, config.jwtRefreshSecret);
    const user = await this.findById(decoded.id);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

// Static method to check and fix authentication for test users
UserSchema.statics.checkAndFixTestAuthentication = async function() {
  try {
    const testEmails = [
      'admin.test@email.com',
      'provider.test@email.com',
      'patient.test@email.com'
    ];
    
    const defaultPassword = 'password@123';
    let fixed = 0;
    
    for (const email of testEmails) {
      const user = await this.findOne({ email });
      if (!user) continue;
      
      // Verify the password works
      const isMatch = await user.comparePassword(defaultPassword);
      if (!isMatch) {
        // Fix the password
        const hashedPassword = await bcrypt.hash(defaultPassword, 12);
        await this.updateOne(
          { _id: user._id },
          { 
            $set: { 
              password: hashedPassword,
              isEmailVerified: true 
            } 
          }
        );
        fixed++;
      }
    }
    
    return { checked: testEmails.length, fixed };
  } catch (error) {
    throw new Error(`Failed to check and fix test authentication: ${error.message}`);
  }
};

module.exports = mongoose.model('User', UserSchema); 