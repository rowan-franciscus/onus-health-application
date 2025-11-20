# 2. Repository Layout

## Repository Structure Type

This is a **monorepo** containing both frontend and backend code in a single Git repository. The structure follows a workspace-based organization with three main sub-projects:

- **`client/`** - React frontend application
- **`server/`** - Node.js/Express backend API
- **`common/`** - Shared utilities and validation schemas (intended for code reuse, though minimally used currently)

### Why a Monorepo?

This architecture enables:
- Coordinated changes across frontend and backend in a single commit
- Shared type definitions and validation logic (via `common/`)
- Unified version control and deployment configuration
- Simplified dependency management for the entire application

---

## Top-Level Directory Structure

```
onus-health-application/
├── client/                   # React frontend (SPA)
├── server/                   # Node.js/Express backend (API)
├── common/                   # Shared code (types, validation)
├── docs/                     # Documentation and fix logs
├── Handover/                 # Handover documentation for new engineers
├── node_modules/             # Root-level dependencies
├── package.json              # Root package.json for workspace scripts
├── package-lock.json         # Root dependency lock
├── render.yaml               # Render deployment configuration
├── .gitignore                # Git ignore rules
├── LICENSE                   # MIT License
├── README.md                 # Main project README
├── PROJECT_SPEC.md           # Original project specification
├── FEATURES.md               # Comprehensive feature list
├── ENV_TEMPLATE.md           # Environment variables template
├── HANDOVER_CONCISE.md       # Legacy concise handover (superseded by Handover/)
└── .git/                     # Git repository metadata (hidden)
```

---

## Detailed Folder Breakdown

### 1. `/client` - React Frontend

**Purpose**: Single-page application (SPA) serving patients, providers, and admins.

```
client/
├── public/                   # Static assets for Create React App
│   ├── index.html            # Root HTML file (React mounts here)
│   ├── manifest.json         # PWA manifest
│   ├── robots.txt            # Search engine instructions
│   ├── _redirects            # Render redirect rules (SPA routing)
│   └── logo-white.png        # Favicon/logo
├── build/                    # Production build output (generated, gitignored)
├── src/                      # Source code (details below)
├── node_modules/             # Frontend dependencies (gitignored)
├── package.json              # Frontend dependencies and scripts
├── package-lock.json         # Dependency lock file
└── jsconfig.json             # JavaScript configuration (path aliases, etc.)
```

#### `client/src/` Structure

```
src/
├── index.js                  # React entry point (ReactDOM.render)
├── App.js                    # Root component with React Router
├── assets/                   # Static assets (fonts, icons, images)
│   ├── fonts/                # DM Sans font files (.ttf) - locally hosted
│   ├── icons/                # SVG icons (30 files)
│   ├── images/               # Hero images, backgrounds
│   ├── logos/                # Onus branding (logo-white.png, onus-logo.svg)
│   └── patterns/             # Background patterns
├── components/               # Reusable React components (114 files)
│   ├── AuthInitializer.jsx   # Restores auth state on app load
│   ├── ProtectedRoute.jsx    # Route guard for authenticated pages
│   ├── SessionTimeout/       # Session timeout modal component
│   ├── common/               # Button, Input, Card, Table, Modal, etc.
│   ├── forms/                # Form components (Checkbox, Radio, FileUpload, ConsultationForm)
│   ├── layouts/              # Layout wrappers (AuthLayout, DashboardLayout, Sidebar, Header)
│   ├── medical-records/      # Medical record display components
│   └── patient/              # Patient-specific components
├── pages/                    # Page-level components (115 files)
│   ├── auth/                 # SignIn, SignUp, VerifyEmail, PasswordReset pages
│   ├── patient/              # Patient dashboard, consultations, medical records, connections
│   ├── provider/             # Provider dashboard, patients, consultations, onboarding
│   ├── admin/                # Admin dashboard, analytics, provider verification, user management
│   ├── shared/               # Shared pages (Help, PageNotFound, Maintenance)
│   └── test/                 # Test pages (development only)
├── services/                 # API service layer (Axios wrappers) - 12 files
│   ├── api.service.js        # Axios instance with interceptors
│   ├── auth.service.js       # Login, register, verify email
│   ├── consultation.service.js  # Consultation CRUD operations
│   ├── connection.service.js    # Patient-provider connections
│   ├── medicalRecord.service.js # Medical records API calls
│   ├── admin.service.js         # Admin analytics and user management
│   └── file.service.js          # File upload/download
├── store/                    # Redux store (5 files)
│   ├── index.js              # Store configuration
│   ├── slices/               # Redux slices (authSlice.js)
│   └── middleware/           # Custom middleware (sessionTimeout, authPersist)
├── contexts/                 # React Context API
│   └── AuthContext.js        # Authentication context (legacy, mostly superseded by Redux)
├── hooks/                    # Custom React hooks
│   └── useForm.js            # Form state management hook
├── utils/                    # Utility functions (5 files)
│   ├── dateUtils.js          # Date formatting helpers
│   ├── validation.js         # Client-side validation rules
│   ├── initials.js           # Generate user initials for avatars
│   ├── consultationExport.js # Export consultations to PDF
│   └── debugTools.js         # Development debugging utilities
├── config/                   # Configuration files (2 files)
│   ├── constants.js          # App-wide constants (API URLs, timeouts)
│   └── index.js              # Config exports
├── styles/                   # Global CSS (2 files)
│   ├── global.css            # Global styles
│   └── globals.css           # Additional global styles (possibly duplicate)
└── containers/               # Container components (empty - likely unused pattern)
```

**Key Files**:
- **`client/src/index.js`**: Mounts React app to `#root`, sets up Redux Provider and AuthInitializer
- **`client/src/App.js`**: Defines all routes (React Router v6) and role-based routing logic
- **`client/src/services/api.service.js`**: Axios instance with JWT token injection and session timeout handling
- **`client/package.json`**: Dependencies include React 18, Redux Toolkit, React Router, Formik, Yup, Axios, React Toastify

---

### 2. `/server` - Node.js/Express Backend

**Purpose**: RESTful API server handling authentication, database operations, file uploads, and email services.

```
server/
├── server.js                 # Express app entry point
├── config/                   # Configuration files
│   ├── environment.js        # Centralized environment variable management
│   ├── passport.js           # Passport.js strategies (JWT, Google, Facebook)
│   ├── testAccounts.js       # Test account definitions
│   └── sampleMedicalData.js  # Sample data for seeding
├── models/                   # Mongoose schemas (13 models)
│   ├── User.js               # User model (all roles: patient, provider, admin)
│   ├── Consultation.js       # Consultation model
│   ├── Connection.js         # Patient-provider connection model
│   ├── EmailQueue.js         # Email queue for async sending
│   ├── VitalsRecord.js       # Vitals medical record
│   ├── MedicationRecord.js   # Medications
│   ├── ImmunizationRecord.js # Immunizations
│   ├── LabResultRecord.js    # Lab results
│   ├── RadiologyReport.js    # Radiology reports
│   ├── HospitalRecord.js     # Hospital admissions
│   ├── SurgeryRecord.js      # Surgery records
│   ├── MedicalRecord.js      # Base medical record (abstract/shared fields)
│   └── index.js              # Model exports
├── controllers/              # Business logic and request handlers
│   ├── authController.js     # Registration, login, email verification, password reset
│   ├── user.controller.js    # User profile CRUD operations
│   ├── consultation.controller.js     # Consultation CRUD (full version)
│   ├── consultation.controller.simple.js  # Simplified consultation controller (legacy)
│   ├── connection.controller.js       # Patient-provider connection management
│   ├── admin.controller.js            # Admin analytics and user management
│   ├── providerController.js          # Provider-specific operations
│   ├── medicalRecord.controller.js    # Medical record aggregation queries
│   ├── baseMedicalRecord.controller.js  # Base controller for medical records
│   └── medicalRecords/                # Record-type-specific controllers (7 files)
│       ├── vitals.controller.js
│       ├── medications.controller.js
│       ├── immunizations.controller.js
│       ├── labResults.controller.js
│       ├── radiologyReports.controller.js
│       ├── hospitalRecords.controller.js
│       └── surgeryRecords.controller.js
├── routes/                   # Express route definitions (17 files)
│   ├── index.js              # Main router aggregator
│   ├── auth.routes.js        # /api/auth endpoints
│   ├── user.routes.js        # /api/users endpoints
│   ├── consultation.routes.js     # /api/consultations endpoints
│   ├── connection.routes.js       # /api/connections endpoints
│   ├── admin.routes.js            # /api/admin endpoints
│   ├── provider.routes.js         # /api/providers endpoints
│   ├── file.routes.js             # /api/files endpoints (upload/download)
│   ├── medicalRecord.routes.js    # /api/medical-records endpoints
│   ├── medicalRecords/            # Record-type routes (7 files)
│   │   ├── vitals.routes.js
│   │   ├── medications.routes.js
│   │   ├── immunizations.routes.js
│   │   ├── labResults.routes.js
│   │   ├── radiologyReports.routes.js
│   │   ├── hospitalRecords.routes.js
│   │   └── surgeryRecords.routes.js
│   └── api.md                     # API documentation
├── middleware/               # Express middleware
│   ├── auth.middleware.js    # JWT verification, RBAC, session timeout
│   ├── error.middleware.js   # Global error handling
│   ├── upload.middleware.js  # Multer file upload configuration
│   └── validation.middleware.js  # express-validator wrapper
├── services/                 # Business services
│   └── email.service.js      # Email sending (SendGrid + Nodemailer), queue processor
├── utils/                    # Utility functions (6 files)
│   ├── logger.js             # Winston logger configuration
│   ├── database.js           # MongoDB connection with retry logic
│   ├── connectionMonitor.js  # Database connection health monitoring
│   ├── dateUtils.js          # Date formatting and calculations
│   ├── templateRenderer.js   # Handlebars email template renderer
│   └── emailTester.js        # Email testing utilities
├── templates/                # Email templates
│   └── emails/               # Handlebars templates (17 files)
│       ├── emailVerification.html
│       ├── passwordReset.html
│       ├── providerVerificationApproval.html
│       ├── newConnection.html
│       ├── consultationNotification.html
│       └── ... (12 more)
├── scripts/                  # Utility and maintenance scripts (47 files)
│   ├── seed/                 # Database seeding scripts
│   │   ├── seedDatabase.js   # Create test accounts and sample data
│   │   └── resetTestData.js  # Remove test accounts
│   ├── test/                 # Test scripts (8 files)
│   │   ├── testDatabaseConnection.js
│   │   ├── testLoginEndpoint.js
│   │   ├── testEmailSending.js
│   │   └── ... (5 more)
│   ├── addAdminUser.js       # Create new admin account
│   ├── updateAdmin.js        # Update admin credentials
│   ├── fixAuthenticationIssues.js  # Fix authentication bugs
│   ├── cleanupOrphanedData.js      # Remove orphaned records
│   └── ... (30+ more maintenance scripts)
├── tests/                    # Jest test files
│   ├── setup.js              # Test setup (MongoDB Memory Server)
│   ├── auth.test.js          # Authentication tests
│   └── test-connection-flow.js    # Connection flow tests
├── docs/                     # Backend-specific documentation (6 files)
│   ├── TEST_ACCOUNTS.md      # Test account documentation
│   ├── EMAIL_FUNCTIONALITY.md     # Email system documentation
│   ├── ENV_CONFIG.md              # Environment variable guide
│   ├── ADMIN_AUTH_FIX.md          # Admin auth fixes
│   └── ... (2 more)
├── logs/                     # Winston log files (production)
│   ├── error.log             # Error-level logs
│   └── combined.log          # All logs
├── uploads/                  # File upload storage (gitignored)
│   ├── profile-images/       # User profile pictures
│   ├── licenses/             # Provider license documents
│   └── consultations/        # Consultation file attachments
├── node_modules/             # Backend dependencies (gitignored)
├── package.json              # Backend dependencies and scripts
├── package-lock.json         # Dependency lock file
├── check-users.js            # Quick script to check users in DB
├── test-auth.js              # Authentication testing script
├── AUTH_ISSUE_FIX.md         # Documentation for auth issue fixes
└── DATABASE_SIMPLIFIED.md    # Simplified database schema overview
```

**Key Files**:
- **`server/server.js`**: Express app initialization, middleware setup, route mounting, error handling
- **`server/config/environment.js`**: All environment variables with fallbacks and validation
- **`server/config/passport.js`**: Passport.js strategies (JWT, Google OAuth, Facebook OAuth)
- **`server/models/User.js`**: Central user model with role-specific subdocuments
- **`server/services/email.service.js`**: Email queue processor with retry logic
- **`server/middleware/auth.middleware.js`**: JWT verification, RBAC enforcement, patient access control
- **`server/package.json`**: Dependencies include Express, Mongoose, Passport, SendGrid, Multer, Winston, bcryptjs, jsonwebtoken

---

### 3. `/common` - Shared Code

**Purpose**: Shared utilities, types, and validation schemas intended for use by both client and server.

```
common/
├── index.js                  # Main export file
├── types/                    # Shared TypeScript-style type definitions (currently unused)
├── validation/               # Shared validation schemas (Yup) - currently unused
├── node_modules/             # Dependencies (gitignored)
├── package.json              # Dependencies: yup, date-fns
└── package-lock.json         # Dependency lock
```

**Note**: This folder appears to be set up for future code sharing but is **minimally used in practice**. Client and server currently have separate validation and utility implementations.

**Likely Reason**: The monorepo structure predates full integration of shared code. Future refactoring could consolidate validation logic here.

---

### 4. `/docs` - Documentation

**Purpose**: Project documentation, implementation guides, and fix logs.

```
docs/
├── README.md                 # Documentation index (if present)
├── DEVELOPMENT_SETUP.md      # Local development setup guide
├── RENDER_DEPLOYMENT.md      # Deployment instructions
├── TESTING_GUIDE.md          # Testing procedures
├── TROUBLESHOOTING.md        # Common issues and solutions
├── QUICK_START_TESTING.md    # Quick test guide
├── FEATURES_SUMMARY.md       # Feature overview
├── PATIENT_PROVIDER_CONNECTION_FLOW.md  # Connection flow documentation
├── EMAIL_VERIFICATION_ONBOARDING_FIX.md # Email verification fix
├── PASSWORD_RESET_IMPLEMENTATION.md     # Password reset feature
├── PROFILE_PICTURE_IMPLEMENTATION.md    # Profile picture feature
├── SESSION_TIMEOUT_IMPLEMENTATION.md    # Session timeout feature
├── FILE_UPLOAD_IMPLEMENTATION.md        # File upload feature
├── SEARCH_FILTER_IMPLEMENTATION.md      # Search/filter feature
├── DATABASE_CLEANUP.md                  # Database maintenance
├── ADMIN_USERS.md                       # Admin user management
├── SUPPORT_CONTACT.md                   # Support contact info
└── ... (20+ more fix and feature documentation files)
```

**Naming Pattern**: 
- `*_IMPLEMENTATION.md` - Feature implementation guides
- `*_FIX.md` / `*_FIX_V2.md` - Bug fix documentation with iterations
- `*.md` (uppercase) - General documentation

**Note**: This folder contains **historical development documentation**—helpful for understanding past decisions and fixes, but may include outdated information. Always verify against current code.

---

### 5. `/Handover` - New Engineer Handover Documentation

**Purpose**: Comprehensive handover documentation for new engineers (this folder you're reading now).

```
Handover/
├── 01-Project-Overview.md
├── 02-Repository-Layout.md        # (This document)
├── 03-Local-Development-Setup.md  # (To be created)
├── 04-Backend-Architecture.md     # (To be created)
└── ... (More to come)
```

**Note**: This folder is **newly created** to supersede `HANDOVER_CONCISE.md` with more detailed, structured documentation.

---

## Important Root-Level Files

### Configuration Files

| File | Purpose | Key Contents |
|------|---------|--------------|
| **`package.json`** | Root workspace configuration | Scripts: `install-all`, `dev`, `start`, `server`, `client`. Uses `concurrently` to run both client and server. |
| **`render.yaml`** | Render deployment configuration | Defines two services: `onus-backend` (Node web service) and `onus-frontend` (static site). Includes env var mappings. |
| **`.gitignore`** | Git ignore rules | Ignores: `node_modules/`, `.env*`, `server/uploads/`, `client/build/`, log files, IDE files. |
| **`ENV_TEMPLATE.md`** | Environment variable template | Documents all required env vars for local setup (MongoDB URI, JWT secrets, SendGrid key, etc.). Does NOT contain actual secrets. |
| **`jsconfig.json`** (client) | JavaScript config for VSCode/IDE | Path aliases, module resolution settings for React app. |

### Documentation Files

| File | Purpose | Notes |
|------|---------|-------|
| **`README.md`** | Main project README | Overview, tech stack, setup instructions, test accounts. Start here for quick orientation. |
| **`PROJECT_SPEC.md`** | Original project specification | Detailed requirements from project inception. Historical reference; some features evolved. |
| **`FEATURES.md`** | Comprehensive feature list | **Most up-to-date** feature documentation (~200+ features with checkmarks). Use this for feature verification. |
| **`HANDOVER_CONCISE.md`** | Legacy concise handover | Single-file handover (superseded by `Handover/` folder). May be deleted after full handover. |
| **`LICENSE`** | MIT License | Open-source license (MIT). Copyright 2025 rowan-franciscus. |

---

## Package.json Files

The repository has **four `package.json` files** (one per workspace):

### 1. Root `package.json`

**Location**: `/package.json`

**Purpose**: Workspace orchestration and unified scripts.

**Key Scripts**:
```json
{
  "start": "concurrently \"npm run server\" \"npm run client\"",
  "dev": "concurrently \"npm run server\" \"npm run client\"",
  "server": "npm start --prefix server",
  "client": "npm start --prefix client",
  "install-all": "npm install && npm install --prefix client && npm install --prefix server"
}
```

**Key Dependencies**:
- `concurrently`: Run client and server simultaneously in development
- `axios`: (Likely unused here; should be in client only)

**Usage**:
```bash
npm run install-all  # Install all dependencies (root, client, server)
npm run dev          # Start both client and server in parallel
```

---

### 2. Server `package.json`

**Location**: `/server/package.json`

**Purpose**: Backend dependencies and utility scripts.

**Key Scripts**:
```json
{
  "start": "node server.js",
  "dev": "nodemon server.js",
  "seed": "node scripts/seed/seedDatabase.js",
  "seed:reset": "node scripts/seed/resetTestData.js",
  "test": "jest --runInBand",
  "test:db": "node scripts/test/testDatabaseConnection.js",
  "test:login": "node scripts/test/testLoginEndpoint.js"
}
```

**Key Dependencies**:
- **Core**: `express`, `mongoose`, `dotenv`, `cors`
- **Auth**: `passport`, `passport-jwt`, `passport-google-oauth20`, `passport-facebook`, `jsonwebtoken`, `bcryptjs`
- **Email**: `@sendgrid/mail`, `nodemailer`, `handlebars`
- **Security**: `helmet`, `express-rate-limit`, `express-validator`
- **File Handling**: `multer`, `fs-extra`
- **Logging**: `winston`, `morgan`
- **Testing**: `jest`, `supertest`, `mongodb-memory-server`

**Dev Dependencies**: `nodemon` (auto-restart on file changes)

---

### 3. Client `package.json`

**Location**: `/client/package.json`

**Purpose**: Frontend dependencies and React scripts.

**Key Scripts**:
```json
{
  "start": "react-scripts start",
  "build": "react-scripts build",
  "test": "react-scripts test",
  "eject": "react-scripts eject"
}
```

**Key Dependencies**:
- **Core**: `react` (v18.2.0), `react-dom`, `react-router-dom` (v6.20.0)
- **State Management**: `@reduxjs/toolkit`, `react-redux`
- **Forms**: `formik`, `yup`
- **HTTP**: `axios`
- **UI**: `react-toastify`, `react-icons`, `classnames`
- **Utilities**: `date-fns`, `jwt-decode`, `jspdf`, `jspdf-autotable`

**Build Tool**: `react-scripts` (Create React App)

**Proxy**: `http://localhost:5001` (proxies API calls in development)

---

### 4. Common `package.json`

**Location**: `/common/package.json`

**Purpose**: Shared utilities (currently minimal).

**Dependencies**:
- `yup`: Validation schema library
- `date-fns`: Date utilities

**Note**: No scripts defined; currently just a placeholder for shared dependencies.

---

## .gitignore Highlights

The `.gitignore` file ensures sensitive and generated files are **not committed** to version control:

**Ignored Files/Folders**:
- **Dependencies**: `node_modules/` (all instances)
- **Environment Variables**: `.env`, `.env.*`, `server/.env`, `client/.env`
- **Build Artifacts**: `client/build/`, `dist/`
- **Logs**: `*.log`, `logs/`, `server/logs/`
- **Uploads**: `server/uploads/` (user-uploaded files)
- **IDE Files**: `.vscode/`, `.idea/`, `*.swp`
- **OS Files**: `.DS_Store`, `Thumbs.db`

**Important**: Environment variables are managed via Render dashboard in production (see [[memory:3993964]]).

---

## File Naming Conventions

### Backend Files
- **Models**: PascalCase (e.g., `User.js`, `MedicationRecord.js`)
- **Controllers**: camelCase with suffix (e.g., `authController.js`, `user.controller.js`)
- **Routes**: camelCase with suffix (e.g., `auth.routes.js`, `consultation.routes.js`)
- **Middleware**: camelCase with suffix (e.g., `auth.middleware.js`)
- **Utils**: camelCase (e.g., `logger.js`, `database.js`)
- **Scripts**: camelCase (e.g., `seedDatabase.js`, `fixAuthenticationIssues.js`)

### Frontend Files
- **Components**: PascalCase (e.g., `Button.jsx`, `SessionTimeout.jsx`)
- **Pages**: PascalCase (e.g., `PatientDashboard.jsx`, `AdminAnalytics.jsx`)
- **Services**: camelCase with suffix (e.g., `auth.service.js`, `api.service.js`)
- **Utilities**: camelCase (e.g., `dateUtils.js`, `validation.js`)
- **Styles**: Match component name (e.g., `Button.module.css` for `Button.jsx`)

### Documentation
- **Root Docs**: UPPERCASE (e.g., `README.md`, `FEATURES.md`)
- **Fix Docs**: UPPERCASE with suffix (e.g., `ADMIN_AUTH_FIX_V2.md`)
- **Handover**: Numbered prefix (e.g., `01-Project-Overview.md`)

---

## Navigating the Codebase

### Common Development Tasks and Where to Look

| Task | Starting Point |
|------|----------------|
| **Add a new API endpoint** | 1. Create route in `server/routes/`, 2. Add controller in `server/controllers/`, 3. Update frontend service in `client/src/services/` |
| **Add a new page** | 1. Create page component in `client/src/pages/{role}/`, 2. Add route in `client/src/App.js` |
| **Modify authentication logic** | `server/middleware/auth.middleware.js`, `server/config/passport.js` |
| **Change database schema** | `server/models/{ModelName}.js` |
| **Update email templates** | `server/templates/emails/{templateName}.html` |
| **Fix file upload issues** | `server/middleware/upload.middleware.js`, `server/routes/file.routes.js` |
| **Debug production deployment** | `render.yaml`, `docs/RENDER_DEPLOYMENT.md`, `server/config/environment.js` |
| **Run database seeding** | `npm run seed` (from `server/`) or see `server/scripts/seed/` |
| **View API documentation** | `server/routes/api.md` (basic overview; incomplete) |

---

## Monorepo Management

### Installing Dependencies

```bash
# Install all dependencies (root, client, server)
npm run install-all

# Or manually:
npm install           # Root dependencies
cd client && npm install
cd ../server && npm install
```

### Running the Application

```bash
# Development mode (both client and server)
npm run dev

# Or separately:
npm run server   # Backend only (port 5001)
npm run client   # Frontend only (port 3000)
```

### Deployment

Render automatically builds and deploys based on `render.yaml`:
- **Backend**: Runs `cd server && npm install && npm start`
- **Frontend**: Runs `cd client && npm install && npm run build`, serves static files

See `docs/RENDER_DEPLOYMENT.md` for full deployment guide.

---

## What's Missing or Unclear

### Not Present in This Repo

1. **`.env` files**: Not committed to Git (see `ENV_TEMPLATE.md` for structure)
2. **CI/CD configuration**: No GitHub Actions or CI pipeline (deployment via Render's Git integration)
3. **Docker/Containerization**: Not containerized; runs natively on Render
4. **API Documentation**: `server/routes/api.md` exists but is incomplete. Consider generating Swagger docs.
5. **End-to-End Tests**: Jest tests exist, but no E2E tests (Cypress, Playwright, etc.)
6. **Common Folder Usage**: Intended for shared code but currently minimally utilized

### Likely Handled Externally

- **Database Backups**: Managed via MongoDB Atlas dashboard
- **SSL Certificates**: Automatically provisioned by Render
- **CDN for Static Assets**: Not configured; static assets served directly from Render
- **Error Monitoring (Sentry)**: Mentioned in tech stack but not fully integrated in code

---

## Quick Navigation by Role

### For Frontend Developers
- **Start Here**: `client/src/App.js` (routing), `client/src/services/api.service.js` (API calls)
- **Components**: `client/src/components/` (reusable), `client/src/pages/` (page-level)
- **State Management**: `client/src/store/` (Redux)
- **Styling**: Component-specific `.module.css` files (CSS Modules)

### For Backend Developers
- **Start Here**: `server/server.js` (app initialization), `server/routes/index.js` (route aggregator)
- **API Logic**: `server/controllers/` (business logic), `server/models/` (data models)
- **Authentication**: `server/middleware/auth.middleware.js`, `server/config/passport.js`
- **Database**: `server/utils/database.js`, `server/models/`

### For DevOps/Deployment
- **Start Here**: `render.yaml`, `docs/RENDER_DEPLOYMENT.md`
- **Environment Config**: `server/config/environment.js`, `ENV_TEMPLATE.md`
- **Monitoring**: `server/utils/logger.js`, `server/utils/connectionMonitor.js`

### For QA/Testing
- **Test Accounts**: `server/config/testAccounts.js`, `server/docs/TEST_ACCOUNTS.md`
- **Seeding**: `npm run seed` (from `server/`), `server/scripts/seed/seedDatabase.js`
- **Test Scripts**: `server/tests/`, `server/scripts/test/`
- **Testing Guide**: `docs/TESTING_GUIDE.md`, `docs/QUICK_START_TESTING.md`

---

## Repository Metrics (Approximate)

- **Total Files**: ~600+ files (excluding node_modules, build artifacts)
- **Backend Files**: ~150 files (controllers, routes, models, scripts)
- **Frontend Files**: ~250 files (components, pages, services)
- **Documentation Files**: ~40+ markdown files
- **Lines of Code**: Estimated ~50,000+ LOC (across client and server)
- **Dependencies**: 
  - Root: 2 (concurrently, axios)
  - Server: 30+ production, 3 dev
  - Client: 20+ production
  - Common: 2

---

## Next Steps

Now that you understand the repository layout:

1. **Proceed to Local Development Setup** (`03-Local-Development-Setup.md`) to get the application running on your machine.
2. **Explore Key Files**: 
   - Read `server/server.js` to understand backend initialization
   - Read `client/src/App.js` to understand frontend routing
   - Read `server/models/User.js` to understand the user schema
3. **Run Database Seeding**: Execute `npm run seed` from `server/` to populate test data
4. **Review FEATURES.md**: Understand what features are implemented

---

**Document Version**: 1.0  
**Last Updated**: November 19, 2025  
**Previous Document**: [01-Project-Overview.md](./01-Project-Overview.md)  
**Next Document**: [03-Local-Development-Setup.md](./03-Local-Development-Setup.md)

