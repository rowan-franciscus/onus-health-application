# Onus Health Application - Comprehensive Testing Guide

## Overview
This guide provides step-by-step instructions for testing all features in the Onus Health application. The application has three main user roles: **Patient**, **Health Provider**, and **Admin**.

## Quick Start
- **Application URL:** https://onus-health-frontend.onrender.com/
- **Test Accounts:** Pre-configured accounts with sample data are available
- **Session Timeout:** 30 minutes (you'll be prompted to continue or log out)

## Test Accounts

### Pre-configured Test Accounts
```
Admin:    rowan.franciscus.2@gmail.com    / password@123
Patient:  rowan.franciscus.3@gmail.com  / password@123
Provider: rowan.franciscus.4@gmail.com / password@123
Admin:          admin.test@email.com     / password@123
Patient:        patient.test@email.com   / password@123
Health Provider: provider.test@email.com  / password@123
```

**Note:** These accounts are pre-verified and contain sample medical data. The provider and patient accounts are already connected.

---

## 🧍 PATIENT USER TESTING

### 1. Patient Registration & Authentication

#### 1.1 Sign Up (New Patient)
1. Navigate to `/sign-up`
2. Fill in registration form:
   - Title, First Name, Last Name
   - Email (use a unique email)
   - Password (must meet security requirements)
   - Phone Number
3. Select "Patient" as role
4. Click "Sign Up"
5. **Expected:** Redirect to email verification page
6. Check email for verification link
7. Click verification link
8. **Expected:** Redirect to thank you page, then to sign-in

#### 1.2 Social Login
1. Navigate to `/sign-in`
2. Click "Continue with Google" or "Continue with Facebook"
3. Complete OAuth flow
4. **Expected:** If first time, redirect to onboarding; otherwise to dashboard

#### 1.3 Password Reset
1. Navigate to `/sign-in`
2. Click "Forgot Password?"
3. Enter registered email
4. Check email for reset link
5. Click link and enter new password
6. **Expected:** Password updated successfully

### 2. Patient Onboarding

#### 2.1 Complete Onboarding Form
After first login, you'll be redirected to onboarding:

**Step 1 - Personal Information:**
- Title, First/Last Name
- Date of Birth, Gender
- Email, Phone, Address

**Step 2 - Health Insurance:**
- Provider, Plan, Insurance Number
- Emergency Contact Details

**Step 3 - Medical History:**
- Chronic conditions
- Past illnesses/surgeries
- Mental health history

**Step 4 - Family History:**
- Hereditary conditions

**Step 5 - Current Medications:**
- Medication names, dosages, frequencies

**Step 6 - Allergies:**
- Known allergies

**Step 7 - Lifestyle:**
- Smoking, Alcohol, Exercise habits
- Dietary preferences

**Step 8 - Immunizations:**
- Vaccination history

### 3. Patient Dashboard
1. Login as patient
2. **Dashboard displays:**
   - Welcome message
   - Recent consultations (if any)
   - Quick stats (total consultations, connected providers)
   - Quick actions (View Consultations, Medical Records, etc.)

### 4. Consultations

#### 4.1 View Consultations List
1. Click "Consultations" in sidebar
2. **Features to test:**
   - Search by specialist name or reason
   - Filter by date range
   - Sort by date (newest/oldest)
   - View consultation status (Completed/Draft)

#### 4.2 View Consultation Details
1. Click on any consultation from the list
2. **Information displayed:**
   - General details (date, specialist, reason)
   - All medical records added by provider:
     - Vitals, Medications, Immunizations
     - Lab Results, Radiology Reports
     - Hospital Records, Surgery Records
   - Attached files (if any)
3. **Test:** Download attached files

### 5. Medical Records

#### 5.1 Navigate Medical Record Types
1. Click "Medical Records" in sidebar
2. Click on each sub-category:
   - **Vitals:** View blood pressure, heart rate, glucose levels, etc.
   - **Medications:** Current and past medications with dosages
   - **Immunizations:** Vaccination history with dates
   - **Lab Results:** Test results with reference ranges
   - **Radiology:** X-rays, MRIs, CT scans
   - **Hospital:** Hospitalization records
   - **Surgery:** Surgical procedures

#### 5.2 Search and Filter
For each medical record type:
1. Use search bar to find specific records
2. Apply date filters
3. **Expected:** Records update dynamically

### 6. Connections (Provider Access Management)

#### 6.1 View Connected Providers
1. Click "Connections" in sidebar
2. **Current Connections tab shows:**
   - Provider name, specialty, practice
   - Connection date
   - "Remove Access" button

#### 6.2 Manage Access Requests
1. Click "Pending Requests" tab
2. **For each request:**
   - View provider details
   - Click "Approve" or "Reject"
3. **Expected:** Request moves to appropriate status

#### 6.3 Remove Provider Access
1. In Current Connections, click "Remove Access"
2. Confirm removal
3. **Expected:** Provider loses access to patient data

### 7. Profile Management

#### 7.1 View Profile
1. Click "Profile" in sidebar
2. **Displays all onboarding information:**
   - Personal details
   - Insurance info
   - Medical history
   - Emergency contacts

#### 7.2 Edit Profile
1. Click "Edit" button on any section
2. Modify information
3. Click "Save Changes"
4. **Expected:** Profile updates successfully

### 8. Settings

#### 8.1 Account Settings
1. Click "Settings" in sidebar
2. **Test these features:**
   - Change Name
   - Change Email (requires password)
   - Change Password (requires current password)
   - Delete Account (requires password confirmation)

---

## 🧑‍⚕️ HEALTH PROVIDER TESTING

### 1. Provider Registration & Onboarding

#### 1.1 Sign Up
1. Navigate to `/sign-up`
2. Select "Health Provider" role
3. Complete registration
4. Verify email
5. **Expected:** Redirect to provider onboarding

#### 1.2 Provider Onboarding
Complete 6-step onboarding:

**Step 1 - Professional Information:**
- Title, Name, Specialty
- Years of Experience
- Practice License Number

**Step 2 - Practice Information:**
- Practice/Clinic Name
- Location, Phone, Email

**Step 3 - Patient Management:**
- Average patients per week
- Collaboration preferences

**Step 4 - Data Preferences:**
- Critical information needs
- Historical data requirements

**Step 5 - Privacy Practices:**
- Security compliance requirements

**Step 6 - Support Preferences:**
- Technical support needs
- Training requirements

#### 1.3 Verification Pending
After onboarding:
1. **Expected:** "Verification Pending" page
2. Message states admin review required
3. Cannot access other features until approved

### 2. Provider Dashboard (After Approval)

#### 2.1 Dashboard Overview
1. Login as approved provider
2. **Dashboard shows:**
   - Total patients
   - Recent consultations
   - Quick actions

### 3. Patient Management

#### 3.1 View All Patients
1. Click "Patients" in sidebar
2. **Features:**
   - Search patients by name/email
   - View patient cards with basic info
   - "View Patient" buttons

#### 3.2 Add New Patient
1. Click "Add New Patient" button
2. Enter patient email
3. Click "Add Patient"
4. **Expected:** 
   - If patient exists: Start new consultation
   - If new: Create patient and start consultation
   - Email sent to patient

#### 3.3 View Patient Details
1. Click "View Patient" on any patient card
2. **Patient profile shows:**
   - Personal information
   - Medical history
   - Insurance details
   - All consultations with this provider
   - Medical records shared with provider

### 4. Consultation Management

#### 4.1 View Consultations
1. Click "Consultations" in sidebar
2. **Features:**
   - Filter by patient
   - Filter by status (Draft/Completed)
   - Search functionality
   - Date range filters

#### 4.2 Create New Consultation
1. Click "Add Consultation" or via Add Patient flow
2. **Multi-tab consultation form:**

**General Tab (Required):**
- Date, Time
- Specialist Name (auto-filled)
- Specialty, Practice
- Reason for Visit
- Notes/Observations

**Vitals Tab:**
- Heart Rate, Blood Pressure
- Body Temperature, Weight, Height
- BMI, Body Fat %, Glucose levels
- Oxygen Saturation, Respiratory Rate

**Medications Tab:**
- Add multiple medications
- For each: Name, Dosage, Frequency
- Reason, Start/End dates

**Immunizations Tab:**
- Vaccine Name, Date
- Serial Number
- Next Due Date

**Lab Results Tab:**
- Test Name, Lab Name
- Date, Results
- Diagnostic Comments

**Radiology Tab:**
- Scan Type, Date
- Body Part, Findings
- Recommendations

**Hospital Tab:**
- Admission/Discharge Dates
- Reason, Treatments
- Attending Doctors
- Investigations

**Surgery Tab:**
- Surgery Type, Date
- Reason, Complications
- Recovery Notes

**Attachments Tab:**
- Upload files (images, PDFs)
- Add descriptions

3. **Save Options:**
   - "Save as Draft" - Continue editing later
   - "Save & Complete" - Finalize consultation

#### 4.3 Edit Consultation
1. Click on any Draft consultation
2. Modify any tab data
3. Save changes or complete

### 5. Medical Records View
1. Click "Medical Records" in sidebar
2. Select record type
3. **View aggregated records** from all patients
4. Search and filter capabilities

### 6. Profile & Settings
Similar to patient profile/settings but with provider-specific fields

---

## 👩‍💼 ADMIN USER TESTING

### 1. Admin Authentication

#### 1.1 Admin Login
1. Navigate to `/admin/sign-in`
2. Use admin credentials
3. **Note:** No sign-up option (admin accounts pre-configured)

### 2. Admin Dashboard

#### 2.1 Analytics Overview
1. View dashboard metrics:
   - Total Users (Patients, Providers, Admins)
   - Active Users (last 30 days)
   - Total Consultations
   - User Growth Rate
   - Churn Rate
   - Gender Distribution Chart

#### 2.2 Date Range Filtering
1. Adjust date range selector
2. **Expected:** All metrics update

### 3. Health Provider Management

#### 3.1 Provider Verification Requests
1. Click "Health Providers" → "Verification Requests"
2. **For each pending request:**
   - Click to view details
   - Review all onboarding information
   - Click "Approve" or "Reject"
   - Add notes (optional)
3. **Expected:** 
   - Email sent to provider
   - Provider can now access platform

#### 3.2 Verified Providers
1. Click "Verified Providers" tab
2. **Features:**
   - Search by name/email/specialty
   - View provider details
   - Edit provider information
   - Delete provider account
   - "View as Provider" - See their interface

### 4. Patient Management

#### 4.1 View All Patients
1. Click "Patients" in sidebar
2. **Features:**
   - Search patients
   - View patient details
   - Edit patient information
   - Delete patient account
   - "View as Patient" - See their interface

#### 4.2 Edit Patient
1. Click "Edit" on patient
2. Modify any profile fields
3. Save changes
4. **Expected:** Patient profile updated

### 5. Admin Settings
1. Click "Settings"
2. **Features:**
   - Change admin name/email
   - Change password
   - View account information

---

## 🔒 Security Features to Test

### 1. Session Management
1. Stay idle for 30 minutes
2. **Expected:** Prompt to continue or logout
3. Click "Continue" to extend session
4. Click "Logout" or ignore to be logged out

### 2. Role-Based Access
1. **Patient:** Cannot access provider/admin routes
2. **Provider:** Cannot access patient/admin exclusive routes
3. **Admin:** Can access user profiles via "View as" feature

### 3. Data Privacy
1. **Patients:** Only see their own data
2. **Providers:** Only see connected patient data
3. **Connection required** for provider-patient data sharing

---

## 📱 Additional Features to Test

### 1. Responsive Design
- Test on different screen sizes
- Mobile, tablet, and desktop views

### 2. Search Functionality
- Real-time search filtering
- Works across all list views

### 3. File Uploads
- Test various file types (PDF, images)
- Check file size limits
- Verify secure download links

### 4. Email Notifications
Test that emails are sent for:
- Registration verification
- Password reset
- Provider verification (approval/rejection)
- New consultation (patient notification)
- Connection requests

### 5. Error Handling
- Invalid inputs show appropriate errors
- Network errors handled gracefully
- Form validation messages

---

## 🐛 Common Issues & Troubleshooting

### Login Issues
- Ensure email is verified
- Check password requirements
- Provider must be approved by admin

### Missing Data
- Ensure consultations are "Completed" not "Draft"
- Check connection status for provider-patient relationships

### Email Issues
- Check spam folder
- Verify email configuration

---

## 📝 Testing Checklist

### Essential User Flows
- [ ] Patient registration → onboarding → dashboard
- [ ] Provider registration → onboarding → verification → approval
- [ ] Create consultation with all medical record types
- [ ] Patient approves provider connection request
- [ ] Admin approves provider verification
- [ ] Password reset flow
- [ ] Session timeout handling

### Data Operations
- [ ] Create, Read, Update, Delete for all record types
- [ ] Search and filter functionality
- [ ] File upload and download
- [ ] Date range filtering

### Security
- [ ] Role-based access restrictions
- [ ] Session management
- [ ] Password requirements
- [ ] Email verification

---

## 📧 Support
For any issues during testing, reference:
- Application logs in browser console
- Network tab for API responses

---

**Note:** This testing guide covers all implemented features as of the current deployment. Some features mentioned in the original specification may be planned for future releases. 