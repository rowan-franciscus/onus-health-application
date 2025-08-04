# Email Verification Redirect Fix - Version 2

## Issue
After the initial fix, users were getting a 404 error when clicking email verification links in production on Render.

## Root Cause
On Render, the frontend and backend are deployed as separate services:
- Frontend: Static file server (e.g., `onus-frontend.onrender.com`)
- Backend: Node.js API server (e.g., `onus-backend.onrender.com`)

The initial fix attempted to use `/api/auth/verify/{token}` URLs on the frontend domain, but the static file server doesn't know about API routes, resulting in 404 errors.

## Solution

### 1. Reverted Email Service to Frontend URLs
Modified `server/services/email.service.js` to use frontend routes:
```javascript
const verificationUrl = `${config.frontendUrl}/verify-email/${token}`;
```

### 2. Updated Backend Redirect Logic
Modified `server/controllers/authController.js` to redirect to role-specific paths:
```javascript
// For new user verification
const redirectUrl = user.role === 'patient' 
  ? `${config.frontendUrl}/patient/onboarding?token=${authToken}`
  : `${config.frontendUrl}/provider/onboarding?token=${authToken}`;

// For already verified users
redirectUrl = user.role === 'patient' 
  ? `${config.frontendUrl}/patient/dashboard`
  : user.role === 'provider'
  ? `${config.frontendUrl}/provider/dashboard`
  : `${config.frontendUrl}/sign-in`;
```

### 3. Maintained Token Handling in Onboarding Pages
The patient and provider onboarding pages still extract and use tokens from URL parameters for auto-authentication.

## How It Works Now

1. User signs up and receives verification email
2. Email contains link to: `https://onus-frontend.onrender.com/verify-email/{token}`
3. React app loads the VerifyEmail component
4. Component makes POST request to backend API: `/api/auth/verify-email`
5. Backend verifies email and returns success with user data
6. Component redirects to appropriate onboarding page based on user role
7. Onboarding page checks for token in URL and authenticates if present

## Architecture on Render

```
Frontend Service (Static)          Backend Service (Node.js)
onus-frontend.onrender.com        onus-backend.onrender.com
       |                                    |
       |  1. User clicks email link         |
       v                                    |
/verify-email/{token}                       |
       |                                    |
       |  2. React app loads                |
       v                                    |
   VerifyEmail Component                    |
       |                                    |
       |  3. POST /api/auth/verify-email    |
       |----------------------------------->|
       |                                    |
       |  4. Response with user data        |
       |<-----------------------------------|
       |                                    |
       v                                    |
Redirect to /patient/onboarding             |
or /provider/onboarding                     |
```

## Testing

1. Create a new account
2. Check email for verification link
3. Click the link - should load the React app (not 404)
4. Should see success message and redirect to onboarding
5. Should be automatically logged in

## Key Points

- Email verification links must point to frontend routes, not API endpoints
- The frontend React app handles the verification flow
- Backend API endpoints are only accessible via AJAX requests from the React app
- Render's static file server cannot proxy API requests like the development server does 