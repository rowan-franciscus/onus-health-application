/**
 * Migration: backfill patient-consent state on existing Connections
 *
 *   - Patient has a real account (isOnusUser !== false)
 *       -> ACTIVE, onboardingSource 'patient_initiated'. The patient controls
 *          their account and can withdraw consent there.
 *   - Patient is an unclaimed provider-created placeholder
 *       -> PENDING_CONSENT, onboardingSource 'provider_initiated'. Providers
 *          cannot add to (or read) these records until the patient consents.
 *
 * Only connections without consent.status are touched, so it is safe to re-run.
 * The rules live in services/consent.service.js (classifyLegacyConnections /
 * applyLegacyBackfill), and the server applies them on every startup, so
 * --apply is only needed to backfill without restarting the server.
 *
 * Steps (run in order, after migrations/consent-email-partial-index.js):
 *   1. node server/migrations/backfill-connection-consent.js
 *        dry run: prints what would change
 *   2. node server/migrations/backfill-connection-consent.js --notify-providers
 *        BEFORE the cutover: emails each affected provider a heads-up
 *   3. node server/migrations/backfill-connection-consent.js --apply
 *        writes the consent states (deploy the feature at the same time)
 *   4. node server/migrations/backfill-connection-consent.js --send-invites
 *        emails a consent request to every pending patient with an email who
 *        has not been sent one. The server's email queue processor delivers them.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const config = require('../config/environment');
const User = require('../models/User');
const Connection = require('../models/Connection');

const args = new Set(process.argv.slice(2));

async function notifyProviders(pending) {
  const emailService = require('../services/email.service');
  const byProvider = new Map();
  for (const c of pending) {
    const key = String(c.provider);
    byProvider.set(key, (byProvider.get(key) || 0) + 1);
  }
  for (const [providerId, count] of byProvider) {
    const provider = await User.findById(providerId).select('firstName email');
    if (!provider || !provider.email) continue;
    await emailService.sendTemplateEmail(
      provider.email,
      'consentMigrationNotice',
      {
        title: 'Patient consent is coming to Onus Health',
        providerFirstName: provider.firstName,
        patientCount: count,
        frontendUrl: config.frontendUrl
      },
      { subject: 'Action needed: patient consent for patients you added', userId: provider._id, queue: true }
    );
    console.log(`Queued heads-up to provider ${providerId} (${count} patient(s))`);
  }
}

async function sendInvites() {
  const consentService = require('../services/consent.service');
  const auditService = require('../services/audit.service');
  await auditService.init();

  const toInvite = await Connection.find({
    onboardingSource: 'provider_initiated',
    'consent.status': 'PENDING_CONSENT',
    'consent.firstInviteSentAt': { $exists: false }
  }).populate('patient', 'email').select('_id patient');

  let sent = 0;
  for (const c of toInvite) {
    if (!c.patient || !c.patient.email) continue;
    const { emailed } = await consentService.sendConsentInvite(c._id);
    if (emailed) sent += 1;
  }
  await auditService.flush();
  console.log(`Queued ${sent} consent request(s); ${toInvite.length - sent} pending patient(s) have no email.`);
}

async function run() {
  await mongoose.connect(config.mongoUri || process.env.MONGODB_ATLAS_URI);
  console.log('Connected to MongoDB');

  if (args.has('--send-invites')) {
    await sendInvites();
    return;
  }

  const consentService = require('../services/consent.service');
  const groups = await consentService.classifyLegacyConnections();
  const withEmail = groups.pending.filter((c) => c.patient.email).length;
  console.log(`Connections without consent state: ${groups.active.length + groups.pending.length + groups.orphaned.length}`);
  console.log(`  -> ACTIVE (patient has an account):          ${groups.active.length}`);
  console.log(`  -> PENDING_CONSENT (unclaimed placeholder):  ${groups.pending.length} (${withEmail} with email, ${groups.pending.length - withEmail} without)`);
  console.log(`  -> skipped (patient no longer exists):       ${groups.orphaned.length}`);

  if (args.has('--notify-providers')) {
    await notifyProviders(groups.pending);
  } else if (args.has('--apply')) {
    const auditService = require('../services/audit.service');
    await auditService.init();
    const applied = await consentService.applyLegacyBackfill(groups);
    await auditService.flush();
    console.log(`Set ACTIVE on ${applied.active}, PENDING_CONSENT on ${applied.pending}.`);
  } else {
    console.log('Dry run — nothing written. Use --notify-providers, --apply, then --send-invites.');
  }
}

run()
  .then(() => mongoose.disconnect())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
