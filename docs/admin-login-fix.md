# Admin Login Issue Fix

## Problem
When attempting to sign in with the admin test account, the error message "No response from server. Please check your internet connection" appears.

## Root Causes
1. **API Connection Issue**: The client was configured to connect to `http://localhost:5000/api` in the `.env` file, but the server is actually running on port 5001.

2. **Token Handling Mismatch**: The client-side auth service was not properly handling the token format returned by the server.

## Solution Applied

1. Updated the API URL configuration in `client/src/config/index.js`:
```js
const config = {
  // API endpoints
  apiUrl: 'http://localhost:5001/api', // Fixed port to match server configuration
  
  // Rest of the configuration...
};
```

2. Fixed the auth service to correctly handle the token format from the server in `client/src/services/auth.service.js`:
```js
static async adminLogin(credentials) {
  try {
    const response = await ApiService.post('/auth/admin/login', credentials);
    
    // The server returns tokens in tokens.authToken and tokens.refreshToken
    if (response.tokens) {
      // Store tokens
      this.setToken(response.tokens.authToken);
      if (response.tokens.refreshToken) {
        this.setRefreshToken(response.tokens.refreshToken);
      }
      
      // Store last login time
      this.setLastLoginTime();
      
      // Add success flag for consistent return format
      return {
        success: true,
        user: response.user
      };
    }
    
    return response;
  } catch (error) {
    console.error('Admin login error:', error);
    const errorMessage = error.userMessage || 'Admin login failed. Please check your credentials.';
    throw new Error(errorMessage);
  }
}
```

3. Made the same update to the regular login method for consistency.

## Long-term Recommendations

1. **Environment Configuration**: Update the `.env` file to match the server port, or consider using a more dynamic approach for service discovery.

2. **Response Format Standardization**: Ensure consistent response formats across all API endpoints to make client-side handling more predictable.

3. **Error Handling**: Add more detailed error logging and user-friendly error messages for auth-related issues.

## Testing the Fix

After applying these changes, the admin login should work correctly with the test account:
- Email: admin.test@email.com
- Password: password@123 