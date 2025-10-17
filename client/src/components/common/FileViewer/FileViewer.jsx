import React, { useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import Button from '../Button';
import { formatDate } from '../../../utils/dateUtils';
import styles from './FileViewer.module.css';

const FileViewer = ({
  files = [],
  onView,
  onDownload,
  onDelete,
  showActions = true,
  canDelete = false,
  className = '',
  emptyMessage = 'No files attached'
}) => {
  const [viewingFile, setViewingFile] = useState(null);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimetype) => {
    // Handle undefined or null mimetype
    if (!mimetype || typeof mimetype !== 'string') {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2Z"/>
          <polyline points="14,2 14,8 20,8"/>
        </svg>
      );
    }

    if (mimetype.startsWith('image/')) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21,15 16,10 5,21"/>
        </svg>
      );
    } else if (mimetype === 'application/pdf') {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2Z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10,9 9,9 8,9"/>
        </svg>
      );
    } else if (mimetype.includes('word') || mimetype.includes('document')) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2Z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      );
    } else {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2Z"/>
          <polyline points="14,2 14,8 20,8"/>
        </svg>
      );
    }
  };

  const canPreview = (mimetype) => {
    if (!mimetype || typeof mimetype !== 'string') {
      return false;
    }
    return mimetype.startsWith('image/') || mimetype === 'application/pdf';
  };

  const handleView = (file) => {
    if (onView) {
      onView(file);
    } else {
      // Don't use file.viewUrl directly as it might be a relative URL
      // that gets intercepted by React Router
      console.warn('No onView handler provided for FileViewer');
    }
  };

  const handleDownload = (file) => {
    if (onDownload) {
      onDownload(file);
    } else {
      // Don't use file.downloadUrl directly as it might be a relative URL
      console.warn('No onDownload handler provided for FileViewer');
    }
  };

  const handleDelete = (file) => {
    if (onDelete && window.confirm(`Are you sure you want to delete "${file.originalName || file.filename}"?`)) {
      onDelete(file);
    }
  };

  if (files.length === 0) {
    return (
      <div className={classNames(styles.container, styles.empty, className)}>
        <div className={styles.emptyIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
            <polyline points="13,2 13,9 20,9"/>
          </svg>
        </div>
        <p className={styles.emptyMessage}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={classNames(styles.container, className)}>
      <div className={styles.fileList}>
        {files.map((file, index) => (
          <div key={file.id || index} className={styles.fileItem}>
            <div className={styles.fileIcon}>
              {getFileIcon(file.mimetype)}
            </div>
            
            <div className={styles.fileInfo}>
              <div className={styles.fileName} title={file.originalName || file.filename}>
                {file.originalName || file.filename}
              </div>
              <div className={styles.fileMeta}>
                <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
                {file.uploadDate && (
                  <span className={styles.fileDate}>
                    {formatDate(file.uploadDate)}
                  </span>
                )}
              </div>
            </div>
            
            {showActions && (
              <div className={styles.fileActions}>
                {canPreview(file.mimetype) && (
                  <Button
                    variant="tertiary"
                    size="small"
                    onClick={() => handleView(file)}
                    className={styles.actionButton}
                    title="View file"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </Button>
                )}
                
                <Button
                  variant="tertiary"
                  size="small"
                  onClick={() => handleDownload(file)}
                  className={styles.actionButton}
                  title="Download file"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </Button>
                
                {canDelete && (
                  <Button
                    variant="tertiary"
                    size="small"
                    onClick={() => handleDelete(file)}
                    className={classNames(styles.actionButton, styles.deleteButton)}
                    title="Delete file"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3,6 5,6 21,6"/>
                      <path d="M19,6V20A2,2 0 0,1 17,22H7A2,2 0 0,1 5,20V6M8,6V4A2,2 0 0,1 10,2H14A2,2 0 0,1 16,4V6"/>
                      <line x1="10" y1="11" x2="10" y2="17"/>
                      <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

FileViewer.propTypes = {
  files: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    filename: PropTypes.string.isRequired,
    originalName: PropTypes.string,
    size: PropTypes.number,
    mimetype: PropTypes.string,
    uploadDate: PropTypes.string,
    viewUrl: PropTypes.string,
    downloadUrl: PropTypes.string
  })),
  onView: PropTypes.func,
  onDownload: PropTypes.func,
  onDelete: PropTypes.func,
  showActions: PropTypes.bool,
  canDelete: PropTypes.bool,
  className: PropTypes.string,
  emptyMessage: PropTypes.string
};

export default FileViewer; 