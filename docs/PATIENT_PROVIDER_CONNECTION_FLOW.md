# Patient-Provider Connection Flow Documentation

## Overview

The patient-provider connection system manages relationships between healthcare providers and patients on the Onus Health platform. It implements a two-tier access system with automatic connection creation and email notifications.

## Access Levels

### 1. Limited Access (Default)
- Providers can only view consultations and medical records they create for the patient
- No access to patient's profile data or records from other providers
- Automatically granted when a connection is created
- No patient approval required

### 2. Full Access
- Providers can view all patient medical data including:
  - All consultations (from any provider)
  - All medical records
  - Patient profile information
- Requires explicit patient approval
- Patient maintains control and can revoke at any time

## Connection Creation Flows

### Flow 1: Provider Adds Patient Without Consultation

1. Provider clicks "Add New Patient" button on Dashboard or Patients page
2. Provider enters patient email address
3. Provider can optionally:
   - Add notes about the connection
   - Request full access immediately
4. System creates connection with limited access
5. If full access requested, patient receives email notification
6. Patient can approve/deny from their Connections page

### Flow 2: Provider Adds Patient and Starts Consultation

1. Provider clicks "Add New Patient" button
2. Provider enters patient email and checks "Start consultation"
3. Provider is redirected to consultation creation form
4. When consultation is saved:
   - Connection is automatically created with limited access
   - Patient receives email about new connection and consultation
5. Provider can later request full access if needed

## API Endpoints

### Connection Management

```
POST   /api/connections                    - Create new connection
GET    /api/connections                    - Get all connections
GET    /api/connections/:id                - Get specific connection
DELETE /api/connections/:id                - Delete connection

POST   /api/connections/provider/request-full-access/:connectionId
       - Request full access for existing connection

GET    /api/connections/patient/requests   - Get pending requests (patient)
POST   /api/connections/patient/respond/:requestId
       - Approve/deny full access request
POST   /api/connections/patient/revoke/:connectionId
       - Revoke provider access
```

### Consultation with Auto-Connection

```
POST   /api/consultations
       - Creates consultation
       - Automatically creates connection if none exists
       - Accepts either patient ID or patient email
```

## Frontend Components

### Provider Side

1. **Add Patient Page** (`/provider/patients/add`)
   - Form to enter patient email
   - Checkbox for requesting full access
   - Checkbox for starting consultation immediately
   - Notes field for connection context

2. **Patients List** (`/provider/patients`)
   - Shows all connected patients
   - Displays access level badges
   - "Request Full Access" button for limited access connections
   - Access level filtering

3. **Dashboard** (`/provider/dashboard`)
   - "Add New Patient" quick action button
   - Recent patients overview
   - Patient metrics

### Patient Side

1. **Connections Page** (`/patient/connections`)
   - Pending full access requests section
   - Connected providers list
   - Access level management
   - Provider removal options

## Email Notifications

### Templates Created

1. **fullAccessRequest.html**
   - Sent when provider requests full access
   - Contains provider details and access explanation
   - Link to approve/deny request

2. **newConnection.html**
   - Sent when connection created via consultation
   - Informs about limited access
   - Link to manage connections

3. **fullAccessApproved.html**
   - Sent to provider when patient approves
   
4. **fullAccessDenied.html**
   - Sent to provider when patient denies

5. **accessRevoked.html**
   - Sent to provider when patient revokes access

## Database Schema

### Connection Model
```javascript
{
  patient: ObjectId (ref: User),
  provider: ObjectId (ref: User),
  accessLevel: String (enum: ['limited', 'full']),
  fullAccessStatus: String (enum: ['none', 'pending', 'approved', 'denied']),
  initiatedBy: ObjectId (ref: User),
  initiatedAt: Date,
  fullAccessStatusUpdatedAt: Date,
  notes: String,
  patientNotified: Boolean,
  patientNotifiedAt: Date
}
```

## Security Considerations

1. **Default Limited Access**: All connections start with limited access
2. **Patient Control**: Patients have full control over their data access
3. **Audit Trail**: All access changes are logged with timestamps
4. **Email Verification**: Both parties must have verified email addresses
5. **Provider Verification**: Providers must be verified by admin

## Testing

Run the test script to verify the connection flow:

```bash
cd server/tests
node test-connection-flow.js
```

This tests:
- Connection creation with limited access
- Full access request flow
- Automatic connection creation with consultations
- Access level transitions
- Email notification triggers 