/**
 * Audit middleware
 * - auditRead(resourceType): per-route middleware logging successful reads of
 *   clinical data. Controllers enrich context via req.audit.set({ patientId,
 *   connectionId, accessLevel, resourceId }) when it only resolves post-load.
 * - failedAccessAudit: global middleware logging every 401/403 on /api/* as a
 *   failed-authorization event, unless an auth-flow handler already audited
 *   the response (dedupe via the request store's `handled` flag).
 */

const auditService = require('../services/audit.service');
const requestContext = require('../utils/requestContext');
const logger = require('../utils/logger');

/**
 * Log a successful read (or export, via options.type/action) of a resource.
 * The event flushes on response finish so controller enrichment is included.
 * `resourceType` may be a string or a (req) => string resolver (e.g. for
 * routes with a :type param).
 */
const auditRead = (resourceType, options = {}) => (req, res, next) => {
  // Capture the store now: ALS context is not guaranteed inside 'finish'
  const store = requestContext.getStore();
  res.on('finish', () => {
    try {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return;
      }
      const enrichment = (store && store.audit) || {};
      // Patients reading their own data: default the subject to themselves
      const selfPatientId =
        req.user && req.user.role === 'patient' ? req.user._id : undefined;
      auditService.logFromRequest(req, {
        type: options.type || 'data',
        subtype: options.subtype || 'record-read',
        action: options.action || 'R',
        outcome: '0',
        entity: {
          resourceType:
            typeof resourceType === 'function' ? resourceType(req) : resourceType,
          resourceId: enrichment.resourceId || req.params.id,
          patientId:
            enrichment.patientId ||
            req.params.patientId ||
            req.query.patientId ||
            selfPatientId
        },
        context: {
          connectionId: enrichment.connectionId,
          accessLevel: enrichment.accessLevel
        }
      });
    } catch (error) {
      logger.error('auditRead middleware failed:', error);
    }
  });
  next();
};

/**
 * Global failed-authorization capture. Mounted once in server.js after the
 * session timeout middleware; covers every RBAC middleware and controller
 * Connection check without touching them individually.
 */
const failedAccessAudit = (req, res, next) => {
  const store = requestContext.getStore();
  res.on('finish', () => {
    try {
      if (res.statusCode !== 401 && res.statusCode !== 403) {
        return;
      }
      if (!req.originalUrl || !req.originalUrl.startsWith('/api')) {
        return;
      }
      if (store && store.audit.handled) {
        return; // already audited by an auth-flow handler
      }
      auditService.logFromRequest(req, {
        type: 'security',
        subtype: 'access-denied',
        action: 'E',
        outcome: '8',
        outcomeDesc: res.statusCode === 401 ? 'unauthenticated' : 'forbidden',
        entity: {
          patientId: (store && store.audit.patientId) || req.params.patientId
        }
      });
    } catch (error) {
      logger.error('failedAccessAudit middleware failed:', error);
    }
  });
  next();
};

// Map the kebab-case :type route param to the discriminator names used by
// write-path events, so reads and writes share resourceType values.
const RECORD_TYPE_BY_PARAM = {
  vitals: 'Vitals',
  medications: 'Medication',
  immunizations: 'Immunization',
  'lab-results': 'LabResult',
  'radiology-reports': 'RadiologyReport',
  'hospital-records': 'HospitalRecord',
  'surgery-records': 'SurgeryRecord'
};

const recordTypeFromParam = (req) =>
  RECORD_TYPE_BY_PARAM[req.params.type] || req.params.type;

module.exports = { auditRead, failedAccessAudit, recordTypeFromParam };
