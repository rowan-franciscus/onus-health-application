# Page Flash Fix During Refresh

## Issue
When users refreshed the page while logged in, they would briefly see:
- Patient/Admin users: Sign-in page flash
- Provider users: Sign-in page AND verification pending page flash

This happened because the app was checking authentication state before user data was fully loaded from the server.

## Root Cause
1. The `isAuthenticated` state was set to `true` immediately if a token existed in localStorage
2. The `user` data was `null` until loaded asynchronously
3. Protected routes would redirect before authentication was fully initialized
4. For providers, an additional async verification check caused a second redirect

## Solution
Added authentication initialization tracking:

1. **Added `initializing` state to authSlice**
   - Tracks whether initial authentication check is complete
   - Starts as `true` if a token exists

2. **Created AuthInitializer component**
   - Shows loading screen while authentication initializes
   - Prevents route rendering until auth state is ready

3. **Updated AuthContext**
   - Sets `initializing` to `false` after loading user data
   - Handles both successful and failed user data fetches

4. **Modified ProtectedRoute**
   - Skips provider verification check in useEffect while initializing
   - Skips synchronous verification check during render when initializing
   - Prevents premature redirects to both sign-in and verification-pending pages

## Files Modified
- `/client/src/store/slices/authSlice.js` - Added initializing state
- `/client/src/contexts/AuthContext.js` - Handle initialization completion
- `/client/src/components/AuthInitializer.jsx` - New loading wrapper component
- `/client/src/components/ProtectedRoute.jsx` - Skip checks during initialization
- `/client/src/App.js` - Wrapped routes with AuthInitializer

## Testing
Test all user roles:
1. Sign in as patient/admin/provider
2. Refresh the page
3. Should see loading spinner briefly, then the correct page
4. No flash of sign-in or verification pending pages

## Additional Benefits
- Better user experience during page loads
- Prevents unnecessary API calls during initialization
- Cleaner authentication flow

## Update (Provider Verification Fix)
Fixed an additional issue where providers would see the verification pending page flash:
- Updated `/server/controllers/user.controller.js` getCurrentUser endpoint
- Now properly formats the response to include `isVerified` flag at top level for providers
- Ensures consistency between login response and getCurrentUser response
