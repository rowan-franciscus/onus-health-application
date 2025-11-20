# 10. Testing, Linting & Quality

This document explains the testing strategy, quality assurance processes, and code quality tools used in the Onus Health Application.

---

## Testing Overview

The application uses a **mixed testing approach**:
- **Unit/Integration Tests**: Jest + Supertest (backend)
- **Manual Test Scripts**: Utility scripts for specific features
- **Manual QA**: Comprehensive testing guide for all user flows

**Test Coverage**: Partial (authentication tests implemented, other features use manual testing)

---

## Automated Testing

### Backend Testing (Jest + Supertest)

**Test Framework**: Jest 29.7.0  
**HTTP Testing**: Supertest 6.3.3  
**In-Memory Database**: mongodb-memory-server 9.1.1

**Test Files Location**: `server/tests/`

```
tests/
├── setup.js                  # Test environment setup
├── auth.test.js              # Authentication API tests
└── test-connection-flow.js   # Connection flow tests
```

---

#### Test Setup

**File**: `server/tests/setup.js`

**Features**:
- Creates in-memory MongoDB server (no need for real database)
- Sets `NODE_ENV=test`
- Provides helper functions:
  - `setupTestDB()` - Initialize MongoDB Memory Server
  - `teardownTestDB()` - Cleanup after tests
  - `clearDatabase()` - Clear all collections between tests

**Usage Pattern**:

```javascript
const { setupTestDB, teardownTestDB, clearDatabase } = require('./setup');

beforeAll(async () => {
  await setupTestDB();
});

beforeEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await teardownTestDB();
});
```

**Benefits**:
- Fast (no network I/O to real database)
- Isolated (each test has clean database)
- No configuration required (in-memory)

---

#### Existing Tests

**File**: `server/tests/auth.test.js`

**Test Suites**:

1. **Registration Tests** (`POST /api/auth/register`):
   - ✅ Should register a new user
   - ✅ Should validate required fields
   - ✅ Should not allow duplicate email
   - ✅ Should hash password before saving
   - ✅ Should return tokens on successful registration

2. **Login Tests** (`POST /api/auth/login`):
   - ✅ Should login with valid credentials
   - ✅ Should reject invalid email
   - ✅ Should reject invalid password
   - ✅ Should return user data and tokens
   - ✅ Should update lastLogin timestamp

**Example Test**:

```javascript
describe('POST /api/auth/register', () => {
  it('should register a new user', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'Password@123',
      firstName: 'Test',
      lastName: 'User',
      role: 'patient'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body.user).toHaveProperty('email', userData.email);
    expect(response.body.user).not.toHaveProperty('password');
    
    const savedUser = await User.findOne({ email: userData.email });
    expect(savedUser).toBeTruthy();
  });
});
```

---

#### Running Tests

**Commands**:

```bash
# Run all Jest tests
cd server
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test auth.test.js
```

**Configuration**:
- **File**: `server/package.json` (scripts section)
- **Jest Config**: Default (no custom jest.config.js)
- **Test Match**: `*.test.js` files

**Current Test Coverage**: 
- ✅ Authentication endpoints (registration, login)
- ❌ Consultation CRUD (not tested)
- ❌ Medical records CRUD (not tested)
- ❌ Connection management (not tested)
- ❌ Admin operations (not tested)
- ❌ File uploads (not tested)

**Note**: From context, this appears to be a **minimal test suite**. Most testing is done manually via test scripts and user testing.

---

### Frontend Testing (React Testing Library)

**Test Framework**: React Testing Library (included in Create React App)  
**Test Runner**: Jest

**Configuration**: `client/package.json` (eslintConfig section includes jest)

**Test Files**: Likely in `client/src/**/*.test.js` or `client/src/**/*.spec.js`

**Running Tests**:

```bash
cd client
npm test
```

**Status**: **No test files found** in current codebase.

**Recommendation**: Add component tests for:
- Form validation (onboarding, consultation forms)
- Protected routes
- Authentication flows
- Error handling

---

## Manual Testing

### Test Scripts (Utility Scripts)

**Location**: `server/scripts/test/`

**Available Scripts**:

| Script | Purpose | Usage |
|--------|---------|-------|
| `testDatabaseConnection.js` | Test MongoDB connection | `npm run test:db` |
| `testLoginEndpoint.js` | Test login API | `npm run test:login` |
| `testEmailSending.js` | Test email sending | `node scripts/testEmailSending.js` |
| `testEmailVerification.js` | Test email verification flow | `node scripts/testEmailVerification.js` |
| `testAllEmails.js` | Test all email templates | `node scripts/testAllEmails.js [email]` |
| `passwordHashTest.js` | Verify password hashing | `node scripts/test/passwordHashTest.js` |
| `checkTestAccounts.js` | Verify test account status | `node scripts/test/checkTestAccounts.js` |
| `forceCreateWorkingTestAccounts.js` | Fix test account passwords | `node scripts/test/forceCreateWorkingTestAccounts.js` |

**Example** (`testDatabaseConnection.js`):

```javascript
require('dotenv').config();
const database = require('../../utils/database');
const logger = require('../../utils/logger');

(async () => {
  try {
    console.log('Testing database connection...');
    await database.connect();
    console.log('✅ Database connection successful');
    
    const mongoose = require('mongoose');
    const dbName = mongoose.connection.name;
    console.log(`Connected to database: ${dbName}`);
    
    if (dbName !== 'onus-health') {
      console.warn(`⚠️  WARNING: Connected to "${dbName}" instead of "onus-health"`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
})();
```

**Running**:
```bash
cd server
npm run test:db
```

---

### Comprehensive Testing Guide

**File**: `docs/TESTING_GUIDE.md`

**Purpose**: Manual testing checklist for all application features.

**Coverage**:
- Patient user flows (registration → onboarding → consultations)
- Provider user flows (onboarding → verification → patients → consultations)
- Admin user flows (analytics → user management → provider verification)
- Security features (session timeout, role-based access)
- File uploads
- Email notifications

**Usage**:
1. Follow step-by-step instructions
2. Use test accounts or create new ones
3. Verify expected behavior
4. Check browser console and network tab for errors

**See**: `docs/TESTING_GUIDE.md` (524 lines) for complete testing procedures.

---

### Quick Start Testing

**File**: `docs/QUICK_START_TESTING.md`

**Purpose**: Rapid testing of core features (15-20 minutes).

**Test Scenarios**:
- Login with test accounts
- View patient dashboard
- View provider dashboard
- Create consultation
- View admin analytics

---

## Database Seeding & Test Data

### Seed Scripts

**Location**: `server/scripts/seed/`

**Scripts**:
- `seedDatabase.js` - Create test accounts and sample data
- `resetTestData.js` - Remove all test data

**Running**:

```bash
cd server

# Seed database with test data
npm run seed

# Reset (remove all test data)
npm run seed:reset

# Re-seed after reset
npm run seed:reset && npm run seed
```

---

### What Seed Script Creates

**File**: `server/scripts/seed/seedDatabase.js`

**Test Accounts Created**:
| Role | Email | Password | Verified | Onboarding |
|------|-------|----------|----------|------------|
| Admin | `admin.test@email.com` | `password@123` | ✅ Yes | ✅ Complete |
| Provider | `provider.test@email.com` | `password@123` | ✅ Yes | ✅ Complete |
| Patient | `patient.test@email.com` | `password@123` | ✅ Yes | ✅ Complete |

**Sample Data Created**:
- 2-3 consultations per test patient
- Medical records for each consultation:
  - 1 vitals record
  - 1-2 medications
  - 1 immunization
  - 1 lab result
  - 1 radiology report
  - 1 hospital record
  - 1 surgery record
- Patient-provider connection (full access)

**Data Source**: `server/config/sampleMedicalData.js`

**Benefits**:
- Consistent test data
- Fast setup (no manual data entry)
- Realistic data for testing

**See**: `server/docs/TEST_ACCOUNTS.md` for test account details.

---

## Linting & Code Quality

### Frontend Linting (ESLint)

**Configuration**: Embedded in `client/package.json`

```json
{
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  }
}
```

**ESLint Config**: `react-app` preset (from Create React App)

**Rules Included**:
- React best practices
- JSX accessibility (a11y)
- Hooks rules
- Import/export syntax
- Jest test rules

**Running ESLint**:

```bash
cd client
npx eslint src/
```

**Note**: No standalone ESLint config file (`.eslintrc.js`) - uses CRA defaults.

**IDE Integration**: ESLint extension auto-detects config from package.json.

---

### Backend Linting

**Status**: **Not configured**

**No ESLint Configuration Found**:
- No `.eslintrc` or `.eslintrc.js` file
- No `eslintConfig` in `server/package.json`
- No linting scripts in package.json

**Recommendation**: Add ESLint for Node.js:

```bash
cd server
npm install --save-dev eslint

# Initialize ESLint config
npx eslint --init
# Choose: Node, CommonJS, enforce code style
```

**Suggested Config**:
```json
{
  "extends": "eslint:recommended",
  "env": {
    "node": true,
    "es2021": true
  },
  "rules": {
    "no-console": "off",
    "no-unused-vars": "warn"
  }
}
```

---

### Code Formatting (Prettier)

**Status**: **Not configured**

**No Prettier Configuration Found**:
- No `.prettierrc` file
- No prettier config in package.json
- No formatting scripts

**Recommendation**: Add Prettier for consistent code formatting:

```bash
# Root level (formats both client and server)
npm install --save-dev prettier

# Create .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}

# Create .prettierignore
node_modules
build
dist
coverage
```

**Usage**:
```bash
# Format all files
npx prettier --write "**/*.{js,jsx,json,css,md}"
```

---

## Code Quality Checks

### Pre-Commit Hooks

**Status**: **Not configured**

**Recommendation**: Use Husky + lint-staged for pre-commit checks:

```bash
npm install --save-dev husky lint-staged

# Add to package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{js,jsx}": ["eslint --fix", "prettier --write"],
    "*.{json,css,md}": ["prettier --write"]
  }
}
```

**Benefits**:
- Automatically format code before commit
- Catch linting errors before push
- Enforce consistent code style

---

### Code Review Checklist

**Manual Checklist** (since no automated tools):

**Before Committing**:
- [ ] Code follows existing patterns
- [ ] No console.log statements (or marked as TODO to remove)
- [ ] Error handling implemented
- [ ] Input validation added
- [ ] Authentication/authorization checked
- [ ] Database queries optimized
- [ ] No sensitive data logged
- [ ] Comments added for complex logic

**Before Deploying**:
- [ ] All features manually tested
- [ ] Test accounts work
- [ ] Environment variables set in Render
- [ ] Database seeded (if needed)
- [ ] Email sending works
- [ ] File uploads work
- [ ] No errors in browser console
- [ ] No errors in server logs

---

## Testing Strategies by Feature

### 1. Authentication Testing

**Automated Tests**: `server/tests/auth.test.js`

**Test Coverage**:
- Registration with valid/invalid data
- Login with valid/invalid credentials
- Password hashing
- Token generation
- Duplicate email prevention

**Manual Testing**:
- Email verification flow
- Password reset flow
- OAuth login (Google/Facebook)
- Session timeout
- Token refresh

**Test Script**: `npm run test:login` (tests login endpoint directly)

---

### 2. Consultation Testing

**Automated Tests**: ❌ Not implemented

**Manual Testing** (from `docs/TESTING_GUIDE.md`):
- Create consultation with all 8 tabs
- Save as draft
- Complete consultation
- Edit draft consultation
- View consultation (patient and provider)
- Upload attachments
- Download attachments

**Recommended Automated Tests**:
- Create consultation with patient email
- Create consultation with patient ID
- Auto-connection creation on first consultation
- Access control (limited vs. full access)
- Medical record creation and linking

---

### 3. Connection Flow Testing

**Automated Tests**: `server/tests/test-connection-flow.js`

**Test Coverage** (from context):
- Connection creation with limited access
- Full access request flow
- Automatic connection creation with consultations
- Access level transitions
- Email notification triggers

**Running**:
```bash
cd server/tests
node test-connection-flow.js
```

**Manual Testing**:
- Provider adds patient → connection created
- Provider requests full access → patient receives email
- Patient approves → provider gains full access
- Patient revokes → provider loses full access

---

### 4. Email Testing

**Test Scripts**:

```bash
# Test email sending capability
node server/scripts/testEmailSending.js

# Test all email templates
node server/scripts/testAllEmails.js your.email@example.com

# Test email verification flow
node server/scripts/testEmailVerification.js

# Test email URLs in templates
node server/scripts/testEmailUrls.js
```

**What These Test**:
- SendGrid API connection
- Template rendering (Handlebars)
- Email queue processing
- All 17 email templates
- Email URLs correctness

**Example Output**:

```
Testing email sending...
✅ SendGrid API key configured
✅ Email sent successfully to test@example.com
✅ Template rendered correctly
```

---

### 5. File Upload Testing

**Manual Testing** (from `docs/FILE_UPLOAD_TESTING.md`):
- Upload profile picture (PNG, JPG, GIF - max 2MB)
- Upload provider license (PDF, PNG, JPG - max 5MB)
- Upload consultation attachment (Images, PDF, DOC - max 5MB)
- Multiple file upload
- File size validation
- File type validation
- File viewing (inline)
- File downloading
- File deletion

**Test Cases**:
- Valid file types → Success
- Invalid file types (e.g., .exe) → Rejection
- Oversized files → Rejection
- Multiple files simultaneously → Success
- View file in new tab → Opens correctly
- Download file → Downloads with correct name

**See**: `docs/FILE_UPLOAD_TESTING.md` for detailed file upload testing procedures.

---

### 6. Database Testing

**Test Script**: `npm run test:db`  
**File**: `server/scripts/test/testDatabaseConnection.js`

**Tests**:
- Connection to MongoDB Atlas
- Database name verification (should be 'onus-health')
- Ping response time
- Connection pooling

**Example Output**:

```
Testing database connection...
✅ Database connection successful
Connected to database: onus-health
Ping time: 45ms
✅ All checks passed
```

---

## Quality Assurance Process

### Manual QA Workflow

**Pre-Deployment Checklist**:

1. **Functionality Testing**:
   - [ ] All user flows work (patient, provider, admin)
   - [ ] Search and filter features work
   - [ ] Forms validate correctly
   - [ ] File uploads work
   - [ ] Emails are sent

2. **Security Testing**:
   - [ ] Role-based access enforced
   - [ ] Session timeout works
   - [ ] Unauthorized access blocked
   - [ ] Password reset secure
   - [ ] File access controlled

3. **Performance Testing**:
   - [ ] Pages load < 3 seconds
   - [ ] Large lists paginated
   - [ ] Database queries optimized
   - [ ] File uploads complete successfully

4. **Browser Testing**:
   - [ ] Chrome (primary browser)
   - [ ] Firefox
   - [ ] Safari
   - [ ] Edge

5. **Mobile Testing** (limited - desktop-first app):
   - [ ] Basic functionality works
   - [ ] Responsive layout (if implemented)

---

### Bug Reporting

**Process** (from context, not explicitly documented):
1. Identify bug during testing
2. Check browser console for errors
3. Check network tab for API errors
4. Check server logs (`server/logs/error.log`)
5. Create fix documentation in `docs/` (e.g., `CONSULTATION_SAVE_FIX.md`)
6. Fix and test
7. Commit with descriptive message

**Example Fix Docs**: 
- `docs/CONSULTATION_DRAFT_FIX_V2.md`
- `docs/FILE_AUTHENTICATION_FIX.md`
- `docs/PROFILE_PICTURE_CACHING_FIX_V2.md`

---

## Code Quality Patterns

### Code Organization

**Good Patterns Observed**:
- ✅ Consistent file naming (camelCase for JS, PascalCase for components)
- ✅ Modular structure (routes, controllers, models separated)
- ✅ Service layer for complex logic (email)
- ✅ Middleware for cross-cutting concerns
- ✅ CSS Modules for scoped styles
- ✅ Utility functions in `utils/` folders

**Areas for Improvement**:
- ⚠️ Some console.log statements left in production code
- ⚠️ Inconsistent error handling (some use try-catch, some don't)
- ⚠️ API response format not standardized
- ⚠️ Missing JSDoc comments on some functions

---

### Error Handling

**Backend Pattern**:

```javascript
// Good: Centralized error handling
try {
  // ... business logic
  res.json({ success: true, data });
} catch (error) {
  logger.error('Error message:', error);
  res.status(500).json({ message: 'Server error' });
}
```

**Frontend Pattern**:

```javascript
// Good: User-friendly error messages
try {
  await ApiService.post('/endpoint', data);
  toast.success('Operation successful');
} catch (error) {
  toast.error(error.userMessage || 'An error occurred');
  console.error(error);
}
```

---

### Logging

**Backend Logging**: Winston  
**Config**: `server/utils/logger.js`

**Log Levels**:
- `error` - Error-level logs (logged to `logs/error.log`)
- `warn` - Warnings
- `info` - General information
- `debug` - Debug information (development only)

**Log Transports**:
- **Console**: All environments
- **File**: Production only (`logs/error.log`, `logs/combined.log`)
- **Rotation**: 5MB max per file, 5 files retained

**Usage**:

```javascript
const logger = require('../utils/logger');

logger.info('User logged in:', { userId: user._id, email: user.email });
logger.error('Failed to create consultation:', error);
logger.debug('Request payload:', req.body);
```

**Frontend Logging**: console.log (development), removed in production build

---

## Testing Environment

### Test Mode

**Environment Variable**: `TEST_MODE=true`

**Effects**:
- Email sending skipped (logs instead)
- Rate limiting may be disabled
- More verbose logging
- Useful for local development without email credentials

**Configuration**: `server/config/environment.js` (line 116)

---

### Test Accounts

**Pre-configured Accounts**:
- Automatically fixed on server startup (development)
- Passwords reset to `password@123` if invalid
- All marked as email-verified
- All have completed onboarding

**Fix Script**: `server/scripts/test/forceCreateWorkingTestAccounts.js`

**Auto-Fix** (on server start in development):

```javascript
if (config.env === 'development') {
  const result = await User.checkAndFixTestAuthentication();
  if (result.fixed > 0) {
    logger.info(`Fixed authentication for ${result.fixed} test accounts`);
  }
}
```

**See**: `server/server.js` lines 204-214

---

## Performance Testing

### Current Performance Metrics

**Not formally tracked**, but observed:

| Metric | Typical Value | Note |
|--------|---------------|------|
| Page Load Time | < 2 seconds | Development |
| API Response Time | 50-200ms | Simple queries |
| Database Query Time | 10-50ms | With indexes |
| File Upload Time | 1-3 seconds | 5MB file |
| Email Queue Processing | 60 seconds | Batch interval |

---

### Performance Bottlenecks (Potential)

From context, these could be slow:

1. **Consultation Detail Page**: 8+ populate() calls
2. **Medical Records List**: Large datasets without pagination
3. **Admin Analytics**: Complex aggregation queries
4. **File Uploads**: Synchronous upload (no streaming)

**Recommendation**: Add performance monitoring (e.g., New Relic, Datadog) to identify actual bottlenecks.

---

## Known Testing Gaps

### 1. Limited Automated Test Coverage ⚠️

**Issue**: Only authentication tested, no tests for core features.

**Impact**: Regressions may go unnoticed.

**Recommendation**: Add tests for:
- Consultation CRUD
- Connection management
- Medical record operations
- File uploads
- Admin operations

---

### 2. No End-to-End (E2E) Tests ⚠️

**Issue**: No browser automation tests (Cypress, Playwright).

**Impact**: UI regressions not caught automatically.

**Recommendation**: Add Cypress for critical flows:
- Patient onboarding
- Create consultation
- Provider verification

---

### 3. No Load Testing ⚠️

**Issue**: Application not tested under high load.

**Impact**: Performance under scale unknown.

**Recommendation**: Use tools like:
- Apache JMeter
- k6
- Artillery

---

### 4. No Security Testing ⚠️

**Issue**: No automated security scanning.

**Impact**: Vulnerabilities may exist.

**Recommendation**:
- OWASP ZAP scan
- npm audit (dependency vulnerabilities)
- Penetration testing (third-party)

---

## Continuous Integration (CI/CD)

### Current Status

**CI/CD**: **Not configured**

**No CI Pipeline Found**:
- No GitHub Actions workflows
- No Travis CI, CircleCI, or Jenkins config
- No automated test runs on push

**Deployment**: Manual via Render's Git integration (auto-deploy on push to main)

---

### Recommended CI/CD Setup

**GitHub Actions Workflow** (example):

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm run install-all
    
    - name: Run backend tests
      run: cd server && npm test
      env:
        NODE_ENV: test
    
    - name: Run frontend tests
      run: cd client && npm test
    
    - name: Lint code
      run: |
        cd client && npx eslint src/
```

**Benefits**:
- Automated testing on every push
- Prevent broken code from being merged
- Continuous quality monitoring

---

## Summary

### Testing Status

| Test Type | Status | Coverage | Tools |
|-----------|--------|----------|-------|
| **Backend Unit Tests** | ✅ Partial | Auth only | Jest + Supertest |
| **Frontend Unit Tests** | ❌ None | 0% | React Testing Library (available) |
| **Integration Tests** | ✅ Manual Scripts | Key features | Custom scripts |
| **E2E Tests** | ❌ None | 0% | None |
| **Manual QA** | ✅ Comprehensive | All features | Testing guide |
| **Load Testing** | ❌ None | - | None |
| **Security Testing** | ❌ None | - | None |

### Linting Status

| Area | Status | Config | Recommendation |
|------|--------|--------|----------------|
| **Frontend Linting** | ✅ Configured | ESLint (react-app) | Add custom rules |
| **Backend Linting** | ❌ Not configured | None | Add ESLint |
| **Code Formatting** | ❌ Not configured | None | Add Prettier |
| **Pre-commit Hooks** | ❌ Not configured | None | Add Husky |

---

## Next Steps for Quality Improvement

### Immediate (Quick Wins)
1. Add ESLint to backend
2. Add Prettier (both client and server)
3. Set up pre-commit hooks (Husky)
4. Run `npm audit` and fix vulnerabilities
5. Remove console.log statements

### Short-term (1-2 weeks)
1. Add tests for consultation CRUD
2. Add tests for connection management
3. Add React component tests
4. Set up GitHub Actions CI
5. Add load testing for key endpoints

### Long-term (1-3 months)
1. Add Cypress E2E tests
2. Implement code coverage tracking
3. Set up performance monitoring (New Relic, Datadog)
4. Security audit (penetration testing)
5. Implement SonarQube or similar for code quality metrics

---

## Testing Utilities & Tools

### Available in Codebase

**Server Scripts**:
```bash
npm run test              # Jest tests
npm run test:db           # Database connection test
npm run test:login        # Login endpoint test
npm run seed              # Seed test data
npm run seed:reset        # Reset test data
npm run check:users       # Check all users in DB
```

**Test Data**:
- Test accounts: `server/config/testAccounts.js`
- Sample medical data: `server/config/sampleMedicalData.js`

**Documentation**:
- Testing guide: `docs/TESTING_GUIDE.md`
- Quick start: `docs/QUICK_START_TESTING.md`
- Test accounts: `server/docs/TEST_ACCOUNTS.md`

---

## Next Steps

To improve testing and quality:

1. **Run Existing Tests**: `cd server && npm test`
2. **Seed Database**: `cd server && npm run seed`
3. **Manual Testing**: Follow `docs/TESTING_GUIDE.md`
4. **Add Missing Tests**: Write tests for consultation, connection, medical records
5. **Set Up Linting**: Add ESLint and Prettier
6. **Enable CI**: Set up GitHub Actions

---

**Document Version**: 1.0  
**Last Updated**: November 19, 2025  
**Previous Document**: [09-Third-Party-Integrations.md](./09-Third-Party-Integrations.md)  
**Next Document**: [11-Deployment-Environments.md](./11-Deployment-Environments.md)

