# 4. Backend Architecture (Node.js / Express)

This document explains the backend architecture of the Onus Health Application, built with Node.js and Express.js following a layered MVC-style pattern with clear separation of concerns.

---

## Architecture Overview

The backend follows a **traditional Express.js architecture** with these layers:

```
Request → Middleware Pipeline → Route → Controller → Service (optional) → Model → Database
                                    ↓                                        ↓
                              Validation                               Business Logic
```

**Key Characteristics**:
- **RESTful API** design with resource-based routes
- **Middleware-driven** request processing
- **Role-based access control** (RBAC) at route and controller levels
- **Mongoose ODM** for MongoDB interactions
- **Centralized error handling** with custom error classes
- **Service layer** for email and complex operations (lightweight pattern)

---

## Backend Entry Point

### `server/server.js` - Main Entry Point

The application starts here. This file:
1. Initializes Express app
2. Configures middleware
3. Mounts routes
4. Starts the HTTP server
5. Connects to MongoDB

**Key Sections**:

#### 1. Express Initialization (Lines 1-43)

```javascript
const express = require('express');
const app = express();

// Trust proxy for cloud deployments (Render)
if (config.env === 'production') {
  app.set('trust proxy', true);
}

// Disable ETag headers
app.disable('etag');
```

**Important Settings**:
- `trust proxy`: Enables correct client IP detection behind proxies (required for Render)
- `disable('etag')`: Prevents 304 responses with empty bodies that can break frontend API calls

---

#### 2. Middleware Registration (Lines 44-157)

**Middleware are registered in this order** (order matters!):

```javascript
// 1. Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. CORS (environment-specific)
app.use(cors(corsOptions));

// 3. Security headers (Helmet)
app.use(helmet({ /* config */ }));

// 4. HTTP request logging (Morgan)
app.use(morgan('dev', { stream: logger.stream }));

// 5. Passport initialization (authentication strategies)
app.use(passport.initialize());

// 6. Session timeout checking
app.use(sessionTimeout);

// 7. Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 8. Health check endpoint (before routes)
app.get('/health', (req, res) => { ... });

// 9. API routes
app.use('/api', apiRoutes);

// 10. Error handling (must be last)
app.use(notFound);
app.use(handleUploadErrors);
app.use(errorHandler);
```

**See**: `server/server.js` lines 56-192 for full middleware configuration.

---

#### 3. Route Mounting (Line 178)

All API routes are mounted under `/api` prefix:

```javascript
const apiRoutes = require('./routes');
app.use('/api', apiRoutes);
```

This means a route defined as `/auth/login` in `routes/auth.routes.js` becomes `/api/auth/login`.

---

#### 4. Server Startup (Lines 195-242)

```javascript
const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await database.connect();
    
    // 2. Start connection monitoring
    connectionMonitor.startMonitoring();
    
    // 3. Fix test accounts (development only)
    if (config.env === 'development') {
      await User.checkAndFixTestAuthentication();
    }
    
    // 4. Start email queue processor
    if (!config.testMode) {
      emailService.startEmailQueueProcessor();
    }
    
    // 5. Start HTTP server
    const PORT = config.port;
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
```

**Startup Sequence**:
1. Database connection with retry logic
2. Connection health monitoring
3. Test account password fix (development)
4. Email queue background processor
5. HTTP server listening on port 5001 (default)

---

## Folder Structure

### Overview

```
server/
├── server.js                 # Main entry point
├── config/                   # Configuration files
├── routes/                   # Route definitions
├── controllers/              # Request handlers
├── middleware/               # Express middleware
├── models/                   # Mongoose schemas
├── services/                 # Business logic (email)
├── utils/                    # Utility functions
├── templates/                # Email templates
└── scripts/                  # Maintenance scripts
```

---

### `routes/` - Route Definitions

**Purpose**: Define HTTP endpoints and map them to controllers.

**Structure**:

```
routes/
├── index.js                  # Route aggregator (mounts all routes)
├── auth.routes.js            # Authentication routes
├── user.routes.js            # User profile routes
├── consultation.routes.js    # Consultation routes
├── connection.routes.js      # Patient-provider connection routes
├── admin.routes.js           # Admin-only routes
├── provider.routes.js        # Provider-specific routes
├── file.routes.js            # File upload/download routes
├── medicalRecord.routes.js   # Medical record aggregation routes
└── medicalRecords/           # Record-type-specific routes
    ├── vitals.routes.js
    ├── medications.routes.js
    ├── immunizations.routes.js
    ├── labResults.routes.js
    ├── radiologyReports.routes.js
    ├── hospitalRecords.routes.js
    └── surgeryRecords.routes.js
```

**Pattern**: Routes are **organized by resource** (not by version or role, though role-based routes exist for clarity).

#### `routes/index.js` - Route Aggregator

**Purpose**: Central router that mounts all sub-routes.

```javascript
const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const consultationRoutes = require('./consultation.routes');
// ... more imports

// Mount routes
router.use('/auth', authRoutes);           // /api/auth/*
router.use('/users', userRoutes);          // /api/users/*
router.use('/consultations', consultationRoutes);  // /api/consultations/*
router.use('/medical-records', medicalRecordRoutes);  // /api/medical-records/*
router.use('/connections', connectionRoutes);  // /api/connections/*
router.use('/admin', adminRoutes);         // /api/admin/*
router.use('/provider', providerRoutes);   // /api/provider/*
router.use('/files', fileRoutes);          // /api/files/*

module.exports = router;
```

**See**: `server/routes/index.js`

---

### `controllers/` - Request Handlers

**Purpose**: Handle incoming requests, orchestrate business logic, and return responses.

**Structure**:

```
controllers/
├── authController.js         # Authentication (register, login, verify email)
├── user.controller.js        # User profile CRUD
├── consultation.controller.js        # Consultation CRUD (full version)
├── consultation.controller.simple.js # Simplified version (legacy)
├── connection.controller.js          # Patient-provider connections
├── admin.controller.js               # Admin analytics and user management
├── providerController.js             # Provider-specific operations
├── medicalRecord.controller.js       # Medical record aggregation
├── baseMedicalRecord.controller.js   # Base controller for medical records
└── medicalRecords/                   # Record-type controllers
    ├── vitals.controller.js
    ├── medications.controller.js
    ├── immunizations.controller.js
    ├── labResults.controller.js
    ├── radiologyReports.controller.js
    ├── hospitalRecords.controller.js
    └── surgeryRecords.controller.js
```

**Pattern**: One controller per resource, with functions exported as named exports.

**Typical Controller Structure**:

```javascript
// Example: authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

exports.register = async (req, res) => {
  try {
    // 1. Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // 2. Extract data
    const { email, password, firstName, lastName, role } = req.body;
    
    // 3. Check for existing user
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // 4. Create user (password hashing happens in model pre-save hook)
    user = new User({ email, password, firstName, lastName, role });
    await user.save();
    
    // 5. Send verification email (via service)
    const emailService = require('../services/email.service');
    await emailService.sendVerificationEmail(user, verificationToken);
    
    // 6. Generate tokens
    const authToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();
    
    // 7. Return response
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: { id: user._id, email: user.email, role: user.role },
      tokens: { authToken, refreshToken }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
```

**See**: `server/controllers/authController.js` lines 15-95 for full implementation.

---

### `services/` - Business Logic Layer

**Purpose**: Encapsulate complex business logic that doesn't fit neatly into controllers or models.

**Structure**:

```
services/
└── email.service.js          # Email sending with queue and retry logic
```

**Note**: This application uses a **lightweight service layer** pattern. Most business logic is handled in:
- **Controllers** (orchestration, request/response handling)
- **Models** (data validation, instance methods, static methods)
- **Services** (cross-cutting concerns like email)

**From context, this appears to be** a deliberate design choice to keep the architecture simple and avoid over-engineering for the application's current scale.

**Service Pattern Example**:

```javascript
// email.service.js
const sendEmail = async (emailData) => {
  // Try SendGrid first
  try {
    await sgMail.send(email);
    return true;
  } catch (error) {
    // Fallback to Nodemailer
    await transporter.sendMail(email);
    return true;
  }
};

const sendVerificationEmail = async (user, token) => {
  const html = await renderTemplate('emailVerification', { user, token });
  return await sendEmail({
    to: user.email,
    subject: 'Verify your email',
    html
  });
};
```

**See**: `server/services/email.service.js`

---

### `middleware/` - Express Middleware

**Purpose**: Reusable request processing functions (authentication, validation, error handling).

**Structure**:

```
middleware/
├── auth.middleware.js        # JWT auth, RBAC, session timeout
├── error.middleware.js       # Global error handling
├── upload.middleware.js      # Multer file upload configuration
└── validation.middleware.js  # Request validation helpers
```

#### Key Middleware Files

**1. `auth.middleware.js` - Authentication & Authorization**

**Exports**:
- `authenticateJWT` - Verify JWT token
- `isPatient` - Ensure user is a patient
- `isProvider` - Ensure user is a provider
- `isAdmin` - Ensure user is an admin
- `isAdminOrProvider` - Either admin or provider
- `checkPatientAccess` - Verify provider has access to patient data
- `authRateLimiter` - Rate limit authentication attempts (10 per 15 min)
- `passwordResetLimiter` - Rate limit password reset (5 per hour)
- `sessionTimeout` - Check session expiration (30 minutes)

**Example**:
```javascript
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
```

**2. `error.middleware.js` - Error Handling**

**Exports**:
- `ApiError` class - Custom error with status code
- `notFound` - 404 handler
- `errorHandler` - Central error handler
- `setupErrorHandling` - Global uncaught exception handler

**Pattern**: All errors are caught and passed to the central `errorHandler`:

```javascript
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Log error (500+ as error, 400-499 as warning)
  if (statusCode >= 500) {
    logger.error({ message, url: req.originalUrl, stack: err.stack });
  } else {
    logger.warn({ message, url: req.originalUrl });
  }
  
  // Return JSON response
  res.status(statusCode).json({
    success: false,
    message,
    stack: config.env === 'development' ? err.stack : undefined
  });
};
```

**3. `upload.middleware.js` - File Uploads**

**Exports**:
- `uploadProfilePicture` - Profile image upload (PNG/JPG/GIF, max 2MB)
- `uploadLicense` - Provider license upload (PDF/PNG/JPG, max 5MB)
- `uploadConsultationFile` - Consultation attachment (Images/PDF/DOC, max 5MB)
- `handleUploadErrors` - Multer error handler

**Pattern**: Uses Multer with disk storage and file type validation.

**4. `validation.middleware.js` - Request Validation**

**Exports**:
- `validateRequest` - Process express-validator results
- `validateRequiredFields` - Check required fields
- `validateEmail` - Email format validation
- `validatePassword` - Password strength validation
- `validateObjectId` - MongoDB ObjectId format validation

**See**: `server/middleware/` for all implementations.

---

### `models/` - Mongoose Schemas

**Purpose**: Define database schemas and model methods.

**Structure**:

```
models/
├── User.js                   # User model (all roles)
├── Consultation.js           # Consultation model
├── Connection.js             # Patient-provider connection
├── EmailQueue.js             # Email queue for async sending
├── VitalsRecord.js           # Vitals medical record
├── MedicationRecord.js       # Medications
├── ImmunizationRecord.js     # Immunizations
├── LabResultRecord.js        # Lab results
├── RadiologyReport.js        # Radiology reports
├── HospitalRecord.js         # Hospital admissions
├── SurgeryRecord.js          # Surgery records
├── MedicalRecord.js          # Base medical record (abstract)
└── index.js                  # Model exports
```

**Pattern**: One model per collection, with:
- Schema definition
- Indexes for query optimization
- Instance methods (e.g., `user.generateAuthToken()`)
- Static methods (e.g., `User.findByEmail()`)
- Pre/post hooks (e.g., password hashing before save)

**See**: [05-Database-Design.md](./05-Database-Design.md) for detailed model documentation.

---

### `utils/` - Utility Functions

**Purpose**: Reusable helper functions.

**Structure**:

```
utils/
├── logger.js                 # Winston logger configuration
├── database.js               # MongoDB connection with retry logic
├── connectionMonitor.js      # Database health monitoring
├── dateUtils.js              # Date formatting helpers
├── templateRenderer.js       # Handlebars email template renderer
└── emailTester.js            # Email testing utilities
```

**Key Utilities**:
- **`logger.js`**: Winston logger with console and file transports (production logs to `logs/error.log` and `logs/combined.log`)
- **`database.js`**: MongoDB connection with automatic reconnection and retry logic
- **`dateUtils.js`**: Date formatting (e.g., `formatDate()`, `calculateAge()`)
- **`templateRenderer.js`**: Render Handlebars email templates with data injection

---

### `config/` - Configuration

**Purpose**: Centralize configuration values.

**Structure**:

```
config/
├── environment.js            # Environment variable handling
├── passport.js               # Passport.js strategies (JWT, Google, Facebook)
├── testAccounts.js           # Test account definitions
└── sampleMedicalData.js      # Sample data for seeding
```

**Key Files**:
- **`environment.js`**: Exports configuration object with environment-specific values (development, test, production)
- **`passport.js`**: Configures Passport.js strategies for authentication

**See**: `server/config/environment.js` for all configuration values.

---

## Request Flow: Typical HTTP Request

### Flow Diagram

```
1. HTTP Request → Express Server
                     ↓
2. Middleware Pipeline:
   - Body parsing (express.json)
   - CORS headers
   - Security headers (Helmet)
   - HTTP logging (Morgan)
   - Passport initialization
   - Session timeout check
                     ↓
3. Route Matching (routes/index.js → routes/{resource}.routes.js)
                     ↓
4. Route-Specific Middleware:
   - authenticateJWT (verify token, attach req.user)
   - Role-based middleware (isProvider, isPatient, isAdmin)
   - Validation middleware (express-validator)
   - validateRequest (check validation errors)
                     ↓
5. Controller Function
   - Extract request data
   - Business logic / orchestration
   - Database queries (via Mongoose models)
   - Call services (if needed)
                     ↓
6. Response
   - JSON response with status code
                     ↓
7. Error Handling (if error occurs)
   - Passed to errorHandler middleware
   - Logged and returned as JSON
```

---

### Concrete Example 1: User Registration

**Endpoint**: `POST /api/auth/register`

**Files Involved**:
1. `server/routes/auth.routes.js` (route definition)
2. `server/controllers/authController.js` (controller)
3. `server/models/User.js` (model)
4. `server/services/email.service.js` (service)

**Flow**:

#### Step 1: Route Definition

**File**: `server/routes/auth.routes.js` lines 23

```javascript
const registerValidation = [
  body('email').isEmail().withMessage('Enter a valid email'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('role').isIn(['patient', 'provider', 'admin']).withMessage('Invalid role')
];

router.post('/register', registerValidation, authController.register);
```

**Middleware Chain**: `registerValidation` → `authController.register`

#### Step 2: Controller

**File**: `server/controllers/authController.js` lines 15-95

```javascript
exports.register = async (req, res) => {
  try {
    // 1. Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // 2. Check if user exists
    let user = await User.findOne({ email: req.body.email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // 3. Create user
    user = new User(req.body);
    await user.save();  // Password hashing happens in pre-save hook
    
    // 4. Send verification email
    const emailService = require('../services/email.service');
    await emailService.sendVerificationEmail(user, verificationToken);
    
    // 5. Generate tokens
    const authToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();
    
    // 6. Return response
    res.status(201).json({ success: true, user, tokens });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
```

#### Step 3: Model

**File**: `server/models/User.js`

```javascript
// Pre-save hook to hash password
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method to generate JWT
UserSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    { id: this._id, email: this.email, role: this.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
};
```

#### Step 4: Service

**File**: `server/services/email.service.js`

```javascript
exports.sendVerificationEmail = async (user, token) => {
  const verificationUrl = `${config.frontendUrl}/verify-email/${token}`;
  
  const html = await renderTemplate('emailVerification', {
    firstName: user.firstName,
    verificationUrl
  });
  
  // Queue email (async processing)
  await EmailQueue.create({
    to: user.email,
    subject: 'Verify your email',
    html,
    type: 'verification'
  });
};
```

**Result**: User created, verification email queued, tokens returned.

---

### Concrete Example 2: Get Consultation by ID

**Endpoint**: `GET /api/consultations/:id`

**Files Involved**:
1. `server/routes/consultation.routes.js` (route definition)
2. `server/middleware/auth.middleware.js` (authentication)
3. `server/controllers/consultation.controller.js` (controller)
4. `server/models/Consultation.js` (model)

**Flow**:

#### Step 1: Route Definition

**File**: `server/routes/consultation.routes.js` lines 59-80

```javascript
router.get('/:id', 
  authenticateJWT,              // Verify JWT token
  param('id').isMongoId().withMessage('Invalid consultation ID'),
  validateRequest,              // Check validation errors
  (req, res) => {
    consultationController.getConsultationById(req, res);
  }
);
```

**Middleware Chain**: `authenticateJWT` → `param validation` → `validateRequest` → `controller`

#### Step 2: Authentication Middleware

**File**: `server/middleware/auth.middleware.js`

```javascript
const authenticateJWT = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;  // Attach user to request
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
```

**Result**: `req.user` is now populated with `{ id, email, role }`.

#### Step 3: Controller

**File**: `server/controllers/consultation.controller.js` lines 106-150

```javascript
exports.getConsultationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Find consultation with populated references
    const consultation = await Consultation.findById(id)
      .populate('patient', 'firstName lastName email')
      .populate('provider', 'firstName lastName email')
      .populate('vitals')
      .populate('medications')
      // ... populate other medical records
    
    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found' });
    }
    
    // Check access permissions
    if (userRole === 'patient') {
      // Patients can only see their own consultations
      if (consultation.patient._id.toString() !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (userRole === 'provider') {
      // Providers need connection access
      const connection = await Connection.findOne({
        provider: userId,
        patient: consultation.patient._id
      });
      
      if (!connection) {
        return res.status(403).json({ message: 'No connection to this patient' });
      }
      
      // Check access level
      if (connection.accessLevel === 'limited' && 
          consultation.provider.toString() !== userId) {
        return res.status(403).json({ message: 'Limited access - not your consultation' });
      }
    }
    // Admins can view all
    
    res.json(consultation);
  } catch (error) {
    logger.error('Error fetching consultation:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
```

**Result**: Consultation returned if user has access, otherwise 403 Forbidden.

---

### Concrete Example 3: Create Consultation (Provider)

**Endpoint**: `POST /api/consultations`

**Files Involved**:
1. `server/routes/consultation.routes.js`
2. `server/middleware/auth.middleware.js` (authenticateJWT, isProvider)
3. `server/controllers/consultation.controller.js`
4. `server/models/Consultation.js`, medical record models
5. `server/services/email.service.js`

**Flow**:

#### Step 1: Route Definition

**File**: `server/routes/consultation.routes.js`

```javascript
router.post('/', 
  authenticateJWT,                    // Verify JWT
  isProvider,                         // Ensure user is provider
  body('patientEmail').isEmail(),     // Validate patient email
  body('date').isISO8601(),           // Validate date format
  validateRequest,                    // Check validation errors
  (req, res) => {
    consultationController.createConsultation(req, res);
  }
);
```

#### Step 2: Controller (Simplified)

**File**: `server/controllers/consultation.controller.js`

```javascript
exports.createConsultation = async (req, res) => {
  try {
    const providerId = req.user.id;
    const { patientEmail, generalInfo, vitals, medications, ... } = req.body;
    
    // 1. Find or create patient
    let patient = await User.findOne({ email: patientEmail, role: 'patient' });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    
    // 2. Check/create connection
    let connection = await Connection.findOne({ provider: providerId, patient: patient._id });
    if (!connection) {
      connection = new Connection({
        provider: providerId,
        patient: patient._id,
        accessLevel: 'limited'
      });
      await connection.save();
    }
    
    // 3. Create medical records
    const vitalsRecord = vitals ? await VitalsRecord.create({ ...vitals, patient: patient._id }) : null;
    const medicationRecords = await MedicationRecord.insertMany(
      medications.map(m => ({ ...m, patient: patient._id }))
    );
    
    // 4. Create consultation
    const consultation = new Consultation({
      patient: patient._id,
      provider: providerId,
      generalInfo,
      vitals: vitalsRecord?._id,
      medications: medicationRecords.map(m => m._id),
      status: 'completed'
    });
    await consultation.save();
    
    // 5. Send notification email
    const emailService = require('../services/email.service');
    await emailService.sendConsultationNotification(patient, consultation);
    
    // 6. Return response
    res.status(201).json({
      success: true,
      message: 'Consultation created',
      consultation
    });
  } catch (error) {
    logger.error('Error creating consultation:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
```

**Result**: Consultation created, medical records created, connection established, email notification queued.

---

## Middleware Patterns

### Authentication Middleware Chain

**Common Pattern**:
```javascript
router.get('/endpoint', 
  authenticateJWT,      // Step 1: Verify token, populate req.user
  isProvider,           // Step 2: Check role
  (req, res) => {       // Step 3: Controller
    // Handle request
  }
);
```

**Available Role Middleware**:
- `isPatient` - Ensures `req.user.role === 'patient'`
- `isProvider` - Ensures `req.user.role === 'provider'`
- `isAdmin` - Ensures `req.user.role === 'admin'`
- `isAdminOrProvider` - Either role
- `checkPatientAccess(patientId)` - Verifies provider has connection access

---

### Validation Middleware Chain

**Pattern with express-validator**:

```javascript
const { body, param, query } = require('express-validator');
const { validateRequest } = require('../middleware/validation.middleware');

router.post('/endpoint',
  authenticateJWT,
  body('email').isEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 8 }).withMessage('Password too short'),
  validateRequest,      // Checks validationResult, returns 400 if errors
  (req, res) => {
    // Request is validated, proceed
  }
);
```

**Validation Types**:
- `body('field')` - Validate request body field
- `param('field')` - Validate URL parameter
- `query('field')` - Validate query string parameter

**Common Validators**:
- `.isEmail()` - Email format
- `.isMongoId()` - MongoDB ObjectId format
- `.isLength({ min, max })` - String length
- `.isIn([...])` - Value in array
- `.isISO8601()` - ISO date format
- `.notEmpty()` - Required field

**See**: `server/routes/auth.routes.js` lines 9-20 for examples.

---

### Error Handling Pattern

**In Controllers**:
```javascript
exports.someFunction = async (req, res) => {
  try {
    // ... business logic
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error message:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
```

**Or using next() for central error handler**:
```javascript
exports.someFunction = async (req, res, next) => {
  try {
    // ... business logic
    res.json({ success: true, data });
  } catch (error) {
    next(new ApiError(500, 'Error message'));
  }
};
```

**Custom Error Classes**:
```javascript
const { ApiError } = require('../middleware/error.middleware');

// Throw custom error
throw new ApiError(400, 'Invalid input');

// Or in middleware
if (!valid) {
  return next(new ApiError(403, 'Access denied'));
}
```

**See**: `server/middleware/error.middleware.js` for error handling implementation.

---

## Request Validation

### Validation Strategy

The application uses **express-validator** for request validation.

**Implementation Pattern**:

1. **Define validation rules** (inline or as constants)
2. **Apply to routes** as middleware
3. **Check results** with `validateRequest` middleware
4. **Return 400 errors** with details

### Validation Locations

**Inline Validation** (most common):
```javascript
// In route file
router.post('/endpoint',
  body('email').isEmail().withMessage('Enter a valid email'),
  body('password').isLength({ min: 8 }).withMessage('Password too short'),
  validateRequest,
  controller.function
);
```

**Validation Arrays** (for reuse):
```javascript
// In route file
const registerValidation = [
  body('email').isEmail().withMessage('Enter a valid email'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required')
];

router.post('/register', registerValidation, authController.register);
```

**See**: `server/routes/auth.routes.js` lines 9-20 for validation examples.

---

### Validation Helpers

**File**: `server/middleware/validation.middleware.js`

**Exports**:

| Function | Purpose | Example |
|----------|---------|---------|
| `validateRequest` | Process express-validator results | Used in routes after validation rules |
| `validateRequiredFields(['field1', 'field2'])` | Check required fields | Custom middleware |
| `validateEmail('fieldName')` | Validate email format | Alternative to express-validator |
| `validatePassword('fieldName')` | Check password strength | Alternative to express-validator |
| `validateObjectId(['param1', 'param2'])` | Validate MongoDB IDs | Alternative to express-validator |

**Note**: The app primarily uses **express-validator** (inline in routes) rather than these custom helpers, which are provided as alternatives for simple cases.

---

### Validation Error Response Format

**Success** (validation passes):
- Proceeds to controller
- No validation response sent

**Failure** (validation fails):
- Returns `400 Bad Request`
- Error format:
  ```json
  {
    "errors": [
      {
        "msg": "Enter a valid email",
        "param": "email",
        "location": "body"
      },
      {
        "msg": "Password must be at least 8 characters",
        "param": "password",
        "location": "body"
      }
    ]
  }
  ```

**See**: `server/middleware/validation.middleware.js` lines 15-21 for implementation.

---

## API Response Patterns

### Standard Response Formats

**Success Response**:
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Error message",
  "errors": [ ... ]  // Optional: validation errors
}
```

**Paginated Response**:
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "pages": 5
  }
}
```

**Note**: The application **does not enforce** a strict response format across all endpoints. Some endpoints return data directly, others wrap it in a `{ success, data }` object. This is a minor inconsistency that could be standardized in future refactoring.

---

## Architecture Patterns Summary

### Design Patterns Used

| Pattern | Implementation | Example |
|---------|----------------|---------|
| **MVC** | Routes → Controllers → Models | All CRUD operations |
| **Middleware Pipeline** | Express middleware chain | Authentication, validation, error handling |
| **Repository Pattern** | Mongoose models act as repositories | `User.findOne()`, `Consultation.create()` |
| **Service Layer** | Lightweight, for complex operations | Email service with queue |
| **Factory Pattern** | Model static methods | `User.createFromOAuth()` |
| **Decorator Pattern** | Middleware wrapping routes | `authenticateJWT`, `isProvider` |
| **Strategy Pattern** | Passport.js authentication strategies | JWT, Google OAuth, Facebook OAuth |

---

### Code Organization Principles

1. **Separation of Concerns**: Routes define endpoints, controllers handle logic, models manage data
2. **Single Responsibility**: Each controller function handles one operation
3. **DRY (Don't Repeat Yourself)**: Reusable middleware for auth, validation
4. **Convention over Configuration**: Consistent file naming and structure
5. **Fail Fast**: Validation at route level before reaching controller

---

## Key Takeaways

1. **Entry Point**: `server/server.js` initializes Express and registers middleware in a specific order
2. **Routing**: Resource-based routes in `routes/`, aggregated in `routes/index.js`
3. **Controllers**: Handle business logic and orchestration in `controllers/`
4. **Middleware**: Authentication, validation, error handling in `middleware/`
5. **Models**: Mongoose schemas in `models/` with instance/static methods
6. **Services**: Email service for cross-cutting concerns
7. **Validation**: express-validator with inline rules in routes
8. **Error Handling**: Centralized in `error.middleware.js` with custom `ApiError` class
9. **Request Flow**: Middleware → Route → Controller → Model → Response
10. **Authentication**: JWT tokens, Passport.js, role-based access control

---

## Next Steps

To understand the backend architecture more deeply:

1. **Read Database Design**: [05-Database-Design.md](./05-Database-Design.md) for model schemas
2. **Read Auth & Security**: [06-Authentication-Authorization-Security.md](./06-Authentication-Authorization-Security.md) for JWT and RBAC details
3. **Explore Routes**: Read `server/routes/*.routes.js` files for API endpoints
4. **Trace a Request**: Pick an endpoint (e.g., `POST /api/auth/login`) and follow the code from route → controller → model
5. **Review Middleware**: Read `server/middleware/auth.middleware.js` to understand RBAC implementation

---

**Document Version**: 1.0  
**Last Updated**: November 19, 2025  
**Previous Document**: [03-Local-Development-Setup.md](./03-Local-Development-Setup.md)  
**Next Document**: [05-Database-Design.md](./05-Database-Design.md)

