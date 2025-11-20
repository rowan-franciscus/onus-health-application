# Onus EHR Application - Engineering Handover

*Last Updated: November 2025*

---

## 1. Project Snapshot

- **What it does**: Secure web platform for managing electronic health records (EHRs). Patients own and control their health data; providers create consultations and manage medical records; admins oversee platform users and verifications.

- **User roles**: 
  - **Patients**: View consultations/records, manage provider access, control who sees their data
  - **Providers**: Create consultations with structured medical records (vitals, meds, labs, etc.), request patient access
  - **Admins**: Verify providers, view analytics, manage all users

- **Business goal**: Enable patients to centralize health data and selectively grant access to verified providers, while providers can manage and document patient consultations.

---

## 2. High-Level Architecture

**Data Flow**:
```
Frontend (React SPA) → Backend API (Express/Node) → MongoDB Atlas
                    ↓
            Email Service (SendGrid)
            File Storage (Render persistent disk)
```

- **Frontend**: React single-page app hosted on Render as static site
- **Backend**: Express REST API hosted on Render (Node service)
- **Database**: MongoDB Atlas (cloud-hosted, no local DB)
- **Email**: SendGrid for transactional emails (verification, password reset, notifications)
- **File uploads**: Stored locally in `server/uploads/` (consultation attachments, profile pictures) / Render Persistent Disk

---

## 3. Tech Stack & Key Libraries

### Backend
- **Runtime**: Node.js (Express.js)
- **Database**: Mongoose (MongoDB ODM)
- **Auth**: 
  - JWT tokens (`jsonwebtoken`) for stateless sessions
  - Passport.js (JWT strategy + Partially Google/Facebook OAuth)
  - bcryptjs for password hashing
- **Validation**: `express-validator`
- **File uploads**: Multer
- **Email**: SendGrid (`@sendgrid/mail`), Handlebars for templates
- **Security**: Helmet, CORS, express-rate-limit
- **Logging**: Winston + Morgan

### Frontend
- **Framework**: React 18
- **Routing**: React Router v6
- **State management**: Redux Toolkit (`@reduxjs/toolkit`)
- **Forms**: Formik + Yup validation
- **HTTP client**: Axios
- **UI**: CSS Modules, React Icons
- **Auth**: JWT stored in localStorage, decoded with `jwt-decode`

### Development Tools
- **Concurrently**: Run frontend + backend simultaneously
- **Nodemon**: Backend hot reload
- **Jest + Supertest**: Backend testing

---

## 4. Local Development Quickstart

### Prerequisites
- Node.js v16+
- MongoDB Atlas connection string (no local MongoDB)

### Environment Variables

**Critical backend vars** (`server/.env`):
- `MONGODB_ATLAS_URI`: MongoDB connection string
- `JWT_SECRET` / `JWT_REFRESH_SECRET`: Token signing secrets
- `SENDGRID_API_KEY`: Email service key
- `FRONTEND_URL`: `http://localhost:3000` (for CORS + email links)
- `PORT`: `5001` (backend port)

**Critical frontend vars** (`client/.env` or inline in code):
- `REACT_APP_API_URL`: `http://localhost:5001/api`

See `ENV_TEMPLATE.md` for full list.

### Commands

```bash
# Install all dependencies (root, client, server)
npm run install-all

# Run backend + frontend concurrently
npm run dev
# OR run individually:
# cd server && npm run dev (nodemon on port 5001)
# cd client && npm start (port 3000)

# Seed test accounts and data
cd server && npm run seed
```

**Default ports**:
- Frontend: `3000`
- Backend: `5001`

**Test accounts** (after seeding):
- Admin: `admin.test@email.com` / `password@123`
- Provider: `provider.test@email.com` / `password@123`
- Patient: `patient.test@email.com` / `password@123`

---

## 5. Backend Overview

### Entry Point & Structure

- **Entry**: `server/server.js` – Configures Express, connects to MongoDB, starts server
- **Key directories**:
  - `routes/`: API endpoints (auth, user, consultation, medical records, admin, etc.)
  - `controllers/`: Business logic for each route domain
  - `models/`: Mongoose schemas (User, Consultation, Connection, medical record types)
  - `middleware/`: Auth (JWT, role checks), validation, error handling, file uploads
  - `services/`: Email service with queue processing
  - `config/`: Environment config, Passport strategies
  - `utils/`: Logger, database connection, helpers
  - `scripts/`: DB seed scripts, maintenance utilities

### Auth & Roles

- **Auth mechanism**: JWT tokens (access + refresh), 7d expiry by default
- **Session timeout**: 30 minutes (enforced by middleware)
- **Auth middleware** (`middleware/auth.middleware.js`):
  - `authenticateJWT`: Passport JWT validation
  - `isAdmin`, `isProvider`, `isPatient`: Role-based guards
  - `isVerifiedProvider`: Provider must be admin-approved
  - `sessionTimeout`: Checks token age
- **Roles**: Embedded in JWT payload and `User.role` field (`patient`, `provider`, `admin`)
- **Provider verification**: Providers must be verified by admin before full access

### Core Models (Most Important)

- **User** (`models/User.js`):
  - Single user model with embedded role-specific profiles: `patientProfile`, `providerProfile`, `adminProfile`
  - Fields: email, password, role, firstName, lastName, isEmailVerified, isProfileCompleted, profileImage
  - Methods: `comparePassword()`, `generateAuthToken()`, `generateRefreshToken()`

- **Consultation** (`models/Consultation.js`):
  - Links patient + provider, stores general consultation info
  - References to medical records (vitals, medications, labs, etc.) via ObjectId arrays
  - Fields: patient (ref), provider (ref), date, general (specialist, specialty, reason, notes), status (draft/completed)
  - Attachments array for file uploads

- **Connection** (`models/Connection.js`):
  - Represents patient-provider relationship
  - Fields: patient (ref), provider (ref), accessLevel (limited/full), fullAccessStatus (pending/approved/denied)
  - Methods: `requestFullAccess()`, `approveFullAccess()`, `revokeAccess()`

- **Medical Record Models**:
  - `VitalsRecord`, `MedicationRecord`, `ImmunizationRecord`, `LabResultRecord`, `RadiologyReport`, `HospitalRecord`, `SurgeryRecord`
  - Each references a consultation and patient
  - Contain structured fields per medical record type (e.g., heart rate, blood pressure for vitals)

### Routing Structure

Routes are organized in `server/routes/`:
- `auth.routes.js`: Registration, login (patient/provider/admin), password reset, email verification, OAuth callbacks
- `user.routes.js`: User profile CRUD, onboarding submission
- `consultation.routes.js`: Create, update, view consultations; file uploads
- `connection.routes.js`: Patient-provider connection requests, approval/denial
- `medicalRecord.routes.js` + `medicalRecords/*.routes.js`: CRUD for each medical record type
- `admin.routes.js`: User management, provider verification, analytics
- `provider.routes.js`: Provider-specific endpoints (patients list, consultation management)

---

## 6. Frontend Overview

### Structure

- **Entry**: `client/src/index.js` → renders `App.js`
- **Routing**: `client/src/App.js` – Defines all routes with React Router v6, lazy-loads pages
- **Layouts**:
  - `AuthLayout`: For sign-in/sign-up pages (no sidebar)
  - `DashboardLayout`: Main app layout with 250px fixed sidebar + main content area
- **Key directories**:
  - `pages/`: Organized by role (`patient/`, `provider/`, `admin/`, `auth/`, `shared/`)
  - `components/`: Reusable UI components (forms, buttons, modals, tables, etc.)
  - `services/`: API client code (axios wrappers for auth, user, consultation, etc.)
  - `store/`: Redux Toolkit slices (`authSlice`, user state)
  - `contexts/`: `AuthContext` for auth state management
  - `styles/`: Global CSS
  - `utils/`: Helper functions

### State & API Calls

- **Global state**: Redux Toolkit for auth state (`store/slices/authSlice.js`)
  - Stores: `isAuthenticated`, `user`, `loading`, session timeout flags
  - Actions: `loginUser`, `registerUser`, `logout`, `updateUser`, etc.
- **API client**: Services in `client/src/services/` (e.g., `auth.service.js`, `consultation.service.js`)
  - Axios instances with base URL from config
  - Automatically attach JWT token from localStorage to requests
- **Auth token storage**: `localStorage.getItem('onus_auth_token')`

### Key Screens / Flows

**Patient**:
- Consultations list: `pages/patient/Consultations.jsx`
- View consultation: `pages/patient/ViewConsultation.jsx`
- Medical records by type: `pages/patient/medical-records/*.jsx` (Vitals, Medications, etc.)
- Manage connections: `pages/patient/Connections.jsx` (approve/reject provider requests)

**Provider**:
- Patients list: `pages/provider/Patients.jsx`
- Add consultation: `pages/provider/AddConsultation.jsx` (multi-tab form for different record types)
- View patient: `pages/provider/ViewPatient.jsx`

**Admin**:
- Dashboard/Analytics: `pages/admin/Dashboard.jsx`
- Provider verification: `pages/admin/HealthProviders.jsx`, `ViewProviderRequest.jsx`
- Patient management: `pages/admin/Patients.jsx`, `ViewPatient.jsx`

---

## 7. Core Business Flows (High Level)

### Flow 1: Provider Creates Consultation for Patient

1. **Provider**: Logs in → navigates to "Add Patient" or "Add Consultation"
2. **Add patient by email**: `pages/provider/AddPatient.jsx` → calls `POST /api/provider/patients` → Creates Connection (limited access) + starts draft Consultation
3. **Fill consultation form**: Multi-tab form in `pages/provider/AddConsultation.jsx` (General, Vitals, Meds, Labs, etc.)
4. **Backend**: `controllers/consultation.controller.js` → Creates Consultation doc + associated medical record docs → Saves file attachments
5. **Email notification**: Patient receives email (via `services/email.service.js`) about new consultation
6. **Patient**: Views consultation in `pages/patient/Consultations.jsx`

**Key files**:
- Frontend: `pages/provider/AddConsultation.jsx`, `services/consultation.service.js`
- Backend: `routes/consultation.routes.js`, `controllers/consultation.controller.js`, `models/Consultation.js`

### Flow 2: Patient Approves Provider Access Request

1. **Provider requests full access**: From patient view, clicks "Request Full Access"
2. **Backend**: `POST /api/connections/:id/request-full-access` → Updates Connection `fullAccessStatus` to `pending`
3. **Patient notification**: Email sent to patient
4. **Patient**: Navigates to "Connections" page (`pages/patient/Connections.jsx`) → sees pending requests
5. **Approve/Deny**: Clicks button → `PUT /api/connections/:id/approve` or `/deny`
6. **Backend**: `controllers/connection.controller.js` → Updates Connection `accessLevel` to `full` if approved
7. **Provider notification**: Email sent confirming access granted

**Key files**:
- Frontend: `pages/patient/Connections.jsx`, `services/connection.service.js`
- Backend: `routes/connection.routes.js`, `controllers/connection.controller.js`, `models/Connection.js`

### Flow 3: New User Registration & Onboarding

1. **User**: Visits `/sign-up` (`pages/auth/SignUp.jsx`) → enters email, password, role
2. **Backend**: `POST /api/auth/register` → Creates User doc with `isEmailVerified: false`
3. **Email sent**: Verification link to user's email
4. **User clicks link**: `GET /api/auth/verify-email/:token` → Sets `isEmailVerified: true`
5. **Redirect to onboarding**: Frontend redirects based on role to `/patient/onboarding` or `/provider/onboarding`
6. **Onboarding forms**: Multi-step form collecting profile data
7. **Submit**: `PUT /api/users/onboarding` → Updates User with profile data, sets `isProfileCompleted: true`
8. **Provider only**: If provider, admin must approve (`providerProfile.isVerified`) before full access

**Key files**:
- Frontend: `pages/auth/SignUp.jsx`, `pages/patient/Onboarding.jsx`, `pages/provider/Onboarding.jsx`
- Backend: `routes/auth.routes.js`, `controllers/authController.js`, `routes/user.routes.js`, `controllers/user.controller.js`

### Flow 4: Admin Verifies Provider

1. **Admin**: Logs in via `/admin/sign-in` → Dashboard (`pages/admin/Dashboard.jsx`)
2. **View pending providers**: "Health Providers" → "Pending Verification" tab
3. **View request**: Clicks on provider → `pages/admin/ViewProviderRequest.jsx` shows onboarding data
4. **Approve/Reject**: Clicks button → `PUT /api/admin/providers/:id/verify` or `/reject`
5. **Backend**: `controllers/admin.controller.js` → Updates `providerProfile.isVerified: true`
6. **Email sent**: Provider receives approval email with sign-in link

**Key files**:
- Frontend: `pages/admin/HealthProviders.jsx`, `pages/admin/ViewProviderRequest.jsx`
- Backend: `routes/admin.routes.js`, `controllers/admin.controller.js`

---

## 8. Environments & Deployment

### Hosting
- **Backend**: Render web service (Node runtime) – `onus-backend` on Render
- **Frontend**: Render static site – `onus-frontend` on Render
- **Database**: MongoDB Atlas (cloud-hosted)

### Deployment
- **Config**: `render.yaml` defines both services (backend + frontend)
- **CI/CD**: Manual deployment via Render dashboard (connect to GitHub repo, auto-deploy on push to main)
- **Build commands**:
  - Backend: `cd server && npm install` → `npm start`
  - Frontend: `cd client && npm install && npm run build` → serves `client/build/`

### Environment URLs
- Production backend: `https://onus-backend.onrender.com`
- Production frontend: `https://onus-frontend.onrender.com`
- Environment variables set in Render dashboard (not committed to repo)

### Known Deployment Notes
- Environment variables managed via Render dashboard (see `render.yaml` for list)
- `.env` files **not committed** to repo (per user memory)
- File uploads stored locally in `server/uploads/` (ephemeral storage on Render – need to check and make sure that Render persistent storage is used when app is connected to subdomain - app.onus.health)

---

## 9. Known Attention Areas

**Critical areas to understand early**:

1. **Auth flow complexity** (`server/middleware/auth.middleware.js`, `client/src/store/slices/authSlice.js`):
   - JWT token lifecycle, session timeout logic, role-based guards
   - Provider verification status impacts access to many routes

2. **Consultation creation** (`server/controllers/consultation.controller.js`):
   - Multi-step form with references to multiple medical record models
   - Draft vs. completed status, file attachment handling

3. **Connection model** (`server/models/Connection.js`):
   - Patient-provider relationships, access levels (limited vs. full), approval workflow
   - Critical for data access control

4. **Provider verification state**:
   - Providers can't access full features until `providerProfile.isVerified: true`
   - Frontend conditionally renders based on verification status

5. **File upload security** (`server/middleware/upload.middleware.js`):
   - Multer config, file type validation, size limits
   - CORS issues with file serving (see helmet config in `server.js`)

6. **Email service** (`server/services/email.service.js`):
   - Uses SendGrid with Handlebars templates in `server/templates/emails/`
   - Email queue processing for async sending

7. **Session timeout** (`client/src/components/SessionTimeout.jsx`, backend middleware):
   - 30-minute timeout enforced on both frontend and backend
   - Token expiry vs. session timeout (two separate checks)

8. **Redux state management** (`client/src/store/`):
   - Auth state, onboarding completion flags, session timeout handling
   - State persistence via localStorage

9. **Test accounts auto-fix** (`server/models/User.js` line 280):
   - Development mode auto-fixes test account passwords on startup
   - Useful for local dev, should be understood if modifying auth logic

10. **Medical record types** (multiple models in `server/models/`):
    - Each record type is a separate model with references back to Consultation and Patient
    - Adding new record types requires: new model, new routes, new controller, frontend forms

**TODO/FIXME hotspots**: Check `docs/` folder for detailed fix documentation – many edge cases around consultation save/draft, email verification redirects, profile picture caching, etc. (See files like `CONSULTATION_DRAFT_FIX.md`, `EMAIL_VERIFICATION_REDIRECT_FIX.md`)

---

## Quick Reference

- **Docs folder**: `docs/` has detailed feature implementation docs and troubleshooting guides
- **Test scripts**: `server/scripts/` for DB seeding, cleanup, maintenance
- **Logging**: Winston logs in `server/logs/` (combined.log, error.log)

---

