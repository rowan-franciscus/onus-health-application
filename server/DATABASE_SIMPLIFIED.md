# Database Simplification

## Overview

The application has been simplified to only use the MongoDB Atlas `onus-health` database. Previously, the application was using different databases depending on the environment, which could lead to confusion and issues where data was being stored in unexpected places.

## Connection String Fix

The application is currently connecting to the **test** database in MongoDB Atlas instead of the **onus-health** database. This is why you don't see your changes in the MongoDB Atlas web interface when looking at the onus-health database.

### How to Fix the Connection String

Edit your `.env` file and update the MongoDB Atlas URI to include the database name:

```
# Original
MONGODB_ATLAS_URI=mongodb+srv://rowanfranciscus:SJnMcNnrX2Sar2AJ@onus-health-application.nxqgbsi.mongodb.net/?retryWrites=true&w=majority&appName=onus-health-application

# Updated (adding "onus-health" after .net/)
MONGODB_ATLAS_URI=mongodb+srv://rowanfranciscus:SJnMcNnrX2Sar2AJ@onus-health-application.nxqgbsi.mongodb.net/onus-health?retryWrites=true&w=majority&appName=onus-health-application
```

The key change is adding `/onus-health` before the question mark in the connection string.

## Changes Made

1. **Connection Logic**: Updated the database connection logic in `config/environment.js` to always connect to the `onus-health` database regardless of environment.

2. **Database Settings**: Removed any environment-specific database settings to ensure consistent database usage.

3. **Seed Scripts**: Updated seed scripts to explicitly check that they're connected to the `onus-health` database before seeding data.

4. **Test Data**: Ensured all test users are properly seeded in the `onus-health` database.

5. **Utility Scripts**: Added several utility scripts to help manage the database connection.

6. **Authentication Fix**: Fixed issues with test account passwords to ensure login works correctly.

## New Scripts

The following npm scripts have been added to help manage the database:

- `npm run consolidate:db` - Comprehensive script that:
  - Ensures the connection string points to the `onus-health` database
  - Removes any test databases
  - Seeds test users into the `onus-health` database
  - Verifies the test users were created properly

- `npm run fix:auth` - Fixes authentication issues by resetting passwords for test accounts.

- `npm run check:users` - Lists all users in the database to verify data

## Getting Started

To ensure your application is using the correct database and has the test users properly seeded:

1. Make sure your `.env` file contains a MongoDB Atlas connection string:
   ```
   MONGODB_ATLAS_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
   ```

2. Run the consolidation script:
   ```bash
   npm run consolidate:db
   ```

3. If you're having trouble logging in, run the authentication fix script:
   ```bash
   npm run fix:auth
   ```

4. Start the application:
   ```bash
   npm run dev
   ```

## Test Accounts

After running the consolidation script, the following test accounts will be available in the `onus-health` database:

- **Admin**: admin.test@email.com / password@123
- **Patient**: patient.test@email.com / password@123
- **Provider**: provider.test@email.com / password@123

## Authentication Issues

If you encounter "Invalid credentials" errors when trying to log in:

1. Run `npm run fix:auth` to properly reset the test account passwords
2. Ensure the environment variables in your `.env` file match the ones in the documentation
3. Restart the server after making any changes

## Troubleshooting

If you encounter issues with the database connection:

1. Check your `.env` file to ensure it has a valid MongoDB Atlas URI
2. Run `npm run consolidate:db` to fix the connection string and seed database
3. Run `npm run check:users` to verify users exist in the database
4. If no users are found, run `npm run seed` to create the test accounts 

## Verifying the Connection

After updating the connection string, restart your server, and the application will connect to the correct database. You should then be able to see your test accounts in the MongoDB Atlas web interface when viewing the onus-health database.

You can verify the connection is working correctly by running:

```bash
node scripts/test/testDatabaseConnection.js
```

This should now show "Database Name: onus-health" in the output. 