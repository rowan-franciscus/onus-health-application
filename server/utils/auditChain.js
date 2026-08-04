/**
 * Audit hash-chain utilities
 * Shared by the audit service (write path), the verify script, and tests so
 * that all three compute hashes identically.
 *
 * This is a lightweight tamper-evidence mechanism, not a substitute for
 * proper access control: it makes retroactive edits or deletions detectable,
 * it does not prevent them.
 */

const crypto = require('crypto');

// prevHash value of the very first audit event in the collection
const GENESIS_HASH = 'GENESIS';

// Deterministic serialization for the Mixed before/after fields
const sortKeysDeep = (value) => {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value && typeof value === 'object' && value.constructor === Object) {
    return Object.keys(value).sort().reduce((acc, key) => {
      acc[key] = sortKeysDeep(value[key]);
      return acc;
    }, {});
  }
  return value;
};

const str = (v) => (v === undefined || v === null ? null : String(v));
const mixed = (v) => (v === undefined || v === null ? null : JSON.stringify(sortKeysDeep(v)));

/**
 * Canonical string form of an audit event: an explicit, fixed-order field
 * list (never a generic object sort) so stored documents re-serialize to the
 * exact bytes that were hashed at write time.
 */
const canonicalize = (e) => {
  const agent = e.agent || {};
  const entity = e.entity || {};
  const context = e.context || {};
  return JSON.stringify([
    e.seq,
    e.recorded instanceof Date ? e.recorded.toISOString() : str(e.recorded),
    str(e.type),
    str(e.subtype),
    str(e.action),
    str(e.outcome),
    str(e.outcomeDesc),
    str(agent.userId),
    str(agent.role),
    str(agent.ip),
    str(agent.userAgent),
    str(entity.resourceType),
    str(entity.resourceId),
    str(entity.patientId),
    str(context.connectionId),
    str(context.accessLevel),
    str(context.practiceId),
    str(context.method),
    str(context.path),
    (context.modifiedFields || []).map(String).join(','),
    mixed(context.before),
    mixed(context.after),
    str(e.prevHash)
  ]);
};

// hash = SHA-256(prevHash + own content); prevHash is part of the canonical form
const computeHash = (event) =>
  crypto.createHash('sha256').update(canonicalize(event)).digest('hex');

/**
 * Walk an ascending-by-seq iterable of audit documents and verify the chain.
 * The first document is accepted as the anchor (its prevHash cannot be
 * checked against a predecessor — relevant after a documented retention
 * purge removed older records).
 *
 * @returns {Promise<{valid: boolean, checked: number, error?: {seq, id, reason}}>}
 */
const verifyChain = async (docs) => {
  let prev = null;
  let checked = 0;
  for await (const doc of docs) {
    if (computeHash(doc) !== doc.hash) {
      return {
        valid: false,
        checked,
        error: { seq: doc.seq, id: String(doc._id), reason: 'content hash mismatch (record altered)' }
      };
    }
    if (prev) {
      if (doc.seq !== prev.seq + 1) {
        return {
          valid: false,
          checked,
          error: { seq: doc.seq, id: String(doc._id), reason: `sequence gap after seq ${prev.seq} (record(s) deleted)` }
        };
      }
      if (doc.prevHash !== prev.hash) {
        return {
          valid: false,
          checked,
          error: { seq: doc.seq, id: String(doc._id), reason: 'broken prevHash link' }
        };
      }
    }
    prev = doc;
    checked += 1;
  }
  return { valid: true, checked };
};

module.exports = {
  GENESIS_HASH,
  canonicalize,
  computeHash,
  verifyChain
};
