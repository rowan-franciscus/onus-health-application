import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './FileUpload.module.css';

/**
 * FileUpload component for uploading files
 */
const FileUpload = ({
  id,
  name,
  accept,
  multiple = false,
  label = 'Upload File',
  helpText = 'Drag and drop your file here, or click to browse',
  onChange,
  disabled = false,
  maxSize,
  error,
  className = '',
  ...props
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateFiles = (fileList) => {
    if (!fileList || fileList.length === 0) return [];
    
    let validFiles = Array.from(fileList);
    
    // Check max size if provided
    if (maxSize) {
      validFiles = validFiles.filter(file => file.size <= maxSize);
    }
    
    return validFiles;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = validateFiles(e.dataTransfer.files);
      setFiles(validFiles);
      handleFiles(validFiles);
    }
  };

  const handleChange = (e) => {
    if (disabled) return;
    
    const validFiles = validateFiles(e.target.files);
    setFiles(validFiles);
    handleFiles(validFiles);
  };

  const handleFiles = (fileList) => {
    if (onChange) {
      // For single file upload, pass the file directly
      if (!multiple && fileList.length > 0) {
        onChange(fileList[0], name);
      } else {
        onChange(fileList, name);
      }
    }
  };

  const handleClick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const renderFileList = () => {
    if (files.length === 0) return null;
    
    return (
      <div className={styles.fileList}>
        {files.map((file, index) => (
          <div key={index} className={styles.fileItem}>
            <span className={styles.fileName}>{file.name}</span>
            <span className={styles.fileSize}>
              {(file.size / 1024).toFixed(2)} KB
            </span>
          </div>
        ))}
      </div>
    );
  };

  const containerClasses = classNames(
    styles.container,
    {
      [styles.dragActive]: dragActive,
      [styles.disabled]: disabled,
      [styles.hasError]: error,
    },
    className
  );

  return (
    <div className={containerClasses}>
      <div 
        className={styles.dropzone}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={inputRef}
          type="file"
          id={id || name}
          name={name}
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className={styles.input}
          disabled={disabled}
          {...props}
        />
        <div className={styles.content}>
          <div className={styles.icon}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          </div>
          <div className={styles.label}>{label}</div>
          <p className={styles.helpText}>{helpText}</p>
          {maxSize && (
            <p className={styles.maxSize}>
              Maximum file size: {(maxSize / (1024 * 1024)).toFixed(2)} MB
            </p>
          )}
        </div>
      </div>
      
      {renderFileList()}
      
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
};

FileUpload.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string.isRequired,
  accept: PropTypes.string,
  multiple: PropTypes.bool,
  label: PropTypes.node,
  helpText: PropTypes.node,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  maxSize: PropTypes.number,
  error: PropTypes.string,
  className: PropTypes.string,
};

export default FileUpload; 