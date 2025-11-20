# 8. Domain-Specific Flows (Health / EHR Logic)

This document explains the key business flows specific to the electronic health record (EHR) domain, including patient onboarding, consultation management, patient-provider connections, and medical record viewing.

---

## Core Business Flows

### 1. Patient Registration & Onboarding

This flow takes a new patient from account creation through profile completion.

---

#### Flow Overview

```
Registration → Email Verification → Onboarding (8 steps) → Dashboard Access
```

---

#### Step-by-Step Flow

**Step 1: Registration**

**Frontend**: `client/src/pages/auth/SignUp.jsx`  
**Backend**: `POST /api/auth/register`  
**Controller**: `server/controllers/authController.js` (lines 15-95)

**Process**:
1. User fills registration form (email, password, firstName, lastName, role)
2. Frontend validates input (Formik + Yup)
3. Submit to API
4. Backend creates user with `isEmailVerified: false`, `isProfileCompleted: false`
5. Backend queues verification email
6. Backend returns auth tokens
7. Frontend stores tokens in localStorage
8. Frontend redirects to `/verify-your-email` page

---

**Step 2: Email Verification**

**Frontend**: `client/src/pages/auth/VerifyEmail.jsx`  
**Backend**: `GET /api/auth/verify-email/:token`  
**Controller**: `server/controllers/authController.js` (lines 271-414)

**Process**:
1. User clicks verification link in email
2. Backend verifies JWT token (24h expiration)
3. Backend updates `isEmailVerified: true`
4. Backend redirects to `/patient/onboarding?token={authToken}`
5. Frontend receives token via URL parameter
6. Frontend stores token and fetches user data

---

**Step 3: Patient Onboarding (Multi-Step Form)**

**Frontend**: `client/src/pages/patient/Onboarding.jsx`  
**Backend**: `POST /api/users/onboarding`  
**Controller**: `server/controllers/user.controller.js` (lines 170-250)

**Form Steps** (10 steps total):

| Step | Component | Data Collected |
|------|-----------|----------------|
| 1 | `PersonalInfoStep` | Title, firstName, lastName, dateOfBirth, gender, email, phone, address |
| 2 | `HealthInsuranceStep` | Insurance provider, plan, insuranceNumber, emergencyContact |
| 3 | `MedicalHistoryStep` | Chronic conditions, significant illnesses, mental health history |
| 4 | `FamilyHistoryStep` | Family medical history |
| 5 | `CurrentMedicationStep` | Current medications (name, dosage, frequency), supplements |
| 6 | `AllergiesStep` | Known allergies |
| 7 | `LifestyleStep` | Smoking, alcohol, exercise, dietary preferences |
| 8 | `ImmunizationStep` | Immunization history |
| 9 | `TermsAndConditionsStep` | Terms acceptance |
| 10 | `ReviewStep` | Review all data before submission |

**Component**: `client/src/components/forms/MultiStepForm/MultiStepForm.jsx`

**Features**:
- Progress indicator (1/10, 2/10, etc.)
- Next/Previous navigation
- Per-step validation
- Data persistence between steps (component state)
- Review step to confirm all data

**Submission Process** (lines 107-205 in `Onboarding.jsx`):

```javascript
const handleSubmit = async (formData) => {
  // Transform form data to match backend schema
  const patientProfile = {
    dateOfBirth: formData.personalInfo.dateOfBirth,
    gender: formData.personalInfo.gender,
    address: formData.personalInfo.address,
    insurance: formData.healthInsurance.insurance,
    emergencyContact: formData.healthInsurance.emergencyContact,
    medicalHistory: {
      chronicConditions: formData.medicalHistory.chronicConditions,
      significantIllnesses: formData.medicalHistory.significantIllnesses,
      mentalHealthHistory: formData.medicalHistory.mentalHealthHistory
    },
    familyMedicalHistory: formData.familyHistory.conditions,
    currentMedications: formData.currentMedication.medications,
    supplements: formData.currentMedication.supplements,
    allergies: formData.allergies.knownAllergies,
    lifestyle: formData.lifestyle,
    immunisationHistory: formData.immunization.immunizationHistory,
    termsAccepted: formData.termsAccepted
  };
  
  // Submit to API
  await api.post('/users/onboarding', {
    patientProfile,
    title: formData.personalInfo.title,
    firstName: formData.personalInfo.firstName,
    lastName: formData.personalInfo.lastName,
    email: formData.personalInfo.email,
    phone: formData.personalInfo.phone,
    role: 'patient',
    isProfileCompleted: true
  });
  
  // Update Redux state
  dispatch(updateUser({ onboardingCompleted: true }));
  
  // Navigate to dashboard
  navigate('/patient/dashboard');
};
```

**Backend Processing**:
1. Validate request data
2. Find user by authenticated ID
3. Update user document with patientProfile subdocument
4. Set `isProfileCompleted: true`
5. Return success response

**Result**: Patient can now access all dashboard features.

---

### 2. Provider Registration, Onboarding & Verification

This flow includes a **two-step verification process**: email verification (user) + admin verification (manual).

---

#### Flow Overview

```
Registration → Email Verification → Onboarding (7 steps) → Admin Verification → Dashboard Access
```

---

#### Steps 1-2: Same as Patient

Registration and email verification work identically to patient flow.

---

#### Step 3: Provider Onboarding

**Frontend**: `client/src/pages/provider/Onboarding.jsx`  
**Backend**: `POST /api/users/onboarding`  
**Controller**: `server/controllers/user.controller.js`

**Form Steps** (7 steps):

| Step | Component | Data Collected |
|------|-----------|----------------|
| 1 | `ProfessionalInfoStep` | Title, firstName, lastName, specialty, yearsOfExperience, **license upload** |
| 2 | `PracticeInfoStep` | Practice name, location, phone, email |
| 3 | `PatientManagementStep` | Average patients per week, collaboration info |
| 4 | `DataPreferencesStep` | Critical patient info, historical data needs |
| 5 | `DataPrivacyStep` | Data privacy practices |
| 6 | `SupportPreferencesStep` | Support preferences, training needs, update preferences |
| 7 | `ReviewStep` | Review all data |

**License Upload**:
- File types: PDF, PNG, JPG, JPEG
- Max size: 5MB
- Stored in `server/uploads/licenses/` (dev) or `/mnt/data/uploads/licenses/` (production)
- Path saved in `providerProfile.practiceLicense`

**Submission**:
1. Submit onboarding data
2. Set `isProfileCompleted: true`
3. Set `providerProfile.isVerified: false` (pending admin verification)
4. Queue email to admin about new provider registration
5. Redirect to `/provider/verification-pending` page

---

#### Step 4: Admin Verification

**Frontend**: `client/src/pages/admin/ViewProviderRequest.jsx`  
**Backend**: `POST /api/admin/verify-provider/:id`  
**Controller**: `server/controllers/admin.controller.js`

**Admin Process**:
1. Admin navigates to `/admin/health-providers` (verification requests tab)
2. Views pending providers (filter: `isVerified: false`)
3. Clicks on provider to view full profile and license
4. Reviews credentials
5. Clicks "Approve" or "Reject" with optional notes

**Approval**:
- Backend sets `providerProfile.isVerified: true`
- Backend queues approval email to provider
- Provider can now login and access dashboard

**Rejection**:
- Backend sets `providerProfile.isVerified: false` (remains false)
- Backend queues rejection email with reason/notes
- Provider account remains inactive

**Email Templates**:
- `server/templates/emails/providerVerificationRequest.html` (to admin)
- `server/templates/emails/providerVerificationApproval.html` (to provider)
- `server/templates/emails/providerVerificationRejection.html` (to provider)

---

#### Step 5: Provider Login (After Verification)

**Check on Login** (`server/controllers/authController.js` lines 133-143):

```javascript
if (user.role === 'provider' && user.isProfileCompleted) {
  const isVerified = user.providerProfile && user.providerProfile.isVerified;
  if (!isVerified) {
    return res.status(403).json({
      message: 'Your provider account is pending verification. Please wait for admin approval.',
      code: 'PROVIDER_NOT_VERIFIED'
    });
  }
}
```

**Result**: Only verified providers can access provider dashboard.

---

### 3. Creating a Consultation (Provider)

This is the **core workflow** of the application - providers documenting patient visits.

---

#### Flow Overview

```
Select Patient → Fill 8-Tab Form → Upload Attachments → Save as Draft or Complete → Auto-Create Connection → Email Patient
```

---

#### Step-by-Step Flow

**Step 1: Select Patient**

**Frontend**: `client/src/pages/provider/AddPatient.jsx` or patient selection in consultation form  
**Options**:
1. Add patient by email (if not connected yet)
2. Select existing patient from list
3. Direct link from patient profile

**Process**:
- Provider enters patient email OR selects patient ID
- System checks if patient exists (`POST /api/connections/check-patient` or similar)
- Navigate to `/provider/add-consultation?patientEmail={email}` or `?patientId={id}`

---

**Step 2: Fill Consultation Form (8 Tabs)**

**Frontend**: `client/src/pages/provider/AddConsultation.jsx`  
**Component**: `client/src/components/forms/ConsultationForm/`  
**Backend**: `POST /api/consultations` (draft), `PUT /api/consultations/:id` (complete)  
**Controller**: `server/controllers/consultation.controller.js` (lines 200-450)

**8 Tabs**:

| Tab | Fields | Records Created |
|-----|--------|-----------------|
| **General** | Date, specialistName, specialty, practice, reasonForVisit, notes | Part of Consultation doc |
| **Vitals** | Heart rate, BP, BMI, weight, height, temperature, glucose, O2, respiratory rate, body fat % | VitalsRecord (1 doc) |
| **Medications** | Name, dosage, frequency, reason, start/end dates (multiple) | MedicationRecord (N docs) |
| **Immunizations** | Vaccine name, date, serial number, next due date (multiple) | ImmunizationRecord (N docs) |
| **Lab Results** | Test name, lab name, date, results, comments (multiple) | LabResultRecord (N docs) |
| **Radiology** | Scan type, date, body part, findings, recommendations (multiple) | RadiologyReport (N docs) |
| **Hospital** | Admission/discharge dates, reason, treatments, doctors, summary (multiple) | HospitalRecord (N docs) |
| **Surgery** | Surgery type, date, reason, complications, recovery notes (multiple) | SurgeryRecord (N docs) |

**Tab Implementation**: `client/src/components/forms/ConsultationForm/tabs/*.jsx`

**Form Features**:
- Tab switching with data persistence (formData state)
- Dynamic field arrays for medications, immunizations, etc. (add/remove fields)
- File attachment upload (drag-and-drop)
- Draft saving (status: 'draft')
- Validation per tab

---

**Step 3: Save as Draft or Complete**

**Draft** (`POST /api/consultations` with `status: 'draft'`):
- Saves all data but doesn't email patient
- Provider can edit later
- Not visible to patient until completed

**Complete** (`POST /api/consultations` with `status: 'completed'` or `PUT /api/consultations/:id`):
- Creates/updates consultation document
- Creates all medical record documents
- Auto-creates connection (if doesn't exist)
- Queues email to patient
- Marks consultation as visible to patient

---

**Step 4: Backend Processing** (from `consultation.controller.js`):

```javascript
exports.createConsultation = async (req, res) => {
  const { patientEmail, patient: patientId, general, vitals, medication, ... } = req.body;
  const providerId = req.user.id;
  
  // 1. Find or validate patient
  let patient;
  if (patientId) {
    patient = await User.findById(patientId);
  } else if (patientEmail) {
    patient = await User.findOne({ email: patientEmail, role: 'patient' });
  }
  
  if (!patient) {
    return res.status(404).json({ message: 'Patient not found' });
  }
  
  // 2. Check/create connection
  let connection = await Connection.findOne({ provider: providerId, patient: patient._id });
  if (!connection) {
    connection = new Connection({
      provider: providerId,
      patient: patient._id,
      accessLevel: 'limited',
      initiatedBy: providerId
    });
    await connection.save();
  }
  
  // 3. Create medical records
  let vitalsRecord = null;
  if (vitals && hasVitalsData(vitals)) {
    vitalsRecord = await VitalsRecord.create({
      patient: patient._id,
      provider: providerId,
      ...vitals
    });
  }
  
  const medicationRecords = [];
  if (medication && medication.length > 0) {
    for (const med of medication) {
      const medRecord = await MedicationRecord.create({
        patient: patient._id,
        provider: providerId,
        ...med
      });
      medicationRecords.push(medRecord._id);
    }
  }
  
  // ... same for immunizations, lab results, radiology, hospital, surgery
  
  // 4. Create consultation
  const consultation = new Consultation({
    patient: patient._id,
    provider: providerId,
    date: req.body.date,
    general: general,
    vitals: vitalsRecord?._id,
    medications: medicationRecords,
    immunizations: immunizationRecords,
    labResults: labResultRecords,
    radiologyReports: radiologyRecords,
    hospitalRecords: hospitalRecords,
    surgeryRecords: surgeryRecords,
    status: req.body.status || 'draft',
    attachments: []  // Uploaded separately
  });
  
  await consultation.save();
  
  // 5. Send email notification (if completed)
  if (consultation.status === 'completed') {
    const emailService = require('../services/email.service');
    await emailService.sendConsultationNotification(patient, consultation);
  }
  
  // 6. Return response
  res.status(201).json({
    success: true,
    consultation,
    message: 'Consultation created successfully'
  });
};
```

---

**Step 5: File Attachments (Optional)**

**Frontend**: File upload component in consultation form  
**Backend**: `POST /api/files/upload/consultation/:consultationId`  
**Middleware**: `server/middleware/upload.middleware.js` (uploadConsultationFile)

**Process**:
1. After consultation is created, upload files separately
2. Multer processes FormData
3. Files saved to `uploads/consultations/` or `/mnt/data/uploads/consultations/`
4. File metadata added to `consultation.attachments` array

**File Types**: Images (PNG, JPG), PDF, DOC, DOCX  
**Max Size**: 5MB per file

**See**: `docs/FILE_UPLOAD_IMPLEMENTATION.md` for detailed file upload implementation.

---

### 4. Patient-Provider Connection Flow

This flow manages the relationship and access levels between patients and providers.

---

#### Flow Overview

```
Provider Creates Consultation → Auto-Connection (Limited) → Provider Requests Full Access → Patient Approves/Denies → Access Updated
```

---

#### Connection Creation Methods

**Method 1: Automatic (via Consultation)**

**Trigger**: Provider creates first consultation for a patient  
**Process** (in `consultation.controller.js`):

```javascript
// Check if connection exists
let connection = await Connection.findOne({ provider: providerId, patient: patient._id });

if (!connection) {
  // Auto-create with limited access
  connection = new Connection({
    provider: providerId,
    patient: patient._id,
    accessLevel: 'limited',
    fullAccessStatus: 'none',
    initiatedBy: providerId,
    initiatedAt: Date.now()
  });
  await connection.save();
  
  // Queue email to patient
  await emailService.sendNewConnectionEmail(patient, provider);
}
```

**Result**: Connection created with **limited access** (provider sees only their consultations).

---

**Method 2: Manual (Provider Adds Patient)**

**Frontend**: `client/src/pages/provider/AddPatient.jsx`  
**Backend**: `POST /api/connections`  
**Controller**: `server/controllers/connection.controller.js` (lines 12-86)

**Process**:
1. Provider enters patient email
2. Provider optionally requests full access immediately
3. System creates connection with `accessLevel: 'limited'`
4. If full access requested, set `fullAccessStatus: 'pending'` and email patient
5. Otherwise, connection created silently

---

#### Access Level Transitions

**Limited → Full Access Request**

**Frontend**: Patient list page → "Request Full Access" button  
**Backend**: `POST /api/connections/provider/request-full-access/:connectionId`  
**Controller**: `server/controllers/connection.controller.js` (lines 91-150)

**Process**:
1. Provider clicks "Request Full Access"
2. Backend updates connection: `fullAccessStatus: 'pending'`
3. Backend queues email to patient
4. Patient sees request in `/patient/connections` page

---

**Patient Approves Full Access**

**Frontend**: `client/src/pages/patient/Connections.jsx` → Approve button  
**Backend**: `POST /api/connections/patient/approve/:connectionId`  
**Controller**: `server/controllers/connection.controller.js` (lines 250-300)

**Process**:
1. Patient clicks "Approve"
2. Backend updates:
   - `accessLevel: 'full'`
   - `fullAccessStatus: 'approved'`
   - `fullAccessStatusUpdatedAt: Date.now()`
3. Backend queues approval email to provider
4. Provider can now see all patient consultations and medical records

---

**Patient Denies Full Access**

**Backend**: `POST /api/connections/patient/deny/:connectionId`

**Process**:
1. Patient clicks "Deny"
2. Backend updates:
   - `accessLevel: 'limited'` (remains limited)
   - `fullAccessStatus: 'denied'`
3. Backend queues denial email to provider

---

**Patient Revokes Access**

**Backend**: `POST /api/connections/patient/revoke/:connectionId` or `DELETE /api/connections/:id`

**Process**:
1. Patient clicks "Revoke Access" or "Remove Provider"
2. Backend either:
   - Revokes access (sets to limited): `accessLevel: 'limited'`, `fullAccessStatus: 'none'`
   - Or deletes connection entirely
3. Backend queues revocation email to provider
4. Provider can no longer access patient data (except consultations they created, if connection not deleted)

**See**: `docs/PATIENT_PROVIDER_CONNECTION_FLOW.md` for complete documentation.

---

### 5. Viewing Consultations

Different flows for patients and providers based on access levels.

---

#### Patient Viewing Own Consultations

**Frontend**: `client/src/pages/patient/Consultations.jsx` → View details → `ViewConsultation.jsx`  
**Backend**: `GET /api/consultations/patient` (list), `GET /api/consultations/:id` (detail)  
**Controller**: `server/controllers/consultation.controller.js`

**List View Flow**:
1. Patient navigates to `/patient/consultations`
2. Frontend calls `GET /api/consultations/patient`
3. Backend filters: `{ patient: userId, status: 'completed' }` (only completed consultations)
4. Backend populates patient, provider, and all medical record references
5. Frontend displays table with search and filter

**Detail View Flow**:
1. Patient clicks "View Details"
2. Navigate to `/patient/consultations/:id`
3. Frontend calls `GET /api/consultations/:id`
4. Backend checks: `consultation.patient === userId`
5. Backend populates all medical records
6. Frontend displays 9 tabs (general + 7 record types + files)

**Access Control** (in controller):

```javascript
if (userRole === 'patient') {
  if (consultation.patient.toString() !== userId) {
    return res.status(403).json({ message: 'Access denied' });
  }
}
```

---

#### Provider Viewing Consultations

**Frontend**: `client/src/pages/provider/Consultations.jsx`, `ViewConsultation.jsx`  
**Backend**: `GET /api/consultations?patient={patientId}`, `GET /api/consultations/:id`

**Access Control** (connection-based):

```javascript
if (userRole === 'provider') {
  const connection = await Connection.findOne({
    provider: userId,
    patient: consultation.patient
  });
  
  if (!connection) {
    return res.status(403).json({ message: 'No connection to this patient' });
  }
  
  // Check access level
  if (connection.accessLevel === 'limited') {
    // Limited: Only see consultations they created
    if (consultation.provider.toString() !== userId) {
      return res.status(403).json({ message: 'Limited access - not your consultation' });
    }
  } else if (connection.accessLevel === 'full' && connection.fullAccessStatus === 'approved') {
    // Full: Can see all consultations for this patient
    // Allow access
  } else {
    return res.status(403).json({ message: 'Access denied' });
  }
}
```

**Result**: Provider access depends on connection level.

---

### 6. Viewing Medical Records

Medical records are **aggregated from consultations** and can be viewed by category.

---

#### Patient Viewing Medical Records

**Frontend**: `client/src/pages/patient/MedicalRecords.jsx` → Category pages (e.g., `Vitals.jsx`)  
**Backend**: `GET /api/medical-records/vitals`, `/medications`, etc.  
**Controller**: `server/controllers/medicalRecords/{type}.controller.js`

**Flow**:
1. Patient navigates to `/patient/medical-records`
2. Sees 7 categories (Vitals, Medications, Immunizations, Lab Results, Radiology, Hospital, Surgery)
3. Clicks on category (e.g., "Vitals")
4. Navigate to `/patient/medical-records/vitals`
5. Frontend calls `GET /api/medical-records/vitals`
6. Backend filters: `{ patient: userId, isDeleted: false }`
7. Backend populates consultation and provider references
8. Frontend displays table with:
   - Record data
   - Associated consultation
   - Provider who created it
   - Date

**Search & Filter**:
- Search by date, provider, consultation
- Filter by date range
- Sort by date (newest first)

**Example** (Vitals page):

```javascript
const PatientVitals = () => {
  const [vitals, setVitals] = useState([]);
  
  useEffect(() => {
    fetchVitals();
  }, []);
  
  const fetchVitals = async () => {
    const data = await MedicalRecordService.getVitals();
    setVitals(data);
  };
  
  return (
    <div>
      <h1>Vitals Records</h1>
      <Table>
        {vitals.map(vital => (
          <tr key={vital._id}>
            <td>{formatDate(vital.date)}</td>
            <td>{vital.heartRate?.value} bpm</td>
            <td>{vital.bloodPressure?.systolic}/{vital.bloodPressure?.diastolic} mmHg</td>
            <td>{vital.provider?.firstName} {vital.provider?.lastName}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
};
```

---

#### Provider Viewing Medical Records

**Frontend**: `client/src/pages/provider/MedicalRecords.jsx`  
**Backend**: `GET /api/medical-records/{type}?patient={patientId}`

**Access Control**:
- Backend checks connection to patient
- If **limited access**: Returns only records from consultations provider created
- If **full access**: Returns all patient records

**Filtering** (in backend):

```javascript
if (userRole === 'provider') {
  const connection = await Connection.findOne({ provider: userId, patient: patientId });
  
  if (!connection) {
    return res.status(403).json({ message: 'No connection to this patient' });
  }
  
  if (connection.accessLevel === 'limited') {
    // Only records from provider's consultations
    const providerConsultations = await Consultation.find({ 
      provider: userId, 
      patient: patientId 
    }).select('_id');
    
    query.consultation = { $in: providerConsultations.map(c => c._id) };
  } else if (connection.accessLevel === 'full' && connection.fullAccessStatus === 'approved') {
    // All records for this patient
    query.patient = patientId;
  }
}
```

---

### 7. File Upload & Attachment Flow

Files are uploaded separately from form submissions for better error handling and progress tracking.

---

#### File Upload Types

| Type | Use Case | Max Size | Formats | Storage Path |
|------|----------|----------|---------|--------------|
| **Profile Pictures** | User avatars | 2MB | PNG, JPG, JPEG, GIF | `uploads/profile-images/` |
| **Provider Licenses** | Professional credentials | 5MB | PDF, PNG, JPG, JPEG | `uploads/licenses/` |
| **Consultation Attachments** | Medical documents, images | 5MB | Images, PDF, DOC, DOCX | `uploads/consultations/` |

---

#### Consultation File Upload Flow

**Frontend**: `client/src/components/forms/FileUpload/FileUpload.jsx`  
**Backend**: `POST /api/files/upload/consultation/:consultationId`  
**Middleware**: `server/middleware/upload.middleware.js` (uploadConsultationFile)

**Process**:
1. User drags file into upload zone or clicks "Choose File"
2. Frontend validates file type and size client-side
3. After consultation is created, upload files separately
4. Create FormData with file(s)
5. POST to `/api/files/upload/consultation/:consultationId`
6. Multer middleware processes upload:
   - Validates file type and size
   - Generates unique filename (timestamp + random)
   - Saves to disk
7. Backend updates `consultation.attachments` array:
   ```javascript
   {
     filename: 'file-1234567890-123456789.pdf',
     originalName: 'lab-results.pdf',
     mimetype: 'application/pdf',
     size: 1048576,
     path: '/uploads/consultations/file-1234567890-123456789.pdf',
     uploadDate: Date.now()
   }
   ```
8. Frontend shows success message and file preview

**File Viewing**:
- **Images/PDFs**: Open in new tab with `?inline=true` parameter
- **Other files**: Download via `Content-Disposition: attachment`

**File Access Endpoint**: `GET /api/files/consultations/:filename?token={jwt}`

**Security** (from `file.routes.js` lines 163-225):
- JWT token required (via header or query parameter)
- Permission check: User must be patient, provider, or admin associated with consultation
- File streaming (not loading entire file into memory)

---

#### Profile Picture Upload Flow

**Frontend**: `client/src/components/common/ProfilePictureUpload/`  
**Backend**: `POST /api/users/profile-picture`  
**Middleware**: `uploadProfilePicture` (max 2MB, image types only)

**Process**:
1. User clicks "Upload Profile Picture"
2. Select image file
3. Preview shown in UI
4. Submit to API
5. Backend deletes old profile image (if exists)
6. Backend saves new image
7. Backend updates `user.profileImage` with file path
8. Frontend updates Redux state with new image URL

**Public Access**: Profile images have a public endpoint for CORS compatibility:
- `GET /api/files/public/profile/:userId` (no auth required)
- Used for displaying profile images in headers, lists, etc.

**See**: `docs/PROFILE_PICTURE_IMPLEMENTATION.md` for full implementation details.

---

### 8. Viewing Patient's Longitudinal History

Patients and providers (with full access) can view aggregated medical history.

---

#### Patient Medical Records Hub

**Frontend**: `client/src/pages/patient/MedicalRecords.jsx`  
**Backend**: Multiple endpoints (one per record type)

**Layout**:
- 7 category cards (Vitals, Medications, Immunizations, Lab Results, Radiology, Hospital, Surgery)
- Each card shows:
  - Icon
  - Total count
  - "View All" link

**Navigation**:
- Click card → Navigate to `/patient/medical-records/vitals` (or other type)
- View list of all records of that type
- Records sorted by date (newest first)
- Each record shows:
  - Date
  - Key fields (e.g., BP, heart rate for vitals)
  - Associated consultation
  - Provider who created it

**Backend Queries** (example for vitals):

```javascript
// GET /api/medical-records/vitals
const vitals = await VitalsRecord.find({
  patient: userId,
  isDeleted: false
})
  .populate('provider', 'firstName lastName')
  .populate('consultation', 'date general')
  .sort({ date: -1 });
```

---

#### Provider Viewing Patient History

**Frontend**: `client/src/pages/provider/ViewPatient.jsx` → Medical records tabs  
**Backend**: `GET /api/medical-records/{type}?patient={patientId}`

**Access Control**:
- Backend checks connection
- If **limited access**: Only records from provider's consultations
- If **full access**: All patient records

**Features**:
- View all 7 record types for a specific patient
- Filter by date range
- Search across records
- Export to PDF (frontend functionality using jsPDF)

**Timeline View** (from context, likely implemented):
- Chronological display of all medical events
- Color-coded by type (vitals = blue, medications = green, etc.)
- Grouped by consultation

---

### 9. Admin Dashboard & Analytics

Admins view platform-wide metrics and manage users.

---

#### Analytics Dashboard Flow

**Frontend**: `client/src/pages/admin/Dashboard.jsx`  
**Backend**: `GET /api/admin/analytics`  
**Controller**: `server/controllers/admin.controller.js` (lines 200-400)

**Metrics Displayed**:

**General Metrics**:
- Total users, patients, providers, consultations
- Average patient age
- Gender distribution (male/female count)

**Activity Metrics** (date-range filtered):
- New users, patients, providers
- Active users, patients, providers (last login within range)
- New consultations
- Churn rate (deleted profiles)

**Recent Activity Log**:
- User registrations (last 10)
- Consultation creations (last 10)
- Timestamped activity feed

**Date Range Filtering** (lines 39-79 in `Dashboard.jsx`):

```javascript
const [dateRange, setDateRange] = useState({
  startDate: '',
  endDate: ''
});

const fetchAnalytics = async () => {
  const data = await adminService.getDashboardAnalytics(
    dateRange.startDate || null,
    dateRange.endDate || null
  );
  setAnalytics(data);
};
```

**Backend Aggregation** (example for gender distribution):

```javascript
const genderDistribution = await User.aggregate([
  { $match: { role: 'patient' } },
  { $group: {
    _id: '$patientProfile.gender',
    count: { $sum: 1 }
  }}
]);
```

---

#### Provider Verification Management

**Frontend**: `client/src/pages/admin/HealthProviders.jsx` → `ViewProviderRequest.jsx`  
**Backend**: `GET /api/admin/providers/pending`, `POST /api/admin/verify-provider/:id`

**Flow**:
1. Admin views "Provider Verification Requests" tab
2. Backend queries: `{ role: 'provider', isProfileCompleted: true, 'providerProfile.isVerified': false }`
3. Admin clicks provider to view details
4. View includes:
   - Professional information
   - Practice details
   - Uploaded license (viewable inline)
   - All onboarding data
5. Admin clicks "Approve" or "Reject"
6. Backend updates `providerProfile.isVerified: true/false`
7. Backend queues email to provider
8. Provider receives email with approval/rejection

---

#### User Management

**Frontend**: `client/src/pages/admin/Users.jsx`, `Patients.jsx`, `HealthProviders.jsx`  
**Backend**: `GET /api/admin/users`, `PUT /api/admin/users/:id`, `DELETE /api/admin/users/:id`

**Features**:
- View all users with role filter
- Search by name, email
- Filter by verification status
- Edit user details (limited fields for patients - no medical data)
- Delete user accounts
- "View As" functionality (impersonate user view)

**"View As" Flow**:
1. Admin clicks "View Profile" on patient/provider
2. Navigate to `/admin/patients/:id/profile` or `/admin/providers/:id/profile`
3. Frontend renders patient/provider dashboard **exactly as the user sees it**
4. Admin can navigate through the user's interface
5. Admin cannot modify data in "view as" mode (read-only)

**See**: `client/src/pages/admin/PatientProfile.jsx` for implementation.

---

### 10. File Attachment Workflow

Detailed flow for viewing and downloading attached files.

---

#### Viewing Attachments in Consultation

**Frontend**: Consultation view page → Files tab  
**Backend**: `GET /api/files/consultation/:consultationId/attachments`

**Process**:
1. User opens consultation detail page
2. Clicks "Files" tab
3. Frontend calls attachments endpoint
4. Backend returns array of file metadata:
   ```json
   {
     "attachments": [
       {
         "id": "...",
         "filename": "file-123.pdf",
         "originalName": "lab-results.pdf",
         "size": 1048576,
         "mimetype": "application/pdf",
         "uploadDate": "2025-11-19T10:00:00Z",
         "viewUrl": "/api/files/consultations/file-123.pdf?inline=true",
         "downloadUrl": "/api/files/consultations/file-123.pdf"
       }
     ]
   }
   ```
5. Frontend displays file list with:
   - Original filename
   - File size (formatted: "1.0 MB")
   - Upload date
   - View button (images/PDFs)
   - Download button

---

#### Viewing/Downloading Files

**Backend**: `GET /api/files/:type/:filename?token={jwt}&inline={true/false}`  
**File**: `server/routes/file.routes.js` (lines 163-225)

**Process**:
1. User clicks "View" or "Download"
2. Frontend generates URL with JWT token in query parameter (necessary for new window/tab)
3. Open in new window: `window.open(url)`
4. Backend verifies JWT token (from header or query param)
5. Backend checks file permissions
6. Backend streams file with appropriate headers:
   - `inline=true`: `Content-Disposition: inline` (view in browser)
   - `inline=false`: `Content-Disposition: attachment` (download)

**Security** (from `file.routes.js` lines 163-169):
- Token in query parameter only used if Authorization header is missing
- Tokens sanitized from logs
- All permission checks remain in place
- **Should only be used over HTTPS in production**

**Future Consideration**: Implement signed URLs with expiration for better security.

---

## Summary of Key API Endpoints by Flow

### Patient Onboarding
- `POST /api/auth/register` - Create account
- `GET /api/auth/verify-email/:token` - Verify email
- `POST /api/users/onboarding` - Submit onboarding data

### Provider Onboarding & Verification
- `POST /api/auth/register` - Create account
- `GET /api/auth/verify-email/:token` - Verify email
- `POST /api/users/onboarding` - Submit onboarding with license
- `POST /api/files/upload/license` - Upload license file
- `GET /api/admin/providers/pending` - Admin view pending providers
- `POST /api/admin/verify-provider/:id` - Admin approve/reject

### Consultation Management
- `POST /api/consultations` - Create consultation (draft or completed)
- `PUT /api/consultations/:id` - Update consultation
- `GET /api/consultations/:id` - View consultation detail
- `GET /api/consultations/patient` - Patient list consultations
- `GET /api/consultations?provider={id}` - Provider list consultations
- `POST /api/files/upload/consultation/:id` - Upload attachments
- `GET /api/files/consultation/:id/attachments` - List attachments

### Patient-Provider Connections
- `POST /api/connections` - Create connection (manual)
- `POST /api/connections/provider/request-full-access/:id` - Request full access
- `GET /api/connections/patient/requests` - Patient view pending requests
- `POST /api/connections/patient/approve/:id` - Approve full access
- `POST /api/connections/patient/deny/:id` - Deny full access
- `DELETE /api/connections/:id` - Remove connection

### Medical Records
- `GET /api/medical-records/vitals` - Get vitals records
- `GET /api/medical-records/medications` - Get medications
- `GET /api/medical-records/immunizations` - Get immunizations
- `GET /api/medical-records/labResults` - Get lab results
- `GET /api/medical-records/radiology` - Get radiology reports
- `GET /api/medical-records/hospital` - Get hospital records
- `GET /api/medical-records/surgery` - Get surgery records
- `POST /api/medical-records/vitals` - Add vitals (patient-created)

### Admin Analytics
- `GET /api/admin/analytics?startDate={date}&endDate={date}` - Dashboard metrics
- `GET /api/admin/users` - All users with filtering
- `GET /api/admin/providers/pending` - Pending verifications
- `POST /api/admin/verify-provider/:id` - Approve provider

### File Management
- `POST /api/files/upload/:type/:id` - Upload file
- `GET /api/files/:type/:filename` - Download/view file
- `GET /api/files/public/profile/:userId` - Public profile image
- `DELETE /api/files/:type/:filename` - Delete file

---

## Key Frontend-Backend Data Flows

### 1. Consultation Creation Data Transformation

**Frontend Format** (from form):
```javascript
{
  general: {
    date: '2025-11-19',
    specialistName: 'Dr. John Doe',
    specialty: 'Cardiology',
    practiceName: 'Heart Clinic',
    reasonForVisit: 'Annual checkup',
    notes: 'Patient doing well'
  },
  vitals: {
    heartRate: '72',
    bloodPressure: { systolic: '120', diastolic: '80' },
    // ...
  },
  medication: [
    { name: 'Lisinopril', dosage: { value: '10', unit: 'mg' }, frequency: 'Daily' }
  ]
}
```

**Backend Transformation** (in controller):
```javascript
// Create vitals record
const vitalsRecord = await VitalsRecord.create({
  patient: patientId,
  provider: providerId,
  heartRate: { value: vitals.heartRate, unit: 'bpm' },
  bloodPressure: { 
    systolic: vitals.bloodPressure.systolic, 
    diastolic: vitals.bloodPressure.diastolic, 
    unit: 'mmHg' 
  }
});

// Create consultation referencing records
const consultation = new Consultation({
  patient: patientId,
  provider: providerId,
  date: formData.general.date,
  general: {
    specialistName: formData.general.specialistName,
    specialty: formData.general.specialty,
    practice: formData.general.practiceName,
    reasonForVisit: formData.general.reasonForVisit,
    notes: formData.general.notes
  },
  vitals: vitalsRecord._id,
  medications: [medicationRecord1._id, medicationRecord2._id],
  status: 'completed'
});
```

**Result**: 1 Consultation document + N medical record documents created.

---

### 2. Medical Records Aggregation for Display

**Backend Query** (example for patient dashboard vitals):

```javascript
// GET /api/users/patient/vitals/recent
const recentVitals = await VitalsRecord.find({
  patient: userId,
  isDeleted: false
})
  .populate('consultation', 'date general')
  .populate('provider', 'firstName lastName')
  .sort({ date: -1 })
  .limit(5);
```

**Frontend Display** (in dashboard):
```javascript
{recentVitals.map(vital => (
  <div key={vital._id}>
    <p>Heart Rate: {vital.heartRate.value} {vital.heartRate.unit}</p>
    <p>BP: {vital.bloodPressure.systolic}/{vital.bloodPressure.diastolic} {vital.bloodPressure.unit}</p>
    <p>Date: {formatDate(vital.date)}</p>
    <p>Provider: {vital.provider.firstName} {vital.provider.lastName}</p>
  </div>
))}
```

---

## Domain-Specific Business Rules

### 1. Consultation Status Lifecycle

**States**: `'draft'` → `'completed'` → `'archived'` (optional)

**Rules**:
- **Draft**: Editable by provider, not visible to patient, no email sent
- **Completed**: Immutable (no editing), visible to patient, email sent
- **Archived**: (Not fully implemented) - intended for old consultations

**Transition**:
```javascript
// Save as draft
consultation.status = 'draft';
await consultation.save();

// Complete consultation
consultation.status = 'completed';
await consultation.save();
await emailService.sendConsultationNotification(patient, consultation);
```

---

### 2. Connection Access Rules

| Access Level | Provider Can See | Requires Patient Approval |
|--------------|-----------------|---------------------------|
| **Limited** (default) | Only consultations they created | No |
| **Full** | All consultations, all medical records, patient profile | Yes |

**Business Logic** (enforced in controllers and middleware):
- Limited access = automatic on connection creation
- Full access = requires patient approval
- Patient can revoke full access → reverts to limited
- Patient can delete connection → provider loses all access

---

### 3. Medical Record Ownership

**Rules**:
- Medical records are **always linked to a consultation** (except patient-created vitals)
- Medical records are **owned by the patient** (patient field)
- Medical records are **created by a provider** (provider field)
- Medical records **cannot be edited** after consultation is completed (data integrity)
- Medical records use **soft deletes** (`isDeleted: true`)

---

### 4. Provider Verification Requirements

**Unverified Provider Restrictions**:
- Can login after email verification
- Cannot access dashboard
- Redirected to `/provider/verification-pending` page
- Cannot create consultations
- Cannot view patients

**Verified Provider Access**:
- Full dashboard access
- Can create consultations
- Can request full access to patients
- Can view connected patients (based on access level)

**Verification Trigger**: Admin approval in admin dashboard.

---

## Data Privacy & Access Control Enforcement

### 1. Patient Data Protection

**Admin Access** (limited for privacy):
- Admins can view patient demographics (name, email, DOB, gender, address, insurance)
- Admins **cannot** view medical history, medications, allergies, lifestyle data
- Enforced in `admin.controller.js` lines 94-121:

```javascript
if (user.role === 'patient') {
  const filteredUser = {
    _id: user._id,
    email: user.email,
    firstName: user.firstName,
    patientProfile: {
      dateOfBirth: user.patientProfile?.dateOfBirth,
      gender: user.patientProfile?.gender,
      address: user.patientProfile?.address,
      insurance: user.patientProfile?.insurance,
      emergencyContact: user.patientProfile?.emergencyContact
      // Explicitly excluding: medicalHistory, familyMedicalHistory, 
      // currentMedications, supplements, allergies, lifestyle, immunisationHistory
    }
  };
  return res.json(filteredUser);
}
```

**Rationale**: Even admins should not have unrestricted access to sensitive medical data.

---

### 2. Provider Access Based on Connection

**Enforced at**:
- Middleware: `server/middleware/auth.middleware.js` (`canProviderAccessPatient` function)
- Controllers: Check connection before returning patient data
- Frontend: UI hides inaccessible data

**Example** (from `consultation.controller.js`):

```javascript
if (userRole === 'provider') {
  const connection = await Connection.findOne({
    provider: userId,
    patient: consultation.patient
  });
  
  if (!connection) {
    return res.status(403).json({ message: 'No connection to this patient' });
  }
  
  // Check access level for non-created consultations
  if (connection.accessLevel === 'limited' && 
      consultation.provider.toString() !== userId) {
    return res.status(403).json({ 
      message: 'Limited access - you can only view consultations you created' 
    });
  }
}
```

---

## Summary of Domain Flows

| Flow | Frontend Entry Point | Backend API | Key Models |
|------|---------------------|-------------|------------|
| **Patient Onboarding** | `pages/patient/Onboarding.jsx` | `POST /api/users/onboarding` | User (patientProfile) |
| **Provider Onboarding** | `pages/provider/Onboarding.jsx` | `POST /api/users/onboarding` | User (providerProfile) |
| **Provider Verification** | `pages/admin/ViewProviderRequest.jsx` | `POST /api/admin/verify-provider/:id` | User |
| **Create Consultation** | `pages/provider/AddConsultation.jsx` | `POST /api/consultations` | Consultation, 7 medical record types |
| **View Consultation** | `pages/patient/ViewConsultation.jsx` | `GET /api/consultations/:id` | Consultation (populated) |
| **Patient-Provider Connection** | `pages/provider/AddPatient.jsx`, `pages/patient/Connections.jsx` | `POST /api/connections`, `POST /api/connections/provider/request-full-access/:id` | Connection |
| **View Medical Records** | `pages/patient/medical-records/{Type}.jsx` | `GET /api/medical-records/{type}` | VitalsRecord, MedicationRecord, etc. |
| **Upload Files** | `components/forms/FileUpload/` | `POST /api/files/upload/{type}/:id` | Consultation.attachments |
| **Admin Analytics** | `pages/admin/Dashboard.jsx` | `GET /api/admin/analytics` | User, Consultation aggregations |

---

## Next Steps

To understand domain-specific flows more deeply:

1. **Test Flows**: Use test accounts to walk through each flow end-to-end
2. **Read Connection Flow**: `docs/PATIENT_PROVIDER_CONNECTION_FLOW.md` for detailed access control
3. **Read Consultation Controller**: `server/controllers/consultation.controller.js` for business logic
4. **Explore Onboarding Forms**: `client/src/pages/patient/onboarding/` for form steps
5. **Review File Upload**: `docs/FILE_UPLOAD_IMPLEMENTATION.md` for file handling details

---

**Document Version**: 1.0  
**Last Updated**: November 19, 2025  
**Previous Document**: [07-Frontend-Architecture.md](./07-Frontend-Architecture.md)  
**Next Document**: [09-Third-Party-Integrations.md](./09-Third-Party-Integrations.md)

