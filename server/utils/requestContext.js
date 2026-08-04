/**
 * Per-request context via AsyncLocalStorage.
 * Carries the Express request (actor identity, IP, user agent) and an
 * enrichment bag (`audit`) through async call chains so Mongoose audit hooks
 * can attribute writes to the acting user without controller cooperation.
 *
 * Code running outside a request (seed scripts, queue processors) simply has
 * no store; consumers must treat that as a 'system' actor.
 */

const { AsyncLocalStorage } = require('async_hooks');

const als = new AsyncLocalStorage();

/**
 * Express middleware: creates the per-request store and exposes
 * `req.audit.set({...})` for controllers to enrich audit context
 * (patientId, connectionId, accessLevel, resourceId, ...).
 */
const middleware = (req, res, next) => {
  const store = { req, audit: {} };
  req.audit = {
    set(fields) {
      Object.assign(store.audit, fields);
    }
  };
  als.run(store, next);
};

const getStore = () => als.getStore();

module.exports = { middleware, getStore };
