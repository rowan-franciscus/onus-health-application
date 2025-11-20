# 6. Authentication, Authorization & Security

This document explains the authentication, authorization, and security mechanisms implemented in the Onus Health Application.

---

## Authentication Overview

### Authentication Method

The application uses **JWT (JSON Web Token) based authentication** with optional **OAuth 2.0** social login:

- **Primary**: Email/Password with JWT tokens
- **Secondary**: Google OAuth 2.0
- **Tertiary**: Facebook OAuth

**Token Type**: Stateless JWT tokens (no server-side session storage)  
**Token Storage**: Client-side (sessionStorage in browser)  
**Token Transmission**: Bearer token in Authorization header

---

## Authentication Flow

### 1. Registration Flow

**Endpoint**: `POST /api/auth/register`  
**File**: `server/controllers/authController.js` (lines 15-95)

**Steps**:
1. User submits email, password, firstName, lastName, role
2. Server validates input (express-validator)
3. Check if email already exists
4. Create user with hashed password (bcrypt, 12 salt rounds)
5. Generate email verification token (JWT, 24h expiration)
6. Queue verification email (via email service)
7. Generate auth token (7 days) and refresh token (30 days)
8. Return user data and tokens

**Response**:
```json
{
  "success": true,
  "message": "User registered successfully. Please check your email for verification.",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "patient"
  },
  "tokens": {
    "authToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Note**: User can access the app after registration but certain features require email verification.

---

### 2. Email Verification Flow

**Endpoints**: 
- `GET /api/auth/verify-email/:token` (email link click)
- `POST /api/auth/verify-email` (API call with token in body)

**File**: `server/controllers/authController.js` (lines 271-414)

**Steps**:
1. User clicks verification link in email
2. Server verifies JWT token
3. Find user by ID from token
4. Set `isEmailVerified: true`
5. Redirect to onboarding (GET) or return success (POST)

**GET Request Flow**:
```
Email Link → /api/auth/verify-email/:token
         ↓
   Verify Token
         ↓
   Update User (isEmailVerified = true)
         ↓
   Redirect to:
   - /patient/onboarding (if patient, not completed)
   - /provider/onboarding (if provider, not completed)
   - Role dashboard (if already completed)
```

**Security**:
- Token expires after 24 hours
- Token is single-use (implicitly, as user is marked verified)
- Invalid tokens redirect to error page

---

### 3. Login Flow

**Endpoint**: `POST /api/auth/login`  
**File**: `server/controllers/authController.js` (lines 100-183)

**Steps**:
1. User submits email and password
2. Server finds user by email
3. Compare password with stored hash (bcrypt)
4. Check email verification status (skip for OAuth users)
5. **Check provider verification** (if role = 'provider')
6. Update `lastLogin` timestamp
7. Generate auth token and refresh token
8. Return user data and tokens

**Validation Checks**:
- Email exists
- Password matches
- Email is verified (unless OAuth)
- Provider is verified by admin (if role = 'provider' and onboarding completed)

**Response**:
```json
{
  "user": {
    "id": "...",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "patient",
    "isProfileCompleted": true,
    "onboardingCompleted": true,
    "profileImage": "/uploads/profile-images/..."
  },
  "tokens": {
    "authToken": "...",
    "refreshToken": "..."
  }
}
```

**Login Rejection Scenarios**:

| Scenario | Status | Message | Code |
|----------|--------|---------|------|
| Invalid email/password | 400 | "Invalid credentials" | - |
| Email not verified | 403 | "Email not verified. Please verify your email before logging in." | `EMAIL_NOT_VERIFIED` |
| Provider not verified by admin | 403 | "Your provider account is pending verification. Please wait for admin approval." | `PROVIDER_NOT_VERIFIED` |

**See**: Provider verification is a **two-step process**: 
1. Email verification (user confirms email)
2. Admin verification (admin approves provider credentials)

---

### 4. Admin Login Flow

**Endpoint**: `POST /api/auth/admin/login`  
**File**: `server/controllers/authController.js` (lines 419-471)

**Difference from Regular Login**:
- Explicitly checks `role === 'admin'` in database query
- No email verification check (admins are pre-verified)
- No provider verification check
- Identical token generation

**Security Note**: Admin route is separate (`/admin/sign-in` in frontend) to prevent accidental regular login.

---

### 5. Social Login Flow (Google/Facebook OAuth)

**Endpoints**:
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - Google callback
- `GET /api/auth/facebook` - Initiate Facebook OAuth
- `GET /api/auth/facebook/callback` - Facebook callback

**Files**:
- `server/config/passport.js` (lines 54-151)
- `server/routes/auth.routes.js` (lines 28-81)

**Steps**:
1. User clicks "Sign in with Google/Facebook"
2. Redirected to OAuth provider
3. User authorizes app
4. Provider redirects to callback URL with auth code
5. Server exchanges code for access token
6. Fetch user profile from provider
7. Check if user exists by `googleId`/`facebookId`
8. If exists: Login user
9. If not exists: Check by email and link accounts OR create new user
10. Generate JWT tokens
11. Redirect to frontend with tokens in URL

**OAuth Callback Flow** (lines 30-56 in `auth.routes.js`):
```javascript
passport.authenticate('google', { session: false }),
async (req, res) => {
  const user = req.user;
  
  // Check provider verification (if applicable)
  if (user.role === 'provider' && user.isProfileCompleted) {
    if (!user.providerProfile.isVerified) {
      return res.redirect(`${FRONTEND_URL}/sign-in?error=provider_not_verified`);
    }
  }
  
  // Generate tokens
  const authToken = user.generateAuthToken();
  const refreshToken = user.generateRefreshToken();
  
  // Redirect with tokens
  res.redirect(`${FRONTEND_URL}/auth/social-callback?authToken=${authToken}&refreshToken=${refreshToken}`);
}
```

**OAuth User Creation** (lines 82-93 in `passport.js`):
```javascript
const newUser = new User({
  googleId: profile.id,
  email: profile.emails[0].value,
  firstName: profile.name.givenName,
  lastName: profile.name.familyName,
  isEmailVerified: true,  // OAuth users are pre-verified
  role: 'patient'         // Default role
});
```

**Security**:
- OAuth tokens not stored (stateless)
- Users are automatically email-verified (`isEmailVerified: true`)
- Default role is `patient` (must complete provider onboarding separately if needed)

---

### 6. Token Refresh Flow

**Endpoint**: `POST /api/auth/refresh-token`  
**File**: `server/controllers/authController.js` (lines 188-247)

**Purpose**: Generate new access token when current token expires without requiring re-login.

**Steps**:
1. Client sends refresh token (30-day validity)
2. Server verifies refresh token
3. Find user by ID from token
4. **Check session timeout** (if old auth token provided)
5. Generate new auth token and refresh token
6. Return new tokens

**Session Timeout Check** (lines 204-230):
- If old auth token is ≥30 minutes old, reject refresh
- This enforces 30-minute session timeout even with valid refresh token

**Security**:
- Refresh token rotates on each refresh (new refresh token issued)
- Session timeout enforced (30 minutes of inactivity)
- Invalid refresh tokens return 401 Unauthorized

---

### 7. Password Reset Flow

**Endpoints**:
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

**Files**: `server/controllers/authController.js` (lines 476-560)

#### Request Password Reset

**Steps**:
1. User submits email
2. Server finds user (returns generic message regardless of result - prevents email enumeration)
3. Generate password reset token (JWT, 1h expiration)
4. Store token and expiration in `User.resetPasswordToken` and `User.resetPasswordExpires`
5. Queue password reset email with token link
6. Return success message

**Response** (always 200, even if email doesn't exist):
```json
{
  "message": "If the email exists, a password reset link will be sent"
}
```

**Security**: Generic message prevents attackers from enumerating valid emails.

#### Reset Password with Token

**Steps**:
1. User submits token and new password
2. Server verifies JWT token
3. Find user with matching token and non-expired `resetPasswordExpires`
4. Hash new password (bcrypt, 12 salt rounds via pre-save hook)
5. Clear `resetPasswordToken` and `resetPasswordExpires`
6. Send confirmation email
7. Return success

**Security**:
- Token expires after 1 hour
- Token is single-use (cleared after reset)
- Password complexity enforced by validation (min 8 characters)

**See**: `docs/PASSWORD_RESET_IMPLEMENTATION.md` for detailed implementation notes.

---

## JWT Token Structure

### Access Token (Auth Token)

**Expiration**: 7 days (default)  
**Secret**: `JWT_SECRET` environment variable  
**Algorithm**: HS256 (HMAC SHA-256)

**Payload**:
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "role": "patient",
  "isProfileCompleted": true,
  "onboardingCompleted": true,
  "isEmailVerified": true,
  "firstName": "John",
  "lastName": "Doe",
  "isVerified": true,  // For providers only
  "iat": 1700000000,   // Issued at
  "exp": 1700604800    // Expiration
}
```

**Generation**: `User.generateAuthToken()` (lines 208-232 in `User.js`)

---

### Refresh Token

**Expiration**: 30 days (default)  
**Secret**: `JWT_REFRESH_SECRET` environment variable

**Payload**:
```json
{
  "id": "user_id",
  "iat": 1700000000,
  "exp": 1702592000
}
```

**Generation**: `User.generateRefreshToken()` (lines 234-245 in `User.js`)

**Note**: Refresh token contains minimal data (only user ID).

---

## Authorization (Role-Based Access Control)

### User Roles

**Defined in**: `server/models/User.js` (line 24)

```javascript
role: {
  type: String,
  enum: ['patient', 'provider', 'admin'],
  required: true
}
```

**Role Descriptions**:

| Role | Description | Access Level |
|------|-------------|--------------|
| `patient` | Regular user | Own data only |
| `provider` | Health provider/clinician | Connected patients' data (limited or full) |
| `admin` | Platform administrator | All data, user management, provider verification |

---

### RBAC Middleware

**File**: `server/middleware/auth.middleware.js`

**Available Middleware Functions**:

| Function | Purpose | Status Code | Usage |
|----------|---------|-------------|-------|
| `authenticateJWT` | Verify JWT token, populate `req.user` | 401 | All protected routes |
| `isPatient` | Ensure user role = 'patient' | 403 | Patient-only routes |
| `isProvider` | Ensure user role = 'provider' | 403 | Provider-only routes |
| `isVerifiedProvider` | Ensure provider is admin-verified | 403 | Provider routes requiring verification |
| `isAdmin` | Ensure user role = 'admin' | 403 | Admin-only routes |
| `isAdminOrProvider` | Either admin or provider | 403 | Shared routes |
| `isAdminOrVerifiedProvider` | Admin or verified provider | 403 | Shared routes with verification check |
| `isOwnProfileOrAdmin` | User accessing own data or admin | 403 | Profile routes |

---

### Middleware Implementation Examples

#### 1. Basic Role Check (`isPatient`)

**File**: `server/middleware/auth.middleware.js` (lines 159-167)

```javascript
const isPatient = (req, res, next) => {
  if (req.user && req.user.role === 'patient') {
    return next();
  }
  return res.status(403).json({ 
    success: false, 
    message: 'Access denied. Patient role required.' 
  });
};
```

**Usage**:
```javascript
router.get('/patient/dashboard', authenticateJWT, isPatient, controller.getDashboard);
```

---

#### 2. Provider Verification Check (`isVerifiedProvider`)

**File**: `server/middleware/auth.middleware.js` (lines 125-154)

```javascript
const isVerifiedProvider = async (req, res, next) => {
  if (!req.user || req.user.role !== 'provider') {
    return res.status(403).json({ message: 'Provider role required' });
  }
  
  // Load full user to check verification status
  const user = await User.findById(req.user.id);
  
  if (!user.providerProfile || !user.providerProfile.isVerified) {
    return res.status(403).json({ 
      message: 'Your provider account is pending verification.',
      code: 'PROVIDER_NOT_VERIFIED'
    });
  }
  
  return next();
};
```

**Rationale**: JWT token includes `isVerified` but may be stale. This middleware does a **database lookup** to ensure provider is still verified.

---

#### 3. Connection-Based Access (`canProviderAccessPatient`)

**File**: `server/middleware/auth.middleware.js` (lines 259-285)

```javascript
const canProviderAccessPatient = async (providerId, patientId, requireFullAccess = false) => {
  const Connection = require('../models/Connection');
  
  const connection = await Connection.findOne({
    provider: providerId,
    patient: patientId
  });
  
  if (!connection) {
    return false;
  }
  
  // If full access is required, check approval
  if (requireFullAccess) {
    return connection.accessLevel === 'full' && connection.fullAccessStatus === 'approved';
  }
  
  // Otherwise, any connection is sufficient
  return true;
};
```

**Usage**: Called by controllers to check if provider can access specific patient data.

**Access Levels**:
- **Limited**: Provider sees only consultations they created
- **Full**: Provider sees all consultations and medical records (requires patient approval)

**See**: `docs/PATIENT_PROVIDER_CONNECTION_FLOW.md` for detailed access control flow.

---

### Route Protection Patterns

#### Pattern 1: Single Role

```javascript
// Patient-only route
router.get('/patient/dashboard', 
  authenticateJWT,    // Verify token
  isPatient,          // Check role
  controller.getDashboard
);
```

#### Pattern 2: Multiple Roles

```javascript
// Admin or provider route
router.get('/consultations', 
  authenticateJWT,
  isAdminOrProvider,
  controller.getAllConsultations
);
```

#### Pattern 3: Verified Provider

```javascript
// Requires admin-verified provider
router.post('/consultations', 
  authenticateJWT,
  isVerifiedProvider,
  controller.createConsultation
);
```

#### Pattern 4: Controller-Level Access Check

```javascript
// Route allows authenticated users, controller checks access
router.get('/consultations/:id', 
  authenticateJWT,
  controller.getConsultationById
);

// In controller:
exports.getConsultationById = async (req, res) => {
  const consultation = await Consultation.findById(req.params.id);
  
  // Check if user has access
  if (req.user.role === 'patient') {
    if (consultation.patient.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
  } else if (req.user.role === 'provider') {
    const hasAccess = await canProviderAccessPatient(req.user.id, consultation.patient);
    if (!hasAccess) {
      return res.status(403).json({ message: 'No connection to this patient' });
    }
  }
  // Admins can access all
  
  res.json(consultation);
};
```

**See**: `server/controllers/consultation.controller.js` (lines 106-180) for full implementation.

---

## Password & Account Security

### Password Hashing

**Library**: bcrypt.js  
**Salt Rounds**: 12  
**File**: `server/models/User.js` (lines 192-200)

**Pre-Save Hook**:
```javascript
UserSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    // Check if password is already hashed (prevent double-hashing)
    if (!this.password.startsWith('$2a$') && 
        !this.password.startsWith('$2b$') && 
        !this.password.startsWith('$2y$')) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }
  next();
});
```

**Security Features**:
- Automatic hashing on save
- Double-hashing prevention
- 12 salt rounds (2^12 = 4096 iterations)

---

### Password Validation

**Client-Side** (not enforced server-side currently):
- Minimum 8 characters
- At least one number
- At least one special character

**Server-Side** (enforced):
- Minimum 8 characters (Mongoose schema validation)
- Required unless OAuth user (Google/Facebook)

**Validation Location**: `server/routes/auth.routes.js` (lines 11)

```javascript
body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
```

**Note**: From context, password strength validation (special characters, numbers) is defined in `validation.middleware.js` but **not actively used** in auth routes. This is a **minor security gap**.

---

### Password Comparison

**Method**: `User.comparePassword(candidatePassword)`  
**File**: `server/models/User.js` (lines 203-205)

```javascript
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};
```

**Usage** (in login):
```javascript
const isMatch = await user.comparePassword(password);
if (!isMatch) {
  return res.status(400).json({ message: 'Invalid credentials' });
}
```

---

## Security Middleware

### 1. CORS (Cross-Origin Resource Sharing)

**File**: `server/server.js` (lines 60-90)

**Configuration**:

**Development**:
```javascript
{
  origin: '*',  // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false,
  optionsSuccessStatus: 200
}
```

**Production**:
```javascript
{
  origin: [
    config.frontendUrl,           // https://onus-frontend.onrender.com
    'http://localhost:3000',      // Local development fallback
    'http://127.0.0.1:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false,
  optionsSuccessStatus: 200
}
```

**Special CORS for File Routes** (lines 93-99):
```javascript
app.use('/api/files', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});
```

**Rationale**: File routes (profile images, consultation attachments) need broader CORS to allow frontend to display images cross-origin.

---

### 2. Helmet (Security Headers)

**File**: `server/server.js` (lines 129-148)

**Configuration**:
```javascript
helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "*"],  // Allow images from any source
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", config.frontendUrl, "http://localhost:3000", "http://localhost:5001"]
    }
  }
})
```

**Security Headers Added**:
- `X-DNS-Prefetch-Control: off`
- `X-Frame-Options: DENY` (prevent clickjacking)
- `Strict-Transport-Security: max-age=15552000; includeSubDomains` (HTTPS enforcement)
- `X-Content-Type-Options: nosniff` (prevent MIME sniffing)
- `X-XSS-Protection: 0` (disable old XSS filter)
- `Content-Security-Policy` (as configured above)

**Note**: Helmet is **skipped for file routes** (`/api/files/`) to avoid CORS conflicts (line 132).

---

### 3. Rate Limiting

**Library**: express-rate-limit  
**File**: `server/middleware/auth.middleware.js`

#### Authentication Rate Limiter

**Configuration** (lines 21-30):
```javascript
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,                    // 10 requests per window
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes'
  }
});
```

**Applied to**:
- `POST /api/auth/login`
- `POST /api/auth/admin/login`

**Purpose**: Prevent brute-force login attacks.

---

#### Password Reset Rate Limiter

**Configuration** (lines 35-56):
```javascript
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 5,                     // 5 requests per window
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again after an hour'
  },
  handler: (req, res) => {
    logger.warn(`Password reset rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ message: 'Too many password reset attempts...' });
  },
  skip: (req) => {
    return config.env === 'development';  // Skip in development
  }
});
```

**Applied to**:
- `POST /api/auth/forgot-password`

**Purpose**: Prevent password reset abuse (email flooding, enumeration attempts).

**Development Bypass**: Rate limiting is **disabled in development** for easier testing.

---

### 4. Session Timeout

**File**: `server/middleware/auth.middleware.js` (lines 61-90)

**Configuration**: 30 minutes (default, from `SESSION_TIMEOUT` env var)

**Implementation**:
```javascript
const sessionTimeout = async (req, res, next) => {
  if (!req.user || !req.headers.authorization) {
    return next();
  }
  
  const token = req.headers.authorization.split(' ')[1];
  const payload = jwt.verify(token, config.jwtSecret, { ignoreExpiration: true });
  
  // Calculate time since token was issued
  const currentTime = Math.floor(Date.now() / 1000);
  const tokenIssueTime = payload.iat;
  const minutesSinceIssue = Math.floor((currentTime - tokenIssueTime) / 60);
  
  // If token is older than session timeout
  if (minutesSinceIssue >= config.sessionTimeout) {
    return res.status(401).json({
      success: false,
      message: 'Session timeout',
      code: 'SESSION_TIMEOUT'
    });
  }
  
  return next();
};
```

**How it works**:
1. Extract JWT token from Authorization header
2. Decode token (ignore expiration check)
3. Calculate time since token issuance (`iat` claim)
4. If ≥30 minutes, return 401 with `SESSION_TIMEOUT` code
5. Frontend shows modal: "Extend session or logout?"

**Applied to**: All routes (global middleware in `server.js` line 157)

**Frontend Handling**: `client/src/components/SessionTimeout/SessionTimeout.jsx`

**See**: `docs/SESSION_TIMEOUT_IMPLEMENTATION.md` for full implementation details.

---

### 5. Input Validation

**Library**: express-validator  
**Pattern**: Inline validation in route files

**Example** (from `auth.routes.js`):
```javascript
const loginValidation = [
  body('email').isEmail().withMessage('Enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

router.post('/login', authRateLimiter, loginValidation, authController.login);
```

**Validation in Controller**:
```javascript
const errors = validationResult(req);
if (!errors.isEmpty()) {
  return res.status(400).json({ errors: errors.array() });
}
```

**See**: [04-Backend-Architecture.md](./04-Backend-Architecture.md#request-validation) for detailed validation patterns.

---

## Security Best Practices Implemented

### 1. Password Security
- ✅ Bcrypt hashing (12 salt rounds)
- ✅ No plain-text passwords stored
- ✅ Password comparison in constant time (bcrypt.compare)
- ✅ Password reset tokens expire (1 hour)
- ⚠️ Password strength validation not enforced server-side

### 2. Authentication Security
- ✅ JWT tokens with expiration (7 days access, 30 days refresh)
- ✅ Refresh token rotation on refresh
- ✅ Session timeout (30 minutes)
- ✅ Email verification required
- ✅ Provider verification by admin
- ✅ Rate limiting on login (10 attempts per 15 min)
- ✅ Rate limiting on password reset (5 attempts per hour)

### 3. Authorization Security
- ✅ Role-based access control (RBAC)
- ✅ JWT payload includes role
- ✅ Middleware enforces role checks
- ✅ Connection-based patient data access for providers
- ✅ Two-tier access levels (limited vs. full)

### 4. API Security
- ✅ CORS configured (production: whitelist, dev: permissive)
- ✅ Helmet security headers
- ✅ Input validation (express-validator)
- ✅ Error messages don't leak sensitive info
- ✅ Passwords excluded from API responses (`.select('-password')`)

### 5. Transport Security
- ✅ HTTPS enforced in production (Render platform)
- ✅ Strict-Transport-Security header (HSTS)
- ✅ Secure cookies not used (JWT in Authorization header)

---

## Known Limitations & Security Gaps

### 1. Password Strength Validation ⚠️

**Issue**: Server-side validation only checks minimum length (8 characters).

**Location**: `server/routes/auth.routes.js` (line 11)

**Impact**: Weak passwords like "password" or "12345678" are accepted.

**Recommendation**: Add server-side validation for:
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Fix** (not implemented):
```javascript
body('password')
  .isLength({ min: 8 })
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .withMessage('Password must contain uppercase, lowercase, number, and special character')
```

---

### 2. No Account Lockout ⚠️

**Issue**: Rate limiting only limits requests, not account-based lockouts.

**Impact**: Attacker can try 10 passwords every 15 minutes per IP, indefinitely.

**Recommendation**: Implement account-based lockout:
- Track failed login attempts per email
- Lock account after 5 consecutive failures
- Require email verification or time-based unlock

---

### 3. No Multi-Factor Authentication (MFA) ⚠️

**Issue**: Only single-factor authentication (password or OAuth).

**Impact**: If password is compromised, account is fully accessible.

**Recommendation**: Implement MFA (TOTP, SMS, or email codes) for:
- Admin accounts (required)
- Provider accounts (optional)
- Patient accounts (optional)

---

### 4. JWT Secrets in Environment Variables ⚠️

**Issue**: JWT secrets are static (set once in environment).

**Impact**: If secrets leak, all issued tokens can be forged until secrets are rotated.

**Recommendation**:
- Rotate JWT secrets periodically
- Implement key versioning (multiple secrets, rotate gracefully)
- Use asymmetric keys (RS256 instead of HS256)

---

### 5. No Token Blacklisting

**Issue**: JWT tokens cannot be revoked before expiration.

**Impact**: If user logs out or is deleted, their token remains valid for up to 7 days.

**Recommendation**: Implement token blacklist:
- Redis-based blacklist for revoked tokens
- Check blacklist in `authenticateJWT` middleware
- Blacklist tokens on logout or account deletion

---

### 6. Session Timeout Not Enforced on Refresh Token ⚠️

**Issue**: Refresh token is valid for 30 days, even if user is inactive.

**Current Behavior**: Session timeout only checks auth token age during refresh (lines 204-230 in `authController.js`).

**Impact**: User can remain logged in indefinitely by refreshing every 29 minutes, even if inactive for weeks.

**Recommendation**: Track last activity timestamp and reject refresh if inactive > 30 minutes.

---

### 7. Email Enumeration in Registration

**Issue**: Registration returns "User already exists" if email exists.

**Impact**: Attacker can enumerate valid email addresses.

**Recommendation**: Return generic message: "If email doesn't exist, account created" (same as password reset pattern).

---

### 8. No IP-Based Rate Limiting Storage

**Issue**: Rate limiting is memory-based (resets on server restart).

**Impact**: In multi-instance deployments (e.g., Render auto-scaling), rate limits are per-instance, not global.

**Recommendation**: Use Redis for distributed rate limiting.

---

## Security Checklist for Production

### Before Deploying

- [ ] **Environment Variables**: All secrets set in Render dashboard (not in `.env` files)
- [ ] **JWT Secrets**: Strong random strings (64+ characters)
- [ ] **HTTPS**: SSL certificate configured (automatic on Render)
- [ ] **CORS**: Production frontend URL whitelisted
- [ ] **Rate Limiting**: Enabled in production (not skipped)
- [ ] **Helmet**: Security headers enabled
- [ ] **Password Hashing**: Bcrypt with 12+ salt rounds
- [ ] **Email Verification**: Required for non-OAuth users
- [ ] **Provider Verification**: Admin approval required
- [ ] **Session Timeout**: 30 minutes configured
- [ ] **Logging**: Sensitive data (passwords, tokens) not logged

### Recommended Enhancements

- [ ] **MFA**: Implement for admin accounts (minimum)
- [ ] **Password Strength**: Server-side validation with complexity requirements
- [ ] **Account Lockout**: Implement after N failed login attempts
- [ ] **Token Blacklist**: Redis-based revocation on logout/deletion
- [ ] **IP Rate Limiting**: Redis-based distributed rate limiting
- [ ] **Audit Logging**: Log all authentication events (login, logout, password change)
- [ ] **Security Monitoring**: Sentry or similar for security event tracking
- [ ] **Penetration Testing**: Third-party security audit

---

## Summary

### Authentication Summary

| Feature | Implementation | Status |
|---------|----------------|--------|
| Email/Password Login | JWT tokens, bcrypt hashing | ✅ Implemented |
| OAuth (Google/Facebook) | Passport.js strategies | ✅ Implemented |
| Email Verification | JWT token, 24h expiration | ✅ Implemented |
| Password Reset | JWT token, 1h expiration | ✅ Implemented |
| Token Refresh | Refresh tokens, rotation | ✅ Implemented |
| Session Timeout | 30 minutes | ✅ Implemented |

### Authorization Summary

| Feature | Implementation | Status |
|---------|----------------|--------|
| Role-Based Access Control | 3 roles (patient, provider, admin) | ✅ Implemented |
| Route Protection | Middleware chain | ✅ Implemented |
| Provider Verification | Two-step (email + admin) | ✅ Implemented |
| Connection-Based Access | Limited vs. full access | ✅ Implemented |
| Resource Ownership Check | Controller-level checks | ✅ Implemented |

### Security Summary

| Feature | Implementation | Status |
|---------|----------------|--------|
| Password Hashing | Bcrypt (12 rounds) | ✅ Implemented |
| Rate Limiting | express-rate-limit | ✅ Implemented |
| CORS | Environment-specific | ✅ Implemented |
| Security Headers | Helmet | ✅ Implemented |
| Input Validation | express-validator | ✅ Implemented |
| HTTPS | Render platform | ✅ Implemented |
| MFA | - | ❌ Not implemented |
| Token Blacklisting | - | ❌ Not implemented |
| Account Lockout | - | ❌ Not implemented |

---

## Next Steps

To understand security implementation more deeply:

1. **Read Middleware**: `server/middleware/auth.middleware.js` for all RBAC logic
2. **Read Auth Controller**: `server/controllers/authController.js` for authentication flows
3. **Read Passport Config**: `server/config/passport.js` for OAuth strategies
4. **Test Authentication**: Use test accounts to see flows in action
5. **Review Connection Flow**: `docs/PATIENT_PROVIDER_CONNECTION_FLOW.md` for access control details

---

**Document Version**: 1.0  
**Last Updated**: November 19, 2025  
**Previous Document**: [05-Database-Design.md](./05-Database-Design.md)  
**Next Document**: [07-Frontend-Architecture.md](./07-Frontend-Architecture.md)

