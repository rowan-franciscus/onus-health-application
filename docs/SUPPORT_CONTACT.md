# Official Support Contact Information

## Email Support
- **Email**: support@onus.health
- **Response Time**: 24-48 hours

## Phone Support
- **Phone Number**: 081 000 0000
- **Hours**: Monday - Friday, 9AM - 5PM SAST

## Usage Notes
- The support email `support@onus.health` is used for all user-facing support communications
- The system email `no-reply@onus.health` is used for automated system notifications
- Support contact information is configured via environment variables:
  - `SUPPORT_EMAIL` - Support email address
  - `SUPPORT_PHONE` - Support phone number

## Implementation
Support contact information is used in:
- Help Center page (`/client/src/pages/shared/Help.jsx`)
- Email templates (footer and specific templates)
- Configuration files (`/server/config/environment.js`) 