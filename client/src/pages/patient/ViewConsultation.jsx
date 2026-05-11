import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './ViewConsultation.module.css';
import ApiService from '../../services/api.service';
import { formatDate } from '../../utils/dateUtils';

import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Badge from '../../components/common/Badge/Badge';
import Timeline from '../../components/common/Timeline/Timeline';

const PatientViewConsultation = () => {
  const { id } = useParams();
  const [consultation, setConsultation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchConsultationData();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchConsultationData = async () => {
    setIsLoading(true);
    try {
      const response = await ApiService.get(`/consultations/${id}`);
      if (response) setConsultation(response);
    } catch (error) {
      console.error('Error fetching consultation:', error);
      toast.error('Failed to load consultation');
    } finally {
      setIsLoading(false);
    }
  };

  const buildEntryContent = (entry, rootId) => {
    const isFollowUp = !!entry.parentConsultation;
    const fullUrl = isFollowUp
      ? `/patient/consultations/${rootId}/full?followUpId=${entry._id}`
      : `/patient/consultations/${rootId}/full`;

    return (
      <div className={styles.entryContent}>
        <div className={styles.entryCols}>
          <div className={styles.entryCol}>
            <div className={styles.entryColLabel}>DIAGNOSIS</div>
            <div className={styles.entryColValue}>
              {entry.general?.diagnosis || '—'}
            </div>
          </div>
          <div className={styles.entryCol}>
            <div className={styles.entryColLabel}>TREATMENT</div>
            <div className={styles.entryColValue}>
              {entry.management || '—'}
            </div>
          </div>
        </div>
        <div className={styles.viewFullRow}>
          <Link to={fullUrl} className={styles.viewFullBtn}>
            <span className={styles.eyeIcon}>👁</span> View Full Consultation
          </Link>
        </div>
      </div>
    );
  };

  const buildTimelineItems = (root, thread = []) => {
    const rootId = root._id;

    const providerLabel = (entry) => {
      const p = entry.provider;
      if (!p) return 'Unknown Provider';
      const name = p.firstName ? `Dr. ${p.firstName} ${p.lastName}` : 'Unknown Provider';
      const specialty = entry.general?.specialty || '';
      return specialty ? `${name} · ${specialty}` : name;
    };

    const items = [
      {
        id: root._id,
        title: `${formatDate(root.date)}  —  Initial Consultation`,
        subtitle: providerLabel(root),
        badge: (
          <Badge variant={root.status === 'completed' ? 'completed' : 'draft'}>
            {root.status || 'draft'}
          </Badge>
        ),
        content: buildEntryContent(root, rootId),
        defaultExpanded: true,
      },
    ];

    thread.forEach((followUp, idx) => {
      items.push({
        id: followUp._id,
        title: `${formatDate(followUp.date)}  —  Follow-Up #${idx + 1}`,
        subtitle: providerLabel(followUp),
        badge: (
          <Badge variant={followUp.status === 'completed' ? 'completed' : 'draft'}>
            {followUp.status || 'draft'}
          </Badge>
        ),
        content: buildEntryContent(followUp, rootId),
        defaultExpanded: false,
      });
    });

    return items;
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner />
        <p>Loading consultation...</p>
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className={styles.errorContainer}>
        <h2>Consultation Not Found</h2>
        <p>The consultation you're looking for could not be found.</p>
        <Link to="/patient/consultations">
          <Button>Back to Consultations</Button>
        </Link>
      </div>
    );
  }

  const timelineItems = buildTimelineItems(consultation, consultation.thread || []);

  return (
    <div className={styles.threadPage}>
      <Link to="/patient/consultations" className={styles.backLink}>
        ← Back to Consultations
      </Link>

      <div className={styles.timelineArea}>
        <Timeline
          items={timelineItems}
          trailing={consultation.caseStatus !== 'closed' ? 'Next follow-up not yet scheduled' : null}
        />
      </div>
    </div>
  );
};

export default PatientViewConsultation;
