# Session Timeout Testing Guide

## Overview
This guide provides comprehensive testing steps to verify that the session timeout functionality works correctly for all user types (Admin, Patient, Provider).

## Summary of Changes Made

### Frontend Changes
1. **AuthContext.js**: Updated to properly clear tokens from localStorage when session times out
2. **authSlice.js**: Added session validation on app initialization to check if tokens have exceeded 30-minute timeout
3. **auth.service.js**: Updated pingSession to handle new token from server to refresh session
4. **apiMiddleware.js**: Fixed token refresh to include current auth token for session validation

### Backend Changes
1. **authController.js**: 
   - Updated refreshToken to check session timeout before issuing new tokens
   - Updated checkSessionStatus to return new token with updated issue time
2. **auth.middleware.js**: Already had session timeout middleware in place

## Testing Steps

### Test 1: Basic Session Timeout (30 minutes)

1. **Login as any user type** (Admin/Patient/Provider)
2. **Wait for 27 minutes** - You should see a warning modal with 3-minute countdown
3. **Do not interact** - After 3 more minutes (total 30 minutes):
   - User should be automatically logged out
   - Redirected to sign-in page with timeout message
   - All tokens should be cleared from localStorage

### Test 2: Session Continuation

1. **Login as any user type**
2. **Wait for 27 minutes** - Warning modal appears
3. **Click "Continue Session"** button:
   - Modal should close
   - Session timer should reset
   - User remains logged in
   - New token should be issued with updated timestamp

### Test 3: User Activity Reset

1. **Login as any user type**
2. **Perform activities** (click, scroll, type) every few minutes
3. **Verify session never times out** as long as you're active
4. **Stop all activity for 30 minutes**
5. **Verify timeout occurs** after inactivity period

### Test 4: Browser Close/Reopen

1. **Login as any user type**
2. **Note the current time**
3. **Close the browser completely**
4. **Wait 35+ minutes**
5. **Reopen browser and navigate to the app**
6. **Expected result**: 
   - Should redirect to sign-in page
   - Should NOT auto-login with expired session
   - Tokens should be cleared

### Test 5: Token Refresh During Timeout

1. **Login as any user type**
2. **Wait 28 minutes**
3. **Make an API call** (e.g., navigate to a different page)
4. **Expected result**:
   - If within 30 minutes, request should succeed
   - If after 30 minutes, should get SESSION_TIMEOUT error
   - User should be logged out

### Test 6: Multiple Tabs

1. **Login in Tab 1**
2. **Open the app in Tab 2** (should share session)
3. **Be active in Tab 1 only**
4. **Expected result**:
   - Both tabs should remain logged in
   - Activity in one tab keeps both alive
   - When timeout occurs, both tabs should logout

## Quick Testing (Development)

For faster testing during development, you can temporarily modify the session timeout:

### Frontend (client/src/contexts/AuthContext.js):
```javascript
// Change these values for testing (use seconds instead of minutes)
const SESSION_TIMEOUT = 60 * 1000; // 60 seconds instead of 30 minutes
const WARNING_TIME = 30 * 1000;     // 30 seconds warning
```

### Backend (server/.env):
```
SESSION_TIMEOUT=1  # 1 minute instead of 30
```

### Client Config (client/src/config/index.js):
```javascript
sessionTimeout: 60000, // 60 seconds in milliseconds
```

**Remember to change these back to production values after testing!**

## Verification Checklist

- [ ] Session warning appears at 27 minutes (or configured time)
- [ ] Countdown timer displays correctly (3:00 → 0:00)
- [ ] "Continue Session" button resets the timeout
- [ ] "Logout Now" button immediately logs out
- [ ] Auto-logout occurs after full timeout period
- [ ] Tokens are cleared from localStorage on timeout
- [ ] Browser refresh after timeout doesn't auto-login
- [ ] Session timeout message appears on sign-in page
- [ ] User activity properly resets the timeout
- [ ] API calls fail with SESSION_TIMEOUT after timeout
- [ ] Token refresh fails if session has timed out

## Debugging

To debug session timeout issues:

1. **Check Browser Console**:
   ```javascript
   // Check if tokens exist
   localStorage.getItem('onus_auth_token')
   localStorage.getItem('onus_refresh_token')
   
   // Decode token to see issue time
   const token = localStorage.getItem('onus_auth_token');
   if (token) {
     const decoded = JSON.parse(atob(token.split('.')[1]));
     console.log('Token issued at:', new Date(decoded.iat * 1000));
     console.log('Token expires at:', new Date(decoded.exp * 1000));
   }
   ```

2. **Check Network Tab**:
   - Look for `/api/auth/session-status` calls
   - Verify SESSION_TIMEOUT error responses
   - Check if new tokens are being returned

3. **Server Logs**:
   - Check for "Session timed out" messages
   - Verify token validation logs

## Common Issues

1. **Session doesn't timeout**: Check if user activity is being tracked too broadly
2. **Immediate logout**: Verify session timeout configuration matches between frontend/backend
3. **Auto-login after timeout**: Ensure tokens are properly cleared and validated on startup
