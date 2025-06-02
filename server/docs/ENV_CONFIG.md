# Environment Configuration

This document outlines the environment variables used in the Onus Digital Health Record Application.

## Environment Files

For local development, create a `.env` file in the server directory with the required environment variables. For security reasons, this file should never be committed to the repository.

## Sample .env File

```
# Server Configuration
PORT=5001
NODE_ENV=development

# MongoDB Local Configuration
MONGO_URI=mongodb://localhost:27017/onus-health
TEST_MONGO_URI=mongodb://localhost:27017/onus-health-test

# MongoDB Atlas Configuration
MONGODB_ATLAS_URI=
# OR individual credentials
MONGODB_ATLAS_USERNAME=
MONGODB_ATLAS_PASSWORD=
MONGODB_ATLAS_CLUSTER=cluster0.abc123
MONGODB_ATLAS_DATABASE=onus-health

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5001/api/auth/google/callback

# Email Configuration (SendGrid)
SENDGRID_API_KEY=your_sendgrid_api_key
EMAIL_FROM=your-email@example.com

# File Upload
MAX_FILE_SIZE=5242880 # 5MB in bytes

# Frontend URL (for CORS and redirects)
FRONTEND_URL=http://localhost:3000
```

## Required Environment Variables by Environment

### Development

For local development, at minimum you need:

- `PORT` - The port to run the server on
- `MONGO_URI` - Local MongoDB connection string
- `JWT_SECRET` - Secret key for JWT authentication

### Testing

For running tests, the following are required:

- `TEST_MONGO_URI` - MongoDB connection string for testing

### Production

For production, the following are required:

- `NODE_ENV=production` - Set to production mode
- `MONGODB_ATLAS_URI` or the individual MongoDB Atlas credentials
- `JWT_SECRET` - A strong, unique JWT secret key
- `SENDGRID_API_KEY` - For sending emails
- `EMAIL_FROM` - The email address to send from
- `FRONTEND_URL` - The URL of the frontend application

## MongoDB Atlas Setup

For production, we use MongoDB Atlas. To set up:

1. Create a MongoDB Atlas account and cluster
2. Set up network access to allow connections from your application
3. Create a database user with appropriate permissions
4. Configure the connection string in your environment variables

You can provide the full connection string as `MONGODB_ATLAS_URI` or the individual components.

## Connection Options

The application uses different connection options based on the environment:

- **Development**: Includes detailed logging and automatic indexing
- **Testing**: Uses faster connection timeouts and minimal pooling
- **Production**: Uses more connections, majority write concern, and reads from secondaries when possible

## Security Note

Always protect your environment variables, especially in production. Never commit your `.env` file to version control or expose your MongoDB Atlas credentials publicly. 