# Onus Digital Health Record Application

> **Tech Stack:** Full Stack MERN (MongoDB, Express.js, React, Node.js)

## 📌 Overview
Onus is a secure, role-based web platform for managing electronic health records (EHRs). It allows patients to access and control their health data while enabling verified health providers to manage medical consultations and health records. Admins oversee platform activity and user verifications.

## 🧩 Key Features

### 🧍 Patients
- Register/login via email or social login (Google/Facebook)
- Complete a detailed onboarding form
- View consultations and structured medical records (Vitals, Medications, etc.)
- Approve or reject provider access requests
- Manage profile and connected health providers
- Edit account details and delete account

### 🧑‍⚕️ Health Providers
- Register/login via email or social login
- Submit onboarding info and await admin approval
- Create and manage consultations with multi-tab record input
- Add patients using email (auto-consultation initiation)
- Upload consultation files
- View patients and their shared data

### 👩‍💼 Admin
- Secure admin login via a separate route (`/admin/sign-in`)
- View and manage all users
- Approve or reject provider verifications
- View platform analytics and user metrics

## 🔐 Security Features
- JWT + OAuth 2.0 (Passport.js)
- Role-based access control (RBAC)
- Session timeout after 30 minutes
- Secure file uploads, validation, logging, backups, and SSL

## 📄 Medical Record Categories
- **General:** Visit details and specialist info
- **Vitals:** Heart rate, blood pressure, BMI, etc.
- **Medications:** Name, dosage, duration
- **Immunizations:** Dates, serial numbers
- **Lab Results, Radiology, Hospital, Surgery:** Structured, detailed input fields

## 📊 Admin Dashboard Metrics
- Total & active users
- Gender distribution
- Consultations created
- Churn and user growth rate

## 🚀 Pages & Routing
Includes routes for Patients, Providers, and Admins such as:
- `/sign-in`, `/sign-up`, `/admin/sign-in`
- `/consultations`, `/add-new-consultation`
- `/medical-records`, `/profile`, `/settings`
- `/analytics`, `/health-providers`, `/patients`

## ⚙️ Tech Stack & Tools
- **Frontend:** React, CSS Modules, React Router
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (hosted on MongoDB Atlas)
- **Hosting:** Render
- **Email Service:** SendGrid
- **Others:** Multer (file uploads), Bcrypt (password hashing), Sentry & Morgan (monitoring/logging)

## 🧪 Test Accounts
- Admin: `admin.test@email.com` / `password@123`
- Patient: `patient.test@email.com` / `password@123`
- Provider: `provider.test@email.com` / `password@123`

### Test Data Setup

The application includes seed scripts to populate the database with test accounts and sample medical data:

```bash
# Navigate to the server directory
cd server

# Seed the database with test accounts and sample data
npm run seed

# Reset test data (removes all test accounts and their data)
npm run seed:reset
```

For detailed information about test accounts and sample data, see `server/docs/TEST_ACCOUNTS.md`.

## 📥 Setup Instructions
1. Clone the repo and install dependencies:
   ```bash
   git clone https://github.com/yourusername/onus-health-application.git
   cd onus-health-application
   npm run install-all
   ```

2. Configure environment variables:
   - Create a `.env` file in the server directory
   - Set MongoDB URI, JWT secrets, SendGrid keys, etc.

3. Seed the database with test accounts:
   ```bash
   cd server
   npm run seed
   ```

4. Start the application:
   ```bash
   # From the root directory
   npm run dev
   ```

## 📬 Contact
Email configuration used: `rowan.franciscus.10@gmail.com`

---

For a full breakdown, see `PROJECT_SPEC.md`.
