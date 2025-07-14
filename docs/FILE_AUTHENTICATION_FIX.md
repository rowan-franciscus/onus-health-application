# File Authentication Fix - JWT Token in Query Parameter

## Issue
When viewing files by opening them in a new window/tab, the browser doesn't send the Authorization header with the JWT token, resulting in 401 Unauthorized errors.

## Root Cause
- File viewing uses `window.open()` which creates a new browser navigation
- Browser navigations don't include custom headers like Authorization
- The server requires JWT authentication for all file access

## Solution
Implemented a fallback authentication mechanism that accepts JWT tokens via query parameter when the Authorization header is not present.

### Changes Made

1. **Server-side** (`server/routes/file.routes.js`):
   ```javascript
   // Check for token in query parameter if no Authorization header
   if (!req.headers.authorization && req.query.token) {
     req.headers.authorization = `Bearer ${req.query.token}`;
   }
   ```

2. **Client-side** (`client/src/services/file.service.js`):
   ```javascript
   // Get JWT token from localStorage
   const token = localStorage.getItem(config.tokenKey || 'onus_auth_token');
   const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
   
   const viewUrl = `${baseUrl}/api/files/${fileType}/${filename}?inline=true${tokenParam}`;
   ```

3. **Security Measures**:
   - Token in query parameters is sanitized in logs to avoid exposure
   - Token is only used as fallback when Authorization header is missing
   - All existing permission checks remain in place

## Security Considerations

### Risks of Tokens in URLs
1. **URL Logging**: URLs may be logged in server logs, proxy logs, or browser history
2. **Referrer Headers**: URLs might be sent in Referer headers to external sites
3. **Browser History**: URLs with tokens remain in browser history

### Mitigation Strategies
1. **Sanitized Logging**: Server logs redact tokens from query parameters
2. **HTTPS Only**: Always use HTTPS to prevent token interception
3. **Short-lived Tokens**: JWT tokens should have reasonable expiration times
4. **Permission Checks**: File access still requires proper user permissions

## Alternative Approaches

### 1. Proxy Download (More Secure)
Instead of direct file URLs, fetch files via API and create blob URLs:
```javascript
const response = await fetch(fileUrl, { headers: { Authorization: `Bearer ${token}` }});
const blob = await response.blob();
const blobUrl = URL.createObjectURL(blob);
window.open(blobUrl);
```

### 2. Temporary Signed URLs
Generate temporary URLs with expiring tokens specifically for file access.

### 3. Cookie-based Authentication
Use secure, httpOnly cookies alongside JWT for file operations.

## Testing

1. **View Files as Provider**:
   - Create consultation with attachments
   - Click "View" on any attachment
   - File should open without authentication errors

2. **View Files as Patient**:
   - View consultation with attachments
   - Click "View" on files tab
   - Files should be accessible

3. **Security Test**:
   - Check server logs to ensure tokens are redacted
   - Verify file permissions are still enforced

## Future Improvements

1. Implement temporary signed URLs with shorter expiration
2. Add rate limiting for file access endpoints
3. Consider implementing proxy download for sensitive files
4. Add audit logging for all file access attempts 