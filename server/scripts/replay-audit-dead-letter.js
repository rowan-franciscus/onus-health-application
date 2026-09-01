/**
 * Replay dead-lettered audit events into the chain.
 *
 * When the database is unreachable, the audit service appends events it could
 * not persist to a dead-letter file (one JSON object per line) instead of
 * dropping them. This script re-submits those events through the normal write
 * path once the datastore is healthy again, so an outage leaves a delayed
 * entry rather than a permanent hole in the trail.
 *
 * Replayed events keep their original `recorded` timestamp but are appended at
 * the current end of the chain (the seq numbers from the outage window were
 * taken by events that did succeed). The file is renamed on success so the
 * same events cannot be replayed twice.
 *
 * Usage: node scripts/replay-audit-dead-letter.js [--file <path>] [--dry-run]
 * Exit code 0 = nothing to do or replay succeeded, 1 = error.
 */

const fs = require('fs');
const mongoose = require('mongoose');
const config = require('../config/environment');
const auditService = require('../services/audit.service');
const AuditEvent = require('../models/AuditEvent');

const argValue = (flag) => {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
};

const main = async () => {
  const file = argValue('--file') || config.auditDeadLetterPath;
  const dryRun = process.argv.includes('--dry-run');

  if (!fs.existsSync(file)) {
    console.log(`Nothing to replay: no dead-letter file at ${file}`);
    return 0;
  }

  const lines = fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    console.log(`Nothing to replay: ${file} is empty`);
    return 0;
  }

  const events = [];
  const malformed = [];
  lines.forEach((line, index) => {
    try {
      events.push(JSON.parse(line));
    } catch (error) {
      malformed.push(index + 1);
    }
  });

  if (malformed.length > 0) {
    console.error(
      `Refusing to replay: ${malformed.length} unparseable line(s) at ${malformed.join(', ')} in ${file}. ` +
      'Repair or remove them first so no event is silently skipped.'
    );
    return 1;
  }

  console.log(`Found ${events.length} dead-lettered event(s) in ${file}`);
  if (dryRun) {
    events.forEach((event) => {
      console.log(`  ${event.recorded} ${event.type}/${event.subtype} (${event.action})`);
    });
    console.log('Dry run: nothing written.');
    return 0;
  }

  // Claim the batch by renaming before writing anything: events that fail
  // again are appended to a fresh dead-letter file at the original path, so
  // no event can be replayed twice.
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const claimed = `${file}.replaying-${stamp}`;
  fs.renameSync(file, claimed);

  await mongoose.connect(config.mongoUri);
  await auditService.init();

  const before = await AuditEvent.countDocuments();
  events.forEach((event) => auditService.replay(event));
  await auditService.flush();
  const written = (await AuditEvent.countDocuments()) - before;

  await mongoose.disconnect();

  const archived = `${file}.replayed-${stamp}`;
  fs.renameSync(claimed, archived);

  if (written < events.length) {
    console.error(
      `Replayed ${written}/${events.length} event(s); the rest failed again and were ` +
      `re-queued in ${file}. Check the datastore and re-run. Batch archived as ${archived}`
    );
    return 1;
  }

  console.log(`OK: replayed ${written} event(s). Batch archived as ${archived}`);
  return 0;
};

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error('Replay failed to run:', error);
    process.exit(1);
  });
