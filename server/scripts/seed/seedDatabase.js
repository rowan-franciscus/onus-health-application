/**
 * Database Seed Script for Onus Health Application
 * 
 * This script creates test accounts and populates them with sample medical data.
 * Use this for development and testing purposes only.
 * 
 * Usage: 
 * - npm run seed         (seeds the database)
 * - npm run seed:reset   (resets test data)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../../config/environment');

// Import models
const { 
  User, 
  Consultation, 
  Vitals, 
  Medication, 
  Immunization, 
  LabResult, 
  RadiologyReport, 
  HospitalRecord, 
  SurgeryRecord, 
  Connection 
} = require('../../models');

// Import test data
const testAccounts = require('../../config/testAccounts');
const sampleMedicalData = require('../../config/sampleMedicalData');

// Connect to MongoDB (specifically to onus-health database)
console.log(`Connecting to MongoDB: ${config.mongoUri.replace(/\/\/(.+?):(.+?)@/, '//***:***@')}`);
mongoose.connect(config.mongoUri)
  .then(() => {
    console.log(`MongoDB connected successfully to ${mongoose.connection.name} database`);
    if (mongoose.connection.name !== 'onus-health') {
      console.warn(`WARNING: Connected to "${mongoose.connection.name}" database instead of "onus-health"`);
      console.warn('Please check your connection string in .env file');
      console.warn('Exiting to prevent data being seeded to the wrong database');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

/**
 * Create a user with the given data
 * @param {Object} userData - User data object
 * @returns {Promise<Object>} Created user object
 */
const createUser = async (userData) => {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: userData.email });
    
    if (existingUser) {
      console.log(`User ${userData.email} already exists, checking password...`);
      
      // Verify the password is hashed correctly
      const passwordMatches = await bcrypt.compare(userData.password, existingUser.password);
      
      if (!passwordMatches) {
        console.log(`Password for ${userData.email} is not correct, updating...`);
        // Update the password
        const hashedPassword = await bcrypt.hash(userData.password, 12);
        existingUser.password = hashedPassword;
        await existingUser.save();
        console.log(`Password updated for ${userData.email}`);
      } else {
        console.log(`Password for ${userData.email} is already correct`);
      }
      
      return existingUser;
    }
    
    // Create new user directly (bypassing middleware to set isEmailVerified = true)
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    
    const newUser = await User.create({
      ...userData,
      password: hashedPassword,
      isEmailVerified: true, // Bypass email verification for test accounts
      isProfileCompleted: true
    });

    console.log(`Created user: ${newUser.email} (${newUser.role})`);
    return newUser;
  } catch (error) {
    console.error(`Error creating user ${userData.email}:`, error);
    throw error;
  }
};

/**
 * Create consultations for a patient and provider
 * @param {Object} patient - Patient user object
 * @param {Object} provider - Provider user object
 * @param {Array} consultationsData - Array of consultation data
 * @returns {Promise<Array>} Array of created consultation objects
 */
const createConsultations = async (patient, provider, consultationsData) => {
  const createdConsultations = [];

  for (const consultationData of consultationsData) {
    try {
      const newConsultation = await Consultation.create({
        ...consultationData,
        patient: patient._id,
        provider: provider._id
      });

      console.log(`Created consultation for ${patient.email} on ${new Date(consultationData.date).toLocaleDateString()}`);
      createdConsultations.push(newConsultation);
    } catch (error) {
      console.error(`Error creating consultation:`, error);
    }
  }

  return createdConsultations;
};

/**
 * Create medical records for consultations
 * @param {Object} patient - Patient user object
 * @param {Object} provider - Provider user object
 * @param {Array} consultations - Array of consultation objects
 * @returns {Promise<void>}
 */
const createMedicalRecords = async (patient, provider, consultations) => {
  // Create vitals
  for (let i = 0; i < Math.min(consultations.length, sampleMedicalData.vitals.length); i++) {
    try {
      await Vitals.create({
        ...sampleMedicalData.vitals[i],
        patient: patient._id,
        provider: provider._id,
        consultation: consultations[i]._id,
        date: consultations[i].date
      });
      
      // Update consultation with reference to vitals
      await Consultation.findByIdAndUpdate(consultations[i]._id, {
        vitals: consultations[i]._id // Set the same ID to link them
      });

      console.log(`Created vitals record for consultation on ${new Date(consultations[i].date).toLocaleDateString()}`);
    } catch (error) {
      console.error(`Error creating vitals record:`, error);
    }
  }

  // Create medications (distribute across consultations)
  const medicationsPerConsultation = {
    0: [0, 1], // First consultation gets medications 0 and 1
    1: [2],    // Second consultation gets medication 2
    2: [3, 4]  // Third consultation gets medications 3 and 4
  };

  for (const [consultationIndex, medicationIndices] of Object.entries(medicationsPerConsultation)) {
    if (consultationIndex >= consultations.length) continue;
    
    const medicationIds = [];
    
    for (const medicationIndex of medicationIndices) {
      if (medicationIndex >= sampleMedicalData.medications.length) continue;
      
      try {
        const newMedication = await Medication.create({
          ...sampleMedicalData.medications[medicationIndex],
          patient: consultations[consultationIndex].patient,
          provider: consultations[consultationIndex].provider,
          consultation: consultations[consultationIndex]._id,
          date: consultations[consultationIndex].date
        });

        medicationIds.push(newMedication._id);
        console.log(`Created medication record "${sampleMedicalData.medications[medicationIndex].name}" for consultation ${Number(consultationIndex) + 1}`);
      } catch (error) {
        console.error(`Error creating medication record:`, error);
      }
    }

    // Update consultation with references to medications
    if (medicationIds.length > 0) {
      await Consultation.findByIdAndUpdate(consultations[consultationIndex]._id, {
        medications: medicationIds
      });
    }
  }

  // Create immunizations
  const immunizationsMap = {
    0: 0, // First consultation gets immunization 0
    2: 1  // Third consultation gets immunization 1
  };

  for (const [consultationIndex, immunizationIndex] of Object.entries(immunizationsMap)) {
    if (consultationIndex >= consultations.length || immunizationIndex >= sampleMedicalData.immunizations.length) continue;
    
    try {
      const newImmunization = await Immunization.create({
        ...sampleMedicalData.immunizations[immunizationIndex],
        patient: consultations[consultationIndex].patient,
        provider: consultations[consultationIndex].provider,
        consultation: consultations[consultationIndex]._id,
        date: consultations[consultationIndex].date
      });

      // Update consultation with reference to immunization
      await Consultation.findByIdAndUpdate(consultations[consultationIndex]._id, {
        $push: { immunizations: newImmunization._id }
      });

      console.log(`Created immunization record "${sampleMedicalData.immunizations[immunizationIndex].vaccineName}" for consultation ${Number(consultationIndex) + 1}`);
    } catch (error) {
      console.error(`Error creating immunization record:`, error);
    }
  }

  // Create lab results
  const labResultsPerConsultation = {
    0: [0, 1], // First consultation gets lab results 0 and 1
    1: [2],    // Second consultation gets lab result 2
    2: [3]     // Third consultation gets lab result 3
  };

  for (const [consultationIndex, labResultIndices] of Object.entries(labResultsPerConsultation)) {
    if (consultationIndex >= consultations.length) continue;
    
    const labResultIds = [];
    
    for (const labResultIndex of labResultIndices) {
      if (labResultIndex >= sampleMedicalData.labResults.length) continue;
      
      try {
        const newLabResult = await LabResult.create({
          ...sampleMedicalData.labResults[labResultIndex],
          patient: consultations[consultationIndex].patient,
          provider: consultations[consultationIndex].provider,
          consultation: consultations[consultationIndex]._id,
          date: consultations[consultationIndex].date
        });

        labResultIds.push(newLabResult._id);
        console.log(`Created lab result "${sampleMedicalData.labResults[labResultIndex].testName}" for consultation ${Number(consultationIndex) + 1}`);
      } catch (error) {
        console.error(`Error creating lab result record:`, error);
      }
    }

    // Update consultation with references to lab results
    if (labResultIds.length > 0) {
      await Consultation.findByIdAndUpdate(consultations[consultationIndex]._id, {
        labResults: labResultIds
      });
    }
  }

  // Create radiology reports
  const radiologyReportsMap = {
    0: 0, // First consultation gets radiology report 0
    2: 1  // Third consultation gets radiology report 1
  };

  for (const [consultationIndex, reportIndex] of Object.entries(radiologyReportsMap)) {
    if (consultationIndex >= consultations.length || reportIndex >= sampleMedicalData.radiologyReports.length) continue;
    
    try {
      const newRadiologyReport = await RadiologyReport.create({
        ...sampleMedicalData.radiologyReports[reportIndex],
        patient: consultations[consultationIndex].patient,
        provider: consultations[consultationIndex].provider,
        consultation: consultations[consultationIndex]._id,
        date: consultations[consultationIndex].date
      });

      // Update consultation with reference to radiology report
      await Consultation.findByIdAndUpdate(consultations[consultationIndex]._id, {
        $push: { radiologyReports: newRadiologyReport._id }
      });

      console.log(`Created radiology report "${sampleMedicalData.radiologyReports[reportIndex].typeOfScan}" for consultation ${Number(consultationIndex) + 1}`);
    } catch (error) {
      console.error(`Error creating radiology report:`, error);
    }
  }

  // Create hospital records
  if (sampleMedicalData.hospitalRecords.length > 0 && consultations.length > 0) {
    try {
      const newHospitalRecord = await HospitalRecord.create({
        ...sampleMedicalData.hospitalRecords[0],
        patient: consultations[0].patient,
        provider: consultations[0].provider,
        consultation: consultations[0]._id,
        date: sampleMedicalData.hospitalRecords[0].date
      });

      // Update consultation with reference to hospital record
      await Consultation.findByIdAndUpdate(consultations[0]._id, {
        $push: { hospitalRecords: newHospitalRecord._id }
      });

      console.log(`Created hospital record for "${sampleMedicalData.hospitalRecords[0].reasonForHospitalization}"`);
    } catch (error) {
      console.error(`Error creating hospital record:`, error);
    }
  }

  // Create surgery records
  if (sampleMedicalData.surgeryRecords.length > 0 && consultations.length > 0) {
    try {
      const newSurgeryRecord = await SurgeryRecord.create({
        ...sampleMedicalData.surgeryRecords[0],
        patient: consultations[0].patient,
        provider: consultations[0].provider,
        consultation: consultations[0]._id,
        date: sampleMedicalData.surgeryRecords[0].date
      });

      // Update consultation with reference to surgery record
      await Consultation.findByIdAndUpdate(consultations[0]._id, {
        $push: { surgeryRecords: newSurgeryRecord._id }
      });

      console.log(`Created surgery record for "${sampleMedicalData.surgeryRecords[0].typeOfSurgery}"`);
    } catch (error) {
      console.error(`Error creating surgery record:`, error);
    }
  }
};

/**
 * Create connections between provider and patients
 * @param {Object} provider - Provider user object
 * @param {Array} patients - Array of patient user objects
 * @returns {Promise<void>}
 */
const createConnections = async (provider, patients) => {
  for (let i = 0; i < Math.min(patients.length, sampleMedicalData.connections.length); i++) {
    try {
      await Connection.create({
        ...sampleMedicalData.connections[i],
        provider: provider._id,
        patient: patients[i]._id,
        initiatedBy: provider._id
      });

      console.log(`Created connection between ${provider.email} and ${patients[i].email}`);
    } catch (error) {
      console.error(`Error creating connection:`, error);
    }
  }
};

/**
 * Reset all test data in the database
 * @returns {Promise<void>}
 */
const resetTestData = async () => {
  try {
    // Find test users
    const testEmails = [
      testAccounts.admin.email, 
      testAccounts.provider.email, 
      testAccounts.patient.email
    ];
    
    const testUsers = await User.find({ email: { $in: testEmails } });
    const testUserIds = testUsers.map(user => user._id);
    
    // Delete all related data
    await Consultation.deleteMany({ 
      $or: [
        { patient: { $in: testUserIds } },
        { provider: { $in: testUserIds } }
      ]
    });
    
    await Vitals.deleteMany({ patient: { $in: testUserIds } });
    await Medication.deleteMany({ patient: { $in: testUserIds } });
    await Immunization.deleteMany({ patient: { $in: testUserIds } });
    await LabResult.deleteMany({ patient: { $in: testUserIds } });
    await RadiologyReport.deleteMany({ patient: { $in: testUserIds } });
    await HospitalRecord.deleteMany({ patient: { $in: testUserIds } });
    await SurgeryRecord.deleteMany({ patient: { $in: testUserIds } });
    
    await Connection.deleteMany({
      $or: [
        { patient: { $in: testUserIds } },
        { provider: { $in: testUserIds } }
      ]
    });
    
    // Finally, delete the test users themselves
    await User.deleteMany({ email: { $in: testEmails } });
    
    console.log('Test data reset completed successfully.');
  } catch (error) {
    console.error('Error resetting test data:', error);
  }
};

/**
 * Main function to seed the database
 * @param {boolean} reset - Whether to reset the database before seeding
 * @returns {Promise<void>}
 */
const seedDatabase = async (reset = false) => {
  try {
    if (reset) {
      console.log('Resetting test data...');
      await resetTestData();
    }

    console.log('Creating test users...');
    
    // Create admin user
    const admin = await createUser({
      ...testAccounts.admin,
      role: 'admin'
    });
    
    // Create provider user
    const provider = await createUser({
      ...testAccounts.provider,
      role: 'provider'
    });
    
    // Create patient user
    const patient = await createUser({
      ...testAccounts.patient,
      role: 'patient'
    });
    
    console.log('Creating consultations...');
    
    // Create consultations for patient
    const patientConsultations = await createConsultations(
      patient, 
      provider,
      [sampleMedicalData.consultations[0], sampleMedicalData.consultations[1]]
    );
    
    console.log('Creating medical records...');
    
    // Create medical records for patient
    await createMedicalRecords(patient, provider, patientConsultations);
    
    console.log('Creating connections...');
    
    // Create connection between provider and patient
    await createConnections(provider, [patient]);
    
    console.log('Database seeding completed successfully!');
    
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    // Close database connection
    mongoose.connection.close();
  }
};

// Check command line arguments for reset flag
const shouldReset = process.argv.includes('--reset');

// Run the seed function
seedDatabase(shouldReset)
  .then(() => {
    console.log('Seed script execution complete.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error during seed process:', error);
    process.exit(1);
  }); 