# Admin Users Documentation

## Production Admin Users

The Onus Health application has the following admin users with full administrative privileges:

### 1. Primary Admin
- **Email**: rowan.franciscus.2@gmail.com
- **Password**: password@123
- **Admin Level**: Super Admin
- **Role**: Primary application administrator

### 2. Secondary Admin
- **Email**: julian@onus.health
- **Password**: password@123
- **Admin Level**: Super Admin
- **Role**: Full administrative access

## Test Admin User

For development and testing purposes:
- **Email**: admin.test@email.com
- **Password**: password@123
- **Admin Level**: Super Admin
- **Role**: Test account for development

## Admin Capabilities

All admin users have access to:
- View and manage all users (patients and providers)
- Approve/reject provider verification requests
- View platform analytics
- Edit user profiles and data
- Delete user accounts
- Access all areas of the application

## Adding New Admin Users

To add a new admin user, run the following script:

```bash
cd server
node scripts/addAdminUser.js
```

To customize the admin details, edit the `newAdmin` object in `/server/scripts/addAdminUser.js` before running.

## Security Notes

- Admin accounts bypass email verification
- Admin accounts have `isProfileCompleted` set to true by default
- All admin passwords should be changed in production
- Admin emails receive provider verification request notifications

## Admin Login

Admins use a separate login page:
- URL: `/admin/sign-in`
- This page is not linked from the main navigation for security

## Environment Configuration

Admin notification emails are sent to the configured admin addresses. To add or modify admin email recipients for system notifications, update the email service configuration in `/server/services/email.service.js`. 