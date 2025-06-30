# Password Reset Functionality Documentation

## Overview
This document describes the complete password reset functionality implementation for the Onus Health Application, covering all user types (patients, providers, and admin).

## Features

### 1. Password Reset Request
- Users can request a password reset from the sign-in pages
- All user types (admin, provider, patient) can use the forgot password functionality
- Password reset emails are sent via SendGrid using the email queue system

### 2. Password Reset Process
- Users receive an email with a secure reset link
- The reset link contains a JWT token that expires after 1 hour
- Users can set a new password using the reset link
- Password hashing is handled automatically by the User model

### 3. Change Password (When Logged In)
- All authenticated users can change their password from their settings page
- Users must provide their current password for verification
- New passwords must meet security requirements (minimum 8 characters)

## Implementation Details

### Backend Components

#### 1. User Model Updates
Added password reset fields to `server/models/User.js`:
```javascript
resetPasswordToken: {
  type: String
},
resetPasswordExpires: {
  type: Date
}
```

#### 2. Authentication Controller
Password reset methods in `server/controllers/authController.js`:
- `forgotPassword` - Handles password reset requests
- `resetPassword` - Processes password reset with token

#### 3. User Controller
Added `changePassword` method in `server/controllers/user.controller.js` for authenticated password changes.

#### 4. Routes
- **Auth Routes** (`server/routes/auth.routes.js`):
  - POST `/api/auth/password-reset-request` - Request password reset
  - POST `/api/auth/password-reset` - Reset password with token
  
- **User Routes** (`server/routes/user.routes.js`):
  - PUT `/api/user/change-password` - Change password when authenticated
  
- **Admin Routes** (`server/routes/admin.routes.js`):
  - PUT `/api/admin/change-password` - Admin-specific password change
  
- **Provider Routes** (`server/routes/provider.routes.js`):
  - PUT `/api/provider/change-password` - Provider-specific password change

#### 5. Email Templates
- `server/templates/emails/passwordReset.html` - Password reset request email
- `server/templates/emails/passwordResetSuccess.html` - Password reset confirmation email

### Frontend Components

#### 1. Pages
- `client/src/pages/auth/ForgotPassword.jsx` - Forgot password form
- `client/src/pages/auth/ResetPassword.jsx` - Reset password form
- `client/src/pages/patient/Settings.jsx` - Patient settings with password change
- `client/src/pages/provider/Settings.jsx` - Provider settings with password change
- `client/src/pages/admin/Settings.jsx` - Admin settings with password change

#### 2. Services
- `client/src/services/auth.service.js` - Password reset API methods
- `client/src/services/userSettings.service.js` - User settings service

#### 3. Routes
Added routes in `client/src/App.js`:
- `/forgot-password` - Forgot password page
- `/reset-password/:token` - Reset password page with token

## Security Features

1. **Token Security**
   - JWT tokens are used for password reset links
   - Tokens expire after 1 hour
   - Tokens are single-use and cleared after password reset

2. **Password Hashing**
   - Passwords are automatically hashed using bcrypt (12 rounds)
   - The User model's pre-save middleware handles hashing

3. **Validation**
   - Current password verification for authenticated changes
   - Minimum password length of 8 characters
   - Password confirmation required

## API Usage Examples

### Request Password Reset
```bash
POST /api/auth/password-reset-request
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### Reset Password
```bash
POST /api/auth/password-reset
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "NewSecurePassword123"
}
```

### Change Password (Authenticated)
```bash
PUT /api/user/change-password
Authorization: Bearer <auth-token>
Content-Type: application/json

{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword123"
}
```

## Testing

### Test Script
Run the password reset test script:
```bash
cd server
node scripts/test/testPasswordReset.js
```

### Manual Testing Steps
1. Navigate to the sign-in page for any user type
2. Click "Forgot password?" link
3. Enter a valid email address
4. Check email for reset link
5. Click the reset link
6. Enter and confirm new password
7. Sign in with the new password

### Testing for Different User Types
- **Patient**: Use `/sign-in` → "Forgot password?"
- **Provider**: Use `/sign-in` → "Forgot password?"
- **Admin**: Use `/admin/sign-in` → "Forgot password?"

## Troubleshooting

### Common Issues

1. **Reset email not received**
   - Check SendGrid configuration in `.env`
   - Verify email queue is processing
   - Check spam folder

2. **Invalid or expired token error**
   - Token expires after 1 hour
   - Request a new password reset

3. **Password change fails**
   - Ensure current password is correct
   - New password must be at least 8 characters

### Debug Commands
```bash
# Check if user has reset token
cd server
node -e "
const mongoose = require('mongoose');
const User = require('./models/User');
const config = require('./config/environment');
mongoose.connect(config.mongoUri).then(async () => {
  const user = await User.findOne({ email: 'user@example.com' });
  console.log('Reset token:', user.resetPasswordToken ? 'Present' : 'Not set');
  console.log('Expires:', user.resetPasswordExpires);
  mongoose.disconnect();
});
"
```

## Email Configuration

Ensure the following environment variables are set in `server/.env`:
```
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@onushealth.com
FRONTEND_URL=http://localhost:3000
```

## Future Enhancements

1. **Password Strength Indicator**: Add visual feedback for password strength
2. **Two-Factor Authentication**: Add 2FA for password resets
3. **Password History**: Prevent reuse of recent passwords
4. **Account Lockout**: Lock account after multiple failed attempts
5. **Password Requirements**: Enforce more complex password requirements

## Conclusion

The password reset functionality is fully implemented and working for all user types. It follows security best practices including token expiration, password hashing, and secure email delivery. 