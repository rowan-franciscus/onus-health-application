# Onus Project Brief

> **Note:** This is a full stack MERN application (MongoDB, Express.js, React, Node.js).

## Project Name:
**Onus Digital Health Record Application**

---

## Project Purpose:
The goal of this project is to develop a basic yet effective web platform for Onus to manage and 
store electronic health records for its customers. The platform will allow patients to view and 
share their health data. It will allow health providers to manage patient health data by uploading 
consultations and medical records. The consultation data will be filled in by health providers as 
they see patients. Consultations are made up of data that can be split into multiple medical record 
types. Health providers will also be able to view patient data once they have received permission 
from the patient.

---

## Frontend Requirements:

### UI framework:
CSS Modules for React Styling

### State management:
Stateful container components, and Stateless presentational components

### Authentication:
JWT, OAuth 2.0, Passport.js (local strategy and sign up / in with Google / Facebook)

### Routing:
React Router (JSX Notation)

---

## Key User Roles and Features

### Patient
- Sign up or sign in with email, Google or Facebook.
- Reset password if forgotten (via email)
- Onboarding multi-step form after account is created to gather profile data.
- View latest consultations in list form with search functionality.
- View individual consultation for more details about the data that the health provider filled in during the consultation.
- View different medical records (Vitals, Medications, Immunizations, Lab Results, Radiology Reports, Dental, Hospital, Surgery). These medical records are pulled from consultations.
- View current connected health providers that currently have access to their health data, with the ability to remove health providers that they no longer want to share their health data with.
- View health provider requests, with the ability to accept or reject requests.
- A basic profile tab to view and edit their profile data, that they filled in during the onboarding form.
- A Settings tab with basic settings to edit name and email, change password, delete account, etc.

### Health Provider
- Sign up or sign in with email, Google or Facebook.
- Reset password if forgotten (via email)
- Onboarding multi-step form after account is created to gather profile data.
- After completion of the onboarding forms, a verification email should be sent to the admin account to accept of reject health provider profile.
- Once verified, health providers should receive an email with a link to sign in to their account.
- View list of patients that they have access to, or that they have created consultation data for, with search functionality. They should be able to add a new patient by using the patients email address. Once they put in the email, it should immediately start a new consultation for the patient. Once the health provider saves the new consultation, the patient should be informed via email. If the patient is an existing onus user, they should receive an email stating that a new consultation has bee...

### Admin
- Admin accounts should be created in the very beginning of the application build, and should be secured using environment variables.
- The admin sign in page should be separate form the patient / health provider sign in page, and only accessible via url (eg. ‘/admin/sign-in’).
- View key analytics across adjustable date range.
- View all verified health providers in list form with search functionality. After clicking on one of the verified health providers, it should go to a ‘view health provider’ page with all the profile information for that provider. There should also be options to edit, delete, or view health provider profile. The view profile button should take the admin to the health providers profile, exactly the way the health provider would see their user interface, with all the data that they have access to.
- View health provider verification requests in list form from health providers that have created accounts and completed the onboarding forms, with search functionality. After clicking on one of the requests, it should go a page with all the health provider data that they filled in and submitted during the onboarding, with buttons to approve or reject the request.
- View all patient on the platform in list form with search functionality. After clicking on one of the patients, it should go to a ‘view patient’ page with all the profile information for that patient. There should also be options to edit, delete, or view patient profile. The view profile button should take the admin to the patients profile, exactly the way the patient would see their user interface, with all the data that they have access to.
- A Settings tab with basic settings to edit name and email, change password, delete account, etc.

---

## Important Key Considerations
- A consultation is a multi-step form that health providers fill in, with different tabs for medical record types. Virtual consultation functionality should not be built into the app.
- Help link opens a new page in separate tab
- All search functionality should work as follows: whatever the user types into the search box should be used to filter the list that the search function is applied to. The list should only show items that match the search term and this should happen dynamically as the user types.
- All sessions should expire after 30 minutes, and prompt the user asking if they would like to continue the session, and if not, the user should be logged out.
- Data security is of utmost importance for the application.

### Data Security
- Data encryption
- Secure user authentication
- Authorization
- Input validation
- Error handling
- Secure file uploads
- Logging and monitoring
- Session Management
- Data back up and recovery
- SSL certificate

---

## Styling
- I designed the web app at 1400x800 px size.
- All the Sign In / Sign Up pages have a similar layout / styling.
- All the Onboarding pages have a similar layout / styling.
- All the other pages (inside the app, once signed in) should have the same layout. (250px fixed position menu on the left, 1150px main section (scrollable) to the right that displays the main page content).
- For pages where I have not attached designs, style them in a similar theme and layout as the attached designs.
- Use blank placeholders for all the images and icons for now.
- The main font used in the application should be DM Sans (Hosted locally).


---

## Pages

### Sign In / Sign Up
- /sign-up
- /sign-in
- /admin/sign-in
- /verify-your-email
- /thank-you-for-verifying-your-email

### Health Provider
- /onboarding
- /all-patients
- /view-patient
- /consultations
- /add-new-consultation
- /medical-records
  - /vitals
  - /medications
  - /immunizations
  - /lab-results
  - /radiology-reports
  - /hospital
  - /surgery
- /profile
- /settings

### Patient
- /onboarding
- /consultations
- /view-consultation
- /medical-records
  - /vitals
  - /medications
  - /immunizations
  - /lab-results
  - /radiology-reports
  - /hospital
  - /surgery
- /connections
- /settings
- /profile

### Admin
- /analytics
- /health-providers
  - /view-request
  - /view-health-provider
- /patients
  - /view-patient
- /settings

---

## Backend Requirements

- **API Structure:** REST
- **Authentication & Authorization:** JWT, OAuth 2.0, Passport.js (local strategy, Google, Facebook)
- **Third-party Integrations:**
  - Passport.js
  - Bcrypt
  - SendGrid for email functionality
- **Version Control:** GitHub

---

## Third-party APIs to be Used

- JWT (JSON Web Token)
- OAuth 2.0
- Passport.js (Local, Google, Facebook strategies)
- SendGrid
- Bcrypt
- Multer
- MongoDB Atlas
- Render
- Morgan
- Sentry

---

## Medical Record Types and Data Fields

### General
- Date
- Specialist Name
- Specialty
- Practice
- Reason for Visit
- Notes / Observations

### Vitals
- Heart Rate
- Blood Pressure
- Body Fat Percentage
- BMI
- Weight
- Height
- Body Temperature
- Blood Glucose
- Blood Oxygen Saturation
- Respiratory Rate

### Medications
- Name of Medication
- Dosage
- Frequency
- Reason for Prescription
- Start Date
- End Date

### Immunizations
- Vaccine Name
- Date Administered
- Vaccine Serial Number
- Next Due Date

### Lab Results
- Test Name
- Lab Name
- Date of Test
- Results
- Comments or Diagnosis Related to Results

### Radiology Reports
- Type of Scan
- Date
- Body Part Examined
- Findings
- Recommendations

### Hospital
- Admission Date
- Discharge Date
- Reason for Hospitalisation
- Treatments Received
- Attending Doctors
- Discharge Summary
- Investigations Done

### Surgery
- Type of Surgery
- Date
- Reason
- Complications
- Recovery Notes

---

## Administrator Analytics

### General
- Total Users
- Total Patients
- Total Health Providers
- Total Consultations
- Patient Gender Distribution (Male vs Female)
- Average Patient Age

### Periodic
- New Users
- New Patients
- New Health Providers
- Active Users
- Active Patients
- Active Health Providers
- New Consultations
- Churn Rate (Deleted profiles)

---

## Health Care Provider Onboarding Questions

### 1. Professional Information
- Title
- First Name
- Last Name
- Specialty
- Years of Experience in Practice
- Practice License

### 2. Practice Information
- Practice or Clinic Name
- Primary Practice Location
- Phone Number
- Email

### 3. Patient Management Details
- Average number of patients managed per week
- Do you currently collaborate with other specialists or departments?

### 4. Data & Access Preferences
- What patient information is most critical for your decision making?
- Do you require access to historical data trends?

### 5. Data Sharing & Privacy Practices
- Are there specific data security or privacy practices you need to adhere to?

### 6. Support & Communication
- How would you prefer to receive technical support?
- Would you require training?
- How would you like to receive updates?

---

## Patient Onboarding Questions

### 1. Personal Information
- Title
- First Name
- Last Name
- Date of Birth
- Gender
- Email
- Phone Number
- Address

### 2. Health Insurance
- Provider
- Plan
- Insurance Number
- Emergency Contact Name
- Emergency Contact Number
- Relationship

### 3. Personal Medical History
- Chronic conditions
- Significant illnesses, surgeries, hospitalizations
- Mental health history

### 4. Family Medical History
- Family history of chronic or hereditary conditions

### 5. Current Medication
- Medications, dosage and frequency
- Supplements or vitamins

### 6. Allergies
- Known allergies

### 7. Lifestyle & Habits
- Smoking
- Alcohol
- Exercise
- Dietary preferences

### 8. Immunisation
- Vaccinations received (Flu, COVID-19, Tetanus)

---

## Initial Test Accounts

These test accounts should already be email verified. The first time that I use them to sign in, should take me to the onboarding forms for the patient and provider accounts.

**Admin Account:**
- Email: admin.test@email.com
- Password: password@123

**Patient Account:**
- Email: patient.test@email.com
- Password: password@123

**Health Provider Account:**
- Email: provider.test@email.com
- Password: password@123

**Application Email:**
- rowan.franciscus.10@gmail.com
- mailto:rowan.franciscus.2@gmail.com

---


