/**
 * Admin engagement analytics — usage, retention and platform-health metrics
 * for the admin dashboard.
 *
 * Read-only aggregations over existing collections and the audit trail. Only
 * counts and whether a field is filled ever leave this service — never
 * clinical field values, email addresses or names.
 *
 * Login/usage history only exists from the first audit event onwards
 * (`trackingSince`); anything derived from the audit trail is empty before it.
 */

const User = require('../models/User');
const Consultation = require('../models/Consultation');
const EmailQueue = require('../models/EmailQueue');
const AuditEvent = require('../models/AuditEvent');
const { MedicalRecord } = require('../models/MedicalRecord');
const HospitalAdmission = require('../models/HospitalAdmission');
const Surgery = require('../models/Surgery');

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_PERIOD_DAYS = 30;
const MAX_PULSE_DAYS = 366;
const TREND_MONTHS = 12;
const STALE_DRAFT_DAYS = 7;

// Audit events that represent someone using the product — excludes failed
// access attempts ('security') and admins reading the audit log ('audit')
const USAGE_EVENT_TYPES = ['auth', 'data', 'consent', 'export', 'admin'];

// Successful actions only: failed sign-ins and session timeouts are 'auth'
// events too, and carry the account they targeted
const USAGE_EVENTS = { type: { $in: USAGE_EVENT_TYPES }, outcome: '0' };

// Provider-created patient records: still unclaimed, or claimed since
const PLACEHOLDER_ORIGIN = {
  role: 'patient',
  $or: [{ isOnusUser: false }, { claimedAt: { $ne: null } }]
};

const WRITTEN_SECTIONS = [
  { key: 'history', label: 'History', path: '$history' },
  { key: 'physicalExamination', label: 'Examination', path: '$physicalExamination' },
  { key: 'management', label: 'Management', path: '$management' },
  { key: 'diagnosis', label: 'Diagnosis', path: '$general.diagnosis' }
];

// Discriminator names (MedicalRecord.recordType) in display order
const RECORD_TYPES = [
  { type: 'Vitals', label: 'Vitals' },
  { type: 'Medication', label: 'Medications' },
  { type: 'Immunization', label: 'Immunisations' },
  { type: 'LabResult', label: 'Lab results' },
  { type: 'RadiologyReport', label: 'Radiology' },
  { type: 'HospitalRecord', label: 'Hospital records' },
  { type: 'SurgeryRecord', label: 'Surgery records' }
];

// Youngest first; `min` is the lowest age in the band
const AGE_BANDS = [
  { label: 'Under 18', min: 0 },
  { label: '18–29', min: 18 },
  { label: '30–44', min: 30 },
  { label: '45–59', min: 45 },
  { label: '60–74', min: 60 },
  { label: '75+', min: 75 }
];

const DRAFT_AGE_BANDS = [
  { label: 'Under 7 days', maxDays: 7 },
  { label: '7–30 days', maxDays: 30 },
  { label: '30–90 days', maxDays: 90 },
  { label: 'Over 90 days', maxDays: Infinity }
];

// Each invitation email, and what counts as the recipient acting on it
const INVITE_FLOWS = [
  {
    key: 'verification',
    label: 'Email verification',
    templates: ['verification'],
    completed: { isEmailVerified: true }
  },
  {
    key: 'patientInvite',
    label: 'Patient invitations',
    templates: ['consentRequest', 'claimProfileLink', 'consentFormClaimInvite'],
    // Consent requests also go to existing accounts; only placeholders can sign up
    recipients: PLACEHOLDER_ORIGIN,
    completed: { claimedAt: { $ne: null } }
  },
  {
    key: 'practiceAdminInvite',
    label: 'Practice admin invitations',
    templates: ['practiceAdminInvite'],
    completed: { 'practiceAdminProfile.status': 'active' }
  }
];

// ---- helpers ----

const ratio = (part, whole) => (whole > 0 ? part / whole : null);

const median = (values) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const roundTo = (value, places = 1) =>
  value === null ? null : Math.round(value * 10 ** places) / 10 ** places;

const startOfUtcDay = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const dayKey = (date) => date.toISOString().slice(0, 10);

const isDateOnly = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);

/**
 * The reporting period as a half-open [start, end) range. Date-only end dates
 * (from the dashboard's date inputs) are inclusive of that whole day. With no
 * start date, the period is the last 30 calendar days (UTC) up to the end.
 */
const resolvePeriod = ({ startDate, endDate } = {}, now = new Date()) => {
  let end = now;
  if (endDate) {
    end = new Date(endDate);
    if (isDateOnly(endDate)) end = new Date(end.getTime() + DAY_MS);
  }
  const lastDay = startOfUtcDay(new Date(end.getTime() - 1));
  const start = startDate
    ? new Date(startDate)
    : new Date(lastDay.getTime() - (DEFAULT_PERIOD_DAYS - 1) * DAY_MS);
  return { start, end };
};

const rangeOf = ({ start, end }) => ({ $gte: start, $lt: end });

// Non-empty after trimming whitespace
const isFilled = (path) => ({
  $gt: [{ $strLenCP: { $trim: { input: { $ifNull: [path, ''] } } } }, 0]
});

const countIf = (condition) => ({ $sum: { $cond: [condition, 1, 0] } });

// ---- Retention ----

/**
 * Providers who created at least one consultation, per calendar month (UTC),
 * against approved providers who had joined by the end of that month.
 */
const activeProvidersByMonth = async (now) => {
  const months = [];
  for (let i = TREND_MONTHS - 1; i >= 0; i--) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 1));
    months.push({ month: start.toISOString().slice(0, 7), start, end });
  }
  const trendStart = months[0].start;

  const [activeRows, approvedProviders] = await Promise.all([
    Consultation.aggregate([
      { $match: { createdAt: { $gte: trendStart } } },
      {
        $group: {
          _id: {
            month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            provider: '$provider'
          }
        }
      },
      { $group: { _id: '$_id.month', providers: { $push: '$_id.provider' } } }
    ]),
    User.find({ role: 'provider', 'providerProfile.isVerified': true }).select('createdAt').lean()
  ]);

  const joinedAt = new Map(approvedProviders.map((p) => [String(p._id), p.createdAt]));
  const providersByMonth = new Map(activeRows.map((row) => [row._id, row.providers]));
  return months.map(({ month, end }) => {
    // Only providers in the denominator's cohort — approved, and joined by
    // the month's end — so the share can never exceed 100%
    const inCohort = (id) => joinedAt.has(String(id)) && joinedAt.get(String(id)) < end;
    return {
      month,
      active: (providersByMonth.get(month) || []).filter(inCohort).length,
      approved: approvedProviders.filter((p) => p.createdAt < end).length,
      monthToDate: end > now
    };
  });
};

// ---- Activation ----

/**
 * Registered → email confirmed → profile completed (→ approved, providers),
 * for accounts registered in the period. Stages are nested, so each one is a
 * subset of the one before. Claimed placeholder records count as registering
 * when they were claimed.
 */
const signupFunnel = async (period) => {
  const rows = await User.aggregate([
    { $match: { role: { $in: ['patient', 'provider'] }, isOnusUser: { $ne: false } } },
    { $addFields: { registeredAt: { $ifNull: ['$claimedAt', '$createdAt'] } } },
    { $match: { registeredAt: rangeOf(period) } },
    {
      $group: {
        _id: '$role',
        registered: { $sum: 1 },
        verified: countIf({ $eq: ['$isEmailVerified', true] }),
        completed: countIf({
          $and: [{ $eq: ['$isEmailVerified', true] }, { $eq: ['$isProfileCompleted', true] }]
        }),
        approved: countIf({
          $and: [
            { $eq: ['$isEmailVerified', true] },
            { $eq: ['$isProfileCompleted', true] },
            { $eq: ['$providerProfile.isVerified', true] }
          ]
        })
      }
    }
  ]);

  const byRole = new Map(rows.map((row) => [row._id, row]));
  const stagesFor = (role) => {
    const row = byRole.get(role) || { registered: 0, verified: 0, completed: 0, approved: 0 };
    const stages = [
      { stage: 'Registered', count: row.registered },
      { stage: 'Email confirmed', count: row.verified },
      { stage: 'Profile completed', count: row.completed }
    ];
    if (role === 'provider') stages.push({ stage: 'Approved', count: row.approved });
    return stages;
  };

  return { patient: stagesFor('patient'), provider: stagesFor('provider') };
};

/**
 * Provider-created patient records that the patient later claimed as their
 * own account.
 */
const placeholderConversion = async (period) => {
  const range = rangeOf(period);
  const [created, claimed, createdInPeriod, claimedInPeriod] = await Promise.all([
    User.countDocuments(PLACEHOLDER_ORIGIN),
    User.find({ role: 'patient', claimedAt: { $ne: null } }).select('createdAt claimedAt').lean(),
    User.countDocuments({ ...PLACEHOLDER_ORIGIN, createdAt: range }),
    User.countDocuments({ role: 'patient', claimedAt: range })
  ]);

  const daysToClaim = claimed.map((u) => (u.claimedAt - u.createdAt) / DAY_MS);
  return {
    created,
    claimed: claimed.length,
    claimRate: ratio(claimed.length, created),
    createdInPeriod,
    claimedInPeriod,
    medianDaysToClaim: roundTo(median(daysToClaim))
  };
};

// ---- Depth of use ----

/**
 * Providers who did real work (created a consultation) in the period, versus
 * providers who merely showed up (any audited action).
 */
const providerActivity = async (period) => {
  const range = rangeOf(period);
  const [approvedProviders, consultingIds, showedUpIds] = await Promise.all([
    User.find({ role: 'provider', 'providerProfile.isVerified': true }).select('_id').lean(),
    Consultation.distinct('provider', { createdAt: range }),
    AuditEvent.distinct('agent.userId', {
      ...USAGE_EVENTS,
      recorded: range,
      'agent.role': 'provider'
    })
  ]);

  // Count only currently approved providers, matching the denominator
  const approvedIds = new Set(approvedProviders.map((p) => String(p._id)));
  const approvedOnly = (ids) => ids.filter(Boolean).map(String).filter((id) => approvedIds.has(id));
  const consulting = new Set(approvedOnly(consultingIds));
  // Anyone who created a consultation showed up, even before the audit trail
  const showedUp = new Set([...approvedOnly(showedUpIds), ...consulting]);

  return {
    approved: approvedIds.size,
    showedUp: showedUp.size,
    didSomething: consulting.size,
    shareOfApproved: ratio(consulting.size, approvedIds.size),
    shareOfShowedUp: ratio(consulting.size, showedUp.size)
  };
};

/**
 * Patients opening one of their own clinical records (audited reads by
 * patients — the read middleware attributes a patient's read to themselves).
 *
 * Only reads of a specific record count. List and statistics endpoints are
 * audited as reads too, but succeed even when there is nothing to show, so
 * they cannot tell us a patient actually looked at a record.
 */
const patientRecordViews = async (period) => {
  const range = rangeOf(period);
  const [
    realPatients,
    withSharedConsultations,
    withStandaloneRecords,
    withAdmissions,
    withSurgeries,
    activeIds,
    viewRows
  ] = await Promise.all([
    User.countDocuments({ role: 'patient', isOnusUser: { $ne: false } }),
    Consultation.distinct('patient', { status: 'completed', isSharedWithPatient: true }),
    MedicalRecord.distinct('patient', { consultation: null, isDeleted: { $ne: true } }),
    HospitalAdmission.distinct('patient'),
    Surgery.distinct('patient'),
    AuditEvent.distinct('agent.userId', {
      ...USAGE_EVENTS,
      recorded: range,
      'agent.role': 'patient'
    }),
    AuditEvent.aggregate([
      {
        $match: {
          recorded: range,
          type: 'data',
          action: 'R',
          outcome: '0',
          'agent.role': 'patient',
          'entity.resourceId': { $ne: null }
        }
      },
      { $group: { _id: '$agent.userId', views: { $sum: 1 } } }
    ])
  ]);

  // Patients with anything to look at: shared consultations, or records that
  // stand on their own outside a consultation
  const eligible = await User.find({
    _id: {
      $in: [...withSharedConsultations, ...withStandaloneRecords, ...withAdmissions, ...withSurgeries]
    },
    isOnusUser: { $ne: false }
  })
    .select('_id')
    .lean();
  const eligibleIds = new Set(eligible.map((u) => String(u._id)));
  const viewers = viewRows.filter((row) => row._id && eligibleIds.has(String(row._id)));

  return {
    realPatients,
    withRecords: eligibleIds.size,
    active: activeIds.filter(Boolean).length,
    viewed: viewers.length,
    views: viewers.reduce((sum, row) => sum + row.views, 0),
    shareOfWithRecords: ratio(viewers.length, eligibleIds.size)
  };
};

/**
 * Consultations started and never completed, by how long since anyone last
 * touched them, plus how many consultations started in the period got finished.
 */
const abandonedDrafts = async (period, now) => {
  const [drafts, statusRows] = await Promise.all([
    Consultation.find({ status: 'draft' }).select('updatedAt').lean(),
    Consultation.aggregate([
      { $match: { createdAt: rangeOf(period) } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
  ]);

  const ages = drafts.map((d) => (now - new Date(d.updatedAt || now)) / DAY_MS);
  let lower = 0;
  const byAge = DRAFT_AGE_BANDS.map(({ label, maxDays }) => {
    const count = ages.filter((age) => age >= lower && age < maxDays).length;
    lower = maxDays;
    return { label, count };
  });

  // Archiving is how consultations are deleted, whatever their state, so an
  // archived entry is no evidence of completion: leave deleted ones out
  const byStatus = Object.fromEntries(statusRows.map((row) => [row._id, row.count]));
  const finishedInPeriod = byStatus.completed || 0;
  const startedInPeriod = finishedInPeriod + (byStatus.draft || 0);

  return {
    openDrafts: drafts.length,
    staleDrafts: ages.filter((age) => age >= STALE_DRAFT_DAYS).length,
    staleAfterDays: STALE_DRAFT_DAYS,
    medianAgeDays: roundTo(median(ages)),
    byAge,
    startedInPeriod,
    finishedInPeriod,
    completionRate: ratio(finishedInPeriod, startedInPeriod)
  };
};

/**
 * Of the cases (completed root consultations) opened in the period, how many
 * have had at least one completed follow-up. Archived (deleted) consultations
 * count as neither, since drafts are archived too.
 */
const followUps = async (period) => {
  const rootIds = await Consultation.distinct('_id', {
    parentConsultation: null,
    status: 'completed',
    createdAt: rangeOf(period)
  });
  let withFollowUp = 0;
  if (rootIds.length > 0) {
    const followedUpIds = await Consultation.distinct('parentConsultation', {
      parentConsultation: { $in: rootIds },
      status: 'completed'
    });
    withFollowUp = followedUpIds.length;
  }

  return { cases: rootIds.length, withFollowUp, rate: ratio(withFollowUp, rootIds.length) };
};

// ---- Record quality ----

/**
 * How often each narrative section is filled in on consultations completed in
 * the period. Drafts are excluded — they are incomplete by definition.
 */
const writtenSections = async (period) => {
  const group = { _id: null, total: { $sum: 1 } };
  WRITTEN_SECTIONS.forEach(({ key, path }) => {
    group[key] = countIf(isFilled(path));
  });
  group.allFour = countIf({ $and: WRITTEN_SECTIONS.map(({ path }) => isFilled(path)) });

  const [row] = await Consultation.aggregate([
    { $match: { status: 'completed', createdAt: rangeOf(period) } },
    { $group: group }
  ]);
  const total = row ? row.total : 0;
  const allFour = row ? row.allFour : 0;

  return {
    consultations: total,
    sections: WRITTEN_SECTIONS.map(({ key, label }) => {
      const count = row ? row[key] : 0;
      return { key, label, count, share: ratio(count, total) };
    }),
    allFour,
    allFourShare: ratio(allFour, total)
  };
};

/**
 * Share of consultations completed in the period that carry each clinical
 * record type. Counted from the records' own consultation reference, which
 * every create path sets.
 */
const recordTypeUsage = async (period) => {
  const consultationIds = await Consultation.distinct('_id', {
    status: 'completed',
    createdAt: rangeOf(period)
  });
  const total = consultationIds.length;

  let byType = new Map();
  let withAny = 0;
  if (total > 0) {
    const [result] = await MedicalRecord.aggregate([
      { $match: { consultation: { $in: consultationIds }, isDeleted: { $ne: true } } },
      { $group: { _id: { type: '$recordType', consultation: '$consultation' } } },
      {
        $facet: {
          byType: [{ $group: { _id: '$_id.type', count: { $sum: 1 } } }],
          withAny: [{ $group: { _id: '$_id.consultation' } }, { $count: 'count' }]
        }
      }
    ]);
    byType = new Map(result.byType.map((row) => [row._id, row.count]));
    withAny = result.withAny.length ? result.withAny[0].count : 0;
  }

  return {
    consultations: total,
    withAny,
    withAnyShare: ratio(withAny, total),
    types: RECORD_TYPES.map(({ type, label }) => {
      const count = byType.get(type) || 0;
      return { type, label, count, share: ratio(count, total) };
    })
  };
};

// ---- Composition ----

/**
 * All patient records (own accounts and provider-created) by age band today.
 */
const ageGroups = async (now) => {
  const today = startOfUtcDay(now);
  // Born before this instant => has had their Nth birthday by today
  const bornBefore = (years) =>
    new Date(Date.UTC(today.getUTCFullYear() - years, today.getUTCMonth(), today.getUTCDate() + 1));

  // $bucket needs ascending boundaries, so oldest band first: band i spans
  // [boundaries[i], boundaries[i + 1]), and bornBefore(0) closes the youngest
  const oldestFirst = [...AGE_BANDS].reverse();
  const boundaries = [
    new Date(Date.UTC(1850, 0, 1)),
    ...oldestFirst.map(({ min }) => bornBefore(min))
  ];

  const rows = await User.aggregate([
    { $match: { role: 'patient' } },
    {
      $bucket: {
        groupBy: '$patientProfile.dateOfBirth',
        boundaries,
        default: 'unknown',
        output: { count: { $sum: 1 } }
      }
    }
  ]);

  const countByLowerBound = new Map(
    rows.map((row) => [row._id instanceof Date ? row._id.getTime() : row._id, row.count])
  );
  const bands = oldestFirst
    .map(({ label }, i) => ({ label, count: countByLowerBound.get(boundaries[i].getTime()) || 0 }))
    .reverse();
  const unknown = countByLowerBound.get('unknown') || 0;

  return {
    patients: bands.reduce((sum, band) => sum + band.count, 0) + unknown,
    bands,
    unknown
  };
};

// ---- Platform health ----

/**
 * Queue backlog right now, and delivery outcomes for emails queued in the
 * period, overall and per email type.
 */
const emailDelivery = async (period, now) => {
  const [backlogRows, oldestPending, periodRows] = await Promise.all([
    EmailQueue.aggregate([
      { $match: { status: { $in: ['pending', 'processing'] } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    EmailQueue.findOne({ status: 'pending' }).sort({ createdAt: 1 }).select('createdAt').lean(),
    EmailQueue.aggregate([
      { $match: { createdAt: rangeOf(period) } },
      {
        $group: {
          _id: { template: { $ifNull: ['$template', 'other'] }, status: '$status' },
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  const templates = new Map();
  periodRows.forEach(({ _id: { template, status }, count }) => {
    const entry = templates.get(template) || { template, sent: 0, failed: 0, waiting: 0 };
    if (status === 'sent') entry.sent += count;
    else if (status === 'failed') entry.failed += count;
    else entry.waiting += count;
    templates.set(template, entry);
  });
  const byTemplate = [...templates.values()]
    .map((entry) => ({ ...entry, failureRate: ratio(entry.failed, entry.sent + entry.failed) }))
    .sort((a, b) => b.failed - a.failed || b.sent + b.failed - (a.sent + a.failed));

  const sent = byTemplate.reduce((sum, t) => sum + t.sent, 0);
  const failed = byTemplate.reduce((sum, t) => sum + t.failed, 0);
  const backlog = Object.fromEntries(backlogRows.map((row) => [row._id, row.count]));

  return {
    backlog: (backlog.pending || 0) + (backlog.processing || 0),
    oldestPendingHours: oldestPending
      ? roundTo((now - oldestPending.createdAt) / (60 * 60 * 1000))
      : null,
    sent,
    failed,
    failureRate: ratio(failed, sent + failed),
    byTemplate
  };
};

/**
 * Of the people an invitation email was successfully sent to in the period,
 * how many went on to act on it.
 */
const emailsVsSignups = async (period) =>
  Promise.all(
    INVITE_FLOWS.map(async ({ key, label, templates, recipients, completed }) => {
      const recipientIds = await EmailQueue.distinct('userId', {
        template: { $in: templates },
        status: 'sent',
        createdAt: rangeOf(period)
      });
      const scope = { _id: { $in: recipientIds.filter(Boolean) }, ...(recipients || {}) };
      const [sent, done] = await Promise.all([
        User.countDocuments(scope),
        User.countDocuments({ ...scope, ...completed })
      ]);
      return { key, label, sent, completed: done, rate: ratio(done, sent) };
    })
  );

/**
 * Audited actions per UTC day across the period (capped to its most recent
 * year). Days before the audit trail existed are null, not zero.
 */
const activityPulse = async (period, trackingSince) => {
  const lastDay = startOfUtcDay(new Date(period.end.getTime() - 1));
  const periodDays = Math.round((lastDay - startOfUtcDay(period.start)) / DAY_MS) + 1;
  const days = Math.max(1, Math.min(periodDays, MAX_PULSE_DAYS));
  const firstDay = new Date(lastDay.getTime() - (days - 1) * DAY_MS);
  // Buckets are whole days, but events outside the requested period (e.g. a
  // timed range starting mid-day) must not be counted
  const from = new Date(Math.max(firstDay.getTime(), period.start.getTime()));
  const to = new Date(Math.min(lastDay.getTime() + DAY_MS, period.end.getTime()));

  const rows = await AuditEvent.aggregate([
    { $match: { ...USAGE_EVENTS, recorded: { $gte: from, $lt: to } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$recorded' } },
        count: { $sum: 1 }
      }
    }
  ]);

  const countByDay = new Map(rows.map((row) => [row._id, row.count]));
  const trackedFrom = trackingSince ? dayKey(trackingSince) : null;
  return Array.from({ length: days }, (_, i) => {
    const day = dayKey(new Date(firstDay.getTime() + i * DAY_MS));
    const tracked = trackedFrom !== null && day >= trackedFrom;
    return { day, count: tracked ? countByDay.get(day) || 0 : null };
  });
};

/**
 * Everything the engagement section of the admin dashboard shows.
 */
const getEngagementAnalytics = async (query = {}, now = new Date()) => {
  const period = resolvePeriod(query, now);
  // Earliest by time, not chain position: replayed dead-letter events keep
  // their original timestamp but take a new, later sequence number
  const firstEvent = await AuditEvent.findOne().sort({ recorded: 1 }).select('recorded').lean();
  const trackingSince = firstEvent ? firstEvent.recorded : null;

  const [
    activeByMonth,
    funnel,
    placeholders,
    providers,
    patientViews,
    drafts,
    followUpRate,
    sections,
    recordTypes,
    ages,
    emails,
    invites,
    pulse
  ] = await Promise.all([
    activeProvidersByMonth(now),
    signupFunnel(period),
    placeholderConversion(period),
    providerActivity(period),
    patientRecordViews(period),
    abandonedDrafts(period, now),
    followUps(period),
    writtenSections(period),
    recordTypeUsage(period),
    ageGroups(now),
    emailDelivery(period, now),
    emailsVsSignups(period),
    activityPulse(period, trackingSince)
  ]);

  return {
    period: { start: period.start, end: period.end },
    trackingSince,
    generatedAt: now,
    retention: { activeProvidersByMonth: activeByMonth },
    activation: { signupFunnel: funnel, placeholderConversion: placeholders },
    depthOfUse: {
      providerActivity: providers,
      patientRecordViews: patientViews,
      abandonedDrafts: drafts,
      followUps: followUpRate
    },
    recordQuality: { writtenSections: sections, recordTypes },
    composition: { ageGroups: ages },
    platformHealth: { emailDelivery: emails, emailsVsSignups: invites, activityPulse: pulse }
  };
};

module.exports = {
  getEngagementAnalytics,
  resolvePeriod
};
