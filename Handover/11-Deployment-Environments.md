# 11. Deployment & Environments

This document explains how the Onus Health Application is deployed, environment configuration, and deployment procedures.

---

## Deployment Overview

**Platform**: Render ([render.com](https://render.com))  
**Deployment Type**: Platform-as-a-Service (PaaS)  
**Services**: 2 separate services (backend + frontend)  
**Deployment Trigger**: Git push to `main` branch (automatic)  
**Configuration File**: `render.yaml` (Infrastructure as Code)

---

## Environment Types

The application supports 3 environments:

| Environment | Backend URL | Frontend URL | Database | Purpose |
|-------------|-------------|--------------|----------|---------|
| **Development** | `http://localhost:5001` | `http://localhost:3000` | MongoDB Atlas (dev cluster) | Local development |
| **Test** | In-memory | N/A | MongoDB Memory Server | Automated testing |
| **Production** | `https://onus-backend.onrender.com` | `https://onus-frontend.onrender.com` | MongoDB Atlas (prod cluster) | Live application |

**Environment Detection**:
- Backend: `NODE_ENV` environment variable (`development`, `test`, `production`)
- Frontend: `process.env.NODE_ENV` (set automatically by CRA)

**Configuration**: `server/config/environment.js` (lines 75-164)

---

## Render Deployment Configuration

### Configuration File: `render.yaml`

**Location**: Root directory  
**Purpose**: Defines infrastructure and deployment settings for both services

**Structure**:

```yaml
services:
  # Backend Service
  - type: web
    name: onus-backend
    runtime: node
    region: fra  # Frankfurt, Germany
    buildCommand: cd server && npm install
    startCommand: cd server && npm start
    envVars: [...]
  
  # Frontend Service
  - type: static
    name: onus-frontend
    runtime: static
    region: fra
    buildCommand: cd client && npm install && npm run build
    staticPublishPath: ./client/build
    envVars: [...]
```

---

### Backend Service Configuration

**Service Name**: `onus-backend`  
**Type**: Web service (Node.js)  
**Region**: Frankfurt (FRA) - Closest to Namibia for lowest latency

**Build Process**:
```bash
cd server
npm install
```

**Start Command**:
```bash
cd server
npm start  # Runs: node server.js
```

**Port**: 10000 (Render's default, auto-assigned)

**Environment Variables** (from `render.yaml`):

```yaml
envVars:
  - key: NODE_ENV
    value: production
  - key: PORT
    value: 10000
  - key: MONGODB_ATLAS_URI
    sync: false  # Set from Render dashboard (secure)
  - key: JWT_SECRET
    sync: false  # Set from Render dashboard (secure)
  - key: JWT_REFRESH_SECRET
    sync: false  # Set from Render dashboard (secure)
  - key: JWT_EXPIRES_IN
    value: 7d
  - key: JWT_REFRESH_EXPIRES_IN
    value: 30d
  - key: SENDGRID_API_KEY
    sync: false  # Set from Render dashboard (secure)
  - key: EMAIL_FROM
    value: no-reply@onus.health
  - key: SUPPORT_EMAIL
    value: support@onus.health
  - key: SUPPORT_PHONE
    value: 081 000 0000
  - key: SESSION_TIMEOUT
    value: "30"
  - key: FRONTEND_URL
    value: https://onus-frontend.onrender.com
  - key: MAX_FILE_SIZE
    value: "5242880"  # 5MB
```

**Secure Variables** (`sync: false`):
- Must be set via Render dashboard
- Not visible in `render.yaml`
- Encrypted at rest

**See**: [[memory:3993964]] - Environment variables configured via Render dashboard, .env files not committed.

---

### Frontend Service Configuration

**Service Name**: `onus-frontend`  
**Type**: Static site  
**Region**: Frankfurt (FRA)

**Build Process**:
```bash
cd client
npm install
npm run build  # Creates production build in client/build/
```

**Publish Path**: `./client/build`  
**Web Server**: Render's static file server (Nginx)

**Environment Variables**:

```yaml
envVars:
  - key: REACT_APP_API_URL
    value: https://onus-backend.onrender.com/api
  - key: REACT_APP_SESSION_TIMEOUT
    value: "1800000"  # 30 minutes in milliseconds
  - key: NODE_ENV
    value: production
```

**Custom Headers** (security):

```yaml
headers:
  - path: /*
    name: X-Frame-Options
    value: DENY
  - path: /*
    name: Content-Security-Policy
    value: "default-src 'self'; img-src 'self' data: https:; ..."
```

**SPA Routing** (React Router support):

```yaml
routes:
  - type: rewrite
    source: /*
    destination: /index.html
```

**Effect**: All routes rewritten to `index.html` for client-side routing.

---

## Deployment Process

### Automatic Deployment (Git-Based)

**Trigger**: Push to `main` branch on GitHub

**Flow**:

```
Developer commits and pushes to main
   ↓
GitHub webhook notifies Render
   ↓
Render clones repository
   ↓
BACKEND BUILD:
  cd server
  npm install
  [Build complete]
   ↓
BACKEND DEPLOY:
  npm start (node server.js)
  Health check: GET /health
  [Service live on https://onus-backend.onrender.com]
   ↓
FRONTEND BUILD:
  cd client
  npm install
  npm run build
  [Build complete in client/build/]
   ↓
FRONTEND DEPLOY:
  Static files served from client/build/
  [Service live on https://onus-frontend.onrender.com]
   ↓
DEPLOYMENT COMPLETE
```

**Build Time**: 
- Backend: 1-2 minutes
- Frontend: 2-4 minutes
- **Total**: ~5 minutes

**Zero Downtime**: Render uses rolling deployments (new version deployed before old version stopped).

---

### Manual Deployment

**Via Render Dashboard**:
1. Login to [dashboard.render.com](https://dashboard.render.com)
2. Select service (onus-backend or onus-frontend)
3. Click "Manual Deploy" → "Deploy latest commit"
4. Monitor deployment logs in real-time

**Use Cases**:
- Re-deploy after environment variable change
- Force rebuild without code changes
- Rollback to previous deployment (via dashboard)

---

## Environment Variable Management

### Development Environment

**Storage**: `.env` files (gitignored)

**Files**:
- `server/.env` - Backend configuration
- `client/.env` - Frontend configuration (optional, proxied)

**Loading**: `dotenv` package (`require('dotenv').config()`)

**See**: [03-Local-Development-Setup.md](./03-Local-Development-Setup.md#environment-variables) for full list.

---

### Production Environment (Render)

**Storage**: Render dashboard (encrypted)

**Setting Variables**:
1. Go to Render dashboard
2. Select service (onus-backend or onus-frontend)
3. Click "Environment" tab
4. Add/edit environment variables
5. **Important**: Service auto-redeploys when variables change

**Secure Variables**:
- `MONGODB_ATLAS_URI`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `SENDGRID_API_KEY`
- Google/Facebook OAuth credentials

**Best Practices**:
- Never commit `.env` files
- Use strong random strings for secrets (64+ characters)
- Rotate secrets periodically
- Limit access to Render dashboard

---

## File Storage (Persistent Disk)

### Development

**Path**: `server/uploads/`  
**Structure**:
```
server/uploads/
├── profile-images/
├── licenses/
└── consultations/
```

**Gitignored**: Yes (see `.gitignore` line 53)

---

### Production (Render)

**Path**: `/mnt/data/uploads/`  
**Persistent Disk**: Render persistent disk (1GB free, expandable)

**Configuration** (in `file.routes.js` lines 11-18):

```javascript
const getBaseUploadDir = () => {
  // Check if running on Render with persistent storage
  if (process.env.RENDER && fs.existsSync('/mnt/data')) {
    return path.join('/mnt/data', 'uploads');
  }
  // Fall back to local uploads directory
  return path.join(__dirname, '../uploads');
};
```

**Render Persistent Disk Setup**:
1. Render dashboard → Service → "Disks"
2. Add new disk
3. Mount point: `/mnt/data`
4. Size: 1GB (free tier) or larger (paid)

**Important**: Without persistent disk, file uploads are **lost on each deployment** (Render uses ephemeral filesystem).

---

## Deployment Checklist

### Pre-Deployment

**Code Readiness**:
- [ ] All features tested locally
- [ ] No console.log or debug code in production
- [ ] Environment variables documented
- [ ] Database seeded (if new deployment)
- [ ] Tests passing (`npm test`)

**Configuration**:
- [ ] `render.yaml` updated with correct service names
- [ ] Environment variables set in Render dashboard
- [ ] MongoDB Atlas cluster accessible from Render
- [ ] SendGrid API key valid
- [ ] OAuth credentials configured (if using social login)

**Database**:
- [ ] MongoDB Atlas cluster created
- [ ] Database user created with read/write permissions
- [ ] IP whitelist configured (Render auto-whitelists their IPs)
- [ ] Connection string tested

**Render Setup**:
- [ ] Render account created
- [ ] GitHub repository connected
- [ ] Services created (backend + frontend)
- [ ] Persistent disk configured (backend)
- [ ] Custom domain configured (optional)

---

### Deployment Steps (First Time)

**1. Create Render Account**
- Sign up at [render.com](https://render.com)
- Connect GitHub account

**2. Create Backend Service**
- Click "New +" → "Web Service"
- Connect repository
- Name: `onus-backend`
- Region: Frankfurt
- Branch: `main`
- Root directory: Leave empty (monorepo)
- Runtime: Node
- Build command: `cd server && npm install`
- Start command: `cd server && npm start`
- Instance type: Free or Starter ($7/month recommended)

**3. Set Backend Environment Variables**
- Go to service → Environment tab
- Add all required variables (see `render.yaml`)
- **Critical**: `MONGODB_ATLAS_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SENDGRID_API_KEY`

**4. Add Persistent Disk (Backend)**
- Go to service → Disks tab
- Add disk: Mount at `/mnt/data`, size 1GB+

**5. Create Frontend Service**
- Click "New +" → "Static Site"
- Connect same repository
- Name: `onus-frontend`
- Region: Frankfurt
- Branch: `main`
- Build command: `cd client && npm install && npm run build`
- Publish directory: `./client/build`

**6. Set Frontend Environment Variables**
- `REACT_APP_API_URL`: `https://onus-backend.onrender.com/api`
- `NODE_ENV`: `production`

**7. Deploy**
- Both services auto-deploy on creation
- Monitor build logs for errors
- Check deployment status

**8. Verify Deployment**
- Visit frontend URL
- Check health endpoint: `https://onus-backend.onrender.com/health`
- Test login with test accounts
- Check database connection: `https://onus-backend.onrender.com/api/status/db`

---

### Post-Deployment

**Monitoring**:
- [ ] Check service health in Render dashboard
- [ ] Review deployment logs
- [ ] Test all user flows
- [ ] Verify email sending works
- [ ] Check file uploads work
- [ ] Monitor error logs (`server/logs/error.log`)

**Seeding** (if needed):
```bash
# SSH into Render service or run via dashboard shell
cd server
npm run seed
```

**Render Shell Access**:
- Render dashboard → Service → "Shell" tab
- Run commands directly on production server

---

## Environment-Specific Behavior

### Development

**Configuration**:
- CORS: Permissive (`origin: '*'`)
- Logging: Verbose (debug level)
- Rate limiting: Disabled (for easier testing)
- Test mode: Optional (`TEST_MODE=true` skips email sending)
- Auto-fix test accounts on startup

**Files**:
- Logs to console only
- File uploads to `server/uploads/`

---

### Production

**Configuration**:
- CORS: Strict (whitelist origins)
- Logging: Warn level (less verbose)
- Rate limiting: Enabled
- Test mode: Disabled (always send emails)
- Trust proxy: Enabled (Render is behind proxy)

**Files**:
- Logs to files (`server/logs/error.log`, `combined.log`)
- Log rotation (5MB max, 5 files)
- File uploads to `/mnt/data/uploads/`

**Performance**:
- `autoIndex: false` (disable automatic index creation for performance)
- Connection pooling: 50 connections
- Write concern: `{ w: 'majority', j: true }`

---

## Deployment Commands

### Local Development

```bash
# Install dependencies
npm run install-all

# Start development servers
npm run dev

# Or separately:
npm run server  # Backend only
npm run client  # Frontend only
```

---

### Production Build (Local Testing)

**Backend**:
```bash
cd server
NODE_ENV=production npm start
```

**Frontend**:
```bash
cd client
npm run build  # Creates production build in build/
npm install -g serve
serve -s build  # Test production build locally
```

**Test Production Build**:
- Backend: `http://localhost:5001`
- Frontend (via serve): `http://localhost:3000`

---

### Render Deployment

**Automatic** (recommended):
```bash
git add .
git commit -m "Deploy: Description of changes"
git push origin main
```

**Manual** (via dashboard):
1. Render dashboard → Service → "Manual Deploy"
2. Select branch or commit
3. Click "Deploy"

---

## Monitoring & Logs

### Render Dashboard Monitoring

**Access**: [dashboard.render.com](https://dashboard.render.com)

**Available Metrics**:
- **Service Health**: Uptime, last deployment status
- **Logs**: Real-time log streaming (last 7 days)
- **Metrics**: CPU usage, memory usage, request count
- **Bandwidth**: Data transfer (in/out)
- **Build History**: All deployments with status and duration

**Alerts**:
- Email notifications on deployment failure
- Service crash notifications

---

### Application Logs

**Backend Logs**:

**Development**:
- Console only (Winston logger)
- HTTP requests (Morgan middleware)

**Production**:
- Files: `server/logs/error.log`, `server/logs/combined.log`
- Rotation: 5MB max per file, 5 files retained
- Console: Also logged (visible in Render dashboard)

**Log Levels**:
- `error` - Logged to `error.log`
- `warn`, `info`, `debug` - Logged to `combined.log`

**Viewing Production Logs** (via Render):
1. Render dashboard → onus-backend → "Logs" tab
2. Real-time log streaming
3. Search logs by keyword
4. Download logs for analysis

**Viewing via SSH** (Render Shell):
```bash
tail -f /opt/render/project/src/server/logs/error.log
tail -f /opt/render/project/src/server/logs/combined.log
```

---

**Frontend Logs**:
- Browser console (not persisted)
- Render build logs (available in dashboard during build)

---

### Health Checks

**Backend Health Check**: `GET /health`

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-11-19T12:00:00.000Z",
  "environment": "production",
  "frontendUrl": "https://onus-frontend.onrender.com"
}
```

**Database Health Check**: `GET /api/status/db`

**Response**:
```json
{
  "connected": true,
  "connectedSince": "2025-11-19T10:00:00.000Z",
  "lastPing": 45,
  "avgPing": 42,
  "disconnections": 0,
  "reconnections": 0
}
```

**Monitoring**: Render automatically monitors health checks and restarts service if unhealthy.

---

## Rollback Procedures

### Rollback via Render Dashboard

**Process**:
1. Render dashboard → Service → "Events" tab
2. Find previous successful deployment
3. Click "..." → "Redeploy"
4. Confirm rollback

**Result**: Service reverts to previous code version.

**Note**: Environment variables and database data are not rolled back.

---

### Rollback via Git

**Process**:
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or reset to specific commit (dangerous)
git reset --hard <commit-hash>
git push origin main --force  # NOT RECOMMENDED for main branch
```

**Result**: Render auto-deploys reverted code.

---

### Database Rollback

**No Automatic Rollback**: Database changes are not automatically rolled back.

**Manual Rollback**:
1. Restore from MongoDB Atlas backup (if backups enabled)
2. Or run migration script to revert schema changes

**Recommendation**: Enable MongoDB Atlas automated backups (available in paid tiers).

---

## Scaling & Performance

### Render Service Scaling

**Free Tier**:
- 512 MB RAM
- 0.1 CPU
- Goes to sleep after 15 minutes of inactivity
- First request after sleep takes ~30 seconds to wake up

**Paid Tiers**:
- **Starter ($7/month)**: Always on, 512 MB RAM, 0.5 CPU
- **Standard ($25/month)**: 2 GB RAM, 1 CPU
- **Pro ($85/month)**: 4 GB RAM, 2 CPU

**Current Recommendation**: Starter tier minimum (health app should not sleep).

---

### Horizontal Scaling

**Render Auto-Scaling** (not configured):
- Available in Pro and Enterprise plans
- Automatically adds instances based on load
- Load balancing included

**Manual Scaling**:
- Render dashboard → Service → "Scaling" tab
- Increase instance count manually

---

### Database Scaling

**MongoDB Atlas Scaling**:
1. MongoDB Atlas dashboard → Cluster
2. Click "Modify"
3. Select larger tier (M10, M20, M30, etc.)
4. Apply changes

**Current Tier**: Likely M0 (free, shared) or M10 (dedicated, ~$9/month)

**Scaling Options**:
- Vertical: Upgrade to larger cluster (more RAM, CPU)
- Horizontal: Enable sharding (Enterprise tier)
- Read replicas: Add read-only nodes

---

## Domain & SSL

### Custom Domain (Optional)

**Default URLs**:
- Backend: `https://onus-backend.onrender.com`
- Frontend: `https://onus-frontend.onrender.com`

**Custom Domain Setup**:
1. Render dashboard → Service → "Settings" → "Custom Domain"
2. Add domain (e.g., `app.onushealth.com`, `api.onushealth.com`)
3. Configure DNS:
   - Add CNAME record pointing to Render domain
4. Render auto-provisions SSL certificate (Let's Encrypt)

**Update Configuration**:
- Update `FRONTEND_URL` in backend env vars
- Update `REACT_APP_API_URL` in frontend env vars
- Update OAuth callback URLs (Google, Facebook)
- Update CORS whitelist in `server.js`

---

### SSL Certificates

**Status**: ✅ Automatic (Render provides free SSL via Let's Encrypt)

**Features**:
- Auto-renewal every 90 days
- Wildcard certificates supported
- HTTP → HTTPS redirect (automatic)
- HSTS headers (set via Helmet)

**No Configuration Required**: SSL works out of the box.

---

## Backup & Disaster Recovery

### Database Backups

**MongoDB Atlas Backups**:

**Free Tier (M0)**:
- No automated backups
- Manual exports only (via mongodump or Compass)

**Paid Tiers (M10+)**:
- Automated daily backups
- Point-in-time restore (last 7 days)
- On-demand snapshots
- Cross-region backup replication

**Recommendation**: Upgrade to M10+ for production to enable automated backups.

**Manual Backup**:
```bash
# Using MongoDB Compass
# 1. Connect to cluster
# 2. Export collection → JSON/CSV

# Using mongodump
mongodump --uri="mongodb+srv://..." --out=./backup
```

---

### File Backups

**Render Persistent Disk**:
- No automatic backups
- Files lost if disk is deleted

**Recommendation**: 
1. Periodically backup `/mnt/data/uploads/` to cloud storage (S3, Google Cloud Storage)
2. Or use Render's backup add-on (paid)

**Backup Script** (not implemented):
```bash
# Example: Sync to S3
aws s3 sync /mnt/data/uploads/ s3://onus-backups/uploads/
```

---

### Code Backups

**Git Repository**: Primary backup (GitHub)

**Best Practices**:
- Push code regularly
- Use branches for features
- Tag releases (`git tag v1.0.0`)
- Keep `main` branch stable

---

## Environment Variables Reference

### Required for Production

**Backend** (set in Render dashboard):
```
NODE_ENV=production
PORT=10000
MONGODB_ATLAS_URI=mongodb+srv://...
JWT_SECRET=<64-char-random-string>
JWT_REFRESH_SECRET=<64-char-random-string>
SENDGRID_API_KEY=SG...
FRONTEND_URL=https://onus-frontend.onrender.com
SESSION_TIMEOUT=30
EMAIL_FROM=no-reply@onus.health
SUPPORT_EMAIL=support@onus.health
```

**Frontend** (set in Render dashboard):
```
REACT_APP_API_URL=https://onus-backend.onrender.com/api
REACT_APP_SESSION_TIMEOUT=1800000
NODE_ENV=production
```

**See**: `ENV_TEMPLATE.md` for complete reference.

---

## Deployment Troubleshooting

### Build Failures

**Symptom**: Render build fails, deployment not live

**Common Causes**:
- Missing dependencies in package.json
- Build command incorrect
- Environment variables missing
- Out of memory (increase instance size)

**Solution**:
1. Check build logs in Render dashboard
2. Fix issue locally and test build
3. Push fix to GitHub

---

### Service Crashes

**Symptom**: Service status shows "Failed" or keeps restarting

**Common Causes**:
- Missing environment variables
- Database connection failure
- Uncaught exceptions in code
- Port binding issues

**Solution**:
1. Check logs in Render dashboard
2. Verify environment variables set
3. Test database connection
4. Add error handling for uncaught exceptions

---

### CORS Errors

**Symptom**: Frontend can't make API requests (CORS policy errors in browser console)

**Causes**:
- Frontend URL not whitelisted in CORS config
- Environment variable `FRONTEND_URL` incorrect

**Solution**:
1. Verify `FRONTEND_URL` in backend env vars matches actual frontend URL
2. Check CORS configuration in `server.js` lines 60-90
3. Update CORS whitelist if needed

---

### File Upload Issues

**Symptom**: Files upload but are lost after deployment

**Cause**: No persistent disk configured

**Solution**:
1. Add persistent disk in Render dashboard
2. Mount at `/mnt/data`
3. Restart service

---

### Email Not Sending

**Symptom**: Emails not received by users

**Causes**:
- Invalid SendGrid API key
- Sender email not verified in SendGrid
- Email queue processor not running
- TEST_MODE enabled in production

**Solution**:
1. Verify `SENDGRID_API_KEY` in Render env vars
2. Check sender email verification in SendGrid dashboard
3. Check email queue status: `db.emailqueues.find({ status: 'failed' })`
4. Ensure `TEST_MODE` not set to `true` in production

---

## Deployment Best Practices

### 1. Use Staging Environment

**Recommendation**: Create staging services for testing before production:
- `onus-backend-staging` (deployed from `develop` branch)
- `onus-frontend-staging`

**Benefits**:
- Test deployments without affecting production
- Catch deployment issues early
- Validate environment variable changes

---

### 2. Enable Monitoring

**Recommendations**:
- Set up uptime monitoring (e.g., UptimeRobot, Pingdom)
- Enable error tracking (Sentry)
- Monitor database performance (MongoDB Atlas dashboard)
- Set up alerts for service crashes

---

### 3. Automate Deployments

**Current**: Auto-deploy on push to `main` (✅ Enabled)

**Recommendation**: Add deployment notifications:
- Slack notifications on deployment success/failure
- Email notifications to team

---

### 4. Database Backups

**Critical**: Enable automated backups for production database:
1. Upgrade to MongoDB Atlas M10+ tier ($9/month)
2. Enable automated backups (daily)
3. Test restore procedure

---

### 5. Document Deployments

**Recommendation**: Maintain deployment log:
- Date and time
- Deployed by (developer name)
- Changes included (commit messages)
- Post-deployment verification results

---

## Summary

### Deployment Configuration

| Aspect | Development | Production |
|--------|-------------|------------|
| **Platform** | Local machine | Render |
| **Backend** | localhost:5001 | onus-backend.onrender.com |
| **Frontend** | localhost:3000 | onus-frontend.onrender.com |
| **Database** | MongoDB Atlas | MongoDB Atlas |
| **File Storage** | `server/uploads/` | `/mnt/data/uploads/` |
| **Logs** | Console | Console + Files |
| **SSL** | Not required | Automatic (Let's Encrypt) |
| **Environment** | `.env` files | Render dashboard |

### Deployment Checklist

- [x] Render services created
- [x] Environment variables configured
- [x] MongoDB Atlas connected
- [x] Persistent disk configured
- [x] Auto-deploy enabled
- [ ] Staging environment (recommended)
- [ ] Custom domain (optional)
- [ ] Database backups (recommended for production)
- [ ] Monitoring/alerting (recommended)

---

## Next Steps

To understand deployment more deeply:

1. **Read Render Config**: `render.yaml` for service definitions
2. **Read Deployment Guide**: `docs/RENDER_DEPLOYMENT.md` for detailed instructions
3. **Test Local Build**: Create production build locally and test
4. **Review Logs**: Check Render dashboard logs for any errors
5. **Set Up Monitoring**: Add uptime monitoring and error tracking

---

**Document Version**: 1.0  
**Last Updated**: November 19, 2025  
**Previous Document**: [10-Testing-Linting-Quality.md](./10-Testing-Linting-Quality.md)  
**Next Document**: [12-Operations-Maintenance-Debugging.md](./12-Operations-Maintenance-Debugging.md)

