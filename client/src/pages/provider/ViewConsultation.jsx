import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import styles from "./ViewConsultation.module.css";
import ApiService from "../../services/api.service";
import ConsultationService from "../../services/consultation.service";
import { formatDate } from "../../utils/dateUtils";
import { useAuth } from "../../contexts/AuthContext";

import Button from "../../components/common/Button";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Badge from "../../components/common/Badge/Badge";
import Timeline from "../../components/common/Timeline/Timeline";

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
      if (response) setConsultation(response);
    } catch (error) {
      console.error("Error fetching consultation:", error);
      toast.error("Failed to load consultation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseCase = async () => {
    setIsActing(true);
    try {
      const updated = await ConsultationService.closeCase(consultation._id);
      setConsultation(updated);
      toast.success("Case closed successfully");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to close case");
    } finally {
      setIsActing(false);
    }
  };

  const handleReopenCase = async () => {
    setIsActing(true);
    try {
      const updated = await ConsultationService.reopenCase(consultation._id);
      setConsultation(updated);
      toast.success("Case reopened successfully");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to reopen case");
    } finally {
      setIsActing(false);
    }
  };

  const handleAddFollowUp = () => {
    navigate(`/provider/consultations/${consultation._id}/follow-ups/new`);
  };

  /* Build the expandable content for a single thread entry */
  const buildEntryContent = (entry, rootId) => {
    const isFollowUp = !!entry.parentConsultation;
    const fullUrl = isFollowUp
      ? `/provider/consultations/${rootId}/full?followUpId=${entry._id}`
      : `/provider/consultations/${rootId}/full`;

    return (
      <div className={styles.entryContent}>
        <div className={styles.entryCols}>
          <div className={styles.entryCol}>
            <div className={styles.entryColLabel}>DIAGNOSIS</div>
            <div className={styles.entryColValue}>
              {entry.general?.diagnosis || "—"}
            </div>
          </div>
          <div className={styles.entryCol}>
            <div className={styles.entryColLabel}>TREATMENT</div>
            <div className={styles.entryColValue}>
              {entry.management || "—"}
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

  /* Convert root + thread into Timeline items */
  const buildTimelineItems = (root, thread = []) => {
    const rootId = root._id;

    const providerLabel = (entry) => {
      const p = entry.provider;
      if (!p) return "Unknown Provider";
      const name = p.firstName
        ? `Dr. ${p.firstName} ${p.lastName}`
        : "Unknown Provider";
      const specialty = entry.general?.specialty || "";
      return specialty ? `${name} · ${specialty}` : name;
    };

    const items = [
      {
        id: root._id,
        title: `${formatDate(root.date)}  —  Initial Consultation`,
        subtitle: providerLabel(root),
        badge: (
          <Badge variant={root.status === "completed" ? "completed" : "draft"}>
            {root.status || "draft"}
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
          <Badge
            variant={followUp.status === "completed" ? "completed" : "draft"}
          >
            {followUp.status || "draft"}
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
        <Link to="/provider/consultations">
          <Button>Back to Consultations</Button>
        </Link>
      </div>
    );
  }

  const isAssignedProvider = consultation.provider?._id === user?.id;
  const isClosed = consultation.caseStatus === "closed";
  const timelineItems = buildTimelineItems(
    consultation,
    consultation.thread || [],
  );

  return (
    <div className={styles.threadPage}>
      {/* Back link */}
      <Link to="/provider/consultations" className={styles.backLink}>
        ← Back to Consultations
      </Link>

      {/* Timeline */}
      <div className={styles.timelineArea}>
        <Timeline
          items={timelineItems}
          trailing={!isClosed ? "Next follow-up not yet scheduled" : null}
        />
      </div>

      {/* Action bar */}
      {isAssignedProvider && (
        <div className={styles.actionBar}>
          <div className={styles.actionBarLeft}>
            {isClosed ? (
              <button
                className={styles.reopenBtn}
                onClick={handleReopenCase}
                disabled={isActing}
              >
                ↺ Reopen Case
              </button>
            ) : (
              <button
                className={styles.closeBtn}
                onClick={handleCloseCase}
                disabled={isActing}
              >
                ✕ Close Case
              </button>
            )}
          </div>

          {!isClosed && (
            <button
              className={styles.addFollowUpBtn}
              onClick={handleAddFollowUp}
              disabled={isActing}
            >
              + Add Follow-Up
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ViewConsultation;
