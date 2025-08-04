# Email Verification to Onboarding Redirect Debug Guide

## Issue
Users are being redirected to the sign-in page instead of the onboarding page after email verification.

## Expected Flow
1. User clicks email verification link
2. VerifyEmail component loads
3. Component verifies email via POST to `/api/auth/verify-email`
4. Backend returns success with user data (onboardingCompleted: false)
5. Component stores auth token and updates Redux
6. Component redirects to role-specific onboarding page
7. ProtectedRoute allows access since user is authenticated

## Debugging Steps

### 1. Check Backend Response
In the browser console, when clicking the verification link, you should see:
```javascript
// Added console.log in VerifyEmail.jsx
console.log('Email verified successfully', {
  user: response.user,
  onboardingCompleted: response.user.onboardingCompleted,
  role: response.user.role
});
```

Expected output:
- `onboardingCompleted` should be `false` for new users
- `role` should be either 'patient' or 'provider'

### 2. Check Authentication State
Open Redux DevTools and check the auth state after verification:
- `isAuthenticated` should be `true`
- `user` object should contain the user data
- There should be a token in localStorage (`onus_auth_token`)

### 3. Check Network Requests
In Network tab:
1. POST to `/api/auth/verify-email` should return 200 with user data
2. No immediate redirect to `/api/auth/me` that returns 401

### 4. Check Console for Redirect Logs
You should see:
- "Redirecting to patient onboarding" or "Redirecting to provider onboarding"

## Potential Issues and Solutions

### Issue 1: Redux State Not Updated in Time
The ProtectedRoute checks authentication immediately, but Redux might not be updated yet.

**Solution**: Already implemented - we update Redux before navigation.

### Issue 2: Token Not Stored Correctly
The token might not be stored in localStorage properly.

**Solution**: Check `localStorage.getItem('onus_auth_token')` in console.

### Issue 3: Backend Returns Wrong Data
The backend might be returning `isProfileCompleted: true` for new users.

**Solution**: Check the database directly or add logging to backend.

### Issue 4: ProtectedRoute Redirecting Too Early
The ProtectedRoute might be checking authentication before Redux is updated.

**Solution**: Add a small delay or ensure Redux is updated synchronously.

## Quick Test
1. Open browser console
2. Clear localStorage: `localStorage.clear()`
3. Click verification link
4. Watch console logs and Redux DevTools
5. Check if redirected to onboarding or sign-in

## Manual Override Test
After clicking verification link, in browser console:
```javascript
// Check current auth state
const state = window.store.getState();
console.log('Auth state:', state.auth);

// Manually navigate to onboarding
window.location.href = '/patient/onboarding';
```

If manual navigation works, the issue is with the automatic redirect timing. 