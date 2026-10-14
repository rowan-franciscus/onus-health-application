import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import ConsentService, { DEFERRAL_REASONS, errorMessage } from '../../services/consent.service';
import styles from './ConsentReport.module.css';

const pct = (value) => (value === null || value === undefined ? '—' : `${(value * 100).toFixed(1)}%`);

const duration = (ms) => {
  if (ms === null || ms === undefined) return '—';
  const hours = ms / 3600000;
  if (hours < 1) return `${Math.round(ms / 60000)} min`;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} days`;
};

const reasonLabel = (value) => DEFERRAL_REASONS.find((r) => r.value === value)?.label || value;

const Tile = ({ label, value, sub, headline }) => (
  <div className={`${styles.tile} ${headline ? styles.headline : ''}`}>
    <p className={styles.tileLabel}>{label}</p>
    <p className={styles.tileValue}>{value}</p>
    {sub && <p className={styles.tileSub}>{sub}</p>}
  </div>
);

/**
 * Internal report for the patient-consent pilot: how often patients can't
 * consent in the room, time to consent, expiry and claim rates.
 */
const ConsentReport = () => {
  const [filters, setFilters] = useState({ from: '', to: '', practiceId: '' });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const res = await ConsentService.getReport(params);
      setReport(res.report);
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to load the consent report'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (name) => (e) => setFilters((f) => ({ ...f, [name]: e.target.value }));

  const totals = report?.totals;
  const rates = report?.rates;
  const histogram = report?.timeToConsent?.histogram || [];
  const maxBucket = Math.max(1, ...histogram.map((b) => b.count));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Consent report</h1>
        <p>
          Patients added by providers (Add New Patient). Used to judge whether &ldquo;patient can&apos;t consent
          in the room&rdquo; is common enough to justify SMS/WhatsApp or paper fallbacks.
        </p>
      </div>

      <div className={styles.filters}>
        <label>
          From
          <input type="date" value={filters.from} onChange={setFilter('from')} />
        </label>
        <label>
          To
          <input type="date" value={filters.to} onChange={setFilter('to')} />
        </label>
        <label>
          Practice
          <select value={filters.practiceId} onChange={setFilter('practiceId')}>
            <option value="">All practices</option>
            {(report?.practices || []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        </label>
      </div>

      {loading && !report ? (
        <div className={styles.empty}>Loading…</div>
      ) : !report || totals.onboardings === 0 ? (
        <div className={styles.empty}>No provider-initiated onboardings in this range.</div>
      ) : (
        <>
          <div className={styles.tiles}>
            <Tile
              headline
              label="Couldn't consent in the room"
              value={pct(rates.couldNotConsentNow)}
              sub={`${report.deferrals.onboardingsWithDeferral} of ${totals.onboardings} onboardings`}
            />
            <Tile label="Onboardings" value={totals.onboardings} sub={`${totals.noEmailAtOnboarding} with no email`} />
            <Tile label="Consent rate" value={pct(rates.consent)} sub={`${totals.granted} of ${totals.invitesSent} invited`} />
            <Tile label="Median time to consent" value={duration(report.timeToConsent.medianMs)} sub={`90th percentile ${duration(report.timeToConsent.p90Ms)}`} />
            <Tile label="Expiry rate" value={pct(rates.expiry)} sub="Links that lapsed after 14 days" />
            <Tile label="Claim rate" value={pct(rates.claim)} sub="Consenting patients who claimed" />
          </div>

          <div className={styles.panels}>
            <div className={styles.panel}>
              <h2>Why patients couldn&apos;t consent now</h2>
              <p className={styles.panelSub}>Onboardings with at least one recorded reason</p>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Reason</th>
                    <th className={styles.num}>Patients</th>
                    <th className={styles.num}>Share of onboardings</th>
                    <th className={styles.num}>Times recorded</th>
                  </tr>
                </thead>
                <tbody>
                  {report.deferrals.reasons.map((r) => (
                    <tr key={r.reason}>
                      <td>{reasonLabel(r.reason)}</td>
                      <td className={styles.num}>{r.onboardings}</td>
                      <td className={styles.num}>{pct(r.shareOfOnboardings)}</td>
                      <td className={styles.num}>{r.events}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.panel}>
              <h2>Time from invite to consent</h2>
              <p className={styles.panelSub}>{report.timeToConsent.count} patients who consented</p>
              <div className={styles.histogram} role="img" aria-label="Number of patients by time from invite to consent">
                {histogram.map((b) => (
                  <div key={b.label} className={styles.barSlot} title={`${b.label}: ${b.count} patient${b.count === 1 ? '' : 's'}`}>
                    <span className={styles.barValue}>{b.count}</span>
                    <div className={styles.bar} style={{ height: `${(b.count / maxBucket) * 100}%` }} />
                  </div>
                ))}
              </div>
              <div className={styles.barLabels}>
                {histogram.map((b) => <span key={b.label}>{b.label}</span>)}
              </div>
            </div>

            <div className={styles.panel}>
              <h2>Current status</h2>
              <p className={styles.panelSub}>All provider-initiated onboardings in range</p>
              <table className={styles.table}>
                <tbody>
                  {[
                    ['Pending consent', totals.byStatus.PENDING_CONSENT],
                    ['Consented', totals.byStatus.ACTIVE],
                    ['Declined', totals.byStatus.DECLINED],
                    ['Link expired', totals.byStatus.EXPIRED],
                    ['Withdrawn', totals.byStatus.WITHDRAWN]
                  ].map(([label, count]) => (
                    <tr key={label}>
                      <td>{label}</td>
                      <td className={styles.num}>{count || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className={styles.note}>Generated {new Date(report.generatedAt).toLocaleString()}.</p>
        </>
      )}
    </div>
  );
};

export default ConsentReport;
