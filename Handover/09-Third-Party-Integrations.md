# 9. Third-Party Integrations

This document explains all third-party services and APIs integrated into the Onus Health Application.

---

## Overview of Integrations

The application integrates with 6 primary third-party services:

| Service | Purpose | Configuration | Status |
|---------|---------|---------------|--------|
| **MongoDB Atlas** | Cloud database | `MONGODB_ATLAS_URI` | ✅ Active |
| **SendGrid** | Primary email service | `SENDGRID_API_KEY` | ✅ Active |
| **Nodemailer** | Fallback email service | SMTP settings | ✅ Fallback |
| **Google OAuth 2.0** | Social authentication | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | ✅ Active |
| **Facebook OAuth** | Social authentication | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | ✅ Active |
| **Render** | Hosting platform | Environment variables via dashboard | ✅ Active |

---

## 1. MongoDB Atlas (Cloud Database)

### Purpose
Cloud-hosted MongoDB database for all application data.

### Configuration

**Environment Variable**: `MONGODB_ATLAS_URI`  
**Format**: `mongodb+srv://username:password@cluster.mongodb.net/onus-health?retryWrites=true&w=majority&readPreference=primary`

**Connection File**: `server/utils/database.js`  
**Config File**: `server/config/environment.js` (lines 13-52)

### Features Used
- **Shared Cluster** (free tier M0 or paid)
- **Database Name**: `onus-health`
- **Connection Pooling**: 10 connections (dev), 50 (production)
- **Automatic Reconnection**: With exponential backoff
- **Monitoring**: Connection health checks and ping monitoring

### Setup Instructions

1. Create MongoDB Atlas account: [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create new cluster
3. Create database user with read/write permissions
4. Whitelist IP addresses:
   - Development: Your local IP or `0.0.0.0/0` (all IPs)
   - Production: Render's IP addresses (automatic via Render integration)
5. Get connection string from "Connect" → "Connect your application"
6. Set `MONGODB_ATLAS_URI` in environment variables

### Monitoring

**MongoDB Atlas Dashboard**:
- Database size and document counts
- Connection metrics
- Query performance
- Alerts and notifications

**Application Monitoring**:
- Connection status: `GET /api/status/db`
- Health check: `GET /health`
- Connection logs in `server/logs/combined.log`

**See**: [[memory:3196676]] - MongoDB Atlas is the only database used.

---

## 2. SendGrid (Primary Email Service)

### Purpose
Transactional email delivery for verification, notifications, and password resets.

### Configuration

**Environment Variable**: `SENDGRID_API_KEY`  
**Format**: `SG.xxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`  
**Sender Email**: `EMAIL_FROM` (e.g., `no-reply@onus.health`)

**Service File**: `server/services/email.service.js` (lines 1-680)  
**Initialization**: Lines 15-20

```javascript
if (config.sendgridApiKey && config.sendgridApiKey.startsWith('SG.')) {
  sgMail.setApiKey(config.sendgridApiKey);
} else {
  console.warn('Valid SendGrid API key not provided. Email sending via SendGrid will be disabled.');
}
```

### Email Templates

**Location**: `server/templates/emails/`  
**Template Engine**: Handlebars  
**Count**: 17 email templates

| Template | Filename | Trigger | Recipient |
|----------|----------|---------|-----------|
| **Email Verification** | `verification.html` | User registration | New user |
| **Password Reset** | `passwordReset.html` | Forgot password request | User requesting reset |
| **Password Reset Success** | `passwordResetSuccess.html` | Password reset completed | User who reset password |
| **Provider Verification Request** | `providerVerificationRequest.html` | Provider completes onboarding | Admin |
| **Provider Approval** | `providerVerificationApproval.html` | Admin approves provider | Provider |
| **Provider Rejection** | `providerVerificationRejection.html` | Admin rejects provider | Provider |
| **New Connection** | `newConnection.html` | Provider creates first consultation | Patient |
| **Connection Request** | `accessRequest.html` | Provider manually adds patient | Patient |
| **Full Access Request** | `fullAccessRequest.html` | Provider requests full access | Patient |
| **Full Access Approved** | `fullAccessApproved.html` | Patient approves full access | Provider |
| **Full Access Denied** | `fullAccessDenied.html` | Patient denies full access | Provider |
| **Access Revoked** | `accessRevoked.html` | Patient revokes provider access | Provider |
| **Consultation Notification** | `consultationNotification.html` | Consultation completed | Patient |
| **Consultation Completed** | `consultationCompleted.html` | Consultation status updated | Patient |
| **Connection Removed** | `connectionRemoved.html` | Patient deletes connection | Provider |

**Template Structure** (example):

```html
<!DOCTYPE html>
<html>
<head>
  <title>{{title}}</title>
</head>
<body>
  <h1>Hello {{firstName}},</h1>
  <p>{{message}}</p>
  <a href="{{actionUrl}}" style="...">{{actionText}}</a>
  <p>Best regards,<br>Onus Health Team</p>
</body>
</html>
```

**Template Rendering**: `server/utils/templateRenderer.js`

```javascript
const renderTemplate = async (templateName, data) => {
  const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.html`);
  const templateSource = fs.readFileSync(templatePath, 'utf8');
  const template = Handlebars.compile(templateSource);
  return template(data);
};
```

### Email Queue System

**Purpose**: Reliable email delivery with retry logic

**Model**: `server/models/EmailQueue.js`  
**Processor**: `server/services/email.service.js` (lines 570-650)

**Features**:
- **Automatic Queueing**: Emails are queued rather than sent immediately
- **Background Processing**: Queue processor runs every 60 seconds
- **Retry Logic**: Failed emails retried at intervals (5 min, 15 min, 60 min)
- **Status Tracking**: Pending, processing, sent, failed
- **Priority Levels**: 0 = normal, 1 = high, 2 = urgent

**Queue Processor**:

```javascript
const processEmailQueue = async () => {
  const pendingEmails = await EmailQueue.find({
    status: 'pending',
    $or: [
      { nextAttempt: { $exists: false } },
      { nextAttempt: { $lte: Date.now() } }
    ],
    attempts: { $lt: maxAttempts }
  }).sort({ priority: -1, createdAt: 1 }).limit(10);
  
  for (const email of pendingEmails) {
    try {
      await sendEmail(email);
      email.status = 'sent';
    } catch (error) {
      email.attempts++;
      if (email.attempts >= maxAttempts) {
        email.status = 'failed';
      } else {
        // Schedule next retry
        const retryInterval = retryIntervals[email.attempts - 1] || 60;
        email.nextAttempt = Date.now() + (retryInterval * 60 * 1000);
      }
    }
    await email.save();
  }
};

// Start processor
setInterval(processEmailQueue, 60000); // Every 60 seconds
```

**Startup**: Automatically starts when server starts (see `server/server.js` lines 217-220).

### Testing

**Test Scripts**:
```bash
# Test email sending
node server/scripts/testEmailSending.js

# Test all email templates
node server/scripts/testAllEmails.js your.email@example.com

# Test email verification flow
node server/scripts/testEmailVerification.js
```

**Test Mode**: Set `TEST_MODE=true` to skip email sending and log instead.

### SendGrid Dashboard

**Access**: [app.sendgrid.com](https://app.sendgrid.com)

**Features**:
- View email delivery stats
- Check bounce/spam reports
- Manage sender authentication
- View email activity logs

**Sender Verification**: Free tier requires sender email verification in SendGrid dashboard.

---

## 3. Nodemailer (Fallback Email Service)

### Purpose
SMTP-based email sending as fallback if SendGrid unavailable.

### Configuration

**Environment Variables**:
- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - Port (587 or 465)
- `SMTP_SECURE` - Use TLS (true/false)
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password

**Initialization** (`email.service.js` lines 23-34):

```javascript
let transporter = null;
if (config.smtp && config.smtp.host) {
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: {
      user: config.smtp.auth.user,
      pass: config.smtp.auth.pass
    }
  });
}
```

### Fallback Logic

**Automatic Fallback** (in `sendEmail` function):

```javascript
const sendEmail = async (emailData) => {
  // Try SendGrid first
  try {
    await sgMail.send(email);
    logger.info('Email sent via SendGrid');
    return true;
  } catch (error) {
    logger.warn('SendGrid failed, trying Nodemailer fallback');
    
    // Fallback to Nodemailer
    if (transporter) {
      await transporter.sendMail(email);
      logger.info('Email sent via Nodemailer');
      return true;
    }
    
    throw new Error('Both SendGrid and Nodemailer failed');
  }
};
```

**Status**: **Optional** - Not required if SendGrid is working.

---

## 4. Google OAuth 2.0 (Social Authentication)

### Purpose
"Sign in with Google" functionality for easier registration/login.

### Configuration

**Environment Variables**:
- `GOOGLE_CLIENT_ID` - OAuth 2.0 client ID
- `GOOGLE_CLIENT_SECRET` - OAuth 2.0 client secret
- `GOOGLE_CALLBACK_URL` - Callback URL (e.g., `http://localhost:5001/api/auth/google/callback`)

**Passport Strategy**: `server/config/passport.js` (lines 54-99)

**Frontend Trigger**: "Sign in with Google" button in `pages/auth/SignIn.jsx`

### Setup Instructions

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project (or select existing)
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure OAuth consent screen:
   - Application name: "Onus Health"
   - Scopes: email, profile
6. Add authorized redirect URIs:
   - Development: `http://localhost:5001/api/auth/google/callback`
   - Production: `https://onus-backend.onrender.com/api/auth/google/callback`
7. Copy Client ID and Client Secret to environment variables

### Authentication Flow

```
User clicks "Sign in with Google"
   ↓
Frontend redirects to /api/auth/google
   ↓
Backend redirects to Google OAuth consent page
   ↓
User authorizes app
   ↓
Google redirects to /api/auth/google/callback with auth code
   ↓
Backend exchanges code for access token
   ↓
Backend fetches user profile (email, name)
   ↓
Backend checks if user exists:
   - By googleId → Login existing user
   - By email → Link Google account to existing user
   - New user → Create user with googleId, isEmailVerified: true, role: 'patient'
   ↓
Backend generates JWT tokens
   ↓
Backend redirects to frontend with tokens in URL:
   /auth/social-callback?authToken={token}&refreshToken={token}
   ↓
Frontend stores tokens and navigates to dashboard
```

**Implementation**: `server/config/passport.js` lines 56-98, `server/routes/auth.routes.js` lines 28-57

**Account Linking**: If email exists, Google ID is linked to existing account.

**Default Role**: Google users default to `role: 'patient'`.

---

## 5. Facebook OAuth (Social Authentication)

### Purpose
"Sign in with Facebook" functionality.

### Configuration

**Environment Variables**:
- `FACEBOOK_APP_ID` - Facebook App ID
- `FACEBOOK_APP_SECRET` - Facebook App Secret
- `FACEBOOK_CALLBACK_URL` - Callback URL (e.g., `http://localhost:5001/api/auth/facebook/callback`)

**Passport Strategy**: `server/config/passport.js` (lines 102-151)

### Setup Instructions

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create new app or select existing
3. Add "Facebook Login" product
4. Configure settings:
   - Valid OAuth Redirect URIs:
     - Development: `http://localhost:5001/api/auth/facebook/callback`
     - Production: `https://onus-backend.onrender.com/api/auth/facebook/callback`
5. Get App ID and App Secret from Settings → Basic
6. Set environment variables

### Authentication Flow

Similar to Google OAuth (see above), with Facebook-specific endpoints:
- `/api/auth/facebook` - Initiate OAuth
- `/api/auth/facebook/callback` - Handle callback

**Implementation**: `server/config/passport.js` lines 104-151, `server/routes/auth.routes.js` lines 60-81

**Note**: Facebook OAuth requires email permission (`scope: ['email']`).

---

## 6. Render (Hosting Platform)

### Purpose
Platform-as-a-Service (PaaS) hosting for both frontend and backend.

### Configuration

**File**: `render.yaml` (root directory)

**Services Defined**:

#### Backend Service (`onus-backend`)
- **Type**: Web service
- **Runtime**: Node.js
- **Region**: Frankfurt (FRA) - closest to Namibia for lowest latency
- **Build Command**: `cd server && npm install`
- **Start Command**: `cd server && npm start`
- **Port**: 10000 (Render default)

**Environment Variables** (set via dashboard):
```yaml
NODE_ENV: production
MONGODB_ATLAS_URI: (from dashboard - secure)
JWT_SECRET: (from dashboard - secure)
JWT_REFRESH_SECRET: (from dashboard - secure)
SENDGRID_API_KEY: (from dashboard - secure)
FRONTEND_URL: https://onus-frontend.onrender.com
SESSION_TIMEOUT: "30"
```

#### Frontend Service (`onus-frontend`)
- **Type**: Static site
- **Runtime**: Static
- **Region**: Frankfurt (FRA)
- **Build Command**: `cd client && npm install && npm run build`
- **Publish Path**: `./client/build`

**Environment Variables**:
```yaml
REACT_APP_API_URL: https://onus-backend.onrender.com/api
REACT_APP_SESSION_TIMEOUT: "1800000"
NODE_ENV: production
```

### Deployment Flow

**Automatic Deployment** (Git-based):

```
Developer pushes to GitHub main branch
   ↓
Render detects new commit
   ↓
Render builds backend:
   - cd server
   - npm install
   - npm start
   ↓
Render builds frontend:
   - cd client
   - npm install
   - npm run build
   - Serve static files from client/build
   ↓
Both services deployed and live
```

**Manual Deployment**: Via Render dashboard → "Manual Deploy" button.

### Features Used

**Persistent Disk** (Backend):
- **Mount Point**: `/mnt/data`
- **Usage**: File uploads (profile images, licenses, consultation attachments)
- **Size**: Configurable (starts at 1GB free)

**Environment Variables** (managed via dashboard):
- Secure storage for secrets
- Per-service configuration
- No `.env` files committed to Git

**Custom Headers** (frontend):
```yaml
headers:
  - path: /*
    name: X-Frame-Options
    value: DENY
  - path: /*
    name: Content-Security-Policy
    value: "default-src 'self'; img-src 'self' data: https:; ..."
```

**SPA Routing** (frontend):
```yaml
routes:
  - type: rewrite
    source: /*
    destination: /index.html
```

**Purpose**: All routes rewritten to `index.html` for client-side routing (React Router).

### Monitoring

**Render Dashboard**:
- Service health status
- Request logs
- CPU and memory usage
- Build logs
- Environment variable management

**See**: `docs/RENDER_DEPLOYMENT.md` for detailed deployment guide, [[memory:3993964]] for environment variable management.

---

## Email Integration Details

### Email Service Architecture

**File**: `server/services/email.service.js`

**Key Functions**:

| Function | Purpose | Queued? |
|----------|---------|---------|
| `sendEmail(emailData)` | Direct send with SendGrid/Nodemailer | No |
| `queueEmail(emailData)` | Add to queue for async sending | Yes |
| `sendTemplateEmail(to, template, data)` | Send using Handlebars template | Yes (default) |
| `sendVerificationEmail(user, token)` | Email verification | Yes |
| `sendPasswordResetEmail(user, token)` | Password reset | Yes |
| `sendConsultationNotificationEmail(patient, provider, consultation)` | New consultation | Yes |
| `sendProviderVerificationRequestEmail(provider)` | Admin notification | No (immediate) |
| `sendProviderVerificationApprovalEmail(provider)` | Provider approved | No (immediate) |
| `sendConnectionRequestEmail(patient, provider)` | Connection created | Yes |
| `sendFullAccessRequestEmail(patient, provider)` | Full access requested | Yes |

**Queueing Strategy**:
- **Queued**: Most emails (allows retry on failure)
- **Immediate**: Critical emails (provider verification to admin, approval emails)

**Queue Processing**:
- **Interval**: Every 60 seconds (configurable via `QUEUE_PROCESS_INTERVAL`)
- **Batch Size**: 10 emails per batch
- **Retry Intervals**: 5 min, 15 min, 60 min
- **Max Attempts**: 3

**See**: `server/docs/EMAIL_FUNCTIONALITY.md` for complete email documentation.

---

## OAuth Integration Details

### OAuth Flow Comparison

| Aspect | Google OAuth | Facebook OAuth |
|--------|--------------|----------------|
| **Strategy** | passport-google-oauth20 | passport-facebook |
| **Scopes** | profile, email | email |
| **Profile Fields** | name.givenName, name.familyName, emails | name, emails |
| **Email Required** | Yes (always present) | Yes (but may be missing) |
| **Account Linking** | By email or googleId | By email or facebookId |
| **Default Role** | patient | patient |

### Account Creation Logic

**Google** (`passport.js` lines 64-93):

```javascript
async (accessToken, refreshToken, profile, done) => {
  // Check if user exists with Google ID
  let user = await User.findOne({ googleId: profile.id });
  if (user) return done(null, user);
  
  // Check if user exists with same email
  user = await User.findOne({ email: profile.emails[0].value });
  if (user) {
    // Link Google ID to existing account
    user.googleId = profile.id;
    await user.save();
    return done(null, user);
  }
  
  // Create new user
  const newUser = new User({
    googleId: profile.id,
    email: profile.emails[0].value,
    firstName: profile.name.givenName,
    lastName: profile.name.familyName,
    isEmailVerified: true,  // OAuth users pre-verified
    role: 'patient'
  });
  await newUser.save();
  return done(null, newUser);
}
```

**Facebook**: Nearly identical, checks `facebookId` instead.

**Security Note**: OAuth tokens are not stored in database (stateless authentication).

---

## Integration Configuration Summary

### Required Environment Variables

**Development** (`.env` in `server/`):
```env
# Required
MONGODB_ATLAS_URI=mongodb+srv://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
SENDGRID_API_KEY=SG...

# Optional (social login)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:5001/api/auth/google/callback

FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
FACEBOOK_CALLBACK_URL=http://localhost:5001/api/auth/facebook/callback
```

**Production** (Render dashboard):
- Same variables, but callback URLs use production domain
- All secrets managed via Render dashboard (not in `.env` files)

**See**: `ENV_TEMPLATE.md` for complete environment variable template.

---

## Third-Party API Costs & Limits

### MongoDB Atlas

**Free Tier (M0)**:
- 512 MB storage
- Shared CPU
- Shared RAM
- Sufficient for development and small-scale production

**Paid Tiers**: Start at ~$9/month for M10 (dedicated cluster)

### SendGrid

**Free Tier**:
- 100 emails/day
- Requires sender verification
- Sufficient for development

**Paid Tiers**: 
- Essentials: $19.95/month for 50,000 emails
- Pro: $89.95/month for 100,000 emails

**Current Usage**: Likely on free tier (development) or Essentials (production).

### Google OAuth

**Cost**: Free (up to millions of users)

**Quotas**:
- 10,000 requests/day (OAuth API)
- Sufficient for most applications

### Facebook OAuth

**Cost**: Free

**Limits**: No strict limits for standard use cases

### Render

**Free Tier**:
- Web service: 750 hours/month (goes to sleep after 15 min inactivity)
- Static site: Unlimited
- Persistent disk: 1 GB free

**Paid Tiers**:
- Starter: $7/month per service (always on, no sleep)
- Standard: $25/month (more resources)

**Current Usage**: Likely on paid tier (backend needs to be always on for health app).

---

## Monitoring & Debugging Integrations

### MongoDB Atlas
- **Dashboard**: View queries, connections, performance
- **Application Logs**: `server/logs/combined.log`
- **Health Check**: `GET /api/status/db`

### SendGrid
- **Dashboard**: Email activity, delivery stats, bounce reports
- **Application Logs**: Email queue status in database
- **Test Script**: `node server/scripts/testEmailSending.js`

### OAuth Providers
- **Google Console**: View API usage, errors
- **Facebook Developers**: View app activity
- **Application Logs**: OAuth callback logs in `server/logs/`

### Render
- **Dashboard**: Service logs, metrics, deployment history
- **Application Logs**: Accessible via Render dashboard or shell access
- **Health Check**: Render automatically monitors service health

---

## Known Integration Issues

### 1. SendGrid Free Tier Limits ⚠️

**Issue**: 100 emails/day limit on free tier.

**Impact**: Production app may hit limit with high user activity.

**Recommendation**: Upgrade to Essentials plan ($19.95/month) for 50,000 emails/day.

---

### 2. OAuth Callback URLs Must Match Exactly ⚠️

**Issue**: OAuth fails if callback URL doesn't match configured URL (including http vs https, trailing slashes).

**Solution**: Ensure environment variable matches provider configuration exactly.

---

### 3. MongoDB Atlas IP Whitelist

**Issue**: Connection fails if client IP not whitelisted.

**Solution**: 
- Development: Add local IP or use `0.0.0.0/0` (all IPs)
- Production: Render integration auto-whitelists Render IPs

---

### 4. Render Cold Starts (Free Tier)

**Issue**: Backend goes to sleep after 15 minutes of inactivity (free tier).

**Impact**: First request after sleep takes ~30 seconds to wake up.

**Solution**: Upgrade to paid tier ($7/month) for always-on service.

---

## Summary

### Integration Status

| Integration | Status | Required | Configuration File |
|-------------|--------|----------|-------------------|
| MongoDB Atlas | ✅ Active | Yes | `server/config/environment.js` |
| SendGrid | ✅ Active | Yes* | `server/services/email.service.js` |
| Nodemailer | ✅ Configured | No | `server/services/email.service.js` |
| Google OAuth | ✅ Active | No | `server/config/passport.js` |
| Facebook OAuth | ✅ Active | No | `server/config/passport.js` |
| Render | ✅ Active | Yes (production) | `render.yaml` |

*Required for email functionality (verification, password reset, notifications)

---

## Next Steps

To work with third-party integrations:

1. **Set Up Development Credentials**: Get API keys for MongoDB, SendGrid, OAuth providers
2. **Test Email Sending**: Run `node server/scripts/testEmailSending.js`
3. **Review Render Config**: Read `render.yaml` and `docs/RENDER_DEPLOYMENT.md`
4. **Monitor Integration Health**: Check dashboards for all services
5. **Read Email Service**: `server/services/email.service.js` for email implementation details

---

**Document Version**: 1.0  
**Last Updated**: November 19, 2025  
**Previous Document**: [08-Domain-Specific-Flows.md](./08-Domain-Specific-Flows.md)  
**Next Document**: [10-Testing-Linting-Quality.md](./10-Testing-Linting-Quality.md)

