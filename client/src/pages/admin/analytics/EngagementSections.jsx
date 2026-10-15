import React from 'react';
import { FiAlertTriangle, FiCheckCircle, FiXCircle } from 'react-icons/fi';
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
import styles from './Engagement.module.css';

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

// "consentGranted" -> "Consent granted"
const templateName = (template) =>
  TEMPLATE_NAMES[template] ||
  template.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).replace(/ (\w)/g, (m) => m.toLowerCase());

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

const Section = ({ title, description, children }) => (
  <section className={styles.section}>
    <header className={styles.sectionHeader}>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </header>
    <div className={styles.cardGrid}>{children}</div>
  </section>
);

const Card = ({ title, description, wide, trackingNote, children }) => (
  <article className={`${styles.card} ${wide ? styles.cardWide : ''}`}>
    <header className={styles.cardHeader}>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {trackingNote && <span className={styles.trackingNote}>{trackingNote}</span>}
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

const FunnelBars = ({ title, stages }) => {
  const registered = stages[0].count;
  return (
    <div className={styles.funnel}>
      <h4>{title}</h4>
      <BarList
        ariaLabel={`${title} sign-up funnel`}
        rows={stages.map((s) => ({
          label: s.stage,
          fraction: registered ? s.count / registered : 0,
          value: registered ? `${formatCount(s.count)} · ${formatShare(s.count / registered)}` : formatCount(s.count)
        }))}
      />
    </div>
  );
};

const EngagementSections = ({ data }) => {
  const { retention, activation, depthOfUse, recordQuality, composition, platformHealth } = data;
  const trackingSince = data.trackingSince ? formatDay(data.trackingSince, { day: 'numeric', month: 'short', year: 'numeric' }) : null;
  const trackingNote = trackingSince ? `Usage tracked since ${trackingSince}` : 'Usage tracking has no data yet';

  const months = retention.activeProvidersByMonth;
  const { patient: patientFunnel, provider: providerFunnel } = activation.signupFunnel;
  const claims = activation.placeholderConversion;
  const providers = depthOfUse.providerActivity;
  const views = depthOfUse.patientRecordViews;
  const drafts = depthOfUse.abandonedDrafts;
  const followUps = depthOfUse.followUps;
  const sections = recordQuality.writtenSections;
  const recordTypes = recordQuality.recordTypes;
  const ages = composition.ageGroups;
  const email = platformHealth.emailDelivery;
  const invites = platformHealth.emailsVsSignups;
  const pulse = platformHealth.activityPulse;
  const trackedPulse = pulse.filter((d) => d.count !== null);
  const pulseAverage = trackedPulse.length
    ? Math.round(trackedPulse.reduce((sum, d) => sum + d.count, 0) / trackedPulse.length)
    : null;

  return (
    <>
      <Section
        title="Retention"
        description="Whether providers keep coming back to do clinical work. Not affected by the date range."
      >
        <Card
          wide
          title="Active providers each month"
          description="Providers who recorded at least one consultation that month, out of approved providers who had joined by then."
        >
          <Legend items={[{ label: 'Active', swatch: 'swatchSeries' }, { label: 'Approved', swatch: 'swatchContext' }]} />
          <ColumnChart
            ariaLabel="Active providers per month over the last 12 months"
            data={months.map((m) => ({
              key: m.month,
              label: formatMonth(m.month),
              value: m.active,
              context: m.approved,
              ariaLabel: `${formatMonth(m.month, { month: 'long', year: 'numeric' })}: ${m.active} active of ${m.approved} approved`
            }))}
            renderTooltip={(d) => {
              const m = months.find((month) => month.month === d.key);
              return (
                <TooltipBody
                  value={`${m.active} active`}
                  label={`${formatMonth(m.month, { month: 'long', year: 'numeric' })}${m.monthToDate ? ' (so far)' : ''}`}
                  detail={`${formatShare(m.approved ? m.active / m.approved : null)} of ${m.approved} approved`}
                />
              );
            }}
          />
          <TableView
            caption="Active providers each month"
            columns={['Month', 'Active', 'Approved', 'Share active']}
            rows={months.map((m) => [
              `${formatMonth(m.month, { month: 'short', year: 'numeric' })}${m.monthToDate ? ' (so far)' : ''}`,
              m.active,
              m.approved,
              formatShare(m.approved ? m.active / m.approved : null)
            ])}
          />
        </Card>
      </Section>

      <Section title="Activation" description="Whether new sign-ups get through to a usable account.">
        <Card
          title="Sign-up completion"
          description="Accounts registered in the period, and how many reached each step. Each step is counted out of those who registered."
        >
          <div className={styles.funnelPair}>
            <FunnelBars title="Patients" stages={patientFunnel} />
            <FunnelBars title="Providers" stages={providerFunnel} />
          </div>
        </Card>
        <Card
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
      </Section>

      <Section title="Depth of use" description="Separating people who log in from people who do real work.">
        <Card
          title="Providers who did something"
          description="Approved providers who recorded at least one consultation in the period, versus those who only signed in or browsed."
          trackingNote={trackingNote}
        >
          <StatRow>
            <Stat label="Recorded a consultation" value={formatCount(providers.didSomething)} detail={`${formatShare(providers.shareOfApproved)} of ${formatCount(providers.approved)} approved`} />
            <Stat label="Showed up, recorded nothing" value={formatCount(providers.showedUp - providers.didSomething)} detail={`of ${formatCount(providers.showedUp)} who used Onus`} />
          </StatRow>
        </Card>
        <Card
          title="Patients looking at their own records"
          description="Patients who opened at least one of their own clinical records in the period."
          trackingNote={trackingNote}
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
            <Stat
              label="Finished in period"
              value={formatShare(drafts.completionRate)}
              detail={`${formatCount(drafts.finishedInPeriod)} of ${formatCount(drafts.startedInPeriod)} started`}
            />
          </StatRow>
          <BarList
            ariaLabel="Open drafts by time since last edit"
            rows={drafts.byAge.map((b) => ({
              label: b.label,
              fraction: drafts.openDrafts ? b.count / drafts.openDrafts : 0,
              value: formatCount(b.count)
            }))}
          />
        </Card>
        <Card
          title="Follow-up rate"
          description="Cases opened in the period that have had at least one follow-up consultation since."
        >
          <StatRow>
            <Stat label="Cases with a follow-up" value={formatShare(followUps.rate)} detail={`${formatCount(followUps.withFollowUp)} of ${formatCount(followUps.cases)} cases`} />
          </StatRow>
          <p className={styles.footnote}>Recent cases have had less time for a follow-up, so short periods read low.</p>
        </Card>
      </Section>

      <Section title="Record quality" description="Whether consultations are full clinical records or just notes.">
        <Card
          title="Written sections filled in"
          description={`Of ${formatCount(sections.consultations)} consultations completed in the period, how many have each section written.`}
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
          description={`Of ${formatCount(recordTypes.consultations)} consultations completed in the period, how many include each kind of record.`}
        >
          <BarList
            ariaLabel="Share of consultations including each record type"
            rows={[
              ...recordTypes.types.map((t) => ({ label: t.label, fraction: t.share, value: `${formatShare(t.share)} · ${formatCount(t.count)}` })),
              { label: 'Any record', fraction: recordTypes.withAnyShare, value: `${formatShare(recordTypes.withAnyShare)} · ${formatCount(recordTypes.withAny)}` }
            ]}
          />
        </Card>
      </Section>

      <Section title="Composition" description="Who our patients are. Not affected by the date range.">
        <Card
          wide
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
                detail={`${formatShare(ages.patients ? d.value / ages.patients : null)} of all patients`}
              />
            )}
          />
          <TableView
            caption="Patients by age group"
            columns={['Age group', 'Patients', 'Share']}
            rows={[
              ...ages.bands.map((b) => [b.label, b.count, formatShare(ages.patients ? b.count / ages.patients : null)]),
              ['Unknown', ages.unknown, formatShare(ages.patients ? ages.unknown / ages.patients : null)]
            ]}
          />
        </Card>
      </Section>

      <Section title="Platform health" description="Early warning that something has broken.">
        <Card
          wide
          title="Overall activity pulse"
          description={`Recorded actions per day — sign-ins, record views and edits, consent changes.${pulseAverage !== null ? ` ${formatCount(pulseAverage)} a day on average.` : ''} A sudden drop usually means something broke.`}
          trackingNote={trackingNote}
        >
          {trackedPulse.length ? (
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
            rows={[...trackedPulse].reverse().map((d) => [formatDay(d.day, { day: 'numeric', month: 'short', year: 'numeric' }), d.count])}
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
      </Section>
    </>
  );
};

export default EngagementSections;
