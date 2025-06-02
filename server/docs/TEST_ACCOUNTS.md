# Test Accounts for Onus Health Application

This document provides information about the test accounts available in the application for development and testing purposes.

## Overview

The application includes pre-configured test accounts for three user roles:
- Admin
- Health Provider (Provider)
- Patient

These accounts come with sample medical data and established connections between providers and patients.

## Account Credentials

The following test accounts are available in the application:

- **Admin:** admin.test@email.com / password@123
- **Provider:** provider.test@email.com / password@123
- **Patient:** patient.test@email.com / password@123

### Account Details

#### Admin Account

- **Email:** admin.test@email.com
- **Password:** password@123
- **Access:** Full administrative access to the platform

#### Health Provider Account

- **Email:** provider.test@email.com
- **Password:** password@123
- **Specialty:** General Practice
- **Access:** 
  - Full access to create and manage consultations
  - Access to view patient data for connected patients
  - Already connected to the test patient

#### Patient Account

- **Email:** patient.test@email.com
- **Password:** password@123
- **Medical Conditions:** Hypertension, Type 2 Diabetes
- **Access:**
  - View own consultations and medical records
  - Connected to the test provider

## Sample Data Details

### Consultations

The test accounts include sample consultations:
- Annual physical examination (June 15, 2023)
- Diabetes follow-up visit (September 3, 2023)

### Medical Records

The following medical record types are included:

#### Patient Records

- **Vitals:** Blood pressure, heart rate, glucose levels, etc.
- **Medications:** Lisinopril (for hypertension), Metformin (for diabetes)
- **Immunizations:** Influenza vaccination
- **Lab Results:** Comprehensive Metabolic Panel, Lipid Panel, Hemoglobin A1C
- **Radiology:** Chest X-Ray
- **Hospital Records:** Previous hospitalization for pneumonia
- **Surgery Records:** Laparoscopic Appendectomy

## Patient-Provider Connections

The patient account has an established connection with the provider account, allowing the provider full access to the patient's medical records.

## Email Verification Bypass

All test accounts have email verification automatically bypassed, allowing immediate login without the need for email verification.

## Password Management

If you encounter login issues with test accounts, a utility script is available to reset the passwords:

```bash
# Navigate to the server directory
cd server

# Run the password reset script
node scripts/test/forceCreateWorkingTestAccounts.js
```

This script ensures all test accounts have the correct password hash for 'password@123'.

## Resetting Test Data

To reset all test data to its initial state:

```bash
# Navigate to the server directory
cd server

# Run the reset script
node scripts/seed/seedDatabase.js --reset
```

To re-seed the database with fresh test data (this also happens after reset):

```bash
# Navigate to the server directory
cd server

# Run the seed script
npm run seed
```

## Notes

- These accounts are meant for development and testing only
- Do not use these accounts in a production environment
- The data provided is fictional and should not be used for medical purposes 