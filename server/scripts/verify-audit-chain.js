/**
 * Verify the audit trail hash chain.
 *
 * Walks every AuditEvent in ascending seq order, recomputes each record's
 * hash from its own content + prevHash, and checks prevHash linkage and seq
 * contiguity. Any retroactive edit or deletion in the interior of the chain —
 * even one made with direct database access — surfaces as a divergence at a
 * specific seq.
 *
 * Interior checks alone cannot see truncation: deleting the newest events, or
 * an oldest prefix, leaves no adjacent gap. `--checkpoint` closes that by
 * comparing both boundaries against an anchor/tip recorded outside the
 * database. Keep the checkpoint file on separate storage (and under its own
 * access control) — a checkpoint stored beside the data it attests to proves
 * nothing.
 *
 * Usage:
 *   node scripts/verify-audit-chain.js
 *   node scripts/verify-audit-chain.js --checkpoint <path>
 *   node scripts/verify-audit-chain.js --checkpoint <path> --write-checkpoint
 *
 * `--write-checkpoint` records the current anchor and tip after a successful
 * verification. Run it on a trusted schedule, and after every documented
 * retention purge (which legitimately moves the anchor forward).
 *
 * Exit code 0 = chain intact, 1 = tampering/gap detected or error.
 */

const fs = require('fs');
const mongoose = require('mongoose');
const config = require('../config/environment');
const AuditEvent = require('../models/AuditEvent');
const { verifyChain, compareCheckpoint } = require('../utils/auditChain');

const argValue = (flag) => {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
};

/**
 * Wrap the cursor so a single pass yields both the chain verification and the
 * boundary observations the checkpoint comparison needs.
 */
async function* observe(cursor, observations, tipSeqOfInterest) {
  for await (const doc of cursor) {
    if (observations.first === null) observations.first = doc;
    observations.last = doc;
    if (tipSeqOfInterest !== undefined && doc.seq === tipSeqOfInterest) {
      observations.atCheckpointTip = doc;
    }
    yield doc;
  }
}

const readCheckpoint = (file) => {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};

const main = async () => {
  const checkpointFile = argValue('--checkpoint');
  const writeCheckpoint = process.argv.includes('--write-checkpoint');

  if (writeCheckpoint && !checkpointFile) {
    console.error('--write-checkpoint requires --checkpoint <path>');
    return 1;
  }

  let checkpoint = null;
  if (checkpointFile) {
    checkpoint = readCheckpoint(checkpointFile);
    if (!checkpoint && !writeCheckpoint) {
      console.error(
        `No checkpoint at ${checkpointFile}. Create one with --write-checkpoint ` +
        'once you are satisfied the current chain is trustworthy.'
      );
      return 1;
    }
  }

  await mongoose.connect(config.mongoUri);

  const observations = { first: null, last: null, atCheckpointTip: null };
  const cursor = AuditEvent.find().sort({ seq: 1 }).lean().cursor();
  const result = await verifyChain(
    observe(cursor, observations, checkpoint ? checkpoint.tip.seq : undefined)
  );

  let ok = result.valid;

  if (result.valid) {
    console.log(`OK: audit chain intact (${result.checked} events verified)`);
  } else {
    console.error(
      `TAMPER-EVIDENCE ALERT: chain broken at seq ${result.error.seq} ` +
      `(_id ${result.error.id}): ${result.error.reason}. ` +
      `${result.checked} events verified before the divergence.`
    );
  }

  if (checkpoint && result.valid) {
    const problems = compareCheckpoint(checkpoint, observations);
    if (problems.length > 0) {
      ok = false;
      console.error(
        `TAMPER-EVIDENCE ALERT: chain boundaries disagree with the checkpoint ` +
        `(${checkpointFile}, written ${checkpoint.updated}):`
      );
      problems.forEach((problem) => console.error(`  - ${problem}`));
    } else {
      console.log(`OK: boundaries match the checkpoint written ${checkpoint.updated}`);
    }
  }

  if (writeCheckpoint && checkpointFile) {
    if (!ok) {
      console.error('Refusing to write a checkpoint over a chain that failed verification.');
    } else if (!observations.first) {
      console.error('Refusing to write a checkpoint for an empty collection.');
      ok = false;
    } else {
      const updated = {
        anchor: { seq: observations.first.seq, hash: observations.first.hash },
        tip: { seq: observations.last.seq, hash: observations.last.hash },
        events: result.checked,
        updated: new Date().toISOString()
      };
      fs.writeFileSync(checkpointFile, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');
      console.log(
        `Checkpoint written to ${checkpointFile} (anchor seq ${updated.anchor.seq}, ` +
        `tip seq ${updated.tip.seq}). Store it outside the database.`
      );
    }
  }

  await mongoose.disconnect();
  return ok ? 0 : 1;
};

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error('Verification failed to run:', error);
    process.exit(1);
  });
