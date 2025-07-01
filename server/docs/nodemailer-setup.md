# Setting Up Nodemailer as an Alternative to SendGrid

If you don't have a SendGrid account or prefer to use SMTP, you can configure Nodemailer as your email provider.

## Configuration Steps

1. **Update your .env file**:

```env
# Email Configuration
MAIL_PROVIDER=nodemailer  # Change from 'sendgrid' to 'nodemailer'
EMAIL_FROM=no-reply@onus.health

# SMTP Configuration (example using Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
```

2. **For Gmail users**:
   - Enable 2-factor authentication
   - Generate an app-specific password: https://myaccount.google.com/apppasswords
   - Use the app-specific password as SMTP_PASS

3. **For other email providers**:
   - **Outlook/Hotmail**:
     - SMTP_HOST=smtp-mail.outlook.com
     - SMTP_PORT=587
   - **Yahoo**:
     - SMTP_HOST=smtp.mail.yahoo.com
     - SMTP_PORT=587
   - **Custom SMTP**: Use your provider's settings

4. **Restart the server** after updating the .env file

## Testing

Run the email verification test:
```bash
cd server
node scripts/testEmailVerification.js
```

The system will automatically use Nodemailer when MAIL_PROVIDER is set to 'nodemailer'. 