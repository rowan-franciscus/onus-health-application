import React from 'react';
import { FiAlertTriangle, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { formatDateTime } from '../../../utils/dateUtils';
import {
  BarList,
  ColumnChart,
  Legend,
  LineChart,
  TableView,
  TooltipBody,
  formatCount,
  formatDay,
  formatMonth,
  formatShare
} from './charts';
import styles from './AnalyticsPanels.module.css';

// ---- shared building blocks ----

const Panel = ({ intro, children }) => (
  <div className={styles.panel}>
    {intro && <p className={styles.panelIntro}>{intro}</p>}
    <div className={styles.cardGrid}>{children}</div>
  </div>
);

const Card = ({ title, description, wide, note, children }) => (
  <article className={`${styles.card} ${wide ? styles.cardWide : ''}`}>
    <header className={styles.cardHeader}>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {note && <span className={styles.trackingNote}>{note}</span>}
    </header>
    {children}
  </article>
);

const Stat = ({ label, value, detail }) => (
  <div className={styles.stat}>
    <span className={styles.statValue}>{value}</span>
    <span className={styles.statLabel}>{label}</span>
    {detail && <span className={styles.statDetail}>{detail}</span>}
  </div>
);

const StatRow = ({ children }) => <div className={styles.statRow}>{children}</div>;

// Share of a whole, or null (shown as "—") when there is nothing to divide by
const shareOf = (part, whole) => (whole ? part / whole : null);

const trackingNoteFor = (data) =>
  data.trackingSince
    ? `Usage tracked since ${formatDay(data.trackingSince, { day: 'numeric', month: 'short', year: 'numeric' })}`
    : 'Usage tracking has no data yet';

const FunnelBars = ({ label, stages }) => {
  const registered = stages[0].count;
  return (
    <BarList
      ariaLabel={`${label} sign-up funnel`}
      rows={stages.map((s) => {
        const share = shareOf(s.count, registered);
        return {
          label: s.stage,
          fraction: share,
          value: share === null ? formatCount(s.count) : `${formatCount(s.count)} · ${formatShare(share)}`
        };
      })}
    />
  );
};

// ---- Overview ----

const GENDER_LABELS = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
  'prefer not to say': 'Prefer not to say',
  unknown: 'Not given'
};

const activityText = (activity) => {
  switch (activity.type) {
    case 'user_created':
      return `New ${activity.role} registered: ${activity.user}`;
    case 'consultation_created':
      return `New consultation created by ${activity.provider} for ${activity.patient}`;
    default:
      return 'Unknown activity';
  }
};

const ActivityItem = ({ activity }) => (
  <li className={styles.activityItem}>
    <span className={styles.activityText}>{activityText(activity)}</span>
    <span className={styles.activityTime}>{formatDateTime(activity.timestamp)}</span>
  </li>
);

const AgeGroupsCard = ({ ages }) => (
  <Card
    title="Patient age groups"
    description={`All ${formatCount(ages.patients)} patient records, including those added by providers.${ages.unknown ? ` ${formatCount(ages.unknown)} have no date of birth.` : ''}`}
  >
    <ColumnChart
      height={180}
      ariaLabel="Patients by age group"
      data={ages.bands.map((b) => ({
        key: b.label,
        label: b.label,
        value: b.count,
        ariaLabel: `${b.label}: ${b.count} patients`
      }))}
      renderTooltip={(d) => (
        <TooltipBody
          value={`${formatCount(d.value)} patients`}
          label={`Aged ${d.label}`}
          detail={`${formatShare(shareOf(d.value, ages.patients))} of all patients`}
        />
      )}
    />
    <TableView
      caption="Patients by age group"
      columns={['Age group', 'Patients', 'Share']}
      rows={[
        ...ages.bands.map((b) => [b.label, b.count, formatShare(shareOf(b.count, ages.patients))]),
        ['Unknown', ages.unknown, formatShare(shareOf(ages.unknown, ages.patients))]
      ]}
    />
  </Card>
);

export const OverviewPanel = ({ analytics, engagement }) => {
  const genders = Object.entries(analytics.genderDistribution || {}).sort((a, b) => b[1] - a[1]);
  const genderTotal = genders.reduce((sum, [, count]) => sum + count, 0);

  return (
    <div className={styles.panel}>
      <div className={styles.kpiRow}>
        <Stat label="Users" value={formatCount(analytics.totalUsers)} detail="All time" />
        <Stat label="Patients" value={formatCount(analytics.totalPatients)} detail="All time" />
        <Stat label="Health providers" value={formatCount(analytics.totalProviders)} detail="All time" />
        <Stat label="Consultations" value={formatCount(analytics.totalConsultations)} detail="All time" />
      </div>

      <div className={styles.cardGrid}>
        <Card title="In the selected period" description="New sign-ups, sign-ins and deletions between the selected dates.">
          <div className={styles.periodGrid}>
            <Stat label="New users" value={formatCount(analytics.newUsers || 0)} />
            <Stat label="New patients" value={formatCount(analytics.newPatients || 0)} />
            <Stat label="New providers" value={formatCount(analytics.newProviders || 0)} />
            <Stat label="New consultations" value={formatCount(analytics.newConsultations || 0)} />
            <Stat label="Users signed in" value={formatCount(analytics.activeUsers || 0)} />
            <Stat label="Patients signed in" value={formatCount(analytics.activePatients || 0)} />
            <Stat label="Providers signed in" value={formatCount(analytics.activeProviders || 0)} />
            <Stat label="Deleted profiles" value={formatCount(analytics.deletedProfiles || 0)} />
          </div>
        </Card>

        <Card title="Recent activity" description="The latest sign-ups and consultations.">
          {analytics.activityLog && analytics.activityLog.length > 0 ? (
            <ul className={styles.activityList}>
              {analytics.activityLog.map((activity, index) => (
                <ActivityItem key={index} activity={activity} />
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>No recent activity.</p>
          )}
        </Card>

        <Card title="Patients" description="Gender as patients reported it, and average age.">
          <StatRow>
            <Stat label="Average age" value={analytics.averagePatientAge ? `${analytics.averagePatientAge}` : '—'} detail="Patients with a date of birth" />
          </StatRow>
          <BarList
            ariaLabel="Patients by gender"
            rows={genders.map(([gender, count]) => {
              const share = shareOf(count, genderTotal);
              return {
                label: GENDER_LABELS[gender] || gender,
                fraction: share,
                value: `${formatCount(count)} · ${formatShare(share)}`
              };
            })}
          />
        </Card>

        {engagement && <AgeGroupsCard ages={engagement.composition.ageGroups} />}
      </div>
    </div>
  );
};

// ---- Engagement ----

export const EngagementPanel = ({ data }) => {
  const months = data.retention.activeProvidersByMonth;
  const { providerActivity: providers, patientRecordViews: views, abandonedDrafts: drafts, followUps } = data.depthOfUse;
  const note = trackingNoteFor(data);

  return (
    <Panel intro="Whether people keep coming back, and whether they do real work when they do.">
      <Card
        wide
        title="Active providers each month"
        description="Providers who recorded at least one consultation that month, out of approved providers who had joined by then. Always the last 12 months, whatever dates are selected."
      >
        <Legend items={[{ label: 'Active', swatch: 'swatchSeries' }, { label: 'Approved', swatch: 'swatchContext' }]} />
        <ColumnChart
          ariaLabel="Active providers per month over the last 12 months"
          data={months.map((m) => ({
            key: m.month,
            label: formatMonth(m.month),
            value: m.active,
            context: m.approved,
            ariaLabel: `${formatMonth(m.month, { month: 'long', year: 'numeric' })}: ${m.active} active of ${m.approved} approved`,
            month: m
          }))}
          renderTooltip={({ month: m }) => (
            <TooltipBody
              value={`${m.active} active`}
              label={`${formatMonth(m.month, { month: 'long', year: 'numeric' })}${m.monthToDate ? ' (so far)' : ''}`}
              detail={`${formatShare(shareOf(m.active, m.approved))} of ${m.approved} approved`}
            />
          )}
        />
        <TableView
          caption="Active providers each month"
          columns={['Month', 'Active', 'Approved', 'Share active']}
          rows={months.map((m) => [
            `${formatMonth(m.month, { month: 'short', year: 'numeric' })}${m.monthToDate ? ' (so far)' : ''}`,
            m.active,
            m.approved,
            formatShare(shareOf(m.active, m.approved))
          ])}
        />
      </Card>

      <Card
        title="Providers who did something"
        description="Approved providers who recorded a consultation in the period, versus those who only signed in or browsed."
        note={note}
      >
        <StatRow>
          <Stat label="Recorded a consultation" value={formatCount(providers.didSomething)} detail={`${formatShare(providers.shareOfApproved)} of ${formatCount(providers.approved)} approved`} />
          <Stat label="Showed up, recorded nothing" value={formatCount(providers.showedUp - providers.didSomething)} detail={`of ${formatCount(providers.showedUp)} who used Onus`} />
        </StatRow>
      </Card>

      <Card
        title="Patients looking at their own records"
        description="Patients who opened at least one of their own clinical records in the period."
        note={note}
      >
        <StatRow>
          <Stat label="Opened their records" value={formatCount(views.viewed)} detail={`${formatShare(views.shareOfWithRecords)} of ${formatCount(views.withRecords)} with records to see`} />
          <Stat label="Record views" value={formatCount(views.views)} detail={`${formatCount(views.active)} patients used Onus`} />
        </StatRow>
      </Card>

      <Card
        title="Abandoned drafts"
        description={`Consultations started but never completed, by time since anyone last touched them. Untouched for ${drafts.staleAfterDays}+ days counts as stale.`}
      >
        <StatRow>
          <Stat label="Open drafts" value={formatCount(drafts.openDrafts)} detail={`${formatCount(drafts.staleDrafts)} stale`} />
          <Stat label="Finished in period" value={formatShare(drafts.completionRate)} detail={`${formatCount(drafts.finishedInPeriod)} of ${formatCount(drafts.startedInPeriod)} started`} />
        </StatRow>
        <BarList
          ariaLabel="Open drafts by time since last edit"
          rows={drafts.byAge.map((b) => ({
            label: b.label,
            fraction: shareOf(b.count, drafts.openDrafts),
            value: formatCount(b.count)
          }))}
        />
      </Card>

      <Card title="Follow-up rate" description="Cases opened in the period that have had at least one follow-up consultation since.">
        <StatRow>
          <Stat label="Cases with a follow-up" value={formatShare(followUps.rate)} detail={`${formatCount(followUps.withFollowUp)} of ${formatCount(followUps.cases)} cases`} />
        </StatRow>
        <p className={styles.footnote}>Recent cases have had less time for a follow-up, so short periods read low.</p>
      </Card>
    </Panel>
  );
};

// ---- Activation ----

export const ActivationPanel = ({ data }) => {
  const { patient, provider } = data.activation.signupFunnel;
  const claims = data.activation.placeholderConversion;

  return (
    <Panel intro="Whether new sign-ups get through to a usable account. Each step counts accounts registered in the period, out of those who registered.">
      <Card title="Patient sign-ups" description="Registered, confirmed their email, then finished their profile.">
        <FunnelBars label="Patient" stages={patient} />
      </Card>
      <Card title="Provider sign-ups" description="As for patients, plus approval by an admin.">
        <FunnelBars label="Provider" stages={provider} />
      </Card>
      <Card
        wide
        title="Provider-added patients claiming their record"
        description="Patients a provider added on their behalf who later created their own login."
      >
        <StatRow>
          <Stat label="Claimed, all time" value={formatShare(claims.claimRate)} detail={`${formatCount(claims.claimed)} of ${formatCount(claims.created)} records`} />
          <Stat label="Claimed in period" value={formatCount(claims.claimedInPeriod)} detail={`${formatCount(claims.createdInPeriod)} added in period`} />
          <Stat
            label="Typical time to claim"
            value={claims.medianDaysToClaim === null ? '—' : `${claims.medianDaysToClaim} days`}
            detail="Median, from being added"
          />
        </StatRow>
      </Card>
    </Panel>
  );
};

// ---- Record quality ----

export const RecordQualityPanel = ({ data }) => {
  const { writtenSections: sections, recordTypes } = data.recordQuality;

  return (
    <Panel intro="Whether consultations completed in the period are full clinical records or just notes.">
      <Card
        title="Written sections filled in"
        description={`Of ${formatCount(sections.consultations)} completed consultations, how many have each section written.`}
      >
        <BarList
          ariaLabel="Share of consultations with each section filled in"
          rows={[
            ...sections.sections.map((s) => ({ label: s.label, fraction: s.share, value: `${formatShare(s.share)} · ${formatCount(s.count)}` })),
            { label: 'All four', fraction: sections.allFourShare, value: `${formatShare(sections.allFourShare)} · ${formatCount(sections.allFour)}` }
          ]}
        />
      </Card>
      <Card
        title="Which record types get used"
        description={`Of ${formatCount(recordTypes.consultations)} completed consultations, how many include each kind of record.`}
      >
        <BarList
          ariaLabel="Share of consultations including each record type"
          rows={[
            ...recordTypes.types.map((t) => ({ label: t.label, fraction: t.share, value: `${formatShare(t.share)} · ${formatCount(t.count)}` })),
            { label: 'Any record', fraction: recordTypes.withAnyShare, value: `${formatShare(recordTypes.withAnyShare)} · ${formatCount(recordTypes.withAny)}` }
          ]}
        />
      </Card>
    </Panel>
  );
};

// ---- Platform health ----

const TEMPLATE_NAMES = {
  verification: 'Email verification',
  consentRequest: 'Consent request',
  claimProfileLink: 'Claim your record',
  practiceAdminInvite: 'Practice admin invite',
  passwordReset: 'Password reset',
  passwordResetSuccess: 'Password changed',
  patientClaimed: 'Patient joined',
  other: 'Other'
};

// Unlisted templates: "consentGranted" -> "Consent granted"
const templateName = (template) => {
  if (TEMPLATE_NAMES[template]) return TEMPLATE_NAMES[template];
  const words = template.replace(/([A-Z])/g, ' $1').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const FAILURE_WARNING_RATE = 0.05;

const deliveryStatus = ({ failed, failureRate }) => {
  if (!failed) return { tone: 'good', Icon: FiCheckCircle, label: 'Healthy' };
  if (failureRate < FAILURE_WARNING_RATE) return { tone: 'warning', Icon: FiAlertTriangle, label: 'Some failures' };
  return { tone: 'critical', Icon: FiXCircle, label: 'Failing' };
};

const StatusChip = ({ status }) => (
  <span className={`${styles.status} ${styles[status.tone]}`}>
    <status.Icon aria-hidden="true" />
    {status.label}
  </span>
);

export const PlatformHealthPanel = ({ data }) => {
  const { emailDelivery: email, emailsVsSignups: invites, activityPulse: pulse } = data.platformHealth;
  const tracked = pulse.filter((d) => d.count !== null);
  const average = tracked.length ? Math.round(tracked.reduce((sum, d) => sum + d.count, 0) / tracked.length) : null;

  return (
    <Panel intro="Early warning that something has broken.">
      <Card
        wide
        title="Overall activity pulse"
        description={`Recorded actions per day — sign-ins, record views and edits, consent changes.${average !== null ? ` ${formatCount(average)} a day on average.` : ''} A sudden drop usually means something broke.`}
        note={trackingNoteFor(data)}
      >
        {tracked.length ? (
          <LineChart
            ariaLabel="Recorded actions per day"
            data={pulse.map((d) => ({ day: d.day, value: d.count }))}
            gapLabel="Tracking began"
            renderTooltip={(d) => (
              <TooltipBody value={`${formatCount(d.value)} actions`} label={formatDay(d.day, { weekday: 'short', day: 'numeric', month: 'short' })} />
            )}
          />
        ) : (
          <p className={styles.empty}>No activity has been recorded in this period.</p>
        )}
        <TableView
          caption="Recorded actions per day"
          columns={['Day', 'Actions']}
          rows={[...tracked].reverse().map((d) => [formatDay(d.day, { day: 'numeric', month: 'short', year: 'numeric' }), d.count])}
        />
      </Card>

      <Card title="Email delivery health" description="Emails waiting to send now, and delivery outcomes for emails queued in the period.">
        <StatRow>
          <Stat
            label="Waiting to send"
            value={formatCount(email.backlog)}
            detail={email.oldestPendingHours === null ? 'Queue is clear' : `Oldest waiting ${email.oldestPendingHours} hours`}
          />
          <Stat label="Failure rate" value={formatShare(email.failureRate)} detail={`${formatCount(email.failed)} failed, ${formatCount(email.sent)} sent`} />
        </StatRow>
        {email.byTemplate.length > 0 ? (
          <div className={styles.tableScroll}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th scope="col">Email</th>
                  <th scope="col">Sent</th>
                  <th scope="col">Failed</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {email.byTemplate.map((t) => (
                  <tr key={t.template}>
                    <th scope="row">{templateName(t.template)}</th>
                    <td>{formatCount(t.sent)}</td>
                    <td>{formatCount(t.failed)}</td>
                    <td><StatusChip status={deliveryStatus(t)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.empty}>No emails were queued in this period.</p>
        )}
      </Card>

      <Card
        title="Emails sent versus sign-ups completed"
        description="People an invitation was delivered to in the period, and how many have since acted on it."
      >
        <BarList
          ariaLabel="Invitation emails that led to a completed sign-up"
          rows={invites.map((f) => ({
            label: f.label,
            fraction: f.rate,
            value: f.sent ? `${formatShare(f.rate)} · ${formatCount(f.completed)} of ${formatCount(f.sent)}` : 'None sent'
          }))}
        />
      </Card>
    </Panel>
  );
};
