import React, { useState } from 'react';
import FileUpload from '../../components/forms/FileUpload';
import FileViewer from '../../components/common/FileViewer';
import Button from '../../components/common/Button';
import FileService from '../../services/file.service';
import styles from './FileUploadDemo.module.css';

const FileUploadDemo = () => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);
    
    try {
      // Convert FileList to Array if needed
      const fileArray = Array.isArray(files) ? files : [files];
      
      // Validate files
      const validFiles = [];
      for (const file of fileArray) {
        const validation = FileService.validateFile(file);
        if (validation.isValid) {
          validFiles.push(file);
        } else {
          console.error('File validation failed:', validation.errors);
          setError(`File "${file.name}" validation failed: ${validation.errors.join(', ')}`);
          return;
        }
      }

      // Simulate upload for demo purposes
      // In a real application, you would upload to your consultation endpoint
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        
        // Simulate progress
        for (let progress = 0; progress <= 100; progress += 10) {
          setUploadProgress(progress);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Add to uploaded files list with mock data
        const mockFileData = {
          id: Date.now() + i,
          filename: `uploaded_${Date.now()}_${file.name}`,
          originalName: file.name,
          size: file.size,
          mimetype: file.type,
          uploadDate: new Date().toISOString(),
          viewUrl: FileService.getFileUrls('consultations', `mock_${file.name}`).viewUrl,
          downloadUrl: FileService.getFileUrls('consultations', `mock_${file.name}`).downloadUrl
        };
        
        setUploadedFiles(prev => [...prev, mockFileData]);
      }
      
      setUploadProgress(0);
    } catch (error) {
      console.error('Upload failed:', error);
      setError(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileView = (file) => {
    // For demo purposes, show an alert
    // In a real app, this would open the file viewer
    alert(`Viewing file: ${file.originalName}\nURL: ${file.viewUrl}`);
  };

  const handleFileDownload = (file) => {
    // For demo purposes, show an alert
    // In a real app, this would download the file
    alert(`Downloading file: ${file.originalName}\nSize: ${FileService.formatFileSize(file.size)}`);
  };

  const handleFileDelete = (file) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== file.id));
  };

  const clearAllFiles = () => {
    setUploadedFiles([]);
    setError(null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>File Upload Demo</h1>
        <p>This page demonstrates the file upload functionality for the Onus Health application.</p>
      </div>

      <div className={styles.section}>
        <h2>Upload Files</h2>
        <FileUpload
          name="demoFiles"
          accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx"
          multiple={true}
          label="Upload Documents or Images"
          helpText="Drag and drop files here, or click to browse. Multiple files supported."
          maxSize={5 * 1024 * 1024} // 5MB
          onChange={handleFileUpload}
          disabled={isUploading}
          error={error}
        />
        
        {isUploading && (
          <div className={styles.progressContainer}>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill} 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className={styles.progressText}>{uploadProgress}%</span>
          </div>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Uploaded Files ({uploadedFiles.length})</h2>
          {uploadedFiles.length > 0 && (
            <Button
              variant="secondary"
              size="small"
              onClick={clearAllFiles}
            >
              Clear All
            </Button>
          )}
        </div>
        
        <FileViewer
          files={uploadedFiles}
          onView={handleFileView}
          onDownload={handleFileDownload}
          onDelete={handleFileDelete}
          showActions={true}
          canDelete={true}
          emptyMessage="No files uploaded yet. Use the upload area above to add files."
        />
      </div>

      <div className={styles.section}>
        <h2>Features Demonstrated</h2>
        <ul className={styles.featureList}>
          <li>✅ File upload with drag and drop support</li>
          <li>✅ Multiple file selection</li>
          <li>✅ File type validation (images, PDFs, documents)</li>
          <li>✅ File size validation (max 5MB)</li>
          <li>✅ Upload progress indication</li>
          <li>✅ File listing with metadata</li>
          <li>✅ File icons based on type</li>
          <li>✅ View, download, and delete actions</li>
          <li>✅ Responsive design</li>
          <li>✅ Error handling and validation</li>
        </ul>
      </div>

      <div className={styles.section}>
        <h2>Integration Points</h2>
        <div className={styles.integrationInfo}>
          <div className={styles.integrationItem}>
            <h3>Provider Onboarding</h3>
            <p>License upload functionality is integrated into the professional information step.</p>
          </div>
          <div className={styles.integrationItem}>
            <h3>Consultation Attachments</h3>
            <p>File upload is available when creating or editing consultations.</p>
          </div>
          <div className={styles.integrationItem}>
            <h3>Secure File Access</h3>
            <p>All files are protected by authentication and role-based permissions.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploadDemo; 