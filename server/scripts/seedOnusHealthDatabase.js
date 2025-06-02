/**
 * Seed Onus Health Database
 * 
 * This script specifically seeds the onus-health database with test users
 * and related data.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const testAccounts = require('../config/testAccounts');

// Explicitly set the database name to ensure we're targeting the right database
const connectionString = process.env.MONGODB_ATLAS_URI || 'mongodb://localhost:27017/onus-health';

// Ensure the connection string has the onus-health database
let modifiedConnectionString = connectionString;
if (connectionString.includes('mongodb+srv://')) {
  // For MongoDB Atlas
  if (!connectionString.includes('/onus-health?') && connectionString.includes('/?')) {
    modifiedConnectionString = connectionString.replace('/?', '/onus-health?');
  } else if (!connectionString.includes('/onus-health')) {
    // If no database and no query params
    modifiedConnectionString = connectionString + '/onus-health';
  }
} else {
  // For local MongoDB
  if (!connectionString.includes('/onus-health')) {
    modifiedConnectionString = 'mongodb://localhost:27017/onus-health';
  }
}

// Import models directly to ensure we have all required models
let User, Connection, Consultation, Vitals, Medication, Immunization, LabResult, RadiologyReport, HospitalRecord, SurgeryRecord;

try {
  // Try importing from models/index.js first
  const models = require('../models');
  User = models.User;
  Connection = models.Connection;
  Consultation = models.Consultation;
  Vitals = models.Vitals;
  Medication = models.Medication;
  Immunization = models.Immunization;
  LabResult = models.LabResult;
  RadiologyReport = models.RadiologyReport;
  HospitalRecord = models.HospitalRecord;
  SurgeryRecord = models.SurgeryRecord;
} catch (error) {
  // If index.js not available, try direct imports
  User = require('../models/User');
  Connection = require('../models/Connection');
  Consultation = require('../models/Consultation');
  // Add other models as needed
}

/**
 * Connect to the onus-health database
 */
async function connectToDatabase() {
  try {
    console.log(`Connecting to MongoDB: ${modifiedConnectionString.replace(/\/\/(.+?):(.+?)@/, '//***:***@')}`);
    await mongoose.connect(modifiedConnectionString);
    console.log('Connected to MongoDB successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
}

/**
 * Create a user with the given data
 * @param {Object} userData - User data object
 * @returns {Promise<Object>} Created user object
 */
async function createUser(userData) {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: userData.email });
    
    if (existingUser) {
      console.log(`User ${userData.email} already exists, skipping creation.`);
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
}

/**
 * Create sample consultations for a patient and provider
 */
async function createConsultations(patient, provider) {
  try {
    // Sample consultation data
    const consultationsData = [
      {
        title: 'Annual Physical Examination',
        date: new Date('2023-06-15'),
        summary: 'Regular check-up, patient generally healthy with controlled hypertension and diabetes.',
        notes: 'Patient reports feeling well. Continue current medications and follow-up in 6 months.',
        general: {
          specialistName: 'Dr. Jane Smith',
          specialty: 'General Practice',
          practice: 'Cityview Medical Center',
          reasonForVisit: 'Annual check-up'
        },
        status: 'completed',
        isSharedWithPatient: true
      },
      {
        title: 'Diabetes Follow-up',
        date: new Date('2023-09-03'),
        summary: 'Follow-up for diabetes management. A1C levels improved since last visit.',
        notes: 'Patient adhering to medication regimen. Discussed diet modifications and exercise plan.',
        general: {
          specialistName: 'Dr. Jane Smith',
          specialty: 'General Practice',
          practice: 'Cityview Medical Center',
          reasonForVisit: 'Diabetes follow-up'
        },
        status: 'completed',
        isSharedWithPatient: true
      }
    ];

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
        console.error(error.message);
      }
    }

    return createdConsultations;
  } catch (error) {
    console.error('Error creating consultations:', error);
    return [];
  }
}

/**
 * Create sample medical records for a patient based on consultations
 */
async function createMedicalRecords(patient, provider, consultations) {
  try {
    // Create vitals for each consultation
    for (const consultation of consultations) {
      await Vitals.create({
        patient: patient._id,
        provider: provider._id,
        consultation: consultation._id,
        date: consultation.date,
        heartRate: {
          value: Math.floor(Math.random() * 15) + 65, // Random between 65-80
          unit: 'bpm'
        },
        bloodPressure: {
          systolic: Math.floor(Math.random() * 30) + 120, // Random between 120-150
          diastolic: Math.floor(Math.random() * 20) + 70, // Random between 70-90
          unit: 'mmHg'
        },
        weight: {
          value: Math.floor(Math.random() * 30) + 160, // Random between 160-190
          unit: 'kg'
        },
        height: {
          value: 175, // 5'9" in cm
          unit: 'cm'
        },
        bodyTemperature: {
          value: parseFloat((Math.random() * 0.8 + 36.5).toFixed(1)), // Random around 36.5-37.3
          unit: '°C'
        },
        bloodGlucose: {
          value: Math.floor(Math.random() * 50) + 100, // Random between 100-150
          unit: 'mg/dL',
          measurementType: 'random'
        }
      });
      console.log(`Created vitals record for consultation on ${new Date(consultation.date).toLocaleDateString()}`);
    }

    // Create medications
    const medications = [
      {
        name: 'Lisinopril',
        dosage: {
          value: '10',
          unit: 'mg'
        },
        frequency: 'Once daily',
        reasonForPrescription: 'Hypertension',
        startDate: new Date('2023-01-15'),
        endDate: null // Ongoing
      },
      {
        name: 'Metformin',
        dosage: {
          value: '500',
          unit: 'mg'
        },
        frequency: 'Twice daily',
        reasonForPrescription: 'Type 2 Diabetes',
        startDate: new Date('2023-01-15'),
        endDate: null // Ongoing
      }
    ];

    for (const medication of medications) {
      await Medication.create({
        ...medication,
        patient: patient._id,
        provider: provider._id,
        consultation: consultations[0]._id,
        date: consultations[0].date
      });
      console.log(`Created medication record: ${medication.name}`);
    }

    // Create immunization record
    await Immunization.create({
      patient: patient._id,
      provider: provider._id,
      consultation: consultations[0]._id,
      date: consultations[0].date,
      vaccineName: 'Influenza',
      dateAdministered: new Date('2023-05-10'),
      vaccineSerialNumber: 'FL23-45678',
      nextDueDate: new Date('2024-05-10')
    });
    console.log('Created immunization record: Influenza');

    // Create lab results
    const labResults = [
      {
        testName: 'Comprehensive Metabolic Panel',
        labName: 'City Medical Laboratory',
        dateOfTest: new Date('2023-06-15'),
        results: 'Within normal limits except for slightly elevated glucose (115 mg/dL)',
        comments: 'Consistent with controlled diabetes'
      },
      {
        testName: 'Lipid Panel',
        labName: 'City Medical Laboratory',
        dateOfTest: new Date('2023-06-15'),
        results: 'Total Cholesterol: 195, HDL: 45, LDL: 120, Triglycerides: 150',
        comments: 'Cholesterol levels are borderline but acceptable'
      }
    ];

    for (const labResult of labResults) {
      await LabResult.create({
        ...labResult,
        patient: patient._id,
        provider: provider._id,
        consultation: consultations[0]._id,
        date: consultations[0].date
      });
      console.log(`Created lab result: ${labResult.testName}`);
    }

    // Create a radiology report
    await RadiologyReport.create({
      patient: patient._id,
      provider: provider._id,
      consultation: consultations[0]._id,
      date: consultations[0].date,
      typeOfScan: 'X-Ray',
      bodyPartExamined: 'Chest',
      findings: 'No acute cardiopulmonary disease. Heart size normal.',
      recommendations: 'No follow-up required'
    });
    console.log('Created radiology report: Chest X-Ray');

    // Create a hospital record
    await HospitalRecord.create({
      patient: patient._id,
      provider: provider._id,
      consultation: consultations[0]._id,
      date: consultations[0].date,
      admissionDate: new Date('2019-03-10'),
      dischargeDate: new Date('2019-03-15'),
      hospitalName: 'City General Hospital',
      reasonForHospitalization: 'Community-acquired pneumonia',
      treatmentsReceived: ['IV antibiotics', 'Oxygen therapy', 'Chest physiotherapy'],
      attendingDoctors: [
        { name: 'Dr. James Wilson', specialty: 'Pulmonology' },
        { name: 'Dr. Lisa Cuddy', specialty: 'Internal Medicine' }
      ],
      dischargeSummary: 'Patient responded well to antibiotics. Discharged home on oral antibiotics.',
      investigationsDone: ['Blood cultures', 'Chest X-ray', 'Sputum culture'],
      admissionType: 'Emergency'
    });
    console.log('Created hospital record for pneumonia');

    // Create a surgery record
    await SurgeryRecord.create({
      patient: patient._id,
      provider: provider._id,
      consultation: consultations[0]._id,
      date: consultations[0].date,
      typeOfSurgery: 'Laparoscopic Appendectomy',
      reason: 'Acute appendicitis',
      complications: 'None',
      recoveryNotes: 'Uncomplicated recovery. Patient discharged after 24 hours.',
      surgeon: {
        name: 'Dr. Robert Chase',
        specialty: 'General Surgery'
      },
      anesthesiaType: 'General',
      anesthesiologist: {
        name: 'Dr. Maria Johnson'
      },
      duration: {
        hours: 1,
        minutes: 30
      },
      hospitalName: 'City General Hospital',
      preOpDiagnosis: 'Suspected acute appendicitis',
      postOpDiagnosis: 'Confirmed acute appendicitis',
      procedureDetails: 'Standard laparoscopic approach with three ports. Appendix removed without complications.'
    });
    console.log('Created surgery record for appendectomy');

  } catch (error) {
    console.error('Error creating medical records:', error);
    console.error(error.message);
  }
}

/**
 * Create connection between provider and patient
 */
async function createConnection(provider, patient) {
  try {
    // Check if connection already exists
    const existingConnection = await Connection.findOne({
      provider: provider._id,
      patient: patient._id
    });

    if (existingConnection) {
      console.log(`Connection between ${provider.email} and ${patient.email} already exists.`);
      return existingConnection;
    }

    const connection = await Connection.create({
      provider: provider._id,
      patient: patient._id,
      status: 'approved',
      initiatedBy: provider._id, // Required field: who initiated the connection
      initiatedAt: new Date(),
      statusUpdatedAt: new Date(),
      permissions: {
        viewConsultations: true,
        viewVitals: true,
        viewMedications: true,
        viewImmunizations: true,
        viewLabResults: true,
        viewRadiologyReports: true,
        viewHospitalRecords: true,
        viewSurgeryRecords: true
      }
    });

    console.log(`Created connection between ${provider.email} and ${patient.email}`);
    return connection;
  } catch (error) {
    console.error('Error creating connection:', error);
    console.error(error.message);
  }
}

/**
 * Main seeding function
 */
async function seedDatabase() {
  try {
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
    
    // Create consultations
    console.log('\nCreating consultations...');
    const consultations = await createConsultations(patient, provider);
    
    // Create medical records
    console.log('\nCreating medical records...');
    await createMedicalRecords(patient, provider, consultations);
    
    // Create connection between provider and patient
    console.log('\nCreating provider-patient connection...');
    await createConnection(provider, patient);
    
    console.log('\nDatabase seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    // Close database connection
    mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

// Run the seeding script
(async () => {
  try {
    await connectToDatabase();
    await seedDatabase();
  } catch (error) {
    console.error('Seed script error:', error);
    process.exit(1);
  }
})(); 