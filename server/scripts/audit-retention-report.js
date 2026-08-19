/**
 * Audit retention report.
 *
 * Reads AUDIT_LOG_RETENTION_DAYS (config.auditLogRetentionDays) and reports
 * what falls outside the retention window, together with the exact commands
 * for the manual purge procedure documented in server/docs/AUDIT_TRAIL.md.
 *
 * This script is read-only by design: the audit collection is append-only at
 * the schema level and the application's database user has no `remove`
 * privilege on it, so purging is a deliberate DBA action with break-glass
 * credentials — never something the application performs on its own.
 *
 * Usage: node scripts/audit-retention-report.js
 */

const mongoose = require('mongoose');
const config = require('../config/environment');
const AuditEvent = require('../models/AuditEvent');

const main = async () => {
  const retentionDays = config.auditLogRetentionDays;
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  await mongoose.connect(config.mongoUri);

  const [total, expiring, oldest, newest, firstSurvivor] = await Promise.all([
    AuditEvent.countDocuments(),
    AuditEvent.countDocuments({ recorded: { $lt: cutoff } }),
    AuditEvent.findOne().sort({ seq: 1 }).select('seq recorded').lean(),
    AuditEvent.findOne().sort({ seq: -1 }).select('seq recorded').lean(),
    AuditEvent.findOne({ recorded: { $gte: cutoff } }).sort({ seq: 1 }).select('seq hash recorded').lean()
  ]);

  console.log(`Retention policy : ${retentionDays} days (AUDIT_LOG_RETENTION_DAYS)`);
  console.log(`Purge cutoff     : ${cutoff.toISOString()}`);
  console.log(`Events total     : ${total}`);
  console.log(
    `Oldest / newest  : ${oldest ? `seq ${oldest.seq} @ ${oldest.recorded.toISOString()}` : 'none'} / ` +
    `${newest ? `seq ${newest.seq} @ ${newest.recorded.toISOString()}` : 'none'}`
  );
  console.log(`Beyond retention : ${expiring}`);

  if (expiring > 0) {
    console.log('\nManual purge procedure (break-glass credentials required):');
    console.log('  1. node scripts/verify-audit-chain.js --checkpoint <path>   # archive the output');
    console.log('  2. export the range below for offline archival if policy requires');
    console.log(`  3. db.auditevents.deleteMany({ recorded: { $lt: ISODate("${cutoff.toISOString()}") } })`);
    if (firstSurvivor) {
      console.log(
        `  4. record the new chain anchor — seq ${firstSurvivor.seq}, hash ${firstSurvivor.hash} — ` +
        'in the purge log, then re-write the checkpoint:'
      );
      console.log('     node scripts/verify-audit-chain.js --checkpoint <path> --write-checkpoint');
    }
  } else {
    console.log('\nNothing is beyond the retention window; no purge is due.');
  }

  await mongoose.disconnect();
  return 0;
};

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error('Retention report failed to run:', error);
    process.exit(1);
  });
