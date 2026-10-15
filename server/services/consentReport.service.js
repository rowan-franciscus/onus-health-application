/**
 * Consent instrumentation report (internal, admin only).
 *
 * Built for the clinician pilots: how often can a patient NOT consent in the
 * room (deferral rate and reasons), how long consent takes, how often links
 * expire, and how many consenting patients go on to claim their profile.
 * Computed from Connection.consent fields; pilot volumes are small, so the
 * figures are calculated in memory.
 */

const Connection = require('../models/Connection');
const Practice = require('../models/Practice');
const consentService = require('./consent.service');

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const TIME_BUCKETS = [
  { label: '< 1 hour', max: HOUR_MS },
  { label: '1–24 hours', max: DAY_MS },
  { label: '1–3 days', max: 3 * DAY_MS },
  { label: '3–7 days', max: 7 * DAY_MS },
  { label: '7–14 days', max: 14 * DAY_MS },
  { label: '> 14 days (after resend)', max: Infinity }
];

const ratio = (num, den) => (den > 0 ? num / den : null);

const percentile = (sorted, p) => {
  if (sorted.length === 0) return null;
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
};

/**
 * @param {Object} [filters]
 * @param {Date} [filters.from] - onboardings created on/after
 * @param {Date} [filters.to] - onboardings created on/before
 * @param {String} [filters.practiceId] - restrict to one practice's providers
 */
const getConsentReport = async ({ from, to, practiceId } = {}) => {
  await consentService.expireStale({ onboardingSource: 'provider_initiated' });

  const match = { onboardingSource: 'provider_initiated' };
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = from;
    if (to) match.createdAt.$lte = to;
  }
  if (practiceId) {
    const practice = await Practice.findById(practiceId).select('owner members').lean();
    match.provider = { $in: practice ? [practice.owner, ...(practice.members || [])] : [] };
  }

  const connections = await Connection.find(match)
    .select('consent createdAt patient')
    .populate('patient', 'claimedAt isOnusUser')
    .lean();

  const total = connections.length;
  const byStatus = { PENDING_CONSENT: 0, ACTIVE: 0, DECLINED: 0, EXPIRED: 0, WITHDRAWN: 0 };
  let invited = 0;
  let everExpired = 0;
  let granted = 0;
  let grantedAndClaimed = 0;
  let withDeferral = 0;
  const durations = [];
  const reasonCounts = {};
  const reasonOnboardings = {};

  for (const c of connections) {
    const consent = c.consent || {};
    byStatus[consent.status] = (byStatus[consent.status] || 0) + 1;
    if (consent.firstInviteSentAt) invited += 1;
    if (consent.expiredAt) everExpired += 1;

    // WITHDRAWN implies consent was granted first
    if (consent.status === 'ACTIVE' || consent.status === 'WITHDRAWN') {
      granted += 1;
      if (c.patient && (c.patient.claimedAt || c.patient.isOnusUser)) grantedAndClaimed += 1;
      if (consent.firstInviteSentAt && consent.respondedAt) {
        durations.push(new Date(consent.respondedAt) - new Date(consent.firstInviteSentAt));
      }
    }

    const deferrals = consent.deferrals || [];
    if (deferrals.length > 0) withDeferral += 1;
    const seenReasons = new Set();
    for (const d of deferrals) {
      reasonCounts[d.reason] = (reasonCounts[d.reason] || 0) + 1;
      seenReasons.add(d.reason);
    }
    seenReasons.forEach((r) => { reasonOnboardings[r] = (reasonOnboardings[r] || 0) + 1; });
  }

  durations.sort((a, b) => a - b);
  const histogram = TIME_BUCKETS.map((b) => ({ label: b.label, count: 0 }));
  for (const d of durations) {
    histogram[TIME_BUCKETS.findIndex((b) => d < b.max)].count += 1;
  }

  const reasons = consentService.DEFERRAL_REASONS.map((reason) => ({
    reason,
    events: reasonCounts[reason] || 0,
    onboardings: reasonOnboardings[reason] || 0,
    shareOfOnboardings: ratio(reasonOnboardings[reason] || 0, total)
  }));

  const practices = await Practice.find().select('name').sort({ name: 1 }).lean();

  return {
    generatedAt: new Date(),
    filters: { from: from || null, to: to || null, practiceId: practiceId || null },
    totals: {
      onboardings: total,
      invitesSent: invited,
      noEmailAtOnboarding: total - invited,
      granted,
      byStatus
    },
    rates: {
      // Headline pilot metric: share of onboardings where the patient couldn't consent in the room
      couldNotConsentNow: ratio(withDeferral, total),
      consent: ratio(granted, invited),
      expiry: ratio(everExpired, invited),
      claim: ratio(grantedAndClaimed, granted)
    },
    timeToConsent: {
      count: durations.length,
      medianMs: percentile(durations, 50),
      p90Ms: percentile(durations, 90),
      histogram
    },
    deferrals: {
      onboardingsWithDeferral: withDeferral,
      reasons
    },
    practices: practices.map((p) => ({ _id: p._id, name: p.name }))
  };
};

module.exports = {
  getConsentReport
};
