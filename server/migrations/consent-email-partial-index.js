/**
 * Migration: make User.email unique among real accounts only
 *
 * Provider-created placeholder patients (isOnusUser: false) may share an
 * email address (shared family emails are common), so the plain unique index
 * is replaced by a partial unique index over isOnusUser: true.
 *
 * Also backfills isOnusUser: true on any legacy user missing the field, so
 * the partial index still covers them.
 *
 * Run once BEFORE deploying the patient-consent feature. Safe to re-run.
 *
 * Usage:
 *   node server/migrations/consent-email-partial-index.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const config = require('../config/environment');

const PARTIAL_FILTER = { isOnusUser: true, email: { $type: 'string' } };

async function run() {
  await mongoose.connect(config.mongoUri || process.env.MONGODB_ATLAS_URI);
  console.log('Connected to MongoDB');

  const collection = mongoose.connection.collection('users');

  const backfill = await collection.updateMany(
    { isOnusUser: { $exists: false } },
    { $set: { isOnusUser: true } }
  );
  console.log(`Backfilled isOnusUser on ${backfill.modifiedCount} legacy user(s).`);

  const indexes = await collection.indexes();
  const emailIndex = indexes.find((idx) => idx.key && idx.key.email === 1 && Object.keys(idx.key).length === 1);

  if (emailIndex && emailIndex.partialFilterExpression &&
      emailIndex.partialFilterExpression.isOnusUser === true) {
    console.log('Email index is already partial — no migration needed.');
    process.exit(0);
  }

  if (emailIndex) {
    console.log(`Dropping existing email index "${emailIndex.name}"…`);
    await collection.dropIndex(emailIndex.name);
  }

  console.log('Creating partial unique email index…');
  await collection.createIndex(
    { email: 1 },
    { unique: true, partialFilterExpression: PARTIAL_FILTER, name: 'email_1' }
  );

  console.log('Migration complete.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
