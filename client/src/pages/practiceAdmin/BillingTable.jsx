/**
 * Shared billing table used by both Practice Admin and Provider Billing pages.
 *
 * Props:
 *   fetchBilling: () => Promise<{ consultations: [...] }>
 *   updateStatus: (consultationId, status) => Promise
 *   csvUrl: string (path under /api)
 *   exportTitle: string (PDF header)
 */
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import config from '../../config';
import AuthService from '../../services/auth.service';
import styles from './Billing.module.css';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB') : '—');

const STATUS_OPTIONS = ['pending', 'processed', 'submitted'];

const statusClass = (s) => {
  if (s === 'processed') return styles.statusProcessed;
  if (s === 'submitted') return styles.statusSubmitted;
  return styles.statusPending;
};

const BillingTable = ({
  title,
  subtitle,
  fetchBilling,
  updateStatus,
  csvUrl,
  exportTitle
}) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchBilling();
        setRows(res.consultations || []);
      } catch (e) {
        toast.error('Failed to load billing data');
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchBilling]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (statusFilter !== 'all' && (r.billingStatus || 'pending') !== statusFilter) return false;
      if (!search) return true;
      const hay = [
        r.patient && `${r.patient.firstName} ${r.patient.lastName}`,
        r.provider && `Dr. ${r.provider.firstName} ${r.provider.lastName}`,
        r.general && r.general.diagnosis
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(search.toLowerCase());
    });
  }, [rows, statusFilter, search]);

  const onStatus = async (id, next) => {
    try {
      await updateStatus(id, next);
      setRows(rs => rs.map(r => r._id === id ? { ...r, billingStatus: next } : r));
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  const onExportCsv = async () => {
    try {
      const token = AuthService.getToken();
      const res = await fetch(`${config.apiUrl}${csvUrl}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('CSV download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'onus-billing-export.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('Failed to export CSV');
    }
  };

  const onExportPdf = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text(exportTitle, 14, 18);
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(
        `Generated ${new Date().toLocaleString('en-GB')} · ${filtered.length} consultation(s)`,
        14, 25
      );
      doc.autoTable({
        startY: 32,
        head: [['Date', 'Patient', 'Provider', 'Diagnosis', 'Status']],
        body: filtered.map(r => [
          fmtDate(r.date),
          r.patient ? `${r.patient.firstName} ${r.patient.lastName}` : '',
          r.provider ? `Dr. ${r.provider.firstName} ${r.provider.lastName}` : '',
          (r.general && r.general.diagnosis) || '—',
          r.billingStatus || 'pending'
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [96, 57, 204] }
      });
      doc.save('onus-billing-export.pdf');
    } catch (e) {
      toast.error('Failed to export PDF');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.exportBtn} onClick={onExportCsv}>↧ Export CSV</button>
          <button className={`${styles.exportBtn} ${styles.primary}`} onClick={onExportPdf}>📄 Export PDF</button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.controlsRow}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              className={styles.search}
              placeholder="Search by patient, provider or diagnosis…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="processed">Processed</option>
            <option value="submitted">Submitted</option>
          </select>
        </div>

        <div className={styles.tableHeader}>
          <div>Date</div>
          <div>Patient</div>
          <div>Provider</div>
          <div>Diagnosis</div>
          <div>Status</div>
        </div>

        {loading ? (
          <div className={styles.empty}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>No consultations match the filter</div>
        ) : (
          filtered.map(r => {
            const s = r.billingStatus || 'pending';
            return (
              <div key={r._id} className={styles.tableRow}>
                <div>{fmtDate(r.date)}</div>
                <div>{r.patient ? `${r.patient.firstName} ${r.patient.lastName}` : '—'}</div>
                <div>{r.provider ? `Dr. ${r.provider.firstName} ${r.provider.lastName}` : '—'}</div>
                <div>{(r.general && r.general.diagnosis) || '—'}</div>
                <div>
                  <select
                    className={`${styles.statusPill} ${statusClass(s)}`}
                    value={s}
                    onChange={(e) => onStatus(r._id, e.target.value)}
                  >
                    {STATUS_OPTIONS.map(o => (
                      <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default BillingTable;
