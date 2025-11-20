# 1. Project Overview

## What This Application Does

**Onus Digital Health Record Application** is a secure, role-based web platform for managing electronic health records (EHRs). The platform enables patients to control and access their health data while allowing verified health providers to create consultations and manage medical records. Administrators oversee platform operations, verify health providers, and monitor analytics.

The application is built as a **desktop-first web application** (designed at 1400x800 px) that runs entirely in the browser—no mobile apps or desktop clients. It does **not** provide virtual consultation features (e.g., video calls); instead, consultations are structured data-entry forms that providers fill out after seeing patients in person or externally.

### Why It Exists

Onus was created to give patients ownership of their health data while enabling seamless, secure sharing with trusted health providers. It centralizes medical records that would otherwise be scattered across clinics, hospitals, and personal files.

---

## Primary User Roles

The application supports three distinct user roles, each with a dedicated interface and feature set:

### 1. **Patient**
- Register/login via email or social authentication (Google/Facebook)
- Complete a multi-step onboarding form to provide health background
- View and search consultations created by their providers
- View medical records organized by category (Vitals, Medications, Immunizations, Lab Results, Radiology, Hospital, Surgery)
- Manage connections with health providers:
  - Approve/reject provider access requests
  - Grant or revoke full access to medical history
  - View which providers have access and at what level (limited vs. full)
- Update profile, change password, delete account

### 2. **Health Provider (Clinician)**
- Register/login via email or social authentication
- Complete professional onboarding and submit credentials
- Wait for admin verification before accessing core features
- Once verified:
  - Create and manage consultations using an 8-tab multi-step form
  - Add patients by email and automatically create consultations
  - Upload consultation attachments (images, PDFs, documents)
  - View patients with connection status (limited vs. full access)
  - Request full access to patient records
  - Search and filter patient lists and consultations

### 3. **Admin**
- Secure, separate login route (`/admin/sign-in`)
- Verify or reject provider registration requests
- Manage all users (view, edit, delete patients and providers)
- View platform analytics with date-range filtering:
  - Total users, patients, providers, consultations
  - Gender distribution, average patient age
  - New users, active users, churn rate
- "View as" functionality to impersonate patient or provider views for debugging

See [User.js model](../server/models/User.js) for role-specific schema definitions.

---

## High-Level Architecture

The application follows a traditional **MERN stack** (MongoDB, Express.js, React, Node.js) architecture with clear separation between frontend and backend:

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT TIER                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  React Single-Page Application (SPA)                       │  │
│  │  - React 18, React Router, Redux                          │  │
│  │  - CSS Modules for styling                                │  │
│  │  - Axios for HTTP requests                                │  │
│  │  - Hosted: Render (Static Site)                           │  │
│  │  - Location: client/                                       │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTPS / JSON REST API
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                        SERVER TIER                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Node.js + Express.js REST API                            │  │
│  │  - JWT authentication (Passport.js)                       │  │
│  │  - OAuth 2.0 (Google, Facebook)                           │  │
│  │  - Role-based access control (RBAC)                       │  │
│  │  - Session timeout (30 minutes)                           │  │
│  │  - File uploads (Multer)                                  │  │
│  │  - Winston logging + Morgan HTTP logs                     │  │
│  │  - Hosted: Render (Web Service)                           │  │
│  │  - Location: server/                                       │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────────┘
                       │ Mongoose ODM
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                      DATABASE TIER                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  MongoDB Atlas (Cloud Database)                           │  │
│  │  - Shared cluster (cloud-hosted)                          │  │
│  │  - Collections: Users, Consultations, Connections,        │  │
│  │    MedicalRecords (7 types), EmailQueue                   │  │
│  │  - Indexed for performance                                │  │
│  │  - Connection: Mongoose with pooling                      │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                  EXTERNAL SERVICES                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  SendGrid (Primary Email Provider)                        │  │
│  │  - Transactional emails (verification, notifications)     │  │
│  │  - 14+ email templates (Handlebars)                       │  │
│  │  - Email queue with retry logic                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Nodemailer (Fallback Email Provider)                     │  │
│  │  - SMTP fallback if SendGrid fails                        │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Google OAuth 2.0 (Social Login)                          │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Facebook OAuth (Social Login)                            │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      FILE STORAGE                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Render Persistent Disk (/mnt/data in production)        │  │
│  │  - Profile pictures (PNG, JPG, JPEG, GIF - max 2MB)      │  │
│  │  - Provider licenses (PDF, PNG, JPG - max 5MB)           │  │
│  │  - Consultation attachments (Images, PDF, DOC - max 5MB) │  │
│  │  - Local: server/uploads/                                 │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Communication Flow

1. **User Authentication Flow**:
   - User submits credentials → Express validates → Passport authenticates → JWT issued
   - Frontend stores JWT (sessionStorage) and includes it in Authorization header for subsequent requests
   - Backend middleware (`auth.middleware.js`) validates JWT on protected routes

2. **Consultation Creation Flow** (Provider → Patient):
   - Provider fills 8-tab consultation form → POST `/api/consultations`
   - Backend creates Consultation document + linked medical record documents (Vitals, Medications, etc.)
   - Backend creates/updates Connection document (auto-grants limited access)
   - Email queued to notify patient → SendGrid sends email
   - Patient views consultation in their dashboard

3. **Access Control Flow** (Patient ↔ Provider):
   - Provider requests full access → Connection document updated (status: pending)
   - Patient receives email → approves/denies via UI → Connection updated
   - Provider's subsequent requests check Connection.accessLevel (limited/full) via middleware

4. **File Upload Flow**:
   - User uploads file → Multer middleware validates type/size
   - File stored in `/mnt/data/profile-images/` or `/consultations/`
   - File path stored in MongoDB document (e.g., `User.profileImage`)
   - Retrieval: Authenticated route `/api/files/:category/:filename` with JWT validation

---

## Technology Stack Summary

### Backend (`server/`)
| Technology | Purpose | Key Files/Folders |
|------------|---------|-------------------|
| **Node.js** | Runtime environment | `server/server.js` |
| **Express.js** | Web framework | `server/server.js`, `server/routes/` |
| **MongoDB Atlas** | Cloud database | Connection via `server/utils/database.js` |
| **Mongoose** | ODM for MongoDB | `server/models/` |
| **Passport.js** | Authentication (JWT, Google, Facebook) | `server/config/passport.js` |
| **bcryptjs** | Password hashing | `server/models/User.js` |
| **jsonwebtoken** | JWT creation/validation | `server/middleware/auth.middleware.js` |
| **SendGrid** | Primary email service | `server/services/email.service.js` |
| **Nodemailer** | Fallback email service | `server/services/email.service.js` |
| **Multer** | File upload handling | `server/middleware/upload.middleware.js` |
| **Winston** | Logging (file + console) | `server/utils/logger.js` |
| **Morgan** | HTTP request logging | `server/server.js` (line 151) |
| **Helmet** | Security headers | `server/server.js` (line 136) |
| **express-validator** | Input validation | `server/middleware/validation.middleware.js` |
| **express-rate-limit** | Rate limiting (auth endpoints) | Used in `server/routes/auth.routes.js` |

**Configuration**: `server/config/environment.js` centralizes all environment variables.

### Frontend (`client/`)
| Technology | Purpose | Key Files/Folders |
|------------|---------|-------------------|
| **React 18** | UI library | `client/src/` |
| **React Router** | Client-side routing | `client/src/App.js` |
| **Redux Toolkit** | State management | `client/src/store/` |
| **Axios** | HTTP client | `client/src/services/` (e.g., `api.js`) |
| **Formik** | Form management | Used in onboarding and consultation forms |
| **Yup** | Form validation | Used alongside Formik |
| **CSS Modules** | Component-scoped styling | `*.module.css` files throughout |
| **React Toastify** | Toast notifications | Configured in `client/src/index.js` |
| **DM Sans (local)** | Typography | `client/src/assets/*.ttf` |

**Build Tool**: Create React App (CRA) - see `client/package.json`.

### Hosting & Deployment
- **Platform**: Render (Platform-as-a-Service)
- **Configuration**: `render.yaml` in root defines two services:
  - `onus-backend` (Node.js web service) → `https://onus-backend.onrender.com`
  - `onus-frontend` (Static site) → `https://onus-frontend.onrender.com`
- **Environment Variables**: Managed via Render dashboard (see [[memory:3993964]])
- **Persistent Storage**: Render persistent disk at `/mnt/data` for file uploads (production)

See `docs/RENDER_DEPLOYMENT.md` for detailed deployment instructions.

### Shared Code
- **Location**: `common/` (shared types/validation between client and server)
- **Note**: This folder exists but appears minimally used in current implementation

---

## Third-Party Integrations

### 1. SendGrid (Primary Email Service)
- **Purpose**: Transactional emails (verification, password reset, notifications)
- **Configuration**: API key in `SENDGRID_API_KEY` env var
- **Templates**: 14+ Handlebars templates in `server/templates/emails/`
- **Queue System**: `EmailQueue` model stores emails, processor retries failed sends
- **Service File**: `server/services/email.service.js`

### 2. Nodemailer (Email Fallback)
- **Purpose**: SMTP fallback if SendGrid unavailable
- **Configuration**: SMTP settings in environment config
- **Usage**: Automatic fallback in email service

### 3. Google OAuth 2.0
- **Purpose**: Social login ("Sign in with Google")
- **Strategy**: `passport-google-oauth20`
- **Configuration**: `server/config/passport.js` (lines ~50-80)
- **Credentials**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` env vars

### 4. Facebook OAuth
- **Purpose**: Social login ("Sign in with Facebook")
- **Strategy**: `passport-facebook`
- **Configuration**: `server/config/passport.js` (lines ~80-110)
- **Credentials**: `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` env vars

### 5. MongoDB Atlas
- **Purpose**: Cloud-hosted MongoDB database
- **Connection**: `MONGODB_ATLAS_URI` env var (see [[memory:3196676]])
- **Management**: Web dashboard at mongodb.com
- **Connection File**: `server/utils/database.js`

### 6. Render
- **Purpose**: Application hosting (backend + frontend)
- **Configuration**: `render.yaml`, environment variables via dashboard
- **Regions**: Frankfurt (FRA) - closest to target users in Namibia

---

## Architecture Diagram (Text)

```
┌──────────────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                                │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  React SPA (client/)                                           │  │
│  │  - Pages: /sign-in, /consultations, /medical-records, etc.    │  │
│  │  - Components: Forms, Tables, Modals, File Uploads            │  │
│  │  - Redux Store: Auth state, user profile, session timeout     │  │
│  │  - Services: Axios calls to backend API                       │  │
│  └────────────────┬───────────────────────────────────────────────┘  │
└───────────────────┼──────────────────────────────────────────────────┘
                    │ REST API (HTTPS)
                    │ Authorization: Bearer <JWT>
                    │
┌───────────────────▼──────────────────────────────────────────────────┐
│                    EXPRESS.JS SERVER (server/)                        │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Middleware Pipeline                                           │  │
│  │  1. CORS (cors)                                                │  │
│  │  2. Body parsing (express.json)                               │  │
│  │  3. Security headers (helmet)                                 │  │
│  │  4. HTTP logging (morgan)                                     │  │
│  │  5. Passport initialization                                   │  │
│  │  6. Session timeout check (auth.middleware.js)                │  │
│  └────────────────┬───────────────────────────────────────────────┘  │
│                   │                                                   │
│  ┌────────────────▼───────────────────────────────────────────────┐  │
│  │  Routes (routes/)                                              │  │
│  │  - /api/auth → authController.js (register, login, verify)    │  │
│  │  - /api/users → user.controller.js (profile, update, delete)  │  │
│  │  - /api/consultations → consultation.controller.js            │  │
│  │  - /api/connections → connection.controller.js                │  │
│  │  - /api/medical-records → medicalRecord.controller.js         │  │
│  │  - /api/admin → admin.controller.js (analytics, verification) │  │
│  │  - /api/files → fileRoutes.js (upload, download, view)        │  │
│  └────────────────┬───────────────────────────────────────────────┘  │
│                   │                                                   │
│  ┌────────────────▼───────────────────────────────────────────────┐  │
│  │  Controllers (controllers/)                                    │  │
│  │  - Business logic, input validation                           │  │
│  │  - Call services for email, file operations                   │  │
│  │  - Query/update MongoDB via Mongoose models                   │  │
│  └────────────────┬───────────────────────────────────────────────┘  │
│                   │                                                   │
│  ┌────────────────▼───────────────────────────────────────────────┐  │
│  │  Models (models/)                                              │  │
│  │  - User, Consultation, Connection, EmailQueue                 │  │
│  │  - Medical Records: Vitals, Medication, Immunization,         │  │
│  │    LabResult, Radiology, Hospital, Surgery                    │  │
│  └────────────────┬───────────────────────────────────────────────┘  │
└───────────────────┼──────────────────────────────────────────────────┘
                    │ Mongoose queries
                    │
┌───────────────────▼──────────────────────────────────────────────────┐
│                    MONGODB ATLAS DATABASE                             │
│  Collections:                                                         │
│  - users (all roles: patient, provider, admin)                       │
│  - consultations (created by providers)                              │
│  - connections (patient ↔ provider relationships)                    │
│  - vitalsrecords, medicationrecords, immunizationrecords, ...        │
│  - emailqueues (pending/sent/failed emails)                          │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                                │
│  - SendGrid (email sending)                                           │
│  - Google OAuth (social login)                                        │
│  - Facebook OAuth (social login)                                      │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                      FILE STORAGE                                     │
│  Production: /mnt/data/profile-images/, /consultations/, /licenses/  │
│  Development: server/uploads/                                         │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### 1. **Role-Based Single User Model**
- All users (patients, providers, admins) share a single `User` model with `role` field
- Role-specific data stored in embedded subdocuments (`patientProfile`, `providerProfile`)
- **Rationale**: Simplifies authentication, social login integration, and profile management
- **See**: `server/models/User.js`

### 2. **Consultation-Centric Medical Records**
- Medical records (Vitals, Medications, etc.) are **not standalone**; they're always linked to a `Consultation`
- Each consultation can have multiple record types (1 Vitals record, multiple Medication records, etc.)
- **Rationale**: Maintains context of "when" and "by whom" data was recorded
- **See**: `server/models/Consultation.js`, `server/models/MedicationRecord.js`, etc.

### 3. **Two-Tier Access Control (Limited vs. Full)**
- **Limited Access** (default): Provider sees only consultations they created for a patient
- **Full Access** (patient-approved): Provider sees all patient consultations + medical records
- **Rationale**: Balances provider utility with patient privacy
- **See**: `server/models/Connection.js`, `server/middleware/auth.middleware.js`

### 4. **Email Queue with Retry Logic**
- Emails not sent immediately; they're queued in MongoDB (`EmailQueue` collection)
- Background processor runs every 60 seconds, retries failed emails with exponential backoff
- **Rationale**: Prevents email failures from blocking API responses; ensures delivery
- **See**: `server/services/email.service.js` (lines 400-600)

### 5. **Session Timeout (30 Minutes)**
- JWT tokens expire after 30 minutes
- Frontend shows modal at 28 minutes: "Extend session or logout?"
- **Rationale**: Security requirement for handling sensitive health data
- **See**: `server/middleware/auth.middleware.js`, `client/src/components/SessionTimeout/SessionTimeout.jsx`

### 6. **Monorepo Structure**
- Client, server, and shared code in one Git repository
- **Rationale**: Simplifies coordinated changes, version control, and deployment
- **Tradeoff**: Larger repo size, but manageable for team of this size

---

## Quick Reference: Important Files

| Purpose | File Path |
|---------|-----------|
| Server entry point | `server/server.js` |
| Environment config | `server/config/environment.js` |
| Database connection | `server/utils/database.js` |
| User model (all roles) | `server/models/User.js` |
| Consultation model | `server/models/Consultation.js` |
| Connection model (patient-provider) | `server/models/Connection.js` |
| Email service | `server/services/email.service.js` |
| Authentication middleware | `server/middleware/auth.middleware.js` |
| Passport config (OAuth) | `server/config/passport.js` |
| Client entry point | `client/src/index.js` |
| React router config | `client/src/App.js` |
| Redux store | `client/src/store/index.js` |
| API service (Axios) | `client/src/services/api.js` |
| Deployment config | `render.yaml` |
| Full feature list | `FEATURES.md` |
| Project spec | `PROJECT_SPEC.md` |

---

## What Makes This Codebase Different from Generic MERN Apps

1. **Domain-Specific Medical Record Types**: 7 different medical record schemas (Vitals, Medications, Immunizations, Lab Results, Radiology, Hospital, Surgery) with rich field definitions
2. **Three-Role System with Role-Switching**: Admins can "view as" patients/providers for debugging
3. **Complex Access Control**: Patient-provider connections with two-tier access levels and approval workflows
4. **Multi-Step Forms**: Patient onboarding (8 steps), Provider onboarding (7 steps), Consultation form (8 tabs)
5. **Email Queue System**: Not just "send and forget"; queued emails with retry logic, status tracking, and template rendering
6. **Consultation-as-Container**: Medical records don't exist independently; they're always part of a consultation context
7. **Admin Verification Workflow**: Providers can't access core features until admin manually approves their credentials
8. **Persistent File Storage**: Production uses Render persistent disk (`/mnt/data`) instead of ephemeral filesystem

---

## Next Steps for New Engineer

After reading this document, proceed to:
1. **Repository Layout** (`02-Repository-Layout.md`) - Understand folder structure and file organization
2. **Local Development Setup** (`03-Local-Development-Setup.md`) - Get the app running on your machine
3. **Backend Architecture** (`04-Backend-Architecture.md`) - Deep dive into API design, controllers, models

---

**Document Version**: 1.0  
**Last Updated**: November 19, 2025
**Next Document**: [02-Repository-Layout.md](./02-Repository-Layout.md)

