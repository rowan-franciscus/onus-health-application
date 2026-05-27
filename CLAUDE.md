# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development

```bash
# Install all dependencies (root + client + server)
npm run install-all

# Run both client and server concurrently (from root)
npm run dev

# Run server only (uses nodemon)
npm run server

# Run client only
npm run client
```

### Server-specific (run from `server/` or use `--prefix server`)

```bash
# Run server tests (Jest, in-band)
cd server && npm test

# Seed database with test accounts and sample data
cd server && npm run seed

# Reset test data
cd server && npm run seed:reset
```

### Client-specific

```bash
# Build for production
cd client && npm run build

# Run client tests
cd client && npm test
```

## Architecture

This is a MERN stack monorepo with three packages: `server/` (Express + Node.js), `client/` (React), and `common/` (shared utilities). The client proxies API calls to `http://localhost:5001` in development.

### Four-role access model

Every request flows through RBAC with four roles: `patient`, `provider`, `admin`, and `practice_admin`. The `role` field on the `User` model gates access at the route level via middleware in `server/middleware/auth.middleware.js`. Admins authenticate via a separate route (`/admin/sign-in`), which calls a separate login endpoint. Provider accounts require admin approval before becoming active. Practice Admins are invited by a provider via the Team page and must accept the email invite before they can log in; they are scoped to a single `Practice` and are strictly blocked from clinical data (notes, vitals, findings) at the API level.

### Authentication flow

- **JWT-based**: Access tokens stored in `localStorage` under the key from `client/src/config` (`config.tokenKey`). The `authSlice` (`client/src/store/slices/authSlice.js`) manages auth state in Redux.
- **AuthContext** (`client/src/contexts/AuthContext.js`) wraps the app and manages the 30-minute client-side session timeout via `setTimeout`, resetting on user activity events.
- **Server session timeout** is also enforced in `server/middleware/auth.middleware.js`.
- **Social auth** (Google/Facebook) uses Passport.js strategies configured in `server/config/passport.js`.

### Data model relationships

- `Connection` links a patient to a provider with `accessLevel` (`limited` | `full`) and `fullAccessStatus` (`pending` | `approved` | `denied`). Providers initiate connections by adding patients via email.
- `Consultation` references both a `patient` and `provider` User, plus optional embedded medical record ObjectIds across 8 specialized collections: `Vitals`, `Medication`, `Immunization`, `LabResult`, `RadiologyReport`, `HospitalRecord`, `SurgeryRecord`, `MedicalRecord` (general). It also carries a `billingStatus` (`pending` | `processed` | `submitted`) used by the operational Billing module — pure metadata, never affects clinical fields.
- Medical records are stored in separate collections and referenced by `Consultation`, not embedded.
- `Practice` is an additive grouping over providers (owner + members + admins). It does not replace `Connection`: provider↔patient links remain direct. Practice Admins query "patients of any provider in my Practice" by joining `Practice.members` → `Connection`. Each provider has an optional `providerProfile.practiceId`; Practice Admins have a required `practiceAdminProfile.practiceId` plus `status` (`pending` | `active` | `revoked`).

### Server structure

```
server/
  config/       # environment.js (config object), passport.js (OAuth strategies)
  controllers/  # One controller per domain (auth, user, consultation, admin, provider, connection, medicalRecords/)
  middleware/   # auth.middleware.js (JWT auth, RBAC, rate limiting, session timeout)
  models/       # Mongoose schemas (User, Consultation, Connection, medical record types)
  routes/       # Routes mounted at /api/* via routes/index.js
  services/     # email.service.js (SendGrid + EmailQueue model), other domain services
  utils/        # logger (Winston), database, connectionMonitor, dateUtils
  templates/    # Handlebars email templates
```

The server runs on port **5001**. All API routes are prefixed `/api/`.

### Client structure

```
client/src/
  store/slices/   # authSlice.js — only Redux slice; all other state is local/context
  contexts/       # AuthContext.js — session management, user loading
  services/       # API service files (one per domain, using axios)
  pages/          # Organized by role: admin/, patient/, provider/, practiceAdmin/, auth/, shared/
  components/     # Shared UI components (ProtectedRoute, DashboardLayout, etc.)
  config/         # API URL, token keys, session timeout constants
```

All pages are lazy-loaded. The `ProtectedRoute` component checks role against the current user from Redux to guard routes.

### Email

Email is sent via SendGrid (`@sendgrid/mail`). Emails are queued in the `EmailQueue` MongoDB collection and processed by a background job started in `server.js` (`emailService.startEmailQueueProcessor()`). Templates are Handlebars files in `server/templates/`.

### Environment variables

See `ENV_TEMPLATE.md` for the full list. Key variables for local dev in `server/.env`:
- `MONGODB_ATLAS_URI` — MongoDB Atlas connection string (database name `onus-health`)
- `JWT_SECRET` and `JWT_REFRESH_SECRET`
- `SENDGRID_API_KEY`, `EMAIL_FROM`
- `FRONTEND_URL=http://localhost:3000`
- `PORT=5001`

Client needs `client/.env`:
- `REACT_APP_API_URL=http://localhost:5001/api`

### Deployment

Hosted on Render. Configuration in `render.yaml`. Production requires `NODE_ENV=production` and all env vars set in the Render dashboard.

## Test accounts

- Admin: `admin.test@email.com` / `password@123`
- Patient: `patient.test@email.com` / `password@123`
- Provider: `provider.test@email.com` / `password@123`
- Practice Admin: `practice_admin.test@email.com` / `password@123` (linked to `provider.test`'s Practice)

Run `cd server && npm run seed` to create these in the database.
