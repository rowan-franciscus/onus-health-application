require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function checkPatient() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const email = process.argv[2];
    
    if (!email) {
      console.log('Usage: node checkPatientExists.js <email>');
      process.exit(1);
    }
    
    // Find patient by email
    const patient = await User.findOne({ email, role: 'patient' });
    
    if (patient) {
      console.log('Patient found:');
      console.log({
        id: patient._id,
        email: patient.email,
        name: `${patient.firstName} ${patient.lastName}`,
        role: patient.role,
        isEmailVerified: patient.isEmailVerified,
        isOnboarded: patient.isOnboarded
      });
    } else {
      console.log(`No patient found with email: ${email}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkPatient(); 