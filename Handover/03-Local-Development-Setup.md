# 3. Local Development Setup

This guide walks you through setting up the Onus Health Application on your local machine for development. Follow each step carefully to ensure a smooth setup.

---

## Prerequisites

### Required Software

#### 1. Node.js and npm

**Required Version**: Node.js **14.x or higher** (recommended: 16.x or 18.x)

While there's no explicit `engines` field in the root package.json files to enforce a specific Node version, the dependencies (particularly React 18 and modern Express features) require at least Node 14. Node 16+ is recommended for best compatibility.

**Check your version**:
```bash
node --version  # Should output v14.x or higher
npm --version   # Should output 6.x or higher
```

**Installation**:
- **macOS**: `brew install node` or download from [nodejs.org](https://nodejs.org/)
- **Windows**: Download installer from [nodejs.org](https://nodejs.org/)
- **Linux**: Use your package manager (e.g., `apt install nodejs npm`)

**Recommendation**: Use [nvm](https://github.com/nvm-sh/nvm) (Node Version Manager) to manage Node versions:
```bash
nvm install 18
nvm use 18
```

---

#### 2. MongoDB Database

**Important**: This application **does not use a local MongoDB instance**. It connects exclusively to **MongoDB Atlas** (cloud database). See [[memory:3196676]].

**What you need**:
- A MongoDB Atlas account and cluster URI
- The cluster must be accessible from your local machine (check Atlas network access settings)

**Setup MongoDB Atlas**:
1. Create a free account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (free tier M0 is sufficient for development)
3. Create a database user with read/write permissions
4. Whitelist your IP address (or use `0.0.0.0/0` for development - **not recommended for production**)
5. Get your connection string (format: `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/`)

**Note**: The application will automatically create the `onus-health` database and collections on first connection.

---

#### 3. Git

**Required for**: Cloning the repository.

**Check if installed**:
```bash
git --version
```

**Installation**: [git-scm.com](https://git-scm.com/)

---

#### 4. Code Editor (Recommended)

- **Visual Studio Code** (recommended) - with ESLint and Prettier extensions
- Or any editor with JavaScript/React support

---

### Optional but Recommended

- **Postman** or **Insomnia** - for testing API endpoints
- **MongoDB Compass** - GUI for viewing database contents
- **React Developer Tools** (browser extension) - for debugging React components

---

## Environment Variables

The application requires environment variables for both **backend** (server) and **frontend** (client). These variables are stored in `.env` files that are **not committed to Git** (see `.gitignore`).

### Backend Environment Variables (`server/.env`)

Create a `.env` file in the `server/` directory with the following variables:

```env
# ========================================
# Server Configuration
# ========================================
PORT=5001
NODE_ENV=development

# ========================================
# MongoDB Configuration (REQUIRED)
# ========================================
# Get this from your MongoDB Atlas dashboard
MONGODB_ATLAS_URI=mongodb+srv://username:password@cluster.mongodb.net/onus-health?retryWrites=true&w=majority

# ========================================
# JWT Configuration (REQUIRED)
# ========================================
# Generate secure random strings (at least 32 characters)
# You can use: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your_jwt_secret_here_minimum_32_characters
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here_minimum_32_characters
JWT_REFRESH_EXPIRES_IN=30d

# ========================================
# Email Configuration
# ========================================
MAIL_PROVIDER=sendgrid
EMAIL_FROM=no-reply@onus.health
SUPPORT_EMAIL=support@onus.health
SUPPORT_PHONE=081 000 0000

# SendGrid API Key (REQUIRED for email functionality)
# Get from: https://app.sendgrid.com/settings/api_keys
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here

# ========================================
# Frontend URL (for CORS and email links)
# ========================================
FRONTEND_URL=http://localhost:3000

# ========================================
# Session Configuration
# ========================================
SESSION_TIMEOUT=30

# ========================================
# OAuth Configuration (OPTIONAL - for social login)
# ========================================
# Google OAuth 2.0 (get from Google Cloud Console)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5001/api/auth/google/callback

# Facebook OAuth (get from Facebook Developers)
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_CALLBACK_URL=http://localhost:5001/api/auth/facebook/callback

# ========================================
# File Upload Configuration (Optional)
# ========================================
MAX_FILE_SIZE=5242880  # 5MB in bytes

# ========================================
# Testing Configuration (Optional)
# ========================================
TEST_MODE=false  # Set to true to skip email sending in development
```

**Environment Variable Details**:

| Variable | Required? | Description | Default |
|----------|-----------|-------------|---------|
| `PORT` | No | Backend server port | `5001` |
| `NODE_ENV` | No | Environment mode (`development`/`production`/`test`) | `development` |
| `MONGODB_ATLAS_URI` | **YES** | MongoDB Atlas connection string | None |
| `JWT_SECRET` | **YES** | Secret for JWT token signing | Random (dev only) |
| `JWT_EXPIRES_IN` | No | JWT token expiration | `7d` |
| `JWT_REFRESH_SECRET` | **YES** | Secret for refresh token signing | Random (dev only) |
| `JWT_REFRESH_EXPIRES_IN` | No | Refresh token expiration | `30d` |
| `SENDGRID_API_KEY` | **YES*** | SendGrid API key for email sending | None |
| `EMAIL_FROM` | No | Sender email address | `noreply@onushealth.com` |
| `SUPPORT_EMAIL` | No | Support contact email | `support@onus.health` |
| `SUPPORT_PHONE` | No | Support contact phone | `081 000 0000` |
| `FRONTEND_URL` | No | Frontend URL for CORS and email links | `http://localhost:3000` |
| `SESSION_TIMEOUT` | No | Session timeout in minutes | `30` |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID | None |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret | None |
| `FACEBOOK_APP_ID` | No | Facebook app ID | None |
| `FACEBOOK_APP_SECRET` | No | Facebook app secret | None |
| `MAX_FILE_SIZE` | No | Max file upload size in bytes | `5242880` (5MB) |
| `TEST_MODE` | No | Skip email sending (for testing) | `false` |

**Notes**:
- *`SENDGRID_API_KEY` is required for email functionality. Without it, email verification, password reset, and notifications will not work, but you can still use the app by manually setting `isEmailVerified: true` in the database.
- **JWT secrets**: In development, the app generates random secrets if not provided, but this means tokens won't persist across server restarts. For consistent development, generate your own:
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```

**Where to get API keys**:
- **MongoDB Atlas URI**: [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) → Clusters → Connect → Connect your application
- **SendGrid API Key**: [app.sendgrid.com/settings/api_keys](https://app.sendgrid.com/settings/api_keys) → Create API Key → Full Access
- **Google OAuth**: [console.cloud.google.com](https://console.cloud.google.com/) → APIs & Services → Credentials → Create OAuth 2.0 Client ID
- **Facebook OAuth**: [developers.facebook.com](https://developers.facebook.com/) → My Apps → Create App → Settings → Basic

---

### Frontend Environment Variables (`client/.env`)

Create a `.env` file in the `client/` directory:

```env
# ========================================
# API Configuration
# ========================================
# Backend API URL
REACT_APP_API_URL=http://localhost:5001/api

# ========================================
# Session Configuration
# ========================================
# Session timeout in milliseconds (30 minutes = 1800000ms)
REACT_APP_SESSION_TIMEOUT=1800000
```

**Environment Variable Details**:

| Variable | Required? | Description | Default |
|----------|-----------|-------------|---------|
| `REACT_APP_API_URL` | No | Backend API base URL | `http://localhost:5001/api` (via proxy) |
| `REACT_APP_SESSION_TIMEOUT` | No | Session timeout in milliseconds | `1800000` (30 min) |

**Note**: The React app uses a **proxy** configuration in `client/package.json` to forward API requests to the backend during development. This means you can omit `REACT_APP_API_URL` and the app will automatically proxy `/api/*` requests to `http://localhost:5001`.

---

### Quick Setup: Copy from Template

The repository includes a template file `ENV_TEMPLATE.md` with all environment variables documented.

**Quick commands**:
```bash
# Backend .env setup
cd server
cat > .env << 'EOF'
PORT=5001
NODE_ENV=development
MONGODB_ATLAS_URI=your_mongodb_uri_here
JWT_SECRET=your_generated_jwt_secret_here
JWT_REFRESH_SECRET=your_generated_refresh_secret_here
SENDGRID_API_KEY=your_sendgrid_key_here
FRONTEND_URL=http://localhost:3000
SESSION_TIMEOUT=30
EOF

# Client .env setup (optional - proxy handles this)
cd ../client
cat > .env << 'EOF'
REACT_APP_API_URL=http://localhost:5001/api
REACT_APP_SESSION_TIMEOUT=1800000
EOF
```

**Then edit the files** to replace placeholder values with your actual credentials.

---

## Installation Steps

### 1. Clone the Repository

```bash
# Clone via HTTPS
git clone https://github.com/yourusername/onus-health-application.git
cd onus-health-application

# Or clone via SSH (if you have SSH keys set up)
git clone git@github.com:yourusername/onus-health-application.git
cd onus-health-application
```

---

### 2. Install Dependencies

The repository includes a convenient root-level script to install all dependencies at once:

```bash
# Install dependencies for root, client, and server
npm run install-all
```

**What this does**:
1. Installs root dependencies (`concurrently` for running multiple processes)
2. Installs client dependencies (React, Redux, Axios, etc.) → ~150MB
3. Installs server dependencies (Express, Mongoose, Passport, etc.) → ~80MB

**Manual alternative** (if `install-all` fails):
```bash
# Root dependencies
npm install

# Client dependencies
cd client
npm install
cd ..

# Server dependencies
cd server
npm install
cd ..
```

**Expected time**: 2-5 minutes (depending on internet speed)

**Troubleshooting**:
- If you get `EACCES` permission errors, try using `sudo` (not recommended) or fix npm permissions: [docs.npmjs.com/resolving-eacces-permissions-errors](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally)
- If you get `MODULE_NOT_FOUND` errors after installation, try deleting `node_modules/` and `package-lock.json` and reinstalling

---

### 3. Set Up Environment Variables

**Critical Step**: Create `.env` files as described in the [Environment Variables](#environment-variables) section above.

**Minimum required for development**:
- `server/.env` with `MONGODB_ATLAS_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`

**Verification**:
```bash
# Check that .env files exist
ls -la server/.env
ls -la client/.env  # Optional

# Verify .env is not committed (should be in .gitignore)
git status  # Should NOT show .env files as untracked
```

---

### 4. Seed the Database (Recommended)

The application includes test accounts and sample medical data. Seed the database to get started quickly:

```bash
cd server
npm run seed
```

**What this does**:
- Creates 3 test accounts (admin, provider, patient) with pre-verified emails
- Creates sample consultations and medical records
- Establishes patient-provider connections
- Generates sample data for all 7 medical record types

**Test Account Credentials** (created by seeding):
| Role | Email | Password |
|------|-------|----------|
| Admin | `admin.test@email.com` | `password@123` |
| Provider | `provider.test@email.com` | `password@123` |
| Patient | `patient.test@email.com` | `password@123` |

**See**: `server/docs/TEST_ACCOUNTS.md` for full test account details.

**Reset test data** (if needed):
```bash
cd server
npm run seed:reset  # Removes all test data
npm run seed        # Re-seeds fresh data
```

**Note**: Seeding is **optional** but highly recommended for development and testing. Without it, you'll need to manually register accounts and verify emails.

---

## Running the Application

### Development Mode (Recommended)

**Start both client and server simultaneously** using the root-level script:

```bash
# From the root directory
npm run dev
```

**What this does**:
- Starts the backend server on **`http://localhost:5001`** (Express API)
- Starts the frontend development server on **`http://localhost:3000`** (React app)
- Runs both in parallel using `concurrently`
- Enables hot module replacement (HMR) for both client and server

**Expected output**:
```
[0] [nodemon] starting `node server.js`
[0] Server running in development mode on port 5001
[0] API available at http://localhost:5001/api
[0] Database connection successful
[0] Database ping successful: 45ms
[0] Email queue processor started
[1] webpack compiled successfully
[1] Compiled successfully!
[1] 
[1] You can now view onus-health-client in the browser.
[1] 
[1]   Local:            http://localhost:3000
```

**Access the application**:
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5001/api](http://localhost:5001/api)
- **Health Check**: [http://localhost:5001/health](http://localhost:5001/health)

---

### Running Client and Server Separately

If you prefer to run them in separate terminal windows for better log visibility:

**Terminal 1 - Backend**:
```bash
cd server
npm run dev
# Or: npm start (without auto-restart)
```

**Terminal 2 - Frontend**:
```bash
cd client
npm start
```

**Advantages**:
- Easier to read logs separately
- Can restart one without affecting the other
- Better for debugging

---

## Port Numbers

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| **Frontend** | `3000` | `http://localhost:3000` | React development server |
| **Backend** | `5001` | `http://localhost:5001` | Express API server |
| **MongoDB** | N/A | Atlas Cloud | Cloud-hosted database |

**Port conflicts**:
- If port `3000` is in use, React will prompt to use another port (e.g., `3001`)
- To change backend port, edit `PORT` in `server/.env`

**Proxy Configuration**:
The React app (client) proxies API requests to the backend automatically:
- `client/package.json` includes: `"proxy": "http://localhost:5001"`
- Requests to `/api/*` from the frontend are forwarded to `http://localhost:5001/api/*`

---

## Verification & Testing

### 1. Verify Backend is Running

**Health Check Endpoint**:
```bash
curl http://localhost:5001/health
```

**Expected response**:
```json
{
  "status": "ok",
  "timestamp": "2025-11-19T10:30:00.000Z",
  "environment": "development",
  "frontendUrl": "http://localhost:3000"
}
```

**Database Status**:
```bash
curl http://localhost:5001/api/status/db
```

**Expected response**:
```json
{
  "connected": true,
  "connectedSince": "2025-11-19T10:25:00.000Z",
  "lastPing": 45,
  "avgPing": 42,
  "disconnections": 0,
  "reconnections": 0
}
```

---

### 2. Verify Frontend is Running

Open [http://localhost:3000](http://localhost:3000) in your browser. You should see the **Onus Health Application** sign-in page.

**Check browser console** (F12 → Console tab):
- Should see no errors
- May see React development mode warnings (these are normal)

---

### 3. Test Authentication

**Login with test account**:
1. Navigate to [http://localhost:3000/sign-in](http://localhost:3000/sign-in)
2. Enter:
   - Email: `patient.test@email.com`
   - Password: `password@123`
3. Click "Sign In"
4. Should redirect to patient dashboard

**Verify JWT token is set**:
- Open browser DevTools → Application/Storage → Session Storage
- Should see `token` key with JWT value

---

### 4. Test API Directly (Optional)

**Using curl**:
```bash
# Test registration endpoint (should return validation errors)
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Expected: 400 Bad Request with validation errors
```

**Using Postman/Insomnia**:
1. Import API collection (see `server/routes/api.md` for endpoints)
2. Test endpoints like `POST /api/auth/login`

---

## Common Commands

### Root-Level Commands

```bash
# Install all dependencies (root, client, server)
npm run install-all

# Start both client and server in development mode
npm run dev

# Start production mode (requires build)
npm start

# Run client only
npm run client

# Run server only
npm run server
```

---

### Server Commands

```bash
cd server

# Start server in development mode (with nodemon auto-restart)
npm run dev

# Start server in production mode
npm start

# Seed database with test accounts and sample data
npm run seed

# Reset test data (removes all test accounts)
npm run seed:reset

# Run Jest tests
npm test

# Test database connection
npm run test:db

# Test login endpoint
npm run test:login

# Clean up orphaned data
npm run cleanup:orphaned

# Check all users in database
npm run check:users
```

**Utility scripts** (see `server/scripts/` for more):
```bash
# Add a new admin user
npm run add:admin

# Update existing admin password
npm run update:admin

# Fix authentication issues
npm run fix:auth

# Check onboarding status
npm run fix:onboarding
```

**Full list**: Check `server/package.json` → `scripts` section.

---

### Client Commands

```bash
cd client

# Start development server
npm start

# Build for production
npm run build

# Run tests (Jest + React Testing Library)
npm test

# Eject from Create React App (irreversible - not recommended)
npm run eject
```

---

## Development Workflow

### Typical Development Session

1. **Start the application**:
   ```bash
   npm run dev  # From root directory
   ```

2. **Make changes**:
   - Edit files in `client/src/` or `server/`
   - Changes auto-reload (hot module replacement)
   - Backend restarts automatically (nodemon)

3. **Test changes**:
   - Check browser at `http://localhost:3000`
   - Check API responses in browser DevTools → Network tab
   - Check server logs in terminal

4. **Commit changes**:
   ```bash
   git add .
   git commit -m "Your commit message"
   git push
   ```

---

## Troubleshooting

### Issue: "Proxy error: Could not proxy request"

**Symptom**: Console shows proxy errors, API calls fail

**Cause**: React dev server starts before Express server is ready

**Solution**: Wait 5-10 seconds for backend to fully start. The React app will automatically retry failed requests.

**Permanent fix**: The app already includes automatic retry logic with exponential backoff (see `docs/DEVELOPMENT_SETUP.md`).

---

### Issue: "MongooseError: Operation buffering timed out"

**Symptom**: Backend fails to start with MongoDB timeout error

**Causes**:
1. Invalid `MONGODB_ATLAS_URI` in `server/.env`
2. MongoDB Atlas cluster is paused (free tier auto-pauses after inactivity)
3. IP address not whitelisted in Atlas network access settings
4. Network connectivity issues

**Solutions**:
1. Verify `MONGODB_ATLAS_URI` format:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/onus-health?retryWrites=true&w=majority
   ```
2. Resume cluster in MongoDB Atlas dashboard
3. Add your IP to Atlas Network Access: `0.0.0.0/0` (all IPs - dev only)
4. Check network connection and firewall settings

**Test connection**:
```bash
cd server
npm run test:db
```

---

### Issue: JWT token validation fails / "Invalid token"

**Symptom**: Login succeeds but subsequent API calls return 401 Unauthorized

**Cause**: JWT secret changed between server restarts (if using auto-generated secret)

**Solution**: Set a persistent `JWT_SECRET` in `server/.env`:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copy output to JWT_SECRET in server/.env
```

---

### Issue: "Module not found" errors

**Symptom**: Import errors like `Cannot find module 'express'`

**Causes**:
1. Dependencies not installed
2. Corrupted `node_modules/`
3. Wrong Node version

**Solutions**:
```bash
# Delete and reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Or for all workspaces:
rm -rf */node_modules */package-lock.json node_modules package-lock.json
npm run install-all
```

---

### Issue: Emails not sending

**Symptom**: Email verification, password reset emails don't arrive

**Causes**:
1. `SENDGRID_API_KEY` not set or invalid
2. Email address not verified in SendGrid (free tier requirement)
3. Email in spam folder

**Solutions**:
1. Verify SendGrid API key is set in `server/.env`
2. Verify sender email in SendGrid dashboard
3. Check spam/junk folders
4. **For development**: Set `TEST_MODE=true` in `server/.env` to skip email sending and check logs instead

**Bypass email verification** (for testing):
```javascript
// Manually set in MongoDB Compass or with script
db.users.updateOne(
  { email: "test@example.com" },
  { $set: { isEmailVerified: true } }
)
```

---

### Issue: Port 3000 or 5001 already in use

**Symptom**: Error: `Port 3000 is already in use` or `Port 5001 is already in use`

**Solutions**:

**Find and kill the process**:
```bash
# macOS/Linux
lsof -ti:3000 | xargs kill -9  # Kill process on port 3000
lsof -ti:5001 | xargs kill -9  # Kill process on port 5001

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Or change ports**:
- Backend: Edit `PORT` in `server/.env`
- Frontend: React will prompt to use another port automatically

---

### Issue: Hot reload not working

**Symptom**: Changes to files don't trigger auto-reload

**Causes**:
1. File watcher limit exceeded (Linux)
2. Editor saving files incorrectly

**Solutions**:

**Linux** (increase file watcher limit):
```bash
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

**All platforms**: Check that your editor saves files correctly (not using safe write mode).

---

### Issue: Build failures or cryptic errors

**Solution**: Clear all caches and rebuild:
```bash
# Client
cd client
rm -rf node_modules build .cache
npm install
npm start

# Server
cd ../server
rm -rf node_modules
npm install
npm run dev
```

---

## Next Steps

Now that your local environment is set up:

1. **Explore the application**:
   - Login with test accounts (see `server/docs/TEST_ACCOUNTS.md`)
   - Navigate through patient, provider, and admin dashboards
   - Create a consultation, add medical records, manage connections

2. **Review the architecture**:
   - Read [04-Backend-Architecture.md](./04-Backend-Architecture.md) to understand API design
   - Read [05-Database-Design.md](./05-Database-Design.md) to understand data models
   - Read [07-Frontend-Architecture.md](./07-Frontend-Architecture.md) to understand React structure

3. **Run tests**:
   - See [10-Testing-Linting-Quality.md](./10-Testing-Linting-Quality.md) for testing procedures

4. **Make your first change**:
   - Try modifying a component in `client/src/components/`
   - Try adding a new API endpoint in `server/routes/`

---

## Useful Development Resources

### Documentation Files

- **`README.md`**: Quick start guide
- **`FEATURES.md`**: Complete feature list with implementation status
- **`PROJECT_SPEC.md`**: Original project requirements
- **`docs/DEVELOPMENT_SETUP.md`**: Additional setup notes
- **`docs/TESTING_GUIDE.md`**: Testing procedures
- **`docs/TROUBLESHOOTING.md`**: Common issues and solutions
- **`server/docs/TEST_ACCOUNTS.md`**: Test account details
- **`ENV_TEMPLATE.md`**: Environment variable reference

### Key Configuration Files

- **`server/config/environment.js`**: All environment variable handling with defaults
- **`client/src/config/constants.js`**: Frontend configuration constants
- **`server/config/passport.js`**: Authentication strategies
- **`server/utils/logger.js`**: Logging configuration

---

## Summary Checklist

Before proceeding, ensure you have:

- [ ] Node.js 14+ installed
- [ ] MongoDB Atlas cluster created and URI obtained
- [ ] Repository cloned
- [ ] Dependencies installed (`npm run install-all`)
- [ ] `.env` files created in `server/` (and optionally `client/`)
- [ ] Database seeded (`cd server && npm run seed`)
- [ ] Both client and server running (`npm run dev`)
- [ ] Can access frontend at `http://localhost:3000`
- [ ] Can access backend health check at `http://localhost:5001/health`
- [ ] Can login with test account (`patient.test@email.com` / `password@123`)

If all checkboxes are ticked, you're ready to start developing! 🎉

---

**Document Version**: 1.0  
**Last Updated**: November 19, 2025  
**Previous Document**: [02-Repository-Layout.md](./02-Repository-Layout.md)  
**Next Document**: [04-Backend-Architecture.md](./04-Backend-Architecture.md)

