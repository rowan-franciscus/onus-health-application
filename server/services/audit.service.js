/**
 * Audit Service — the single write path for the audit trail.
 * Aligned with HIPAA §164.312(b) audit control requirements.
 *
 * Design:
 * - log() is fire-and-forget: callers are never blocked and never see errors.
 * - Events drain through a single serialized in-process FIFO so the hash
 *   chain (prevHash -> hash) stays strictly ordered.
 * - Inserts retry with backoff; a duplicate seq (another writer) reloads the
 *   chain tip and recomputes. Persistent failures fall back to Winston
 *   (durable file logs in production) so the event is not silently lost.
 * - No clinical content, passwords, tokens, or session secrets may ever be
 *   passed into an event.
 */

const AuditEvent = require('../models/AuditEvent');
const requestContext = require('../utils/requestContext');
const { GENESIS_HASH, computeHash } = require('../utils/auditChain');
const logger = require('../utils/logger');

const RETRY_DELAYS_MS = [100, 500, 2000];

// Chain tip: seq/hash of the last persisted event. seq -1 => empty collection.
let tip = null;
let queue = [];
let draining = false;
let flushWaiters = [];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Load the chain tip from the collection. Called at server startup and
 * lazily on first log(); tests call it after clearing the database.
 */
const init = async () => {
  const latest = await AuditEvent.findOne().sort({ seq: -1 }).lean();
  tip = latest ? { seq: latest.seq, hash: latest.hash } : { seq: -1, hash: GENESIS_HASH };
};

const persistEvent = async (event) => {
  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    const doc = {
      ...event,
      seq: tip.seq + 1,
      prevHash: tip.hash
    };
    doc.hash = computeHash(doc);
    try {
      await AuditEvent.create(doc);
      tip = { seq: doc.seq, hash: doc.hash };
      return;
    } catch (error) {
      if (error && error.code === 11000) {
        // Another writer advanced the chain — reload the tip and recompute
        try {
          await init();
        } catch (initError) {
          logger.error('Audit service: failed to reload chain tip', initError);
        }
      } else if (attempt < RETRY_DELAYS_MS.length - 1) {
        await sleep(RETRY_DELAYS_MS[attempt]);
      } else {
        throw error;
      }
    }
  }
  throw new Error('Audit write failed after retries');
};

const drain = async () => {
  if (draining) return;
  draining = true;
  try {
    while (queue.length > 0) {
      const event = queue[0];
      try {
        if (!tip) {
          await init();
        }
        await persistEvent(event);
      } catch (error) {
        // Durable fallback: the event never contains clinical content or
        // secrets, so it is safe to write in full to the error log.
        logger.error('AUDIT_WRITE_FAILED', { event, error: error.message });
      }
      queue.shift();
    }
  } finally {
    draining = false;
    if (queue.length === 0) {
      const waiters = flushWaiters;
      flushWaiters = [];
      waiters.forEach((resolve) => resolve());
    } else {
      // New events arrived while resolving waiters — keep draining
      setImmediate(() => drain().catch((e) => logger.error('Audit drain error:', e)));
    }
  }
};

/**
 * Queue an audit event. Fire-and-forget: never throws, never blocks.
 * `recorded` is stamped here (server time) and cannot be supplied by callers.
 */
const log = (event) => {
  try {
    queue.push({
      outcome: '0',
      ...event,
      recorded: new Date()
    });
    drain().catch((error) => logger.error('Audit drain error:', error));
  } catch (error) {
    logger.error('AUDIT_ENQUEUE_FAILED', { error: error.message });
  }
};

/**
 * Queue an audit event, deriving the agent from the Express request.
 * Marks the request's audit context as handled so the global 401/403
 * fallback middleware does not double-log the same response.
 */
const logFromRequest = (req, event) => {
  try {
    const store = requestContext.getStore();
    if (store) {
      store.audit.handled = true;
    }
    const user = req.user;
    log({
      ...event,
      agent: {
        userId: (user && (user._id || user.id)) || (event.agent && event.agent.userId) || null,
        role: (user && user.role) || (event.agent && event.agent.role) || 'anonymous',
        ip: req.ip,
        userAgent: req.get ? req.get('user-agent') : undefined
      },
      context: {
        method: req.method,
        path: req.originalUrl,
        ...(event.context || {})
      }
    });
  } catch (error) {
    logger.error('AUDIT_ENQUEUE_FAILED', { error: error.message });
  }
};

/**
 * Resolves once every queued event has been persisted (or fallen back to
 * Winston). Used by tests and graceful shutdown.
 */
const flush = () => {
  if (queue.length === 0 && !draining) {
    return Promise.resolve();
  }
  return new Promise((resolve) => flushWaiters.push(resolve));
};

module.exports = {
  init,
  log,
  logFromRequest,
  flush
};
