/**
 * Migration: make the User.email index sparse
 *
 * Run once after deploying the isOnusUser / registeredBy schema changes.
 * Safe to re-run — it is a no-op if the index is already sparse.
 *
 * Usage:
 *   node server/migrations/make-email-index-sparse.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const config = require('../config/environment');

async function run() {
  await mongoose.connect(config.mongoUri || process.env.MONGODB_ATLAS_URI);
  console.log('Connected to MongoDB');

  const collection = mongoose.connection.collection('users');
  const indexes = await collection.indexes();

  const emailIndex = indexes.find(
    (idx) => idx.key && idx.key.email === 1
  );

  if (!emailIndex) {
    console.log('No email index found — nothing to migrate.');
    process.exit(0);
  }

  if (emailIndex.sparse) {
    console.log('Email index is already sparse — no migration needed.');
    process.exit(0);
  }

  console.log('Dropping existing non-sparse email index…');
  await collection.dropIndex(emailIndex.name);

  console.log('Creating new sparse unique email index…');
  await collection.createIndex(
    { email: 1 },
    { unique: true, sparse: true, name: 'email_1' }
  );

  console.log('Migration complete.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
