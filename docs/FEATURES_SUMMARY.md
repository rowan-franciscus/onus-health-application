# Onus Health Application - Features Summary

## 🔐 Authentication & Authorization
- **Email/Password Registration & Login** for all user types
- **Social Login** with Google and Facebook OAuth
- **Email Verification** required for new accounts
- **Password Reset** functionality via email
- **Role-Based Access Control** (Patient, Provider, Admin)
- **Separate Admin Login** route (`/admin/sign-in`)
- **JWT Token-based Authentication**
- **30-minute Session Timeout** with extension prompt

## 🧍 Patient Features

### Onboarding (8-step form)
- Personal Information
- Health Insurance Details
- Medical History
- Family Medical History
- Current Medications
- Allergies
- Lifestyle & Habits
- Immunization History

### Core Features
1. **Dashboard**
   - Recent consultations overview
   - Quick stats and actions

2. **Consultations**
   - View all consultations
   - Search and filter by date/provider
   - View detailed consultation data
   - Download attached files

3. **Medical Records** (7 categories)
   - Vitals
   - Medications
   - Immunizations
   - Lab Results
   - Radiology Reports
   - Hospital Records
   - Surgery Records

4. **Connections Management**
   - View connected providers
   - Approve/reject provider requests
   - Remove provider access

5. **Profile & Settings**
   - View/edit profile information
   - Change account details
   - Delete account

## 🧑‍⚕️ Health Provider Features

### Onboarding (6-step form)
- Professional Information
- Practice Details
- Patient Management Preferences
- Data Access Needs
- Privacy Practices
- Support Requirements

### Verification Process
- Admin approval required after onboarding
- Email notification upon approval

### Core Features
1. **Dashboard**
   - Patient overview
   - Recent consultations

2. **Patient Management**
   - View all patients
   - Add new patient by email
   - View patient profiles and medical history
   - Access to shared patient data only

3. **Consultation Management**
   - Create multi-tab consultations
   - Save as draft or complete
   - Edit draft consultations
   - Add medical records across 8 categories
   - Upload file attachments

4. **Medical Records**
   - View aggregated records from all patients
   - Filter by record type

5. **Profile & Settings**
   - Manage professional profile
   - Account settings

## 👩‍💼 Admin Features

1. **Analytics Dashboard**
   - Total users by role
   - Active users (30-day)
   - Total consultations
   - User growth rate
   - Churn rate
   - Gender distribution
   - Date range filtering

2. **Provider Management**
   - Review verification requests
   - Approve/reject providers
   - View all verified providers
   - Edit provider information
   - Delete provider accounts
   - "View as Provider" functionality

3. **Patient Management**
   - View all patients
   - Edit patient information
   - Delete patient accounts
   - "View as Patient" functionality

4. **Settings**
   - Admin account management

## 📋 Medical Record Types & Fields

### General (Consultation Info)
- Date, Time, Specialist, Specialty, Practice
- Reason for Visit, Notes/Observations

### Vitals
- Heart Rate, Blood Pressure, BMI, Weight, Height
- Body Temperature, Blood Glucose, O2 Saturation
- Respiratory Rate, Body Fat Percentage

### Medications
- Name, Dosage, Frequency, Reason
- Start Date, End Date

### Immunizations
- Vaccine Name, Date Administered
- Serial Number, Next Due Date

### Lab Results
- Test Name, Lab Name, Date
- Results, Diagnostic Comments

### Radiology
- Scan Type, Date, Body Part
- Findings, Recommendations

### Hospital Records
- Admission/Discharge Dates
- Reason, Treatments, Doctors
- Discharge Summary, Investigations

### Surgery Records
- Surgery Type, Date, Reason
- Complications, Recovery Notes

## 🔧 Technical Features

### Security
- Password hashing with bcrypt
- Input validation
- Secure file uploads
- SSL/HTTPS encryption
- Role-based route protection

### Communication
- SendGrid email integration
- Automated emails for:
  - Registration verification
  - Password reset
  - Provider approval/rejection
  - New consultation notifications
  - Connection requests

### File Management
- Secure file upload (Multer)
- Support for images and PDFs
- File attachment to consultations

### Search & Filter
- Real-time search across all list views
- Date range filtering
- Status filtering (Draft/Completed)
- Multi-criteria filtering

### Data Management
- MongoDB database
- Comprehensive data models
- Relationship management
- Data aggregation for medical records

### Deployment & Infrastructure
- Hosted on Render
- MongoDB Atlas for database
- Environment-based configuration
- Logging with Morgan
- Error monitoring with Sentry

## 🧪 Testing Support
- Pre-configured test accounts
- Database seeding scripts
- Sample medical data
- Password reset utilities

## 📱 User Experience
- Responsive design (1400x800px base)
- Consistent UI/UX patterns
- Fixed sidebar navigation (250px)
- Scrollable main content area
- Multi-step forms with progress indicators
- Loading states and error handling
- Session management with timeout warnings 