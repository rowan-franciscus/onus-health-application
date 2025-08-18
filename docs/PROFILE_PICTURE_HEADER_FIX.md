# Profile Picture Header Display Fix

## Issue
After updating the profile picture, it displayed correctly initially, but when the page was refreshed, the header showed placeholder initials instead of the profile picture (though the Settings page displayed it correctly).

## Root Cause
The AuthContext was loading user data from the JWT token on page refresh. The JWT token contains basic user information (id, email, role, etc.) but does NOT include the `profileImage` field. This meant the header was trying to display a profile picture that wasn't in the user data.

### The problematic flow was:
1. Page refreshes
2. AuthContext checks if authenticated
3. If yes, it decoded the JWT token to get user data
4. If JWT data exists, it used that and never fetched from server
5. Header tried to display profileImage from user data (which was null)

## Solution
Modified the AuthContext to always fetch fresh user data from the server first, which includes all fields including `profileImage`. The JWT token data is now only used as a fallback if the server request fails.

### File Modified:
`/client/src/contexts/AuthContext.js`

### Change Made:
```javascript
// BEFORE: Used JWT token data first
if (isAuthenticated && !user) {
  const currentUser = AuthService.getCurrentUser(); // JWT decode
  if (currentUser) {
    dispatch(authSuccess(currentUser));
    return; // Never fetched from server!
  }
  // Only fetched from server if no JWT data
}

// AFTER: Always fetch from server first
if (isAuthenticated && !user) {
  try {
    // Always fetch fresh user data from server
    const userData = await UserProfileService.getCurrentUser();
    dispatch(authSuccess(userData));
  } catch (error) {
    // JWT token data as fallback only
    const currentUser = AuthService.getCurrentUser();
    if (currentUser) {
      dispatch(authSuccess(currentUser));
    }
  }
}
```

## Why This Works
1. The `/users/me` endpoint returns the complete user object including `profileImage`
2. On page refresh, we now get fresh data from the database
3. The header component receives user data with profileImage included
4. Profile pictures display correctly in both Settings page and header

## Testing
1. Sign in as any user type
2. Upload a profile picture
3. Verify it shows in both Settings and header
4. Refresh the page
5. Profile picture should persist in both locations

## Note
This approach adds one API call on page refresh, but ensures we always have the most current user data including profile pictures and any other fields not stored in the JWT token.