import * as Yup from 'yup';

/**
 * Common validation schemas for forms
 */
const validation = {
  // Authentication validations
  auth: {
    // Registration validation schema
    register: {
      email: Yup.string()
        .email('Please enter a valid email address')
        .required('Email is required'),
      password: Yup.string()
        .min(8, 'Password must be at least 8 characters')
        .matches(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
          'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        )
        .required('Password is required'),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('password'), null], 'Passwords must match')
        .required('Please confirm your password'),
      firstName: Yup.string().required('First name is required'),
      lastName: Yup.string().required('Last name is required'),
      role: Yup.string()
        .oneOf(['patient', 'provider'], 'Please select a valid role')
        .required('Role is required'),
      title: Yup.string().optional(),
      phone: Yup.string().optional(),
    },

    // Login validation schema
    login: {
      email: Yup.string()
        .email('Please enter a valid email address')
        .required('Email is required'),
      password: Yup.string().required('Password is required'),
    },

    // Password reset request validation
    passwordResetRequest: {
      email: Yup.string()
        .email('Please enter a valid email address')
        .required('Email is required'),
    },

    // Password reset validation
    passwordReset: {
      password: Yup.string()
        .min(8, 'Password must be at least 8 characters')
        .matches(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
          'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        )
        .required('Password is required'),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('password'), null], 'Passwords must match')
        .required('Please confirm your password'),
    },
  },

  // Patient profile validations
  patient: {
    // Patient onboarding validation
    onboarding: {
      // Personal Information
      personalInfo: Yup.object().shape({
        title: Yup.string(),
        firstName: Yup.string(),
        lastName: Yup.string(),
        dateOfBirth: Yup.date()
          .max(new Date(), 'Date of birth cannot be in the future'),
        gender: Yup.string()
          .oneOf(['male', 'female', 'other', 'prefer not to say'], 'Please select a valid gender'),
        email: Yup.string()
          .email('Please enter a valid email address'),
        phone: Yup.string(),
        address: Yup.string(),
      }),

      // Health Insurance
      healthInsurance: Yup.object().shape({
        provider: Yup.string(),
        plan: Yup.string(),
        insuranceNumber: Yup.string(),
        emergencyContactName: Yup.string(),
        emergencyContactNumber: Yup.string(),
        emergencyContactRelationship: Yup.string(),
      }),

      // Medical History
      medicalHistory: Yup.object().shape({
        chronicConditions: Yup.string(),
        significantIllnesses: Yup.string(),
        mentalHealthHistory: Yup.string(),
      }),

      // Family Medical History
      familyHistory: Yup.object().shape({
        familyChronicConditions: Yup.string(),
        hereditaryConditions: Yup.string(),
      }),

      // Current Medication
      currentMedication: Yup.object().shape({
        medications: Yup.string(),
        supplements: Yup.string(),
      }),

      // Allergies
      allergies: Yup.object().shape({
        knownAllergies: Yup.string(),
      }),

      // Lifestyle & Habits
      lifestyle: Yup.object().shape({
        smoking: Yup.string(),
        alcohol: Yup.string(),
        exercise: Yup.string(),
        dietaryPreferences: Yup.string(),
      }),

      // Immunization
      immunization: Yup.object().shape({
        immunizationHistory: Yup.string(),
      }),
    },
  },

  // Provider profile validations
  provider: {
    // Provider onboarding validation
    onboarding: {
      // Professional Information
      professionalInfo: Yup.object().shape({
        title: Yup.string().optional(),
        specialty: Yup.string().optional(),
        yearsOfExperience: Yup.number()
          .min(0, 'Years of experience must be a positive number')
          .optional(),
        practiceLicense: Yup.mixed().optional(),
      }),

      // Practice Information
      practiceInfo: Yup.object().shape({
        practiceName: Yup.string().optional(),
        practiceLocation: Yup.string().optional(),
        phone: Yup.string().optional(),
        email: Yup.string()
          .email('Please enter a valid email address')
          .optional(),
      }),

      // Patient Management
      patientManagement: Yup.object().shape({
        averagePatients: Yup.string().optional(),
        collaboration: Yup.string().optional(),
      }),

      // Data Access
      dataAccess: Yup.object().shape({
        criticalInfo: Yup.string().optional(),
        historicalData: Yup.string().optional(),
      }),

      // Data Sharing & Privacy
      dataSharing: Yup.object().shape({
        privacyPractices: Yup.string().optional(),
      }),

      // Support & Communication
      supportCommunication: Yup.object().shape({
        technicalSupport: Yup.string().optional(),
        training: Yup.string().optional(),
        updates: Yup.string().optional(),
      }),
    },
  },

  // Consultation validations
  consultation: {
    // New consultation validation
    create: {
      patient: Yup.string().required('Patient is required'),
      general: Yup.object().shape({
        specialistName: Yup.string().required('Specialist name is required'),
        specialty: Yup.string().required('Specialty is required'),
        reasonForVisit: Yup.string().required('Reason for visit is required'),
      }),
    },
  },

  // Medical record validations
  medicalRecord: {
    // Vitals validation
    vitals: {
      heartRate: Yup.number()
        .min(0, 'Heart rate must be a positive number')
        .optional(),
      bloodPressure: Yup.object().shape({
        systolic: Yup.number()
          .min(0, 'Systolic pressure must be a positive number')
          .optional(),
        diastolic: Yup.number()
          .min(0, 'Diastolic pressure must be a positive number')
          .optional(),
      }),
      bodyFatPercentage: Yup.number()
        .min(0, 'Body fat percentage must be a positive number')
        .max(100, 'Body fat percentage must be less than or equal to 100')
        .optional(),
      bmi: Yup.number()
        .min(0, 'BMI must be a positive number')
        .optional(),
      weight: Yup.number()
        .min(0, 'Weight must be a positive number')
        .optional(),
      height: Yup.number()
        .min(0, 'Height must be a positive number')
        .optional(),
      bodyTemperature: Yup.number()
        .min(0, 'Body temperature must be a positive number')
        .optional(),
      bloodGlucose: Yup.number()
        .min(0, 'Blood glucose must be a positive number')
        .optional(),
      bloodOxygenSaturation: Yup.number()
        .min(0, 'Blood oxygen saturation must be a positive number')
        .max(100, 'Blood oxygen saturation must be less than or equal to 100')
        .optional(),
      respiratoryRate: Yup.number()
        .min(0, 'Respiratory rate must be a positive number')
        .optional(),
    },
  },
};

export default validation; 