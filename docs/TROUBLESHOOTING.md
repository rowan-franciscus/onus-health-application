# Troubleshooting Guide

This document provides solutions for common issues encountered in the Onus Health Application.

## Authentication Issues

### Sign-In Page Stuck on "Loading..."

If you're stuck on the loading screen when attempting to sign in:

1. **Clear Browser Cache and Cookies**:
   - Open Developer Tools (F12 or Ctrl+Shift+I)
   - Go to Application tab > Storage > Clear Site Data
   - Refresh the page

2. **Reset Authentication State**:
   - Open Developer Console (F12)
   - Run the following command:
     ```javascript
     window.clearAuthState();
     ```
   - Refresh the page and try signing in again

3. **Check Server Status**:
   - Make sure the server is running by checking terminal output
   - Server should be running on port 5001 (check in config)
   - You can run `npm run dev` in the server directory to restart it

4. **Verify API Connection**:
   - Open the Network tab in Developer Tools
   - Look for requests to `/api/auth/login`
   - Check if there are any CORS or connection errors

5. **Try Different Browser or Incognito Mode**:
   - Sometimes browser extensions can interfere with authentication

## Onboarding Redirection Issues

If you keep getting redirected to onboarding after signing in:

1. **Run the Onboarding Fix Script**:
   ```bash
   cd server
   npm run fix:onboarding
   ```

2. **Check Database Records**:
   - Verify that your user has `isProfileCompleted` set to `true`
   - Run the diagnostic script to check JWT tokens:
     ```bash
     node scripts/checkOnboardingIssue.js
     ```

## API Connection Issues

If you're experiencing API connection problems:

1. **Verify Server is Running**:
   ```bash
   cd server
   npm run dev
   ```

2. **Check API Connectivity**:
   ```bash
   cd server
   node scripts/testApiConnectivity.js
   ```

3. **Verify API URL in Client Config**:
   - Check `client/src/config/index.js` for the correct API URL
   - Default should be `http://localhost:5001/api`

## Other Common Issues

### Redux State Corruption
Sometimes the Redux state can become corrupted:

1. Open browser console and run:
   ```javascript
   window.clearAuthState();
   ```

2. Refresh the page and try again

### Port Already in Use
If you see "EADDRINUSE" error (port already in use):

1. Find and kill the process using port 5001:
   ```bash
   # On macOS/Linux
   lsof -i :5001
   kill -9 <PID>
   
   # On Windows
   netstat -ano | findstr :5001
   taskkill /PID <PID> /F
   ```

2. Then restart the server:
   ```bash
   npm run dev
   ```

## Getting Additional Help

If you continue to experience issues after trying these troubleshooting steps, please:

1. Check the server logs for more detailed error information
2. Create an issue in the GitHub repository with detailed steps to reproduce
3. Include browser console output and server logs when reporting issues 