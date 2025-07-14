/**
 * Test account credentials and configuration
 * These accounts will be created when seeding the database
 */

module.exports = {
  admin: {
    email: 'rowan.franciscus.2@gmail.com',
    password: 'password@123',
    firstName: 'Rowan',
    lastName: 'Franciscus',
    title: 'Mr.',
    phone: '1234567890',
    adminProfile: {
      department: 'Administration',
      adminLevel: 'super'
    }
  },
  provider: {
    email: 'provider.test@email.com',
    password: 'password@123',
    firstName: 'Provider',
    lastName: 'Test',
    title: 'Dr.',
    phone: '2345678901',
    providerProfile: {
      specialty: 'General Practice',
      yearsOfExperience: 10,
      practiceLicense: 'LP12345678',
      practiceInfo: {
        name: 'Test Medical Center',
        location: '123 Health St, Medical City',
        phone: '1231231234',
        email: 'info@testmedical.com'
      },
      patientManagement: {
        averagePatients: 25,
        collaboratesWithOthers: true
      },
      dataPreferences: {
        criticalInformation: ['allergies', 'medications', 'chronic conditions'],
        requiresHistoricalData: true
      },
      dataPrivacyPractices: 'HIPAA Compliant',
      supportPreferences: {
        technicalSupportPreference: 'email',
        requiresTraining: false,
        updatePreference: 'email'
      },
      isVerified: true
    }
  },
  patient: {
    email: 'patient.test@email.com',
    password: 'password@123',
    firstName: 'Patient',
    lastName: 'Test',
    title: 'Mr.',
    phone: '3456789012',
    patientProfile: {
      dateOfBirth: new Date('1985-05-15'),
      gender: 'male',
      address: {
        street: '456 Patient Ave',
        city: 'Health Town',
        state: 'Medical State',
        postalCode: '12345',
        country: 'United States'
      },
      insurance: {
        provider: 'Health Insurance Co.',
        plan: 'Premium Care',
        insuranceNumber: 'HIC123456789'
      },
      emergencyContact: {
        name: 'Emergency Contact',
        phone: '9876543210',
        relationship: 'Spouse'
      },
      medicalHistory: {
        chronicConditions: ['Hypertension', 'Type 2 Diabetes'],
        significantIllnesses: ['Pneumonia (2019)'],
        mentalHealthHistory: []
      },
      familyMedicalHistory: ['Heart Disease', 'Diabetes', 'Cancer'],
      currentMedications: [
        {
          name: 'Lisinopril',
          dosage: '10mg',
          frequency: 'Once daily'
        },
        {
          name: 'Metformin',
          dosage: '500mg',
          frequency: 'Twice daily'
        }
      ],
      supplements: 'Vitamin D 1000 IU daily, Omega-3 supplements',
      allergies: ['Penicillin', 'Shellfish'],
      lifestyle: {
        smoking: 'No',
        alcohol: 'Occasionally',
        exercise: 'Moderate (3-4 times per week)',
        dietaryPreferences: 'Balanced diet'
      },
      immunisationHistory: ['Influenza (2023)', 'COVID-19 (2022)', 'Tetanus (2020)']
    }
  }
}; 