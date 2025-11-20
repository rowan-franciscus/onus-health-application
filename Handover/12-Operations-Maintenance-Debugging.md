# 12. Operations, Maintenance & Debugging

This document explains operational procedures, maintenance tasks, debugging techniques, and troubleshooting for the Onus Health Application.

---

## Daily Operations

### Monitoring Checklist

**Daily Checks** (5-10 minutes):
- [ ] Check Render dashboard for service health
- [ ] Review error logs for critical issues
- [ ] Check email queue status (failed emails)
- [ ] Monitor database connection metrics
- [ ] Verify backup completion (if automated backups enabled)

---

## Logging & Monitoring

### Application Logging

**Backend Logging**: Winston  
**File**: `server/utils/logger.js`

**Log Levels**:

| Level | Purpose | Logged To |
|-------|---------|-----------|
| `error` | Critical errors, exceptions | Console + `logs/error.log` (production) |
| `warn` | Warning messages, potential issues | Console + `logs/combined.log` (production) |
| `info` | General information, important events | Console + `logs/combined.log` (production) |
| `debug` | Detailed debugging info | Console (development only) |

**Log Configuration** (from `logger.js`):

```javascript
// Production: Log to files with rotation
if (config.env === 'production') {
  transports.push(
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,      // Keep 5 rotated files
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5,
    })
  );
}
```

**Accessing Logs**:

**Development**:
```bash
# Logs appear in terminal where server is running
npm run dev
```

**Production** (Render):
1. **Via Dashboard**: Render dashboard → Service → "Logs" tab (real-time)
2. **Via Shell**: Render dashboard → Service → "Shell" tab
   ```bash
   tail -f logs/error.log
   tail -f logs/combined.log
   ```

**Log Rotation**: Automatic when files exceed 5MB.

---

### HTTP Request Logging

**Middleware**: Morgan  
**Configuration**: `server/server.js` (line 151)

```javascript
app.use(morgan('dev', { stream: logger.stream }));
```

**Format** (development):
```
GET /api/consultations 200 45.123 ms - 1234
```

**What's Logged**:
- HTTP method (GET, POST, etc.)
- Request path
- Response status code
- Response time (ms)
- Response size (bytes)

---

### Database Monitoring

**Connection Monitor**: `server/utils/connectionMonitor.js`

**Features**:
- Periodic database pings (every 30 seconds)
- Connection metrics tracking
- Disconnection/reconnection counting
- Average ping time calculation

**Health Check Endpoint**: `GET /api/status/db`

**Response**:
```json
{
  "connected": true,
  "connectedSince": "2025-11-19T10:00:00.000Z",
  "lastPing": 45,
  "avgPing": 42,
  "disconnections": 0,
  "reconnections": 0,
  "successfulOperations": 1234,
  "failedOperations": 2
}
```

**Monitoring**:
- Check regularly for high ping times (>1000ms indicates issues)
- Monitor disconnection/reconnection counts
- Check failed operations count

---

### Email Queue Monitoring

**Model**: `server/models/EmailQueue.js`  
**Status Check**: Query database directly

**MongoDB Compass Query**:
```javascript
// Find failed emails
db.emailqueues.find({ status: 'failed' })

// Find pending emails (stuck)
db.emailqueues.find({ 
  status: 'pending', 
  attempts: { $gte: 3 } 
})

// Count emails by status
db.emailqueues.aggregate([
  { $group: { _id: '$status', count: { $sum: 1 } } }
])
```

**Expected**: 
- `pending`: 0-5 (normal, processing)
- `sent`: Growing count
- `failed`: 0-2 (acceptable)

**If many failed emails**:
1. Check SendGrid API key validity
2. Check SendGrid dashboard for bounce/spam reports
3. Review `emailqueues.error` field for failure reasons
4. Manually retry: Update status to 'pending', reset attempts to 0

---

## Maintenance Scripts

### Location

**Directory**: `server/scripts/`  
**Count**: 47 scripts

**Categories**:
1. **Admin Management**: Add/update/fix admin accounts
2. **User Management**: Fix user data, onboarding status
3. **Database Maintenance**: Cleanup, consolidation, seeding
4. **Testing**: Test email, database, API connectivity
5. **Debugging**: Debug authentication, registration, server issues

---

### Essential Maintenance Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| **Seeding & Data** | | |
| `seedDatabase.js` | Create test accounts and sample data | `npm run seed` |
| `resetTestData.js` | Remove all test data | `npm run seed:reset` |
| `cleanupOrphanedData.js` | Remove orphaned medical records | `npm run cleanup:orphaned` |
| **Admin Management** | | |
| `addAdminUser.js` | Create new admin account | `npm run add:admin` |
| `updateAdmin.js` | Update admin credentials | `npm run update:admin` |
| `fixAdmin.js` | Fix admin account issues | `node scripts/fixAdmin.js` |
| **User Fixes** | | |
| `fixAuthenticationIssues.js` | Fix authentication problems | `npm run fix:auth` |
| `fixUserOnboardingStatus.js` | Fix onboarding status | `node scripts/fixUserOnboardingStatus.js` |
| `checkOnboardingIssue.js` | Diagnose onboarding problems | `npm run fix:onboarding` |
| **Testing** | | |
| `testDatabaseConnection.js` | Test MongoDB connection | `npm run test:db` |
| `testLoginEndpoint.js` | Test login API | `npm run test:login` |
| `testEmailSending.js` | Test email functionality | `node scripts/testEmailSending.js` |
| `testAllEmails.js` | Test all email templates | `node scripts/testAllEmails.js [email]` |
| **Debugging** | | |
| `debugServer.js` | Debug server configuration | `node scripts/debugServer.js` |
| `debugAdmin.js` | Debug admin account | `node scripts/debugAdmin.js` |
| `list-all-users.js` | List all users in database | `node scripts/list-all-users.js` |
| `check-users.js` | Check user authentication | `npm run check:users` |

---

### Common Maintenance Tasks

#### 1. Add New Admin User

**Script**: `server/scripts/addAdminUser.js`

**Usage**:
```bash
cd server
npm run add:admin
```

**Interactive Prompts**:
- Email address
- Password
- First name
- Last name

**Result**: New admin account created with:
- `role: 'admin'`
- `isEmailVerified: true`
- `isProfileCompleted: true`

---

#### 2. Reset Test Account Passwords

**Script**: `server/scripts/test/forceCreateWorkingTestAccounts.js`

**Usage**:
```bash
cd server
node scripts/test/forceCreateWorkingTestAccounts.js
```

**What it does**:
- Finds all test accounts (*.test@email.com)
- Resets passwords to `password@123`
- Sets `isEmailVerified: true`
- Sets `isProfileCompleted: true`

**Use When**: Test accounts not working after database changes.

---

#### 3. Cleanup Orphaned Data

**Script**: `server/scripts/cleanupOrphanedData.js`

**Usage**:
```bash
cd server
npm run cleanup:orphaned
```

**What it does**:
- Finds medical records with no consultation reference
- Finds consultations with deleted patients/providers
- Finds connections with deleted users
- Optionally deletes orphaned records

**Recommended**: Run monthly or after bulk user deletions.

---

#### 4. Check All Users

**Script**: `server/check-users.js`

**Usage**:
```bash
cd server
npm run check:users
```

**Output**:
```
Total users: 45
Patients: 30
Providers: 12
Admins: 3

Email verified: 40
Email not verified: 5

Onboarding completed: 38
Onboarding not completed: 7
```

**Use When**: Debugging user-related issues, checking database state.

---

## Debugging Techniques

### Backend Debugging

#### 1. Console Logging

**Current Pattern** (throughout codebase):

```javascript
console.log('=== DEBUG: Function called ===');
console.log('Request user:', req.user);
console.log('Request body:', req.body);
console.log('Database query result:', result);
```

**Location**: Many controllers and routes have console.log statements.

**Viewing**:
- Development: Terminal where server is running
- Production: Render dashboard logs

**Recommendation**: Replace console.log with Winston logger:

```javascript
// Instead of console.log
logger.debug('Function called', { user: req.user });
logger.info('Operation successful', { userId: user._id });
```

---

#### 2. Winston Logger

**Usage**:

```javascript
const logger = require('../utils/logger');

logger.error('Critical error:', error);
logger.warn('Warning message', { context: 'user-login' });
logger.info('User logged in', { userId: user._id, email: user.email });
logger.debug('Request payload', { body: req.body });
```

**Benefits**:
- Structured logging (JSON format)
- Log levels for filtering
- File persistence in production
- Log rotation

---

#### 3. Node.js Debugger

**VS Code Debugging** (recommended):

**Configuration** (`.vscode/launch.json` - create if not exists):

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/server/server.js",
      "cwd": "${workspaceFolder}/server",
      "envFile": "${workspaceFolder}/server/.env"
    }
  ]
}
```

**Usage**:
1. Set breakpoints in VS Code
2. Press F5 or click "Run" → "Start Debugging"
3. Request triggers breakpoint
4. Inspect variables, step through code

---

#### 4. Postman/Insomnia Testing

**Usage**:
1. Import API endpoints (see `server/routes/api.md`)
2. Test endpoints directly without frontend
3. Inspect request/response headers
4. Test authentication with JWT tokens

**Example Collection** (Postman):
```
POST /api/auth/login
Headers:
  Content-Type: application/json
Body:
  {
    "email": "patient.test@email.com",
    "password": "password@123"
  }
```

---

### Frontend Debugging

#### 1. React Developer Tools

**Installation**: Browser extension

**Features**:
- Inspect component tree
- View component props and state
- View Redux state
- Time-travel debugging (with Redux DevTools)

**Usage**:
- F12 → "Components" tab (React DevTools)
- F12 → "Redux" tab (Redux DevTools)

---

#### 2. Browser Console

**Common Debug Commands** (exposed globally):

```javascript
// Check authentication state
window.checkLocalStorage();

// Clear auth state
window.clearAuthState();

// Check Redux state
console.log(window.__REDUX_DEVTOOLS_EXTENSION__);
```

**Network Tab**:
- View all API requests
- Inspect request/response headers
- Check response status codes
- View response payloads

---

#### 3. Redux DevTools

**Extension**: Redux DevTools (Chrome/Firefox)

**Features**:
- View current Redux state
- View dispatched actions
- Time-travel debugging (replay actions)
- Export/import state

**Configuration**: Enabled in `client/src/store/index.js` (line 23)

```javascript
devTools: process.env.NODE_ENV !== 'production'
```

**Note**: Disabled in production for security.

---

## Troubleshooting Common Issues

### 1. Authentication Issues

#### Symptom: "Invalid token" or 401 errors after login

**Causes**:
- JWT secret changed between server restarts (development)
- Token expired but not refreshed
- Token malformed or corrupted

**Debugging**:

```javascript
// In browser console
const token = localStorage.getItem('onus_auth_token');
console.log('Token exists:', !!token);

// Decode token (without verification)
const decoded = JSON.parse(atob(token.split('.')[1]));
console.log('Token payload:', decoded);
console.log('Token expired:', decoded.exp < Date.now() / 1000);
```

**Solutions**:
1. **Clear auth state**: `window.clearAuthState()` in browser console
2. **Set persistent JWT secrets** in `server/.env` (development)
3. **Check token expiration** and refresh token flow
4. **Run auth fix script**: `npm run fix:auth`

**See**: `docs/TROUBLESHOOTING.md` for more authentication troubleshooting.

---

#### Symptom: Stuck on onboarding redirect loop

**Cause**: `isProfileCompleted` flag not set correctly

**Debugging**:
```bash
cd server
npm run fix:onboarding
```

**Or manually** (MongoDB Compass):
```javascript
db.users.updateOne(
  { email: "user@example.com" },
  { $set: { isProfileCompleted: true } }
)
```

---

### 2. Database Issues

#### Symptom: "MongooseError: Operation buffering timed out"

**Causes**:
- MongoDB Atlas cluster paused (free tier auto-pauses)
- Invalid connection string
- Network connectivity issues
- IP not whitelisted

**Debugging**:

```bash
# Test connection
cd server
npm run test:db

# Check connection string
node -e "console.log(process.env.MONGODB_ATLAS_URI.replace(/\/\/(.+):(.+)@/, '//***:***@'))"
```

**Solutions**:
1. **Resume cluster**: MongoDB Atlas dashboard → Cluster → Resume
2. **Verify connection string** format in `.env`
3. **Whitelist IP**: Atlas → Network Access → Add IP (0.0.0.0/0 for testing)
4. **Check logs**: `server/logs/error.log` for connection errors

---

#### Symptom: Slow database queries

**Debugging**:

```javascript
// Enable Mongoose query logging
mongoose.set('debug', true);

// Check query execution time
const startTime = Date.now();
const result = await Model.find(query);
console.log(`Query took ${Date.now() - startTime}ms`);
```

**Solutions**:
1. **Add indexes**: See [05-Database-Design.md](./05-Database-Design.md#index-optimization-summary)
2. **Optimize queries**: Reduce populate() calls, use lean()
3. **Add pagination**: Limit results to 20-50 per page
4. **Use aggregation**: For complex queries, use aggregation pipeline

**Monitoring**: MongoDB Atlas dashboard → Performance → Query Performance

---

### 3. Email Issues

#### Symptom: Emails not being sent

**Causes**:
- Invalid SendGrid API key
- Email queue not processing
- Sender email not verified
- TEST_MODE enabled in production

**Debugging**:

```bash
# Test email sending
cd server
node scripts/testEmailSending.js

# Check email queue
node -e "
const mongoose = require('mongoose');
const EmailQueue = require('./models/EmailQueue');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_ATLAS_URI).then(async () => {
  const failed = await EmailQueue.find({ status: 'failed' });
  console.log('Failed emails:', failed.length);
  console.log(failed);
  process.exit(0);
});
"
```

**Solutions**:
1. **Verify API key**: `SENDGRID_API_KEY` starts with `SG.`
2. **Check SendGrid dashboard**: [app.sendgrid.com](https://app.sendgrid.com) → Activity
3. **Verify sender email**: SendGrid → Settings → Sender Authentication
4. **Check TEST_MODE**: Should be `false` or undefined in production
5. **Restart email processor**: Restart server

---

#### Symptom: Email queue backing up (many pending)

**Causes**:
- SendGrid API rate limit hit
- Email processor crashed
- Network issues

**Debugging**:

```javascript
// Check queue status
db.emailqueues.aggregate([
  { $group: { _id: '$status', count: { $sum: 1 } } }
])

// Find oldest pending emails
db.emailqueues.find({ status: 'pending' }).sort({ createdAt: 1 }).limit(10)
```

**Solutions**:
1. **Check processor running**: Look for "Email queue processor started" in logs
2. **Manually process**: Update status to 'pending', reset attempts
3. **Increase processing interval**: Reduce `QUEUE_PROCESS_INTERVAL` env var
4. **Check SendGrid quota**: Free tier = 100 emails/day

---

### 4. File Upload Issues

#### Symptom: Files upload but disappear after deployment (Render)

**Cause**: No persistent disk configured

**Solution**:
1. Render dashboard → onus-backend → "Disks"
2. Add disk: Mount at `/mnt/data`, Size: 1GB+
3. Redeploy service

**Verification**:
```bash
# Via Render shell
ls -la /mnt/data/uploads/
```

---

#### Symptom: "File too large" error

**Cause**: File exceeds size limit (5MB default)

**Debugging**:
```javascript
// Check file size limit
console.log('Max file size:', process.env.MAX_FILE_SIZE || 5242880);
```

**Solutions**:
1. **Increase limit**: Set `MAX_FILE_SIZE` env var (in bytes)
2. **Client-side validation**: Check file size before upload
3. **Compress files**: Instruct users to compress large files

---

### 5. Session Timeout Issues

#### Symptom: Users logged out unexpectedly

**Causes**:
- Session timeout too short
- Token refresh failing
- Browser closing (tokens in sessionStorage, if used)

**Debugging**:

```javascript
// Check session timeout setting
console.log('Session timeout (minutes):', process.env.SESSION_TIMEOUT || 30);

// Check token age
const token = localStorage.getItem('onus_auth_token');
const decoded = JSON.parse(atob(token.split('.')[1]));
const ageMinutes = Math.floor((Date.now() / 1000 - decoded.iat) / 60);
console.log('Token age (minutes):', ageMinutes);
```

**Solutions**:
1. **Adjust timeout**: Increase `SESSION_TIMEOUT` (minutes) and `REACT_APP_SESSION_TIMEOUT` (milliseconds)
2. **Check refresh flow**: Ensure token refresh working (axios interceptor)
3. **Test session modal**: Wait 28 minutes, should see "Extend session?" modal

**See**: `docs/SESSION_TIMEOUT_IMPLEMENTATION.md` for session timeout details.

---

## Debugging Workflows

### Workflow 1: User Cannot Login

**Steps**:

1. **Check user exists**:
   ```bash
   cd server
   node scripts/list-all-users.js
   # Or
   npm run check:users
   ```

2. **Check email verification**:
   ```javascript
   // MongoDB Compass
   db.users.findOne({ email: "user@example.com" }, { isEmailVerified: 1 })
   ```

3. **Check password hash**:
   ```bash
   node scripts/test/passwordHashTest.js
   ```

4. **Test login endpoint directly**:
   ```bash
   npm run test:login
   ```

5. **Check server logs**:
   ```bash
   # Development
   Check terminal output
   
   # Production
   Render dashboard → Logs
   ```

6. **Fix authentication**:
   ```bash
   npm run fix:auth
   ```

---

### Workflow 2: Consultation Not Saving

**Steps**:

1. **Check browser console** for JavaScript errors

2. **Check network tab** for API request:
   - Request URL correct?
   - Request payload valid JSON?
   - Response status code? (200, 400, 500?)
   - Response body error message?

3. **Check backend logs**:
   ```bash
   # Look for errors around consultation creation
   grep "consultation" server/logs/error.log
   ```

4. **Test consultation endpoint** directly (Postman):
   ```
   POST /api/consultations
   Headers: Authorization: Bearer <token>
   Body: { patient: "...", general: { ... }, ... }
   ```

5. **Check database**:
   ```javascript
   // MongoDB Compass
   db.consultations.find().sort({ createdAt: -1 }).limit(10)
   ```

6. **Review controller code**: `server/controllers/consultation.controller.js`

---

### Workflow 3: Provider Not Receiving Full Access

**Steps**:

1. **Check connection status**:
   ```javascript
   // MongoDB Compass
   db.connections.findOne({ 
     provider: ObjectId("provider_id"),
     patient: ObjectId("patient_id")
   })
   ```

2. **Expected**:
   ```json
   {
     "accessLevel": "full",
     "fullAccessStatus": "approved"
   }
   ```

3. **If not approved**, check patient side:
   - Patient logged in
   - Connection request visible in `/patient/connections`

4. **Check email sent**:
   ```javascript
   db.emailqueues.find({ 
     template: 'fullAccessRequest',
     to: "patient@email.com"
   })
   ```

5. **Manually approve** (if needed):
   ```javascript
   db.connections.updateOne(
     { _id: ObjectId("connection_id") },
     { $set: { 
       accessLevel: 'full', 
       fullAccessStatus: 'approved' 
     }}
   )
   ```

---

## Performance Optimization

### Backend Performance

**Optimization Techniques** (some implemented, some recommended):

1. **Database Query Optimization**:
   - ✅ Indexes on common queries (patient + date, provider + date)
   - ✅ Pagination for large result sets
   - ⚠️ Consider: Aggregation pipelines for complex queries
   - ⚠️ Consider: Caching frequently accessed data (Redis)

2. **API Response Time**:
   - ✅ Connection pooling (10-50 connections)
   - ⚠️ Consider: Response compression (gzip)
   - ⚠️ Consider: API rate limiting per user

3. **File Handling**:
   - ✅ File streaming (not loading entire file into memory)
   - ⚠️ Consider: CDN for static file serving
   - ⚠️ Consider: Image optimization/resizing

---

### Frontend Performance

**Optimization Techniques**:

1. **Code Splitting**:
   - ✅ Lazy-loaded pages (React.lazy + Suspense)
   - ✅ Dynamic imports

2. **Bundle Size**:
   - ✅ Tree shaking (via CRA)
   - ⚠️ Consider: Analyze bundle size (`npm run build -- --stats`)
   - ⚠️ Consider: Remove unused dependencies

3. **Rendering Performance**:
   - ⚠️ Consider: React.memo for expensive components
   - ⚠️ Consider: useMemo/useCallback for expensive calculations
   - ⚠️ Consider: Virtual scrolling for long lists

---

## Monitoring Tools & Services

### Recommended Additions (Not Currently Implemented)

**Application Monitoring**:
- **New Relic** - Application performance monitoring (APM)
- **Datadog** - Infrastructure and application monitoring
- **Sentry** - Error tracking and reporting

**Uptime Monitoring**:
- **UptimeRobot** - Free uptime monitoring (checks every 5 minutes)
- **Pingdom** - Uptime and performance monitoring

**Log Management**:
- **Loggly** - Centralized log management
- **Papertrail** - Real-time log aggregation

**Security Monitoring**:
- **Snyk** - Dependency vulnerability scanning
- **npm audit** - Built-in vulnerability checking

---

## Operational Procedures

### Weekly Maintenance

**Tasks** (30-60 minutes):
- [ ] Review error logs for patterns
- [ ] Check failed email queue
- [ ] Verify database backups (if enabled)
- [ ] Update dependencies (minor versions): `npm update`
- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Check Render service metrics (CPU, memory usage)
- [ ] Review MongoDB Atlas performance metrics

---

### Monthly Maintenance

**Tasks** (1-2 hours):
- [ ] Cleanup orphaned data: `npm run cleanup:orphaned`
- [ ] Review and archive old logs
- [ ] Update dependencies (major versions if needed)
- [ ] Security audit: `npm audit`
- [ ] Database index optimization review
- [ ] Disk space check (Render persistent disk)
- [ ] Review and rotate API keys (SendGrid, OAuth)

---

### Quarterly Maintenance

**Tasks** (2-4 hours):
- [ ] Full security audit
- [ ] Load testing (if high traffic expected)
- [ ] Review and update documentation
- [ ] Dependency major version upgrades
- [ ] Database performance optimization
- [ ] Cost optimization review (downgrade/upgrade services)

---

## Emergency Procedures

### Service Down

**Immediate Actions**:
1. Check Render dashboard for service status
2. Check recent deployments (bad deploy?)
3. Check logs for errors
4. Attempt manual restart (Render dashboard → "Manual Deploy")

**If Database Connection Failed**:
1. Check MongoDB Atlas cluster status
2. Verify connection string in environment variables
3. Check MongoDB Atlas network access (IP whitelist)

**If Out of Memory**:
1. Upgrade Render instance (temporarily)
2. Check for memory leaks in code
3. Optimize queries and data loading

---

### Data Loss

**Immediate Actions**:
1. Stop writes (put application in maintenance mode if possible)
2. Identify affected data (check database timestamps)
3. Restore from backup (MongoDB Atlas)
4. Communicate with affected users

**Prevention**:
- Enable automated backups (MongoDB Atlas M10+)
- Test restore procedure regularly
- Implement soft deletes (partially implemented for medical records)

---

### Security Breach

**Immediate Actions**:
1. **Rotate all secrets**: JWT secrets, API keys
2. **Force logout all users**: Clear user sessions/tokens
3. **Review audit logs**: Check for unauthorized access
4. **Patch vulnerability**: Fix security issue immediately
5. **Deploy fix**: Emergency deployment
6. **Notify users**: If sensitive data exposed

**Prevention**:
- Regular security audits
- Dependency vulnerability scanning (`npm audit`)
- Keep dependencies updated
- Follow security best practices

---

## Useful Commands Reference

### Server Operations

```bash
# Start server
cd server
npm run dev          # Development with auto-restart
npm start            # Production

# Database operations
npm run seed         # Seed test data
npm run seed:reset   # Reset test data
npm run test:db      # Test database connection
npm run cleanup:orphaned  # Cleanup orphaned records

# User management
npm run add:admin    # Add admin user
npm run update:admin # Update admin
npm run check:users  # List all users
npm run fix:auth     # Fix authentication issues
npm run fix:onboarding  # Fix onboarding status

# Testing
npm test             # Run Jest tests
npm run test:login   # Test login endpoint
```

---

### Client Operations

```bash
# Start frontend
cd client
npm start            # Development server
npm run build        # Production build

# Testing
npm test             # Run tests (if any)

# Utilities
npx eslint src/      # Lint code
```

---

### Database Operations

```bash
# MongoDB Compass GUI
# - Connect using MONGODB_ATLAS_URI
# - Browse collections visually
# - Run queries with GUI

# MongoDB Shell (mongosh)
mongosh "mongodb+srv://..."
use onus-health
db.users.find({ role: 'patient' }).count()
db.consultations.find().sort({ createdAt: -1 }).limit(10)
```

---

## Debug Mode Configuration

### Enable Debug Logging

**Backend**:
```env
# In server/.env
NODE_ENV=development
LOG_LEVEL=debug
```

**Effect**: More verbose logging, including:
- Request/response payloads
- Database queries (if Mongoose debug enabled)
- JWT token operations
- Email queueing

---

### Disable Debug Features in Production

**Checklist**:
- [ ] `NODE_ENV=production`
- [ ] No console.log statements (use logger)
- [ ] Redux DevTools disabled
- [ ] Source maps disabled (or uploaded to error tracking service)
- [ ] Debug endpoints removed or protected

---

## Summary

### Operational Tools

| Tool | Purpose | Access |
|------|---------|--------|
| **Render Dashboard** | Service monitoring, logs, deployments | [dashboard.render.com](https://dashboard.render.com) |
| **MongoDB Atlas** | Database monitoring, backups | [cloud.mongodb.com](https://cloud.mongodb.com) |
| **SendGrid Dashboard** | Email delivery stats | [app.sendgrid.com](https://app.sendgrid.com) |
| **MongoDB Compass** | Database GUI, query builder | Desktop application |
| **Postman/Insomnia** | API testing | Desktop application |
| **React DevTools** | Frontend debugging | Browser extension |
| **Redux DevTools** | State debugging | Browser extension |

### Maintenance Scripts

| Category | Script Count | Location |
|----------|--------------|----------|
| **Database** | 10+ | `server/scripts/` |
| **Admin** | 8 | `server/scripts/` |
| **Testing** | 8 | `server/scripts/test/` |
| **Debugging** | 5 | `server/scripts/` |

### Common Issues & Solutions

| Issue | Quick Fix | Documentation |
|-------|-----------|---------------|
| **Login fails** | `npm run fix:auth` | `docs/TROUBLESHOOTING.md` |
| **Onboarding loop** | `npm run fix:onboarding` | - |
| **Database connection** | `npm run test:db` | [05-Database-Design.md](./05-Database-Design.md) |
| **Email not sending** | `node scripts/testEmailSending.js` | `docs/EMAIL_FUNCTIONALITY.md` |
| **Orphaned data** | `npm run cleanup:orphaned` | - |

---

## Next Steps

To improve operations and maintenance:

1. **Set Up Monitoring**: Add uptime monitoring (UptimeRobot)
2. **Enable Backups**: Upgrade MongoDB Atlas to M10+ for automated backups
3. **Add Error Tracking**: Integrate Sentry or similar
4. **Document Procedures**: Create runbooks for common issues
5. **Automate Maintenance**: Schedule cleanup scripts

---

**Document Version**: 1.0  
**Last Updated**: November 19, 2025  
**Previous Document**: [11-Deployment-Environments.md](./11-Deployment-Environments.md)  
**Next Document**: [13-Known-Issues-Technical-Debt.md](./13-Known-Issues-Technical-Debt.md)

