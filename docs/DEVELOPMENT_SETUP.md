# Development Setup Guide

## Quick Start

```bash
# Install dependencies for both client and server
npm run install-all

# Start both development servers
npm run dev
```

## Common Development Issues & Solutions

### 1. Proxy Errors During Startup ✅ FIXED
**Issue:** `Proxy error: Could not proxy request... ECONNREFUSED`

**Why it happens:** The React client starts faster than the Express server and tries to make requests before the server is ready.

**Solution:** We've implemented:
- Automatic retry logic with exponential backoff
- Custom proxy configuration with better error handling
- Graceful handling of webpack hot-update files

### 2. WebSocket Connection Errors ✅ IMPROVED
**Issue:** `WebSocket connection to 'ws://localhost:3000/ws' failed`

**Why it happens:** React's hot module replacement system tries to establish WebSocket connections.

**Solution:** These are handled gracefully and don't affect functionality.

### 3. Missing Static Files ✅ FIXED
**Issue:** `404 - Resource not found - /logo192.png`

**Why it happens:** PWA manifest references logo files that weren't created.

**Solution:** Added proper logo files to the public directory.

## Server Startup Sequence

1. **MongoDB Connection** - Server connects to MongoDB Atlas
2. **Email Queue Processor** - Background email processing starts
3. **HTTP Server** - Express server starts accepting requests on port 5001
4. **API Availability** - All endpoints become available

## Client Configuration

### Proxy Setup
- Uses custom `setupProxy.js` for better proxy control
- Automatically retries failed API requests during startup
- Handles webpack hot-update files gracefully

### Environment Variables
The client uses React's built-in environment variable system. No additional `.env` files are needed for basic development.

## Debugging Tips

### API Request Logs
The server logs all API requests in development mode with:
- Request method and URL
- Authorization header status
- Request body (with sensitive data hidden)
- Response status and timing

### Client-Side Debugging
- All API requests are logged in the browser console
- Authentication errors are handled gracefully
- Network errors show user-friendly messages

## Performance Considerations

### Development Mode
- CORS is configured to allow all origins for easier debugging
- Request/response logging is enabled
- Hot module replacement is active

### Database Connection
- Connection monitoring with 30-second intervals
- Automatic reconnection on connection loss
- Database ping logging for performance monitoring

## Testing the Setup

1. **Start the servers**: `npm run dev`
2. **Check server logs**: Look for "Server running in development mode on port 5001"
3. **Check client**: Should show "webpack compiled successfully"
4. **Test API calls**: Navigate to any page requiring authentication
5. **Check database**: Look for "Database ping successful" messages

## Expected Startup Output

```
[0] Server running in development mode on port 5001
[0] API available at http://localhost:5001/api
[0] Database ping successful: XXms
[1] webpack compiled successfully
```

## Common Commands

```bash
# Start development servers
npm run dev

# Install all dependencies
npm run install-all

# Seed database with test data
cd server && npm run seed

# Reset test data
cd server && npm run seed:reset
``` 