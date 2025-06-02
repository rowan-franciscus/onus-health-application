# Admin Authentication Fix

## Problem
The admin functionality was not working due to several authentication issues, resulting in 401 errors when accessing admin API endpoints like:
- `/api/admin/analytics/dashboard`
- `/api/admin/provider-verifications`
- `/api/admin/users`

## Root Causes
1. **Missing Admin Test Account**: The expected test admin account `admin.test@email.com` was not found in the database.
2. **Incomplete JWT Payload**: The auth token didn't include all necessary user information.
3. **Inadequate Error Handling**: Auth middleware didn't provide detailed enough error messages.
4. **JWT Strategy Configuration**: The JWT strategy didn't have enough debugging information.

## Solutions Applied

### 1. Added Missing Admin Account
Created a script (`scripts/fixAdmin.js`) to create or update the admin test account with proper credentials.

### 2. Enhanced JWT Token Generation
Updated the `generateAuthToken` method in the User model to include all necessary user information:

```js
UserSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { 
      id: this._id, 
      role: this.role,
      email: this.email,
      isProfileCompleted: this.isProfileCompleted,
      onboardingCompleted: this.isProfileCompleted,
      isEmailVerified: this.isEmailVerified, // Added this
      firstName: this.firstName,             // Added this
      lastName: this.lastName                // Added this
    }, 
    config.jwtSecret, 
    { expiresIn: config.jwtExpiresIn }
  );
};
```

### 3. Improved Admin Middleware
Enhanced the `isAdmin` middleware with better logging and error handling:

```js
const isAdmin = (req, res, next) => {
  if (!req.user) {
    logger.error('isAdmin middleware: No user in request');
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  
  logger.debug(`isAdmin middleware: Checking user role: ${req.user.role}`);
  
  if (req.user.role === 'admin') {
    logger.debug(`Admin access granted for user: ${req.user.email}`);
    return next();
  }
  
  logger.warn(`Admin access denied for user: ${req.user.email} with role: ${req.user.role}`);
  return res.status(403).json({ success: false, message: 'Access denied: Admin role required' });
};
```

### 4. Enhanced JWT Strategy
Improved the JWT strategy with detailed logging:

```js
passport.use(
  new JwtStrategy(jwtOptions, async (payload, done) => {
    try {
      // Log payload information for debugging
      console.log('JWT payload received:', {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        isEmailVerified: payload.isEmailVerified
      });
      
      // ... rest of the strategy
    } catch (error) {
      console.error('JWT Auth: Error during authentication:', error);
      return done(error, false);
    }
  })
);
```

### 5. Added Request Logging
Enhanced server request logging to show more details:

```js
// For debugging in non-production
if (config.env !== 'production') {
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.url}`);
    
    // Log authorization header (but hide the token value)
    if (req.headers.authorization) {
      const authHeader = req.headers.authorization;
      logger.debug(`Authorization: ${authHeader.startsWith('Bearer') ? 'Bearer [TOKEN]' : authHeader}`);
    } else {
      logger.debug('No Authorization header present');
    }
    
    // ... more logging
    
    next();
  });
}
```

## Testing the Fix
Created a test script (`scripts/testAdminAuth.js`) that verifies:
1. Admin login works correctly
2. Admin endpoints are accessible with the admin token
3. Data is returned correctly from endpoints

## Future Recommendations
1. **Authentication Debugging Tools**: Keep the test scripts for debugging any future auth issues.
2. **Standardized Error Handling**: Ensure consistent error formats for auth failures.
3. **Token Payload Validation**: Regularly verify that token payloads include all required fields.
4. **Admin Account Management**: Better tools for managing admin accounts and permissions. 