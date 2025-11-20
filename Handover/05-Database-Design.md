# 5. Database Design (MongoDB / Mongoose)

This document explains the database architecture of the Onus Health Application, including models, relationships, indexes, and data conventions.

---

## Database Overview

**Database**: MongoDB (cloud-hosted on **MongoDB Atlas**)  
**Database Name**: `onus-health`  
**ODM**: Mongoose v8.0.1  
**Connection**: Pooled connections with automatic reconnection  
**Collections**: 10 primary collections (User, Consultation, Connection, EmailQueue, + 7 medical record types)

---

## MongoDB Connection Configuration

### Connection File

**File**: `server/utils/database.js`

**Purpose**: Provides robust MongoDB connection with:
- Connection pooling (10 connections in dev, 50 in production)
- Automatic reconnection with exponential backoff (max 5 retries)
- Connection monitoring and health checks
- Graceful shutdown handling

**Connection String Source**:
- **Environment Variable**: `MONGODB_ATLAS_URI` (from `server/.env`)
- **Configured in**: `server/config/environment.js` (lines 13-52)
- **Format**: `mongodb+srv://username:password@cluster.mongodb.net/onus-health?retryWrites=true&w=majority&readPreference=primary`

**Connection Options** (from `database.js` lines 44-73):

```javascript
{
  autoIndex: false,            // Disabled in production for performance
  maxPoolSize: 50,             // Production: 50, Development: 10
  minPoolSize: 5,              // Production: 5, Development: 2
  socketTimeoutMS: 45000,      // Socket idle timeout
  serverSelectionTimeoutMS: 30000,  // Server selection timeout
  heartbeatFrequencyMS: 10000, // Heartbeat frequency
  writeConcern: {              // Production only
    w: 'majority',
    j: true,
    wtimeout: 10000
  }
}
```

**Connection Flow**:
1. Server starts → `startServer()` in `server/server.js` (line 195)
2. Calls `database.connect()` → `server/utils/database.js` (line 173)
3. Mongoose connects with retry logic
4. Connection listeners log success/failure
5. Connection health monitoring starts

**See**: [[memory:3196676]] - MongoDB Atlas is the only database used (no local MongoDB).

---

### Connection Monitoring

**File**: `server/utils/connectionMonitor.js`

**Features**:
- Periodic database pings (every 30 seconds)
- Connection metrics tracking (disconnections, reconnections, ping time)
- Health status endpoint: `GET /api/status/db`

**Health Check Response**:
```json
{
  "connected": true,
  "connectedSince": "2025-11-19T10:00:00.000Z",
  "lastPing": 45,
  "avgPing": 42,
  "disconnections": 0,
  "reconnections": 0
}
```

---

## Data Model Architecture

### Design Patterns

1. **Single Table Inheritance** (User model)
   - One `users` collection for all roles (patient, provider, admin)
   - Role-specific fields in embedded subdocuments (`patientProfile`, `providerProfile`, `adminProfile`)

2. **Discriminator Pattern** (Medical Records)
   - One `medicalrecords` collection for all record types
   - `discriminatorKey: 'recordType'` distinguishes types (Vitals, Medication, etc.)
   - Shared base fields + type-specific fields

3. **References** (One-to-Many, Many-to-Many)
   - Consultations reference Users (patient, provider)
   - Consultations reference Medical Records (array of ObjectIds)
   - Connections reference Users (patient, provider)

4. **Embedded Documents** (One-to-One)
   - User profile data (patientProfile, providerProfile)
   - Consultation general info (general subdocument)

---

## Core Models & Collections

### 1. User Model

**File**: `server/models/User.js`  
**Collection**: `users`  
**Purpose**: Stores all user accounts (patients, providers, admins) with role-specific profiles

#### Schema Structure

**Common Fields** (all users):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | String | Yes | Unique, lowercase email |
| `password` | String | Conditional | Required unless using OAuth (googleId/facebookId) |
| `role` | String | Yes | Enum: `['patient', 'provider', 'admin']` |
| `firstName` | String | Yes | User's first name |
| `lastName` | String | Yes | User's last name |
| `title` | String | No | Salutation (Mr., Dr., etc.) |
| `phone` | String | No | Phone number |
| `isEmailVerified` | Boolean | No | Email verification status (default: false) |
| `isProfileCompleted` | Boolean | No | Onboarding completion status (default: false) |
| `profileImage` | String | No | File path to profile picture |
| `googleId` | String | No | Google OAuth ID |
| `facebookId` | String | No | Facebook OAuth ID |
| `resetPasswordToken` | String | No | Password reset token |
| `resetPasswordExpires` | Date | No | Password reset expiration |
| `createdAt` | Date | No | Account creation date (auto) |
| `updatedAt` | Date | No | Last update date (auto) |
| `lastLogin` | Date | No | Last login timestamp |

**Patient-Specific Fields** (`patientProfile` subdocument):

| Field | Type | Description |
|-------|------|-------------|
| `dateOfBirth` | Date | Patient's birth date |
| `gender` | String | Enum: `['male', 'female', 'other', 'prefer not to say']` |
| `address` | Object | Street, city, state, postalCode, country |
| `insurance` | Object | Provider, plan, insuranceNumber |
| `emergencyContact` | Object | Name, phone, relationship |
| `medicalHistory` | Object | chronicConditions, significantIllnesses, mentalHealthHistory (arrays) |
| `familyMedicalHistory` | Array | Family medical conditions |
| `currentMedications` | Array | Name, dosage, frequency (objects) |
| `supplements` | String | Vitamin/supplement use |
| `allergies` | Array | Known allergies |
| `lifestyle` | Object | smoking, alcohol, exercise, dietaryPreferences |
| `immunisationHistory` | Array | Vaccination history |
| `termsAccepted` | Boolean | Terms and conditions acceptance |

**Provider-Specific Fields** (`providerProfile` subdocument):

| Field | Type | Description |
|-------|------|-------------|
| `specialty` | String | Medical specialty |
| `yearsOfExperience` | Number | Years practicing |
| `practiceLicense` | String | File path to license document |
| `practiceInfo` | Object | name, location, phone, email |
| `patientManagement` | Object | averagePatients, collaboratesWithOthers |
| `dataPreferences` | Object | criticalInformation (array), requiresHistoricalData |
| `dataPrivacyPractices` | String | Privacy policy description |
| `supportPreferences` | Object | technicalSupportPreference, requiresTraining, updatePreference |
| `isVerified` | Boolean | Admin verification status (default: false) |
| `termsAccepted` | Boolean | Terms acceptance |

**Admin-Specific Fields** (`adminProfile` subdocument):

| Field | Type | Description |
|-------|------|-------------|
| `department` | String | Admin department |
| `adminLevel` | String | Enum: `['super', 'standard']` (default: 'standard') |

#### Indexes

```javascript
// Unique index on email (automatically created by Mongoose)
{ email: 1 } // unique: true
```

**Note**: No additional indexes defined beyond email uniqueness. Likely areas for optimization include indexes on `role`, `isEmailVerified`, `providerProfile.isVerified` for frequent queries.

#### Schema Options

```javascript
{
  timestamps: true  // Automatically adds createdAt and updatedAt
}
```

#### Instance Methods

| Method | Purpose | Returns |
|--------|---------|---------|
| `comparePassword(candidatePassword)` | Compare password with stored hash | Boolean (bcrypt.compare) |
| `generateAuthToken()` | Generate JWT access token (30 min) | String (JWT token) |
| `generateRefreshToken()` | Generate JWT refresh token (30 days) | String (JWT token) |

**See**: `server/models/User.js` lines 203-245

#### Static Methods

| Method | Purpose | Returns |
|--------|---------|---------|
| `verifyToken(token)` | Verify JWT access token | User document |
| `verifyRefreshToken(token)` | Verify JWT refresh token | User document |
| `checkAndFixTestAuthentication()` | Fix test account passwords (dev) | Object ({ checked, fixed }) |

**See**: `server/models/User.js` lines 248-318

#### Middleware Hooks

**Pre-save Hook** (line 192):
- Hashes password with bcrypt (12 salt rounds) if password is modified
- Prevents double-hashing by checking if password starts with `$2a$`, `$2b$`, or `$2y$`

```javascript
UserSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    // Check if already hashed
    if (!this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }
  next();
});
```

---

### 2. Consultation Model

**File**: `server/models/Consultation.js`  
**Collection**: `consultations`  
**Purpose**: Stores provider-created consultation records linking to medical records

#### Schema Structure

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `patient` | ObjectId → User | Yes | Reference to patient User |
| `provider` | ObjectId → User | Yes | Reference to provider User |
| `date` | Date | Yes | Consultation date (default: now) |
| `general` | Object | Partial | General consultation info (subdocument) |
| `general.specialistName` | String | Yes | Provider's name |
| `general.specialty` | String | Yes | Medical specialty |
| `general.practice` | String | No | Practice/clinic name |
| `general.reasonForVisit` | String | Conditional | Required if status = 'completed' |
| `general.notes` | String | No | Provider notes |
| `vitals` | ObjectId → VitalsRecord | No | Reference to vitals record |
| `medications` | [ObjectId] → MedicationRecord | No | Array of medication references |
| `immunizations` | [ObjectId] → ImmunizationRecord | No | Array of immunization references |
| `labResults` | [ObjectId] → LabResultRecord | No | Array of lab result references |
| `radiologyReports` | [ObjectId] → RadiologyReport | No | Array of radiology report references |
| `hospitalRecords` | [ObjectId] → HospitalRecord | No | Array of hospital record references |
| `surgeryRecords` | [ObjectId] → SurgeryRecord | No | Array of surgery record references |
| `status` | String | No | Enum: `['draft', 'completed', 'archived']` (default: 'draft') |
| `isSharedWithPatient` | Boolean | No | Visibility flag (default: true) |
| `attachments` | Array | No | File attachments (objects with filename, path, mimetype, size, uploadDate) |
| `lastUpdated` | Date | No | Last modification timestamp |
| `createdAt` | Date | Auto | Creation timestamp (from timestamps: true) |
| `updatedAt` | Date | Auto | Update timestamp (from timestamps: true) |

#### Indexes

```javascript
ConsultationSchema.index({ patient: 1, date: -1 });  // Patient's consultations by date
ConsultationSchema.index({ provider: 1, date: -1 }); // Provider's consultations by date
```

**Purpose**: Optimize queries for:
- Patient viewing their consultations (sorted by date)
- Provider viewing consultations they created (sorted by date)

#### Virtual Fields

```javascript
ConsultationSchema.virtual('title').get(function() {
  return `${this.general.specialty} - ${formatDate(this.date)}`;
});
```

**Purpose**: Generate human-readable consultation title (not stored in database)

**See**: `server/models/Consultation.js` lines 108-110

---

### 3. Connection Model

**File**: `server/models/Connection.js`  
**Collection**: `connections`  
**Purpose**: Manages patient-provider relationships and access levels

#### Schema Structure

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `patient` | ObjectId → User | Yes | Reference to patient |
| `provider` | ObjectId → User | Yes | Reference to provider |
| `accessLevel` | String | No | Enum: `['limited', 'full']` (default: 'limited') |
| `fullAccessStatus` | String | No | Enum: `['none', 'pending', 'approved', 'denied']` (default: 'none') |
| `initiatedBy` | ObjectId → User | Yes | Who created this connection |
| `initiatedAt` | Date | No | Connection creation date (default: now) |
| `fullAccessStatusUpdatedAt` | Date | No | Last access status change |
| `notes` | String | No | Connection notes |
| `patientNotified` | Boolean | No | Patient notification flag (default: false) |
| `patientNotifiedAt` | Date | No | Notification timestamp |
| `expiresAt` | Date | No | Optional connection expiration |
| `lastAccessedAt` | Date | No | Last time provider accessed patient data |
| `createdAt` | Date | Auto | Creation timestamp |
| `updatedAt` | Date | Auto | Update timestamp |

#### Access Levels Explained

**Limited Access** (default):
- Provider sees only consultations they created for this patient
- Cannot view consultations created by other providers
- Cannot view standalone medical records

**Full Access** (patient-approved):
- Provider sees all patient consultations (from all providers)
- Provider sees all medical records
- Provider sees full patient profile

**Access Flow**:
1. Provider creates consultation → Connection auto-created with `limited` access
2. Provider requests full access → `fullAccessStatus = 'pending'`
3. Patient approves → `accessLevel = 'full'`, `fullAccessStatus = 'approved'`
4. Patient can revoke → `accessLevel = 'limited'`, `fullAccessStatus = 'none'`

**See**: `docs/PATIENT_PROVIDER_CONNECTION_FLOW.md` for detailed flow documentation.

#### Indexes

```javascript
// Compound unique index to prevent duplicate connections
ConnectionSchema.index({ patient: 1, provider: 1 }, { unique: true });

// Query optimization indexes
ConnectionSchema.index({ patient: 1, accessLevel: 1 });
ConnectionSchema.index({ provider: 1, accessLevel: 1 });
ConnectionSchema.index({ patient: 1, fullAccessStatus: 1 });
ConnectionSchema.index({ provider: 1, fullAccessStatus: 1 });
```

**Purpose**:
- **Unique index**: Ensures one connection per patient-provider pair
- **Access level indexes**: Optimize queries filtering by access level
- **Status indexes**: Optimize queries for pending/approved requests

#### Instance Methods

| Method | Purpose | Effect |
|--------|---------|--------|
| `requestFullAccess()` | Provider requests full access | Sets `fullAccessStatus = 'pending'`, saves |
| `approveFullAccess()` | Patient approves request | Sets `accessLevel = 'full'`, `fullAccessStatus = 'approved'` |
| `denyFullAccess()` | Patient denies request | Keeps `accessLevel = 'limited'`, sets `fullAccessStatus = 'denied'` |
| `revokeAccess()` | Patient removes provider | Resets to `accessLevel = 'limited'`, `fullAccessStatus = 'none'` |

**See**: `server/models/Connection.js` lines 79-107

---

### 4. Medical Record Models (Discriminator Pattern)

**Base Model**: `server/models/MedicalRecord.js`  
**Collection**: `medicalrecords` (single collection for all types)  
**Discriminator Key**: `recordType` (automatically added by Mongoose)

#### Base Schema (All Medical Records)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `patient` | ObjectId → User | Yes | Reference to patient |
| `provider` | ObjectId → User | No | Reference to provider (optional for patient-created) |
| `consultation` | ObjectId → Consultation | No | Reference to consultation (optional for patient-created) |
| `date` | Date | Yes | Record date (default: now) |
| `notes` | String | No | Additional notes |
| `isDeleted` | Boolean | No | Soft delete flag (default: false) |
| `recordType` | String | Auto | Discriminator key (e.g., 'Vitals', 'Medication') |
| `createdAt` | Date | Auto | Creation timestamp |
| `updatedAt` | Date | Auto | Update timestamp |

**Schema Options**:
```javascript
{
  discriminatorKey: 'recordType',
  timestamps: true
}
```

**Pattern**: All medical record types extend `MedicalRecord` using Mongoose discriminators:

```javascript
const MedicationRecord = MedicalRecord.discriminator('Medication', MedicationSchema);
```

**Benefits**:
- Single collection for all record types (efficient queries)
- Shared base fields (patient, provider, consultation, date)
- Type-specific fields added via discriminators
- Automatic `recordType` field for querying by type

---

#### 4.1. VitalsRecord

**File**: `server/models/VitalsRecord.js`  
**Discriminator**: `'Vitals'`

**Type-Specific Fields**:

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `heartRate.value` | Number | bpm | Heart rate |
| `bloodPressure.systolic` | Number | mmHg | Systolic BP |
| `bloodPressure.diastolic` | Number | mmHg | Diastolic BP |
| `bodyFatPercentage.value` | Number | % | Body fat percentage |
| `bmi.value` | Number | - | Body Mass Index |
| `weight.value` | Number | kg | Weight |
| `height.value` | Number | cm | Height |
| `bodyTemperature.value` | Number | °C | Temperature |
| `bloodGlucose.value` | Number | mg/dL | Blood glucose |
| `bloodGlucose.measurementType` | String | - | Enum: `['fasting', 'postprandial', 'random']` |
| `bloodOxygenSaturation.value` | Number | % | SpO2 |
| `respiratoryRate.value` | Number | breaths/min | Respiratory rate |
| `createdByPatient` | Boolean | - | Patient vs. provider entry (default: false) |

**Note**: Each vital has a `value` and `unit` structure for consistency.

---

#### 4.2. MedicationRecord

**File**: `server/models/MedicationRecord.js`  
**Discriminator**: `'Medication'`

**Type-Specific Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | String | Yes | Medication name |
| `dosage.value` | String | Yes | Dosage amount |
| `dosage.unit` | String | Yes | Dosage unit (mg, ml, etc.) |
| `frequency` | String | Yes | Frequency (e.g., "twice daily") |
| `reasonForPrescription` | String | No | Why prescribed |
| `startDate` | Date | Yes | Start date |
| `endDate` | Date | No | End date (if applicable) |
| `instructions` | String | No | Special instructions |
| `sideEffects` | String | No | Known side effects |
| `isActive` | Boolean | No | Currently active (default: true) |

---

#### 4.3. ImmunizationRecord

**File**: `server/models/ImmunizationRecord.js`  
**Discriminator**: `'Immunization'`

**Type-Specific Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `vaccineName` | String | Yes | Vaccine name |
| `dateAdministered` | Date | Yes | Administration date |
| `vaccineSerialNumber` | String | No | Serial/batch number |
| `nextDueDate` | Date | No | Next dose due date |
| `administeredBy` | String | No | Administrator name |
| `manufacturer` | String | No | Vaccine manufacturer |
| `lotNumber` | String | No | Lot number |
| `site` | String | No | Enum: `['left arm', 'right arm', 'left leg', 'right leg', 'other']` |
| `route` | String | No | Enum: `['intramuscular', 'subcutaneous', 'intradermal', 'oral', 'other']` |
| `doseNumber` | Number | No | Dose number (1, 2, 3...) |
| `reactions` | String | No | Adverse reactions |

---

#### 4.4. LabResultRecord

**File**: `server/models/LabResultRecord.js`  
**Discriminator**: `'LabResult'`

**Type-Specific Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `testName` | String | Yes | Name of test |
| `labName` | String | Yes | Laboratory name |
| `dateOfTest` | Date | Yes | Test date |
| `results` | String | Yes | Test results |
| `comments` | String | No | Comments or diagnosis |
| `referenceRange` | String | No | Normal range for reference |
| `abnormalFlags` | Array | No | Flags for abnormal results |

---

#### 4.5. RadiologyReport

**File**: `server/models/RadiologyReport.js`  
**Discriminator**: `'RadiologyReport'`

**Type-Specific Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `scanType` | String | Yes | Type of scan (X-ray, CT, MRI, etc.) |
| `scanDate` | Date | Yes | Scan date |
| `bodyPart` | String | Yes | Body part examined |
| `findings` | String | Yes | Radiologist findings |
| `recommendations` | String | No | Recommendations |
| `radiologistName` | String | No | Radiologist name |
| `impressions` | String | No | Clinical impressions |

---

#### 4.6. HospitalRecord

**File**: `server/models/HospitalRecord.js`  
**Discriminator**: `'HospitalRecord'`

**Type-Specific Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `admissionDate` | Date | Yes | Hospital admission date |
| `dischargeDate` | Date | No | Discharge date |
| `reasonForHospitalisation` | String | Yes | Admission reason |
| `treatmentsReceived` | Array | No | Treatments during stay |
| `attendingDoctors` | Array | No | Doctor names |
| `dischargeSummary` | String | No | Discharge summary |
| `investigationsDone` | String | No | Investigations performed |
| `hospitalName` | String | No | Hospital name |
| `wardType` | String | No | Ward type |

---

#### 4.7. SurgeryRecord

**File**: `server/models/SurgeryRecord.js`  
**Discriminator**: `'SurgeryRecord'`

**Type-Specific Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `surgeryType` | String | Yes | Type of surgery |
| `surgeryDate` | Date | Yes | Surgery date |
| `reason` | String | Yes | Reason for surgery |
| `complications` | String | No | Complications during/after |
| `recoveryNotes` | String | No | Recovery progress notes |
| `surgeonName` | String | No | Surgeon name |
| `anesthesiaType` | String | No | Type of anesthesia |
| `hospitalName` | String | No | Hospital where performed |
| `duration` | Number | No | Surgery duration (minutes) |

---

### 5. EmailQueue Model

**File**: `server/models/EmailQueue.js`  
**Collection**: `emailqueues`  
**Purpose**: Queue for asynchronous email sending with retry logic

#### Schema Structure

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | String | Yes | Recipient email |
| `from` | String | Yes | Sender email |
| `subject` | String | Yes | Email subject |
| `html` | String | Yes | HTML email body |
| `text` | String | No | Plain text alternative |
| `status` | String | No | Enum: `['pending', 'processing', 'sent', 'failed']` (default: 'pending') |
| `priority` | Number | No | Priority (0=normal, 1=high, 2=urgent) (default: 0) |
| `attempts` | Number | No | Send attempt count (default: 0) |
| `maxAttempts` | Number | No | Max retry attempts (default: 3) |
| `lastAttempt` | Date | No | Last send attempt timestamp |
| `nextAttempt` | Date | No | Next retry scheduled time |
| `error` | String | No | Error message from last attempt |
| `userId` | ObjectId → User | No | Related user (optional) |
| `template` | String | No | Template name |
| `templateData` | Object | No | Template data (mixed type) |
| `createdAt` | Date | Auto | Queue entry creation |
| `updatedAt` | Date | Auto | Last update |

#### Indexes

```javascript
EmailQueueSchema.index({ status: 1, nextAttempt: 1 });  // Find pending emails ready to send
EmailQueueSchema.index({ userId: 1 });                   // Find emails by user
```

**Purpose**: Optimize email queue processing by status and scheduled time.

#### Email Queue Processor

**File**: `server/services/email.service.js`  
**Interval**: Every 60 seconds (configurable via `QUEUE_PROCESS_INTERVAL` env var)

**Retry Logic**:
- Attempt 1: Immediate
- Attempt 2: After 5 minutes
- Attempt 3: After 15 minutes
- Attempt 4: After 60 minutes
- After max attempts: Status set to 'failed'

**See**: `server/services/email.service.js` for full implementation.

---

## Database Conventions

### 1. Timestamps

**All models** use Mongoose timestamps option:

```javascript
{
  timestamps: true
}
```

**Effect**: Automatically adds and manages:
- `createdAt`: Document creation time
- `updatedAt`: Last modification time

**Exceptions**: Some models also have custom date fields (e.g., `User.lastLogin`, `Connection.initiatedAt`) for specific purposes.

---

### 2. Soft Deletes vs. Hard Deletes

**Medical Records**: Use **soft deletes**
- `isDeleted: Boolean` field in base `MedicalRecord` schema
- Records are marked as deleted, not removed from database
- **Rationale**: Maintain data integrity and audit trail

**Other Models**: Use **hard deletes**
- `User`, `Consultation`, `Connection` are permanently deleted when removed
- **Rationale**: User-requested account deletion should be complete
- **Exception**: Admin can view deleted users in logs (not implemented in current version)

**Implementation**:
```javascript
// Soft delete (medical records)
await VitalsRecord.updateOne({ _id: recordId }, { $set: { isDeleted: true } });

// Hard delete (users)
await User.deleteOne({ _id: userId });
```

---

### 3. ObjectId References

**Pattern**: Use `Schema.Types.ObjectId` with `ref` for relationships

```javascript
patient: {
  type: Schema.Types.ObjectId,
  ref: 'User',
  required: true
}
```

**Population**: Use `.populate()` to resolve references

```javascript
const consultation = await Consultation.findById(id)
  .populate('patient', 'firstName lastName email')
  .populate('provider', 'firstName lastName email')
  .populate('vitals')
  .populate('medications');
```

---

### 4. Enum Validation

**Pattern**: Use enum for fields with predefined values

```javascript
role: {
  type: String,
  enum: ['patient', 'provider', 'admin'],
  required: true
}
```

**Benefit**: Database-level validation ensures data integrity.

---

### 5. Default Values

**Pattern**: Set sensible defaults for optional fields

```javascript
isEmailVerified: {
  type: Boolean,
  default: false
}
```

**Common Defaults**:
- Booleans: `false`
- Dates: `Date.now`
- Strings: Empty or specific default value
- Arrays: Empty array `[]`

---

### 6. Lowercase and Trim

**Email Fields**: Always lowercase and trimmed

```javascript
email: {
  type: String,
  required: true,
  unique: true,
  trim: true,
  lowercase: true
}
```

**Benefit**: Prevents duplicate accounts due to case differences.

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                            User                                  │
│  (patients, providers, admins in one collection)                │
│  - _id (ObjectId)                                               │
│  - email (unique)                                               │
│  - role: ['patient', 'provider', 'admin']                       │
│  - patientProfile (subdocument)                                 │
│  - providerProfile (subdocument)                                │
│  - adminProfile (subdocument)                                   │
└───────┬───────────────────────────────────┬────────────────────┘
        │                                    │
        │ Referenced by                      │ Referenced by
        │ (patient)                          │ (provider)
        │                                    │
┌───────▼────────────────────────────────────▼────────────────────┐
│                        Consultation                              │
│  - _id                                                           │
│  - patient (ObjectId → User)                                     │
│  - provider (ObjectId → User)                                    │
│  - date                                                          │
│  - general (subdocument)                                         │
│  - vitals (ObjectId → VitalsRecord)                              │
│  - medications ([ObjectId] → MedicationRecord)                   │
│  - immunizations ([ObjectId] → ImmunizationRecord)               │
│  - labResults, radiologyReports, hospitalRecords, surgeryRecords │
│  - status: ['draft', 'completed', 'archived']                    │
│  - attachments (array)                                           │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           │ References
                           │
┌──────────────────────────▼───────────────────────────────────────┐
│                    MedicalRecord (Base)                          │
│  (Single collection with discriminators)                         │
│  - _id                                                           │
│  - patient (ObjectId → User)                                     │
│  - provider (ObjectId → User)                                    │
│  - consultation (ObjectId → Consultation)                        │
│  - recordType (discriminator key)                                │
│  - date                                                          │
│  - isDeleted (soft delete)                                       │
├──────────────────────────────────────────────────────────────────┤
│  Discriminators (same collection, different types):              │
│  - VitalsRecord (recordType: 'Vitals')                           │
│  - MedicationRecord (recordType: 'Medication')                   │
│  - ImmunizationRecord (recordType: 'Immunization')               │
│  - LabResultRecord (recordType: 'LabResult')                     │
│  - RadiologyReport (recordType: 'RadiologyReport')               │
│  - HospitalRecord (recordType: 'HospitalRecord')                 │
│  - SurgeryRecord (recordType: 'SurgeryRecord')                   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                         Connection                               │
│  (Patient-Provider Relationships)                                │
│  - _id                                                           │
│  - patient (ObjectId → User)                                     │
│  - provider (ObjectId → User)                                    │
│  - accessLevel: ['limited', 'full']                              │
│  - fullAccessStatus: ['none', 'pending', 'approved', 'denied']   │
│  - initiatedBy (ObjectId → User)                                 │
│  UNIQUE INDEX: { patient: 1, provider: 1 }                       │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                        EmailQueue                                │
│  (Asynchronous email sending with retry)                         │
│  - _id                                                           │
│  - to, from, subject, html, text                                 │
│  - status: ['pending', 'processing', 'sent', 'failed']           │
│  - attempts, maxAttempts, nextAttempt                            │
│  - userId (ObjectId → User)                                      │
└──────────────────────────────────────────────────────────────────┘
```

**Key Relationships**:
- **User** has many **Consultations** (as patient or provider)
- **User** has many **Connections** (as patient or provider)
- **Consultation** has one **VitalsRecord** (optional)
- **Consultation** has many **MedicationRecords** (optional)
- **Consultation** has many other medical records (optional)
- **Connection** links one **Patient** to one **Provider** (unique pair)

---

## Migration & Seeding Scripts

### Database Seeding

**File**: `server/scripts/seed/seedDatabase.js`

**Purpose**: Populate database with test accounts and sample medical data for development.

**Usage**:
```bash
cd server
npm run seed         # Seed database
npm run seed:reset   # Remove all test data
```

**What it creates**:
1. **Test Accounts**:
   - Admin: `admin.test@email.com` / `password@123`
   - Provider: `provider.test@email.com` / `password@123`
   - Patient: `patient.test@email.com` / `password@123`
   
2. **Sample Data**:
   - 2-3 consultations per test patient
   - Medical records for each consultation (vitals, medications, etc.)
   - Patient-provider connections
   - All accounts pre-verified (`isEmailVerified: true`)

**Test Account Details**: `server/docs/TEST_ACCOUNTS.md`

**Sample Data Configuration**: `server/config/sampleMedicalData.js`

---

### Database Reset

**File**: `server/scripts/seed/resetTestData.js`

**Purpose**: Remove all test accounts and their associated data.

**Usage**:
```bash
cd server
npm run seed:reset
```

**What it removes**:
- All users with test emails (`*.test@email.com`)
- All consultations associated with test users
- All medical records associated with test users
- All connections involving test users
- All email queue entries for test users

**Note**: Uses **hard deletes** to completely remove test data from database.

---

### Database Migrations

**Status**: **Not implemented / not found in this repo**

**Rationale**: Mongoose handles schema changes dynamically. No formal migration system is in place.

**Considerations for Future**:
- If schema changes require data transformation, write one-off migration scripts in `server/scripts/migrations/`
- Consider using a migration library like `migrate-mongo` for production schema changes

---

## Index Optimization Summary

### Existing Indexes

| Collection | Index | Purpose |
|------------|-------|---------|
| `users` | `{ email: 1 }` unique | Email uniqueness and login queries |
| `consultations` | `{ patient: 1, date: -1 }` | Patient's consultations by date |
| `consultations` | `{ provider: 1, date: -1 }` | Provider's consultations by date |
| `connections` | `{ patient: 1, provider: 1 }` unique | Prevent duplicate connections |
| `connections` | `{ patient: 1, accessLevel: 1 }` | Filter by access level |
| `connections` | `{ provider: 1, accessLevel: 1 }` | Filter by access level |
| `connections` | `{ patient: 1, fullAccessStatus: 1 }` | Filter by status |
| `connections` | `{ provider: 1, fullAccessStatus: 1 }` | Filter by status |
| `emailqueues` | `{ status: 1, nextAttempt: 1 }` | Email processing queue |
| `emailqueues` | `{ userId: 1 }` | Find emails by user |

### Suggested Additional Indexes (Not Implemented)

From context, these indexes could improve performance:

| Collection | Suggested Index | Rationale |
|------------|-----------------|-----------|
| `users` | `{ role: 1 }` | Filter users by role (admin queries) |
| `users` | `{ isEmailVerified: 1, role: 1 }` | Find unverified users by role |
| `users` | `{ providerProfile.isVerified: 1 }` | Find unverified providers (admin) |
| `medicalrecords` | `{ patient: 1, recordType: 1, date: -1 }` | Patient's records by type and date |
| `medicalrecords` | `{ consultation: 1 }` | Find records by consultation |
| `consultations` | `{ status: 1, provider: 1 }` | Provider's draft consultations |

**Implementation**:
```javascript
// In model file
UserSchema.index({ role: 1 });
UserSchema.index({ isEmailVerified: 1, role: 1 });
```

---

## Query Performance Considerations

### 1. Populate() Performance

**Issue**: Multiple `.populate()` calls can be slow for large datasets.

**Example** (from `consultation.controller.js`):
```javascript
const consultation = await Consultation.findById(id)
  .populate('patient', 'firstName lastName email')
  .populate('provider', 'firstName lastName email')
  .populate('vitals')
  .populate('medications')
  .populate('immunizations')
  .populate('labResults')
  .populate('radiologyReports')
  .populate('hospitalRecords')
  .populate('surgeryRecords');
```

**Performance**: Each populate is a separate query. With 8+ populates, this could be slow.

**Optimization Options** (not implemented):
- Use aggregation pipeline with `$lookup`
- Implement caching for frequently accessed consultations
- Lazy-load medical records only when tabs are clicked (frontend optimization)

---

### 2. Pagination

**Status**: **Implemented** in most list views (consultations, patients, medical records)

**Implementation** (typical pattern):
```javascript
const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 20;
const skip = (page - 1) * limit;

const consultations = await Consultation.find(query)
  .skip(skip)
  .limit(limit)
  .sort({ date: -1 });

const total = await Consultation.countDocuments(query);
```

**See**: Controllers use pagination for performance (prevents loading all records at once).

---

### 3. Lean Queries

**Status**: **Not widely used** in current codebase.

**Benefit**: `.lean()` returns plain JavaScript objects (not Mongoose documents), improving performance.

**Example**:
```javascript
const consultations = await Consultation.find(query).lean();
```

**Tradeoff**: Loses Mongoose instance methods and virtuals.

---

## Data Integrity & Validation

### 1. Schema Validation

**Mongoose Schema Validation**: Enforced at application level (before save)

**Examples**:
- Required fields: `required: true`
- Enum validation: `enum: ['value1', 'value2']`
- Min/max: `minlength: 8`, `maxlength: 100`
- Custom validators: Functions in schema definition

**Note**: Validation runs on `save()` and `create()`, but not on `update()` unless `runValidators: true` is set.

---

### 2. Unique Constraints

**Email Uniqueness**:
```javascript
email: {
  type: String,
  unique: true
}
```

**Connection Uniqueness**:
```javascript
ConnectionSchema.index({ patient: 1, provider: 1 }, { unique: true });
```

**Note**: Unique indexes are enforced at database level (MongoDB).

---

### 3. Referential Integrity

**Status**: **Not enforced** at database level (MongoDB doesn't support foreign keys).

**Pattern**: Application-level checks in controllers.

**Example** (from `consultation.controller.js`):
```javascript
// Check if patient exists before creating consultation
const patient = await User.findOne({ email: patientEmail, role: 'patient' });
if (!patient) {
  return res.status(404).json({ message: 'Patient not found' });
}
```

**Orphaned Records**: Possible if documents are deleted without cascading deletes.

**Cleanup Script**: `server/scripts/cleanupOrphanedData.js` removes orphaned records.

---

## Summary

### Key Takeaways

1. **Single Database**: MongoDB Atlas (`onus-health` database)
2. **10 Collections**: User, Consultation, Connection, EmailQueue, + 7 medical record types (in one collection)
3. **Design Patterns**: Single table inheritance (User), Discriminators (MedicalRecords), References (Consultations)
4. **Indexes**: Strategic indexes on common queries (patient/provider + date)
5. **Soft Deletes**: Medical records use `isDeleted` flag
6. **Timestamps**: All models have `createdAt` and `updatedAt`
7. **Connection Pooling**: 10 connections (dev), 50 (production)
8. **Seeding**: `npm run seed` creates test data
9. **No Migrations**: Mongoose handles schema changes dynamically

---

## Next Steps

To understand the database design more deeply:

1. **Read Models**: Explore all model files in `server/models/`
2. **Test Queries**: Use MongoDB Compass to view collections and run queries
3. **Seed Database**: Run `npm run seed` and explore created data
4. **Review Controllers**: See how models are queried in `server/controllers/`
5. **Read Authentication**: [06-Authentication-Authorization-Security.md](./06-Authentication-Authorization-Security.md) for JWT and access control details

---

**Document Version**: 1.0  
**Last Updated**: November 19, 2025  
**Previous Document**: [04-Backend-Architecture.md](./04-Backend-Architecture.md)  
**Next Document**: [06-Authentication-Authorization-Security.md](./06-Authentication-Authorization-Security.md)

