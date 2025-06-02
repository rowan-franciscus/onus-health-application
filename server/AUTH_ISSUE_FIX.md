# Authentication Issue Fix

## Problem

Users were experiencing "Invalid credentials" errors when attempting to sign in with the test accounts. This was occurring despite the users being present in the database with the expected credentials.

## Root Cause

The issue was related to how the passwords were stored in the database. When test users were seeded, the password hashes were not being generated correctly, leading to password comparison failures during authentication.

The issue might have been caused by one of the following:

1. A change in how bcrypt works between different versions of the application
2. Password hashes being double-hashed due to the pre-save middleware in the User model
3. Database migration issues when consolidating to the onus-health database

## Solution

A script has been created to fix the authentication issues by:

1. Finding all test users in the database
2. Generating fresh password hashes for their passwords
3. Updating the hashes directly in the database (bypassing the pre-save middleware)
4. Verifying that the passwords work correctly

## How to Fix

If you're experiencing "Invalid credentials" when trying to log in with test accounts, run:

```bash
npm run fix:auth
```

This will reset the passwords for all test accounts to their default values:

- admin.test@email.com: password@123
- provider.test@email.com: password@123
- patient.test@email.com: password@123

## Prevention

The seed script has been updated to check and fix passwords for existing users, ensuring that they always have the correct password hash. This will prevent the issue from recurring when you run:

```bash
npm run seed
```

## Technical Details

The fix works by bypassing the User model's pre-save middleware when updating passwords. This avoids potential double-hashing issues. It uses direct MongoDB updates via `User.updateOne()` instead of `user.save()`.

## Verification

After running the fix script, you can verify that the authentication is working by:

1. Starting the application: `npm run dev`
2. Trying to sign in with any of the test accounts in the frontend
3. If problems persist, check the server logs for detailed error messages 