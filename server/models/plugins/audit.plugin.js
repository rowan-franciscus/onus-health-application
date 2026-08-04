/**
 * Audit plugin — captures every create/update/delete on clinical models at
 * the Mongoose layer, so no controller write path (including deleteMany
 * cascades and bulk recreate flows) can be missed.
 *
 * Actor identity (user, IP, user agent) comes from the per-request
 * AsyncLocalStorage context; writes outside a request are attributed to the
 * 'system' role. Only field NAMES and consent enum states are recorded —
 * never clinical field values.
 *
 * Every hook swallows its own errors: an audit failure must never break the
 * underlying request.
 */

const requestContext = require('../../utils/requestContext');
const auditService = require('../../services/audit.service');
const logger = require('../../utils/logger');

// Consultation timestamp bumps happen on every sub-record write; auditing
// them would emit a phantom consultation-update event alongside each real one.
const isLastUpdatedOnlyBump = (update) => {
  if (!update) return false;
  const touched = new Set();
  Object.entries(update).forEach(([key, value]) => {
    if (key.startsWith('$')) {
      Object.keys(value || {}).forEach((k) => touched.add(k));
    } else {
      touched.add(key);
    }
  });
  touched.delete('lastUpdated');
  return touched.size === 0;
};

const buildAgent = () => {
  const store = requestContext.getStore();
  const req = store && store.req;
  if (!req) {
    return { userId: null, role: 'system' };
  }
  const user = req.user;
  return {
    userId: (user && (user._id || user.id)) || null,
    role: (user && user.role) || 'anonymous',
    ip: req.ip,
    userAgent: req.get ? req.get('user-agent') : undefined
  };
};

const buildRequestContextFields = () => {
  const store = requestContext.getStore();
  const req = store && store.req;
  const audit = (store && store.audit) || {};
  return {
    connectionId: audit.connectionId,
    accessLevel: audit.accessLevel,
    method: req && req.method,
    path: req && req.originalUrl
  };
};

// Detect the consent-lifecycle transition represented by a Connection save
const connectionTransition = (original, doc) => {
  const before = original || {};
  const events = [];
  if (before.fullAccessStatus !== doc.fullAccessStatus) {
    if (doc.fullAccessStatus === 'pending') events.push('consent-requested');
    else if (doc.fullAccessStatus === 'approved') events.push('consent-approved');
    else if (doc.fullAccessStatus === 'denied') events.push('consent-denied');
    else if (doc.fullAccessStatus === 'none') events.push('consent-revoked');
  }
  if (before.accessLevel === 'limited' && doc.accessLevel === 'full') {
    events.push('access-escalated');
  }
  return events;
};

module.exports = function auditPlugin(schema, options = {}) {
  const baseResourceType = options.resourceType || 'Unknown';
  const isConnection = baseResourceType === 'Connection';
  // Discriminators (the 8 medical record types) carry their concrete type
  // in recordType; fall back to the configured resource type.
  const resourceTypeOf = (doc) => (doc && doc.recordType) || baseResourceType;
  const patientOf = (doc) => (doc && doc.patient) || undefined;

  const emit = (doc, { subtype, action, extraContext = {} }) => {
    try {
      auditService.log({
        type: isConnection ? 'consent' : 'data',
        subtype,
        action,
        outcome: '0',
        agent: buildAgent(),
        entity: {
          resourceType: resourceTypeOf(doc),
          resourceId: doc._id,
          patientId: patientOf(doc)
        },
        context: {
          ...buildRequestContextFields(),
          ...(isConnection ? { connectionId: doc._id, accessLevel: doc.accessLevel } : {}),
          ...extraContext
        }
      });
    } catch (error) {
      logger.error('Audit plugin emit failed:', error);
    }
  };

  // Snapshot consent state on load so saves can record the transition
  if (isConnection) {
    schema.post('init', function () {
      try {
        this.$locals._auditOriginal = {
          accessLevel: this.accessLevel,
          fullAccessStatus: this.fullAccessStatus
        };
      } catch (error) {
        logger.error('Audit plugin init snapshot failed:', error);
      }
    });
  }

  schema.pre('save', function (next) {
    try {
      this.$locals._auditWasNew = this.isNew;
      this.$locals._auditModified = this.isNew ? [] : this.modifiedPaths();
    } catch (error) {
      logger.error('Audit plugin pre-save failed:', error);
    }
    next();
  });

  schema.post('save', function (doc) {
    try {
      const wasNew = this.$locals._auditWasNew;
      if (isConnection) {
        if (wasNew) {
          emit(doc, {
            subtype: 'connection-created',
            action: 'C',
            extraContext: {
              after: { accessLevel: doc.accessLevel, fullAccessStatus: doc.fullAccessStatus }
            }
          });
          this.$locals._auditOriginal = {
            accessLevel: doc.accessLevel,
            fullAccessStatus: doc.fullAccessStatus
          };
          return;
        }
        const original = this.$locals._auditOriginal;
        const transitions = connectionTransition(original, doc);
        if (transitions.length > 0) {
          transitions.forEach((subtype) => {
            emit(doc, {
              subtype,
              action: 'U',
              extraContext: {
                before: original ? { ...original } : undefined,
                after: { accessLevel: doc.accessLevel, fullAccessStatus: doc.fullAccessStatus }
              }
            });
          });
        } else {
          emit(doc, {
            subtype: 'record-update',
            action: 'U',
            extraContext: { modifiedFields: this.$locals._auditModified }
          });
        }
        // Refresh the snapshot for any further saves of this document
        this.$locals._auditOriginal = {
          accessLevel: doc.accessLevel,
          fullAccessStatus: doc.fullAccessStatus
        };
        return;
      }
      if (wasNew) {
        emit(doc, { subtype: 'record-create', action: 'C' });
      } else {
        emit(doc, {
          subtype: 'record-update',
          action: 'U',
          extraContext: { modifiedFields: this.$locals._auditModified }
        });
      }
    } catch (error) {
      logger.error('Audit plugin post-save failed:', error);
    }
  });

  // Document-level deletion (record.deleteOne())
  schema.post('deleteOne', { document: true, query: false }, function (doc) {
    try {
      const target = doc && doc._id ? doc : this;
      emit(target, {
        subtype: isConnection ? 'consent-revoked' : 'record-delete',
        action: 'D',
        extraContext: isConnection
          ? { before: { accessLevel: target.accessLevel, fullAccessStatus: target.fullAccessStatus } }
          : {}
      });
    } catch (error) {
      logger.error('Audit plugin post-deleteOne failed:', error);
    }
  });

  // findByIdAndDelete / findOneAndDelete — the deleted doc is the post arg
  schema.post('findOneAndDelete', function (doc) {
    try {
      if (!doc) return;
      emit(doc, {
        subtype: isConnection ? 'consent-revoked' : 'record-delete',
        action: 'D',
        extraContext: isConnection
          ? { before: { accessLevel: doc.accessLevel, fullAccessStatus: doc.fullAccessStatus } }
          : {}
      });
    } catch (error) {
      logger.error('Audit plugin post-findOneAndDelete failed:', error);
    }
  });

  // Query-level mutations: docs are not hydrated, so pre-fetch the affected
  // ids/patients (inside the operation's session when transactional).
  const QUERY_UPDATE_OPS = ['updateOne', 'updateMany', 'findOneAndUpdate'];
  const QUERY_DELETE_OPS = ['deleteMany'];

  const prefetchTargets = async function () {
    try {
      this._auditTargets = await this.model
        .find(this.getFilter(), { _id: 1, patient: 1, recordType: 1, accessLevel: 1, fullAccessStatus: 1 })
        .session(this.getOptions().session || null)
        .lean();
    } catch (error) {
      this._auditTargets = [];
      logger.error('Audit plugin target prefetch failed:', error);
    }
  };

  QUERY_UPDATE_OPS.forEach((op) => {
    schema.pre(op, { document: false, query: true }, async function () {
      if (baseResourceType === 'Consultation' && isLastUpdatedOnlyBump(this.getUpdate())) {
        this._auditSkip = true;
        return;
      }
      await prefetchTargets.call(this);
    });
    schema.post(op, { document: false, query: true }, function () {
      try {
        if (this._auditSkip) return;
        (this._auditTargets || []).forEach((target) => {
          emit(target, { subtype: 'record-update', action: 'U' });
        });
      } catch (error) {
        logger.error(`Audit plugin post-${op} failed:`, error);
      }
    });
  });

  QUERY_DELETE_OPS.forEach((op) => {
    schema.pre(op, { document: false, query: true }, prefetchTargets);
    schema.post(op, { document: false, query: true }, function () {
      try {
        (this._auditTargets || []).forEach((target) => {
          emit(target, {
            subtype: isConnection ? 'consent-revoked' : 'record-delete',
            action: 'D'
          });
        });
      } catch (error) {
        logger.error(`Audit plugin post-${op} failed:`, error);
      }
    });
  });
};
