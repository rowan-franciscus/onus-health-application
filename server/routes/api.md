# Onus Health Application API Structure

## Base URL
All API endpoints are prefixed with `/api`

## Authentication Endpoints

### Register
- `POST /auth/register`
  - Description: Register a new user (patient or provider)
  - Body: `{email, password, firstName, lastName, title, phone, role}`
  - Response: `{success, message, user}`

### Login
- `POST /auth/login`
  - Description: Login with email and password
  - Body: `{email, password}`
  - Response: `{success, token, user}`

### Social Login
- `GET /auth/google`
  - Description: Authenticate with Google
- `GET /auth/google/callback`
  - Description: Google OAuth callback
- `GET /auth/facebook`
  - Description: Authenticate with Facebook
- `GET /auth/facebook/callback`
  - Description: Facebook OAuth callback

### Admin Login
- `POST /auth/admin/login`
  - Description: Admin specific login
  - Body: `{email, password}`
  - Response: `{success, token, user}`

### Email Verification
- `GET /auth/verify/:token`
  - Description: Verify email with token sent to user's email
  - Response: `{success, message}`

### Request Password Reset
- `POST /auth/password-reset-request`
  - Description: Request a password reset link
  - Body: `{email}`
  - Response: `{success, message}`

### Reset Password
- `POST /auth/password-reset/:token`
  - Description: Reset password with token
  - Body: `{password, confirmPassword}`
  - Response: `{success, message}`

### Refresh Token
- `POST /auth/refresh-token`
  - Description: Get a new access token using refresh token
  - Body: `{refreshToken}`
  - Response: `{success, token}`

## User Endpoints

### Profile Management
- `GET /users/me`
  - Description: Get current user profile
  - Response: `{success, user}`

- `PUT /users/me`
  - Description: Update current user profile
  - Body: Depends on user role (patient/provider/admin)
  - Response: `{success, user}`

- `DELETE /users/me`
  - Description: Delete current user account
  - Response: `{success, message}`

### Onboarding
- `POST /users/onboarding`
  - Description: Submit onboarding information
  - Body: Depends on user role (patient/provider)
  - Response: `{success, user}`

### Profile Image
- `POST /users/profile-image`
  - Description: Upload profile image
  - Body: Form data with image
  - Response: `{success, imageUrl}`

## Consultation Endpoints

### Patient Consultations
- `GET /consultations`
  - Description: Get all consultations for the current patient or by a provider
  - Query: `?patient=patientId&provider=providerId&status=draft&startDate=2023-01-01&endDate=2023-12-31`
  - Response: `{success, consultations}`

- `GET /consultations/:id`
  - Description: Get a specific consultation by ID
  - Response: `{success, consultation}`

### Provider Consultations
- `POST /consultations`
  - Description: Create a new consultation (provider only)
  - Body: `{patient, general: {specialistName, specialty, practice, reasonForVisit, notes}}`
  - Response: `{success, consultation}`

- `PUT /consultations/:id`
  - Description: Update a consultation (provider only)
  - Body: `{general: {specialistName, specialty, practice, reasonForVisit, notes}, status}`
  - Response: `{success, consultation}`

- `DELETE /consultations/:id`
  - Description: Delete a consultation (provider only)
  - Response: `{success, message}`

### Consultation Attachments
- `POST /consultations/:id/attachments`
  - Description: Upload attachment to consultation
  - Body: Form data with file
  - Response: `{success, attachment}`

- `DELETE /consultations/:id/attachments/:attachmentId`
  - Description: Delete attachment from consultation
  - Response: `{success, message}`

## Medical Record Endpoints

### Vitals
- `POST /consultations/:consultationId/vitals`
  - Description: Add vitals to a consultation
  - Body: Vitals data
  - Response: `{success, vitals}`

- `GET /consultations/:consultationId/vitals`
  - Description: Get vitals for a consultation
  - Response: `{success, vitals}`

- `PUT /consultations/:consultationId/vitals/:id`
  - Description: Update vitals
  - Body: Updated vitals data
  - Response: `{success, vitals}`

- `DELETE /consultations/:consultationId/vitals/:id`
  - Description: Delete vitals
  - Response: `{success, message}`

### Medications
- `POST /consultations/:consultationId/medications`
  - Description: Add medication to a consultation
  - Body: Medication data
  - Response: `{success, medication}`

- `GET /consultations/:consultationId/medications`
  - Description: Get medications for a consultation
  - Response: `{success, medications}`

- `PUT /consultations/:consultationId/medications/:id`
  - Description: Update medication
  - Body: Updated medication data
  - Response: `{success, medication}`

- `DELETE /consultations/:consultationId/medications/:id`
  - Description: Delete medication
  - Response: `{success, message}`

### Immunizations
- `POST /consultations/:consultationId/immunizations`
  - Description: Add immunization to a consultation
  - Body: Immunization data
  - Response: `{success, immunization}`

- `GET /consultations/:consultationId/immunizations`
  - Description: Get immunizations for a consultation
  - Response: `{success, immunizations}`

- `PUT /consultations/:consultationId/immunizations/:id`
  - Description: Update immunization
  - Body: Updated immunization data
  - Response: `{success, immunization}`

- `DELETE /consultations/:consultationId/immunizations/:id`
  - Description: Delete immunization
  - Response: `{success, message}`

### Lab Results
- `POST /consultations/:consultationId/lab-results`
  - Description: Add lab result to a consultation
  - Body: Lab result data
  - Response: `{success, labResult}`

- `GET /consultations/:consultationId/lab-results`
  - Description: Get lab results for a consultation
  - Response: `{success, labResults}`

- `PUT /consultations/:consultationId/lab-results/:id`
  - Description: Update lab result
  - Body: Updated lab result data
  - Response: `{success, labResult}`

- `DELETE /consultations/:consultationId/lab-results/:id`
  - Description: Delete lab result
  - Response: `{success, message}`

### Radiology Reports
- `POST /consultations/:consultationId/radiology-reports`
  - Description: Add radiology report to a consultation
  - Body: Radiology report data
  - Response: `{success, radiologyReport}`

- `GET /consultations/:consultationId/radiology-reports`
  - Description: Get radiology reports for a consultation
  - Response: `{success, radiologyReports}`

- `PUT /consultations/:consultationId/radiology-reports/:id`
  - Description: Update radiology report
  - Body: Updated radiology report data
  - Response: `{success, radiologyReport}`

- `DELETE /consultations/:consultationId/radiology-reports/:id`
  - Description: Delete radiology report
  - Response: `{success, message}`

### Hospital Records
- `POST /consultations/:consultationId/hospital-records`
  - Description: Add hospital record to a consultation
  - Body: Hospital record data
  - Response: `{success, hospitalRecord}`

- `GET /consultations/:consultationId/hospital-records`
  - Description: Get hospital records for a consultation
  - Response: `{success, hospitalRecords}`

- `PUT /consultations/:consultationId/hospital-records/:id`
  - Description: Update hospital record
  - Body: Updated hospital record data
  - Response: `{success, hospitalRecord}`

- `DELETE /consultations/:consultationId/hospital-records/:id`
  - Description: Delete hospital record
  - Response: `{success, message}`

### Surgery Records
- `POST /consultations/:consultationId/surgery-records`
  - Description: Add surgery record to a consultation
  - Body: Surgery record data
  - Response: `{success, surgeryRecord}`

- `GET /consultations/:consultationId/surgery-records`
  - Description: Get surgery records for a consultation
  - Response: `{success, surgeryRecords}`

- `PUT /consultations/:consultationId/surgery-records/:id`
  - Description: Update surgery record
  - Body: Updated surgery record data
  - Response: `{success, surgeryRecord}`

- `DELETE /consultations/:consultationId/surgery-records/:id`
  - Description: Delete surgery record
  - Response: `{success, message}`

## Medical Records Aggregate Endpoints

### Patient Medical Records
- `GET /medical-records/:type`
  - Description: Get all medical records of a specific type for the current patient
  - Query: `?startDate=2023-01-01&endDate=2023-12-31`
  - Type options: `vitals, medications, immunizations, lab-results, radiology-reports, hospital-records, surgery-records`
  - Response: `{success, records}`

## Connection Endpoints

### Provider Connections
- `POST /connections`
  - Description: Request connection with a patient (provider initiated)
  - Body: `{patientEmail}`
  - Response: `{success, connection}`

- `GET /connections`
  - Description: Get all connections (for current user)
  - Query: `?status=pending&role=patient`
  - Response: `{success, connections}`

- `GET /connections/:id`
  - Description: Get a specific connection by ID
  - Response: `{success, connection}`

### Patient Connection Management
- `PUT /connections/:id`
  - Description: Update connection status (approve/reject/revoke)
  - Body: `{status: "approved"|"rejected"|"revoked", permissions: {...}}`
  - Response: `{success, connection}`

- `DELETE /connections/:id`
  - Description: Delete a connection
  - Response: `{success, message}`

## Admin Endpoints

### User Management
- `GET /admin/users`
  - Description: Get all users (admin only)
  - Query: `?role=provider&status=pending&verified=false&page=1&limit=10`
  - Response: `{success, users, total, page, pages}`

- `GET /admin/users/:id`
  - Description: Get a specific user by ID (admin only)
  - Response: `{success, user}`

- `PUT /admin/users/:id`
  - Description: Update a user (admin only)
  - Body: User data updates
  - Response: `{success, user}`

- `DELETE /admin/users/:id`
  - Description: Delete a user (admin only)
  - Response: `{success, message}`

### Provider Verification
- `GET /admin/provider-verifications`
  - Description: Get all provider verification requests
  - Query: `?status=pending&page=1&limit=10`
  - Response: `{success, verifications, total, page, pages}`

- `PUT /admin/provider-verifications/:userId`
  - Description: Approve or reject provider verification
  - Body: `{status: "approved"|"rejected", notes}`
  - Response: `{success, verification}`

### Analytics
- `GET /admin/analytics`
  - Description: Get platform analytics
  - Query: `?startDate=2023-01-01&endDate=2023-12-31&metric=users|consultations|connections`
  - Response: `{success, data}`

- `GET /admin/analytics/dashboard`
  - Description: Get all dashboard analytics in one call
  - Query: `?startDate=2023-01-01&endDate=2023-12-31`
  - Response: `{success, totalUsers, activeUsers, totalConsultations, genderDistribution, ...}` 