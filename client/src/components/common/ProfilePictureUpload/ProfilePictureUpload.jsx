import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './ProfilePictureUpload.module.css';
import { toast } from 'react-toastify';

/**
 * ProfilePictureUpload component for uploading user profile pictures
 */
const ProfilePictureUpload = ({
  currentImage,
  onUpload,
  onDelete,
  disabled = false,
  className = '',
  size = 'medium',
  shape = 'round',
  placeholder = null
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, or GIF)');
      return;
    }

    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload file
    setIsUploading(true);
    try {
      await onUpload(file);
      toast.success('Profile picture updated successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to upload profile picture');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentImage && !previewUrl) return;

    setIsDeleting(true);
    try {
      await onDelete();
      setPreviewUrl(null);
      toast.success('Profile picture removed successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to remove profile picture');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClick = () => {
    if (disabled || isUploading || isDeleting) return;
    fileInputRef.current?.click();
  };

  const imageUrl = previewUrl || currentImage || placeholder;
  const hasImage = !!(currentImage || previewUrl);

  const containerClasses = classNames(
    styles.container,
    styles[size],
    styles[shape],
    {
      [styles.disabled]: disabled,
      [styles.loading]: isUploading || isDeleting,
      [styles.hasImage]: hasImage
    },
    className
  );

  return (
    <div className={containerClasses}>
      <div className={styles.imageWrapper} onClick={handleClick}>
        {imageUrl && imageUrl !== placeholder ? (
          <img
            src={imageUrl}
            alt="Profile"
            className={styles.image}
          />
        ) : (
          <div className={styles.placeholderContainer}>
            <svg className={styles.placeholderIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="2"/>
              <path d="M16 14C16 12.8954 14.6569 12 13 12H11C9.34315 12 8 12.8954 8 14V18C8 19.1046 8.89543 20 10 20H14C15.1046 20 16 19.1046 16 18V14Z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span className={styles.placeholderText}>No Photo</span>
          </div>
        )}
        
        {(isUploading || isDeleting) && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner} />
          </div>
        )}

        {!isUploading && !isDeleting && (
          <div className={styles.overlay}>
            <div className={styles.overlayContent}>
              <svg className={styles.cameraIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 17C14.2091 17 16 15.2091 16 13C16 10.7909 14.2091 9 12 9C9.79086 9 8 10.7909 8 13C8 15.2091 9.79086 17 12 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className={styles.overlayText}>Change Photo</span>
            </div>
          </div>
        )}
      </div>

      {hasImage && !isUploading && !isDeleting && (
        <button
          type="button"
          className={styles.deleteButton}
          onClick={handleDelete}
          disabled={disabled}
          aria-label="Remove profile picture"
        >
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif"
        onChange={handleFileSelect}
        disabled={disabled || isUploading || isDeleting}
        className={styles.fileInput}
        aria-label="Upload profile picture"
      />
    </div>
  );
};

ProfilePictureUpload.propTypes = {
  currentImage: PropTypes.string,
  onUpload: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  shape: PropTypes.oneOf(['round', 'square']),
  placeholder: PropTypes.string
};

export default ProfilePictureUpload; 