# Onus Health Application Documentation

## Testing Documentation

### 🚀 For First-Time Testers
1. **[Quick Start Testing Guide](QUICK_START_TESTING.md)**  
   Start here! Contains essential test scenarios and pre-configured test accounts.

2. **[Features Summary](FEATURES_SUMMARY.md)**  
   Complete list of all implemented features organized by user role.

3. **[Comprehensive Testing Guide](TESTING_GUIDE.md)**  
   Detailed step-by-step instructions for testing every feature in the application.

### Test Account Credentials
```
Admin:    admin.test@email.com    / password@123
Patient:  patient.test@email.com  / password@123
Provider: provider.test@email.com / password@123
```

## Additional Documentation

### Development & Setup
- **[Development Setup](DEVELOPMENT_SETUP.md)** - Local development environment setup
- **[Troubleshooting Guide](TROUBLESHOOTING.md)** - Common issues and solutions

### Feature Documentation
- **[Patient-Provider Connection Flow](PATIENT_PROVIDER_CONNECTION_FLOW.md)** - Detailed connection workflow

### Technical Notes
- **[Admin Login Fix](admin-login-fix.md)** - Admin authentication implementation
- **[Admin Login Fix v2](admin-login-fix-v2.md)** - Updated admin authentication

## Testing Priorities

### High Priority Tests
1. User registration and email verification
2. Provider verification by admin
3. Creating and completing consultations
4. Patient-provider connection management
5. Medical records viewing and filtering

### Medium Priority Tests
1. Profile editing
2. Search functionality
3. File uploads/downloads
4. Session timeout handling
5. Password reset flow

### Low Priority Tests
1. Social login (Google/Facebook)
2. Account deletion
3. Responsive design on mobile
4. Browser compatibility

## Support Information
- **Deployed URL:** [Your Render URL]
- **Email Configuration:** rowan.franciscus.10@gmail.com
- **Database:** MongoDB Atlas
- **File Storage:** Local uploads directory

## Quick Links
- [Server API Documentation](/server/routes/api.md)
- [Test Accounts Documentation](/server/docs/TEST_ACCOUNTS.md)
- [Environment Configuration](/server/docs/ENV_CONFIG.md)
- [Email Functionality](/server/docs/EMAIL_FUNCTIONALITY.md) 