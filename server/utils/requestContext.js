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

// Link tokens (consent, claim, practice-admin invite) are 32 random bytes in
// hex and travel in the path; ObjectIds (24 hex chars) are left intact
const PATH_TOKEN = /\/[0-9a-f]{64}(?=\/|$)/gi;

/**
 * Request path with the query string stripped.
 * Audit events must never persist query parameters: the file route accepts
 * `?token=<JWT>` as a fallback for window.open() (which cannot set headers),
 * and `req.originalUrl` would otherwise write that token into the trail.
 * Link tokens embedded in the path are replaced with ':token' for the same reason.
 */
const pathOf = (req) => {
  const url = req && req.originalUrl;
  if (!url) return undefined;
  const queryStart = url.indexOf('?');
  const path = queryStart === -1 ? url : url.slice(0, queryStart);
  return path.replace(PATH_TOKEN, '/:token');
};

module.exports = { middleware, getStore, pathOf };
