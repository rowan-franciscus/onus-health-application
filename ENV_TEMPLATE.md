# Environment Variables Template

This file shows the structure of required environment variables without exposing actual secrets.

## Server Environment Variables (.env in server directory)

```env
# Server Configuration
PORT=5001
NODE_ENV=development

# MongoDB Configuration
MONGODB_ATLAS_URI=mongodb+srv://username:password@cluster.mongodb.net/onus-health?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=generate_a_secure_random_string_here
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=generate_another_secure_random_string_here
JWT_REFRESH_EXPIRES_IN=30d

# Email Configuration
MAIL_PROVIDER=sendgrid
EMAIL_FROM=no-reply@onus.health
SUPPORT_EMAIL=support@onus.health
SUPPORT_PHONE=081 000 0000

# SendGrid
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here

# Admin email for provider verification notifications
ADMIN_EMAIL=admin@example.com

# Frontend URL (for CORS and email links)
FRONTEND_URL=http://localhost:3000

# Session timeout in minutes
SESSION_TIMEOUT=30

# Audit trail retention in days (default 2190 = 6 years; see server/docs/AUDIT_TRAIL.md)
# Read by scripts/audit-retention-report.js to produce the manual purge cutoff
AUDIT_LOG_RETENTION_DAYS=2190

# Where audit events are parked if the database rejects them, for later replay
# with scripts/replay-audit-dead-letter.js (default logs/audit-dead-letter.log)
AUDIT_DEAD_LETTER_PATH=logs/audit-dead-letter.log
```

## Client Environment Variables (.env in client directory)

```env
# API URL
REACT_APP_API_URL=http://localhost:5001/api

# Session timeout in milliseconds (30 minutes)
REACT_APP_SESSION_TIMEOUT=1800000
```

## Production Environment Variables (Set in Render Dashboard)

### Backend Service
- `NODE_ENV=production`
- `MONGODB_ATLAS_URI=your_production_mongodb_uri`
- `JWT_SECRET=generate_secure_production_secret`
- `JWT_REFRESH_SECRET=generate_secure_production_refresh_secret`
- `SENDGRID_API_KEY=your_sendgrid_api_key`
- `EMAIL_FROM=no-reply@onus.health`
- `SUPPORT_EMAIL=support@onus.health`
- `SUPPORT_PHONE=081 000 0000`
- `ADMIN_EMAIL=admin@onus.health`
- `FRONTEND_URL=https://your-frontend-url.onrender.com`
- `SESSION_TIMEOUT=30`
- `AUDIT_LOG_RETENTION_DAYS=2190`
- `AUDIT_DEAD_LETTER_PATH=logs/audit-dead-letter.log`

### Frontend Service
- `REACT_APP_API_URL=https://your-backend-url.onrender.com/api`
- `REACT_APP_SESSION_TIMEOUT=1800000` 