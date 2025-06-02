# Email Functionality in Onus Health Application

## Overview
The Onus Health application uses SendGrid as its primary email provider, with Nodemailer as a fallback option. The email system is designed to be reliable with queue management and retry capabilities.

## Configuration
Email functionality is configured via the following environment variables:

- `MAIL_PROVIDER`: The email provider to use ('sendgrid' or 'nodemailer')
- `SENDGRID_API_KEY`: Your SendGrid API key (should start with 'SG.')
- `EMAIL_FROM`: The email address from which emails are sent (e.g., 'noreply@onus.health')

For Nodemailer fallback (optional):
- `SMTP_HOST`: SMTP server hostname
- `SMTP_PORT`: SMTP server port (usually 587 or 465)
- `SMTP_SECURE`: Whether to use secure connection (true/false)
- `SMTP_USER`: SMTP username
- `SMTP_PASS`: SMTP password

## Implemented Email Templates

The application has the following email templates:

1. **Verification Email**: Sent when a user signs up to verify their email address
2. **Password Reset Email**: Sent when a user requests to reset their password
3. **Connection Request Email**: Sent to patients when a provider requests access to their data
4. **Consultation Notification**: Sent to patients when a new consultation is added by a provider
5. **Provider Verification Request**: Sent to admins when a new provider registers and needs verification

## Email Queue System

The application includes an email queue system for reliability:

- Failed emails are automatically retried according to the retry intervals
- Queue processing happens at regular intervals (default: every 60 seconds)
- Maximum retry attempts can be configured

## Testing Email Functionality

Two test scripts are provided to verify email functionality:

### 1. Test Verification Email
Sends a verification email to a specific email address:

```bash
node scripts/testEmailVerification.js
```

### 2. Test All Email Templates
Tests all available email templates by sending them to a specified email address:

```bash
node scripts/testAllEmails.js [email@example.com]
```

If no email is provided, it defaults to rowan.franciscus@gmail.com.

## Email Service API

The email service (`email.service.js`) provides the following main functions:

- `sendEmail(emailData)`: Sends an email directly using the configured provider
- `queueEmail(emailData, options)`: Queues an email for sending with retry logic
- `sendTemplateEmail(to, templateName, templateData, options)`: Sends an email using a template
- `sendVerificationEmail(user, token, options)`: Sends a verification email to a user
- `sendPasswordResetEmail(user, token, options)`: Sends a password reset email
- `sendConnectionRequestEmail(patient, provider, options)`: Notifies a patient about a provider request
- `sendConsultationNotificationEmail(patient, provider, consultation, options)`: Notifies about a new consultation
- `sendProviderVerificationRequestEmail(provider, options)`: Notifies admins about provider verification requests

## Email Templates

Email templates are located in the `server/templates/emails/` directory and use Handlebars for templating. Available templates:

- `verification.html`: Email verification template
- `passwordReset.html`: Password reset template
- `accessRequest.html`: Provider access request template
- `consultationNotification.html`: New consultation notification template
- `providerVerification.html`: Provider verification request template
- `baseTemplate.html`: Base template used by all emails 