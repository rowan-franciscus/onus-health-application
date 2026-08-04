/**
 * Verify the audit trail hash chain.
 *
 * Walks every AuditEvent in ascending seq order, recomputes each record's
 * hash from its own content + prevHash, and checks prevHash linkage and seq
 * contiguity. Any retroactive edit or deletion — even one made with direct
 * database access — surfaces as a divergence at a specific seq.
 *
 * Usage: node scripts/verify-audit-chain.js
 * Exit code 0 = chain intact, 1 = tampering/gap detected or error.
 */

const mongoose = require('mongoose');
const config = require('../config/environment');
const AuditEvent = require('../models/AuditEvent');
const { verifyChain } = require('../utils/auditChain');

const main = async () => {
  await mongoose.connect(config.mongoUri);

  const cursor = AuditEvent.find().sort({ seq: 1 }).lean().cursor();
  const result = await verifyChain(cursor);

  if (result.valid) {
    console.log(`OK: audit chain intact (${result.checked} events verified)`);
  } else {
    console.error(
      `TAMPER-EVIDENCE ALERT: chain broken at seq ${result.error.seq} ` +
      `(_id ${result.error.id}): ${result.error.reason}. ` +
      `${result.checked} events verified before the divergence.`
    );
  }

  await mongoose.disconnect();
  process.exit(result.valid ? 0 : 1);
};

main().catch((error) => {
  console.error('Verification failed to run:', error);
  process.exit(1);
});
