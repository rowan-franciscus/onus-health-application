# Render Deployment Guide

This guide will help you deploy the Onus Health Application to Render and configure the environment variables correctly to avoid CORS and connection issues.

## Prerequisites

1. GitHub repository with your code
2. Render account
3. MongoDB Atlas cluster
4. SendGrid account for emails

## Step 1: Update Render Service URLs

Before deploying, you need to update the URLs in `render.yaml` to match your actual Render service names:

1. In `render.yaml`, update these URLs:
   - `FRONTEND_URL`: Replace `https://onus-health-frontend.onrender.com` with your actual frontend service URL
   - `REACT_APP_API_URL`: Replace `https://onus-health-backend.onrender.com/api` with your actual backend service URL

## Step 2: Deploy to Render

1. Connect your GitHub repository to Render
2. Render will automatically create both services based on `render.yaml`
3. Wait for the initial deployment (it may fail due to missing environment variables)

## Step 3: Configure Backend Environment Variables

In the Render dashboard for your **backend service**, set these environment variables:

### Required Variables (Set in Render Dashboard)

```bash
# Database
MONGODB_ATLAS_URI=mongodb+srv://username:password@cluster.mongodb.net/onus-health?retryWrites=true&w=majority

# JWT Secrets (Generate secure random strings)
JWT_SECRET=your_secure_jwt_secret
JWT_REFRESH_SECRET=your_secure_refresh_secret

# Email Configuration
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
```

### How to Generate Secure Secrets

You can generate secure JWT secrets using:

```bash
# In terminal
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Or use online tools like:
- https://generate-secret.vercel.app/64
- https://www.allkeysgenerator.com/Random/Security-Encryption-Key-Generator.aspx

## Step 4: Update Service URLs

After your services are deployed, you'll get the actual URLs. Update these:

### Backend Service
Update the `FRONTEND_URL` environment variable to your actual frontend URL:
```
FRONTEND_URL=https://your-actual-frontend-url.onrender.com
```

### Frontend Service
Update the `REACT_APP_API_URL` environment variable to your actual backend URL:
```
REACT_APP_API_URL=https://your-actual-backend-url.onrender.com/api
```

## Step 5: Trigger Redeployment

After setting all environment variables:
1. Go to your Render dashboard
2. Manually trigger a redeploy for both services
3. Or push a new commit to trigger automatic deployment

## Step 6: Verify Deployment

1. Check that both services are running in the Render dashboard
2. Visit your frontend URL
3. Try to sign in with test accounts:
   - Admin: `admin.test@email.com` / `password@123`
   - Patient: `patient.test@email.com` / `password@123`
   - Provider: `provider.test@email.com` / `password@123`

## Troubleshooting

### CORS Errors
- Ensure `FRONTEND_URL` in backend matches your actual frontend URL
- Check that both services are deployed and running

### API Connection Errors
- Verify `REACT_APP_API_URL` in frontend matches your backend URL
- Check backend logs in Render dashboard for errors

### Database Connection Issues
- Verify `MONGODB_ATLAS_URI` is correct
- Ensure your MongoDB Atlas cluster allows connections from all IPs (0.0.0.0/0)

### Email Issues
- Verify `SENDGRID_API_KEY` is valid
- Check SendGrid dashboard for sending statistics

## Environment Variables Summary

### Backend Service Environment Variables
```
NODE_ENV=production
PORT=10000
MONGODB_ATLAS_URI=mongodb+srv://...
JWT_SECRET=your_secure_secret
JWT_REFRESH_SECRET=your_secure_refresh_secret
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
SENDGRID_API_KEY=SG.your_key
EMAIL_FROM=no-reply@onus.health
SESSION_TIMEOUT=30
FRONTEND_URL=https://your-frontend-url.onrender.com
MAX_FILE_SIZE=5242880
```

### Frontend Service Environment Variables
```
REACT_APP_API_URL=https://your-backend-url.onrender.com/api
REACT_APP_SESSION_TIMEOUT=1800000
NODE_ENV=production
```

## Security Notes

- Never commit `.env` files to your repository
- Use strong, unique secrets for JWT tokens
- Regularly rotate your API keys
- Monitor your application logs for security issues

## Next Steps

After successful deployment:
1. Set up monitoring and alerts in Render
2. Configure custom domains if needed
3. Set up backup strategies for your database
4. Consider implementing additional security measures 