import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './ViewConsultation.module.css';
import ApiService from '../../services/api.service';
import ConsultationService from '../../services/consultation.service';
import { formatDate } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';

import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Badge from '../../components/common/Badge/Badge';
import Timeline from '../../components/common/Timeline/Timeline';

const ViewConsultation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [consultation, setConsultation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);

  useEffect(() => {
    fetchConsultationData();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchConsultationData = async () => {
    setIsLoading(true);
    try {
      const response = await ApiService.get(`/consultations/${id}`);
      if (response) {
        setConsultation(response);
      }
    } catch (error) {
      console.error('Error fetching consultation:', error);
      toast.error('Failed to load consultation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseCase = async () => {
    if (!window.confirm('Are you sure you want to close this case? No further follow-ups can be added until it is reopened.')) return;
    setIsActing(true);
    try {
      const updated = await ConsultationService.closeCase(consultation._id);
      setConsultation(updated);
      toast.success('Case closed successfully');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to close case');
    } finally {
      setIsActing(false);
    }
  };

  const handleReopenCase = async () => {
    setIsActing(true);
    try {
      const updated = await ConsultationService.reopenCase(consultation._id);
      setConsultation(updated);
      toast.success('Case reopened successfully');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to reopen case');
    } finally {
      setIsActing(false);
    }
  };

  const handleAddFollowUp = () => {
    navigate(`/provider/consultations/${consultation._id}/follow-ups/new`);
  };

  const buildEntryContent = (entry) => (
    <div className={styles.threadEntryContent}>
      <div className={styles.threadCols}>
        <div className={styles.threadCol}>
          <div className={styles.threadColLabel}>DIAGNOSIS</div>
          <div className={styles.threadColValue}>{entry.general?.diagnosis || '—'}</div>
        </div>
        <div className={styles.threadCol}>
          <div className={styles.threadColLabel}>TREATMENT</div>
          <div className={styles.threadColValue}>{entry.management || '—'}</div>
        </div>
      </div>
      <div className={styles.viewFullLink}>
        <Link to={`/provider/consultations/${id}/full${entry.parentConsultation ? `?followUpId=${entry._id}` : ''}`}>
          <Button variant="tertiary" size="small">👁 View Full Consultation</Button>
        </Link>
      </div>
    </div>
  );

  const buildTimelineItems = (root, thread) => {
    const items = [];

    // Initial consultation entry (expanded by default)
    items.push({
      id: root._id,
      title: `${formatDate(root.date)}  —  Initial Consultation`,
      subtitle: `${root.provider?.firstName ? `Dr. ${root.provider.firstName} ${root.provider.lastName}` : 'Unknown Provider'} · ${root.general?.specialty || ''}`,
      badge: <Badge variant={root.status === 'completed' ? 'completed' : 'draft'}>{root.status || 'draft'}</Badge>,
      content: buildEntryContent(root),
      defaultExpanded: true
    });

    // Follow-up entries
    (thread || []).forEach((followUp, index) => {
      items.push({
        id: followUp._id,
        title: `${formatDate(followUp.date)}  —  Follow-Up #${index + 1}`,
        subtitle: `${followUp.provider?.firstName ? `Dr. ${followUp.provider.firstName} ${followUp.provider.lastName}` : 'Unknown Provider'} · ${followUp.general?.specialty || ''}`,
        badge: <Badge variant={followUp.status === 'completed' ? 'completed' : 'draft'}>{followUp.status || 'draft'}</Badge>,
        content: buildEntryContent(followUp),
        defaultExpanded: false
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
        <Link to="/provider/consultations">
          <Button>Back to Consultations</Button>
        </Link>
      </div>
    );
  }

  const isAssignedProvider = consultation.provider?._id === user?.id;
  const isClosed = consultation.caseStatus === 'closed';
  const timelineItems = buildTimelineItems(consultation, consultation.thread);

  return (
    <div className={styles.viewContainer}>
      <div className={styles.threadHeader}>
        <Link to="/provider/consultations" className={styles.backLink}>
          &larr; Back to Consultations
        </Link>
      </div>

      <div className={styles.timelineWrapper}>
        <Timeline
          items={timelineItems}
          trailing={!isClosed ? 'Next follow-up not yet scheduled' : null}
        />
      </div>

      {isAssignedProvider && (
        <div className={styles.threadActions}>
          {isClosed ? (
            <Button
              variant="secondary"
              onClick={handleReopenCase}
              disabled={isActing}
            >
              ↺ Reopen Case
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={handleCloseCase}
              disabled={isActing}
              className={styles.closeButton}
            >
              ✕ Close Case
            </Button>
          )}

          {!isClosed && (
            <Button
              variant="primary"
              onClick={handleAddFollowUp}
              disabled={isActing}
            >
              + Add Follow-Up
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ViewConsultation;
