import React, { useRef } from 'react';
import styles from './ConsentFormUpload.module.css';

// Mirrors server/middleware/upload.middleware.js (the server re-checks both)
export const CONSENT_FORM_MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'application/pdf'];
const HEIF_EXT = /\.(heic|heif)$/i;
// image/* offers the camera on phones; PDFs cover scans
const ACCEPT = 'image/*,application/pdf,.heic,.heif';

export const EMAIL_OR_FORM_REQUIRED = "Enter the patient's email address or attach their signed consent form.";

const formatFileSize = (bytes) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Some browsers report no type for HEIC photos; go by the extension
const normalise = (file) => {
  if (!file.type && HEIF_EXT.test(file.name)) {
    return new File([file], file.name, { type: 'image/heic', lastModified: file.lastModified });
  }
  return file;
};

/** Error message for a chosen file, or null. */
export const consentFormFileError = (file) => {
  if (!file) return null;
  if (!ACCEPTED_TYPES.includes(normalise(file).type)) {
    return 'Please attach a photo (JPEG, PNG or HEIC) or a PDF of the signed form.';
  }
  if (file.size > CONSENT_FORM_MAX_SIZE) return 'The file is too large. The maximum size is 10 MB.';
  if (file.size === 0) return 'The file is empty.';
  return null;
};

/** Error for the consent form field: a bad file, or neither an email nor a form. */
export const consentFormFieldError = (email, file) => {
  const fileError = consentFormFileError(file);
  if (fileError) return fileError;
  if (!email.trim() && !file) return EMAIL_OR_FORM_REQUIRED;
  return null;
};

/**
 * Add Patient payload: plain JSON as before, or multipart when a signed
 * consent form is attached. Empty values are left out either way.
 */
export const buildPatientPayload = (fields, consentForm) => {
  if (!consentForm) return fields;
  const data = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') data.append(key, value);
  });
  data.append('consentForm', normalise(consentForm));
  return data;
};

/**
 * "Patient doesn't have an email?" attachment for a signed paper consent
 * form. The parent owns the file and the error message.
 */
const ConsentFormUpload = ({ file, onChange, error, disabled }) => {
  const inputRef = useRef(null);

  const handleSelect = (e) => {
    const selected = e.target.files && e.target.files[0];
    // Allow choosing the same file again after removing it
    e.target.value = '';
    if (selected) onChange(selected);
  };

  return (
    <div className={styles.wrapper}>
      <label htmlFor="consentForm" className={styles.label}>
        Signed consent form
      </label>
      <p className={styles.help} id="consentFormHelp">
        Patient doesn&apos;t have an email? Attach a photo or scan of their signed consent form instead.
        They will be marked as consented straight away and no consent email is sent.
      </p>

      {file ? (
        <div className={`${styles.selected} ${error ? styles.hasError : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.fileIcon} aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14,2 14,8 20,8" />
          </svg>
          <div className={styles.fileInfo}>
            <span className={styles.fileName}>{file.name}</span>
            <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
          </div>
          <button
            type="button"
            className={styles.removeButton}
            onClick={() => onChange(null)}
            disabled={disabled}
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={`${styles.dropButton} ${error ? styles.hasError : ''}`}
          onClick={() => inputRef.current && inputRef.current.click()}
          disabled={disabled}
          aria-describedby="consentFormHelp"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={styles.uploadIcon} aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17,8 12,3 7,8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span>Attach consent form</span>
          <span className={styles.hint}>Photo or PDF, up to 10 MB</span>
        </button>
      )}

      <input
        ref={inputRef}
        id="consentForm"
        type="file"
        accept={ACCEPT}
        onChange={handleSelect}
        className={styles.hiddenInput}
        disabled={disabled}
      />
      {error && <div className={styles.error} role="alert">{error}</div>}
    </div>
  );
};

export default ConsentFormUpload;
