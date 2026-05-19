import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import config from '../../config';
import PhysicalRecordService from '../../services/physicalRecord.service';
import styles from './PhysicalRecordsTab.module.css';

const ACCEPTED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const ACCEPTED_EXT = '.pdf,.jpg,.jpeg,.png,.webp';
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
};

const FileIcon = ({ mimetype }) => {
  if (mimetype && mimetype.startsWith('image/')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.iconSvg}>
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21,15 16,10 5,21"/>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.iconSvg}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14,2 14,8 20,8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  );
};

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.uploadIconSvg}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17,8 12,3 7,8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);

const PhysicalRecordsTab = ({ patientId }) => {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const dragCounter = useRef(0);

  const fetchRecords = useCallback(async () => {
    try {
      const data = await PhysicalRecordService.getPhysicalRecords(patientId);
      setRecords(data.records || []);
    } catch {
      toast.error('Failed to load physical records');
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const validateFile = (file) => {
    if (!ACCEPTED_MIME.includes(file.type)) {
      toast.error('Only PDF, JPG, PNG, or WEBP files are allowed');
      return false;
    }
    if (file.size > MAX_SIZE) {
      toast.error('File exceeds 5MB limit');
      return false;
    }
    return true;
  };

  const handleFileSelect = (file) => {
    if (validateFile(file)) {
      setPendingFile(file);
      setDescription('');
    }
  };

  const handleInputChange = (e) => {
    const file = e.target.files[0];
    if (file) handleFileSelect(file);
    e.target.value = '';
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    dragCounter.current++;
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!pendingFile) return;
    setIsUploading(true);
    try {
      await PhysicalRecordService.uploadPhysicalRecord(patientId, {
        file: pendingFile,
        description
      });
      setPendingFile(null);
      setDescription('');
      await fetchRecords();
      toast.success('Record uploaded successfully');
    } catch {
      toast.error('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewFile = (record) => {
    const token = localStorage.getItem(config.tokenKey);
    const baseUrl = config.apiUrl;
    const url = `${baseUrl}/files/physical-records/${record.file.filename}?inline=true${token ? `&token=${token}` : ''}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const providerLabel = (provider) => {
    if (!provider) return 'Provider';
    return `Dr. ${provider.lastName || ''} (Doctor)`.trim();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Physical Records ({records.length})</h2>
        <p className={styles.subtitle}>
          Upload scans or photos of paper records, dockets, and past physical documents to keep this patient's history complete.
        </p>
      </div>

      {/* Drop zone */}
      <div
        className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <UploadIcon />
        <p className={styles.dropZoneText}>Drag &amp; drop a PDF or image here</p>
        <p className={styles.dropZoneHint}>Max 5MB &middot; PDF, JPG, PNG, WEBP</p>
        <div className={styles.dropZoneActions}>
          <button
            type="button"
            className={styles.browseButton}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.btnIcon}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17,8 12,3 7,8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Browse files
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXT}
          className={styles.hiddenInput}
          onChange={handleInputChange}
        />
      </div>

      {/* Upload modal */}
      {pendingFile && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Upload Document</h3>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setPendingFile(null)}
                aria-label="Close upload dialog"
              >
                &times;
              </button>
            </div>

            <div className={styles.fileRow}>
              <div className={styles.fileRowIcon}>
                <FileIcon mimetype={pendingFile.type} />
              </div>
              <div className={styles.fileRowInfo}>
                <span className={styles.fileRowName}>{pendingFile.name}</span>
                <span className={styles.fileRowSize}>{formatFileSize(pendingFile.size)}</span>
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Document type</label>
              <div className={styles.docTypeDisplay}>
                Scanned Record
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Description (optional)</label>
              <textarea
                className={styles.descriptionInput}
                placeholder="Add a short note about this document..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={1000}
              />
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setPendingFile(null)}
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.uploadButton}
                onClick={handleUpload}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Records list */}
      {isLoading ? (
        <div className={styles.loadingState}>Loading records...</div>
      ) : records.length > 0 ? (
        <div className={styles.recordsGrid}>
          {records.map((record) => (
            <div
              key={record.id}
              className={styles.recordCard}
              onClick={() => handleViewFile(record)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleViewFile(record);
                }
              }}
            >
              <div className={styles.cardThumbnail}>
                <FileIcon mimetype={record.file.mimetype} />
              </div>
              <div className={styles.cardBody}>
                <p className={styles.cardFileName}>{record.file.originalName}</p>
                <div className={styles.cardMeta}>
                  <span className={styles.docTypePill}>Scanned Record</span>
                  <span className={styles.cardSize}>{formatFileSize(record.file.size)}</span>
                </div>
                {record.description && (
                  <p className={styles.cardDescription}>{record.description}</p>
                )}
                <p className={styles.cardFooter}>
                  {formatDate(record.uploadDate)} &middot; {providerLabel(record.provider)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default PhysicalRecordsTab;
