# Email Verification to Onboarding Flow Fix

## Issue Description
New users were being redirected to the sign-in page after email verification instead of the onboarding flow. The expected flow should be:
- Sign up → Email verification → Onboarding → Dashboard (for patients) or Verification Pending (for providers)

## Root Cause
The email verification links were pointing to a frontend route (`/verify-email/${token}`) which would:
1. Load the VerifyEmail component
2. Make a POST request to verify the email
3. Try to redirect based on the response

This indirect flow could sometimes fail to properly redirect users to onboarding.

## Solution Implemented

### 1. Email Service Update
Modified `server/services/email.service.js` to send verification emails with backend URLs:
- Changed from: `${config.frontendUrl}/verify-email/${token}`
- Changed to: `${backendUrl}/api/auth/verify/${token}`

The backend URL is determined by:
- Using `config.backendUrl` if configured
- For production: Using the frontend URL (assuming backend is on same domain)
- For development: Replacing port 3000 with 5000

### 2. Backend Configuration
Added `backendUrl` configuration to `server/config/environment.js`:
- Development: `process.env.BACKEND_URL || 'http://localhost:5000'`
- Test: `process.env.BACKEND_URL || 'http://localhost:5000'`
- Production: `process.env.BACKEND_URL` (must be set via environment variable)

### 3. Enhanced Backend Verification Logic
Updated `server/controllers/authController.js` to:
- Add detailed logging for debugging
- Explicitly check `isProfileCompleted` status
- Always redirect new users (isProfileCompleted = false) to onboarding
- Redirect existing users to their dashboard

## Environment Variable for Production (Optional)

### Option 1: Automatic Detection (Recommended for your setup)
Since your backend is deployed at `https://onus-backend.onrender.com`, the email service will automatically use this URL. No additional environment variables needed!

### Option 2: Explicit Configuration
If you want to explicitly set the backend URL or if your backend is at a different URL, you can add:
```
BACKEND_URL=https://your-backend-url.onrender.com
```

## Benefits
1. **Direct Flow**: Email link → Backend verification → Automatic redirect with auth token
2. **More Reliable**: Backend handles the entire flow without frontend intervention
3. **Better Security**: Token is passed via URL parameter and immediately used for authentication
4. **Consistent Behavior**: Same flow for both patient and provider accounts

## Testing
To test the fix:
1. Create a new account (patient or provider)
2. Check email for verification link
3. Click the link - should redirect directly to onboarding
4. Token in URL will authenticate the user automatically
5. After onboarding completion:
   - Patients → Dashboard
   - Providers → Verification Pending page