# Test Scripts

This directory contains scripts for testing different aspects of the Onus Health application.

## Database Testing

- **testDatabaseConnection.js**: Comprehensive script that tests the database connection, creates test users if they don't exist, and verifies their existence.

  ```bash
  npm run test:db
  ```

## Authentication Testing

- **testLoginEndpoint.js**: Tests the login endpoints for admin, provider, and patient test accounts.

  ```bash
  npm run test:login
  ```

## User Account Fixes

- **fixAdminTestAccount.js**: Specifically fixes the admin test account password.

- **forceCreateWorkingTestAccounts.js**: Creates brand new test accounts with working passwords.

## Password Testing

- **passwordHashTest.js**: Tests password hashing using bcrypt.

## Notes on Script Consolidation

To simplify maintenance and avoid redundant code, we've consolidated several scripts:

1. Removed `checkDatabaseConnection.js` - Use `testDatabaseConnection.js` instead
2. Removed `fixAllTestAccounts.js` - Use `npm run fix:auth` instead (runs `fixAuthenticationIssues.js`)
3. Removed `testLoginCredentials.js` - Use `npm run test:login` instead
4. Removed `debugLoginForTestAccounts.js` - Use `npm run fix:auth` for password issues

For comprehensive database fixes including connection string, test accounts, and authentication issues, use:

```bash
npm run consolidate:db
``` 