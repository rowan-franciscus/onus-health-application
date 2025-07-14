# File Viewing 404 Error Fix

## Issue
When clicking to view uploaded files, users were getting a 404 "Not Found" page even though the server was successfully serving the files (returning 200 status).

## Root Cause
The `FileService.viewFile()` method was using relative URLs like `/api/files/consultations/filename.pdf`. When opening these URLs in a new window/tab using `window.open()`, React Router was intercepting them as client-side routes, which don't exist in the React app, resulting in 404 errors.

## Solution
Updated the FileService to use full API URLs that include the protocol and host:

### Changes Made

1. **Import config** in `client/src/services/file.service.js`:
   ```javascript
   import config from '../config';
   ```

2. **Updated viewFile method**:
   ```javascript
   static viewFile(fileType, filename) {
     // Use full API URL to avoid React Router intercepting the request
     const baseUrl = config.apiUrl.replace(/\/api$/, ''); // Remove /api suffix if present
     const viewUrl = `${baseUrl}/api/files/${fileType}/${filename}?inline=true`;
     window.open(viewUrl, '_blank');
   }
   ```

3. **Updated getFileUrls method**:
   ```javascript
   static getFileUrls(fileType, filename) {
     // Use full API URL to avoid React Router intercepting the request
     const baseUrl = config.apiUrl.replace(/\/api$/, ''); // Remove /api suffix if present
     const fileBaseUrl = `${baseUrl}/api/files/${fileType}/${filename}`;
     return {
       viewUrl: `${fileBaseUrl}?inline=true`,
       downloadUrl: fileBaseUrl
     };
   }
   ```

## How It Works Now

- **Before**: `/api/files/consultations/file.pdf` → React Router tries to handle → 404
- **After**: `http://localhost:5001/api/files/consultations/file.pdf` → Direct HTTP request to server → File served correctly

## Testing

1. Create a consultation with file attachments
2. View the consultation
3. Click "View" button on any file
4. File should open in a new tab/window without 404 error
5. For PDFs and images, they should display inline in the browser
6. For other files, they should download

## Additional Notes

- The download functionality was already working correctly because it uses `ApiService.download()` which goes through the axios instance with proper base URL configuration
- This fix ensures that all file viewing operations bypass React Router and go directly to the server 