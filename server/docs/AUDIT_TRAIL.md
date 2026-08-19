# Audit Trail

Persistent, tamper-evident audit trail for the Onus Health application.

Designed to be **aligned with HIPAA §164.312(b) audit control requirements**
(recording and examination of activity in systems containing ePHI) and
§164.308(a)(1)(ii)(D) (regular review of audit logs), the GDPR Article 30 /
Article 5(2) accountability principle, ISO/IEC 27001 A.12.4 logging and
monitoring controls, and the accountability principles in Namibia's draft
Data Protection Act. Field structure follows the HL7/FHIR AuditEvent resource
where practical so the data is exchange-ready. **This document does not claim
regulatory certification of any kind.**

## Architecture

- **`models/AuditEvent.js`** — dedicated `auditevents` collection, separate
  from application data. Append-only at the schema level: every update/delete
  operation (document- and query-level) is rejected with an error.
- **`services/audit.service.js`** — the single write path. All events flow
  through an in-process FIFO that drains asynchronously (fire-and-forget from
  the request path), computes the hash chain in strict order, and retries with
  backoff. If MongoDB stays unavailable, the event is appended to a durable
  dead-letter file and replayed later (see *Dead letter* below) rather than
  dropped. Route handlers and hooks never write to the collection directly.
- **`models/plugins/audit.plugin.js`** — Mongoose plugin applied to every
  clinical model (`MedicalRecord` base schema, covering the base records and
  its seven record-type discriminators — `Vitals`, `Medication`,
  `Immunization`, `LabResult`, `RadiologyReport`, `HospitalRecord`,
  `SurgeryRecord` — plus `Consultation`, `Connection`, `Biometric`,
  `HospitalAdmission`, `Surgery`, `PhysicalRecord`). Captures every
  create/update/delete — document saves, query-level `updateOne`/`updateMany`/
  `findOneAndUpdate`, and `deleteOne`/`deleteMany`/`findOneAndDelete`
  cascades, including bulk delete-and-recreate flows — regardless of which
  controller performed it.
  Actor identity travels from the request via `AsyncLocalStorage`
  (`utils/requestContext.js`); writes outside a request are attributed to the
  `system` role.
- **`middleware/audit.middleware.js`** — `auditRead()` logs successful reads
  and exports at the route level; `failedAccessAudit` (global) logs every
  401/403 on `/api/*` as a failed-authorization event.
- **Auth events** are logged explicitly in `controllers/authController.js`
  (login success/failure, logout, password reset, session timeout) and
  `middleware/auth.middleware.js` (rate-limit lockouts).

## Event catalog

| type | subtype | action | source |
|---|---|---|---|
| auth | login-success / login-failure | E | authController.login / adminLogin |
| auth | logout | E | POST /api/auth/logout |
| auth | session-timeout | E | authController.refreshToken (where expiry is enforced) |
| auth | password-reset-requested / password-reset | E | forgotPassword / resetPassword |
| auth | rate-limit-lockout | E | auth & password-reset rate limiters |
| data | record-create / record-update / record-delete | C/U/D | audit plugin (model hooks) |
| data | record-read | R | auditRead middleware on clinical GET routes |
| consent | connection-created | C | Connection plugin |
| consent | consent-requested / consent-approved / consent-denied / consent-revoked | U/D | Connection plugin (state transitions & deletes) |
| consent | access-escalated | U | Connection plugin (limited → full) |
| admin | user-update / role-change / user-deleted | E | admin.controller |
| admin | provider-approved / provider-rejected | E | admin.controller |
| admin | practice-admin-invited / practice-admin-revoked | E | providerController |
| export | billing-export | E | provider & practice-admin billing CSV/data routes |
| export | file-download | R | file routes (actual file content) |
| data | file-list | R | consultation attachment metadata listing |
| security | access-denied | E | failedAccessAudit middleware |
| audit | audit-query | E | admin getAuditLogs (self-auditing) |

Each event records: actor (`agent.userId`, `role`, `ip`, `userAgent`), the
action (FHIR C/R/U/D/E), the resource (`entity.resourceType`,
`entity.resourceId`), **whose data it is** (`entity.patientId`), a
server-generated UTC timestamp (`recorded`), outcome (FHIR-coded `0`/`4`/`8`
plus `outcomeDesc` reason for failures), and the authorizing context
(`context.connectionId`, `context.accessLevel` at the time of access).

**Never stored:** clinical content (values, findings, results), passwords,
tokens, or session secrets. Update events store modified field **names**
only. `context.path` is the request path with the query string stripped —
the file route accepts `?token=<JWT>` as a fallback for `window.open()`, and
that token must never reach the trail. This keeps the audit collection from
becoming a second copy of PHI.

## Tamper evidence (hash chain)

Every event carries `seq` (monotonic position), `prevHash` (the previous
event's hash; `GENESIS` for the first), and `hash` =
SHA-256(canonical serialization of the event including `prevHash`). Any
retroactive edit changes the recomputed hash; any deletion breaks the
`prevHash` link or leaves a `seq` gap. Verify with:

```bash
node server/scripts/verify-audit-chain.js
```

### Checkpoints (truncation detection)

Interior checks cannot see truncation: removing the newest events, or an
oldest prefix, leaves no adjacent gap to find. Record the chain boundaries
outside the database and verify against them:

```bash
# after establishing that the current chain is trustworthy
node server/scripts/verify-audit-chain.js --checkpoint /secure/audit-checkpoint.json --write-checkpoint

# routine verification (fails if either boundary moved backwards)
node server/scripts/verify-audit-chain.js --checkpoint /secure/audit-checkpoint.json
```

The checkpoint records the anchor (oldest surviving event) and tip (newest
event) as `seq` + `hash`. Verification then fails if events were removed from
either end, or if the checkpointed events no longer hash the same. **Keep the
file on separate storage under separate access control** — a checkpoint kept
beside the data it attests to proves nothing. Re-write it on a trusted
schedule and after every documented retention purge (which legitimately moves
the anchor forward).

This is a **lightweight tamper-evidence mechanism, not a substitute for
proper access control**: it makes tampering detectable, it does not prevent
it. The hashes are unkeyed SHA-256, so an attacker with direct write access
to the collection can edit an event and recompute every subsequent hash; what
they cannot do is make the recomputed boundaries agree with an off-database
checkpoint. Restricting the application's database role (below) and holding
checkpoints elsewhere are what make the chain meaningful. The chain assumes a
single server instance (the current deployment); the unique `seq` index makes
concurrent multi-instance writes fail loudly rather than silently fork the
chain.

## Dead letter (write failures)

If MongoDB rejects an event after every retry, the audit service appends it
to `AUDIT_DEAD_LETTER_PATH` (default `logs/audit-dead-letter.log`) — one JSON
object per line — instead of dropping it. Rotating Winston files are only a
last resort if even that write fails. Once the datastore is healthy:

```bash
node server/scripts/replay-audit-dead-letter.js --dry-run   # inspect
node server/scripts/replay-audit-dead-letter.js             # append to the chain
```

Replayed events keep their original `recorded` timestamp and are appended at
the current end of the chain (the seq numbers from the outage window belong
to events that did succeed). The batch file is renamed on completion so the
same events cannot be replayed twice. Monitor for the presence of this file:
it means the trail is temporarily incomplete.

## MongoDB Atlas access control (operational requirement)

Application-layer enforcement (schema hooks) is the first guard. Restrict the
application's Atlas service account so it cannot modify audit records even if
application code is compromised. MongoDB privileges are additive-only (there
is no "deny" rule), so create a **custom role** that enumerates per-collection
grants instead of using the built-in `readWrite` on the whole database:

1. Atlas → Database Access → Custom Roles → Add Custom Role
   (e.g. `onusAppRole`).
2. For each existing application collection (`users`, `connections`,
   `consultations`, `medicalrecords`, `biometrics`, `hospitaladmissions`,
   `surgeries`, `physicalrecords`, `practices`, `emailqueues`, and any later
   additions): grant `find`, `insert`, `update`, `remove`, `createIndex`,
   `listIndexes`.
3. For `auditevents` **only**: grant `find`, `insert`, `createIndex`,
   `listIndexes` — no `update`, no `remove`.
4. Assign this role to the application's database user in place of
   `readWrite`, and keep a separate break-glass admin user for DBA tasks.

Caveat: adding a new collection to the application requires updating the
custom role. Document this in the deployment checklist.

## Access to the audit log

- Only the platform `admin` role can query the audit trail
  (`GET /api/admin/audit-logs`, surfaced at `/admin/audit-logs` in the client).
  Practice admins have **no** audit access, consistent with their existing
  wall against clinical data.
- Every query against the audit log emits an `audit / audit-query` event
  recording the actor and the filters used.
- Indexes support the two review access patterns required of an audit
  control: `{entity.patientId, recorded}` ("who accessed patient X") and
  `{agent.userId, recorded}` ("what did user Y access").

## Retention & lifecycle

- Retention period: `AUDIT_LOG_RETENTION_DAYS` (default **2190 days / 6
  years**, configurable via environment variable — see `ENV_TEMPLATE.md`).
- **No automatic deletion.** Audit records are kept even when the underlying
  patient record is deactivated or deleted. The application exposes no
  update or delete path for this collection.
- `node server/scripts/audit-retention-report.js` reads
  `AUDIT_LOG_RETENTION_DAYS` and reports the resulting cutoff, how many events
  fall outside the window, and the exact commands for the purge below. It is
  read-only: it never deletes anything.
- Purging records older than the retention period is a **manual, documented
  DBA procedure** using break-glass admin credentials:
  1. Run `node server/scripts/audit-retention-report.js` to get the cutoff.
  2. Run `node server/scripts/verify-audit-chain.js --checkpoint <path>` and
     archive the output.
  3. Export the to-be-purged range for offline archival if policy requires.
  4. `db.auditevents.deleteMany({ recorded: { $lt: <cutoff ISODate> } })`.
  5. Record the new oldest event's `seq` and `hash` in the purge log and
     re-write the checkpoint (`--write-checkpoint`): the chain now anchors at
     that event, and without this the next verification correctly reports the
     purge as a missing prefix.

## Known limitations (documented judgment calls)

- Writes inside an aborted MongoDB transaction can still emit audit events
  (conservative over-reporting; audit entries may exist for writes that were
  rolled back).
- User demographic/profile self-edits are not audited (the User model is not
  plugged in, to avoid login-timestamp noise); administrative account actions
  are audited explicitly instead.
- Consultation `lastUpdated`-only timestamp bumps are suppressed to avoid a
  phantom update event accompanying every sub-record write.
- Events queued in memory are lost if the process crashes before the drain
  completes (graceful shutdown flushes the queue; hard kills do not). Events
  the database rejected are dead-lettered to disk and replayable.
- The global `sessionTimeout` middleware is inert in the current mounting
  order (it is mounted ahead of the per-route passport authentication that
  sets `req.user`, and returns early without it). Session expiry is enforced
  on the refresh path instead — `authController.refreshToken` — which is where
  the `session-timeout` event is emitted. Activating the middleware would turn
  the activity-based session into an absolute 30-minutes-since-issue one and
  log out users mid-session; that is an authentication design decision,
  deliberately kept separate from auditing.
