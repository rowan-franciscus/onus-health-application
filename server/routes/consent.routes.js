const express = require('express');
const router = express.Router();

const { consentLinkLimiter } = require('../middleware/auth.middleware');
const consentController = require('../controllers/consent.controller');

// Public: the patient opens these from the consent email, no account needed.
// The token itself (plus DOB on respond) is the credential.
router.get('/:token', consentLinkLimiter, consentController.getConsentRequest);
router.post('/:token/respond', consentLinkLimiter, consentController.respondToConsentRequest);

module.exports = router;
