import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import styles from './ConsultationForm.module.css';

// Import tab content components
import GeneralTab from './tabs/GeneralTab';
import VitalsTab from './tabs/VitalsTab';
import MedicationTab from './tabs/MedicationTab';
import ImmunizationTab from './tabs/ImmunizationTab';
import LabResultsTab from './tabs/LabResultsTab';
import RadiologyTab from './tabs/RadiologyTab';
import HospitalTab from './tabs/HospitalTab';
import SurgeryTab from './tabs/SurgeryTab';

// Import common components
import Button from '../../common/Button';
import FileUpload from '../FileUpload/FileUpload';
import FileViewer from '../../common/FileViewer';

// Import validation schemas
import { validationSchema } from './validationSchema';

const ConsultationForm = ({
  initialValues,
  activeTab,
  onTabChange,
  onSaveDraft,
  onSubmit,
  isSaving
}) => {
  const [attachments, setAttachments] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [attachmentErrors, setAttachmentErrors] = useState(null);
  
  // Initialize attachments when component mounts or initialValues change
  React.useEffect(() => {
    if (initialValues.attachments && initialValues.attachments.length > 0) {
      // Separate existing attachments (from server) and new files
      const existing = initialValues.attachments.filter(att => att._id || att.filename);
      const newFiles = initialValues.attachments.filter(att => att instanceof File);
      
      setExistingAttachments(existing);
      setAttachments(newFiles);
    }
  }, [initialValues.attachments]);
  
  // Function to render active tab content
  const renderTabContent = (formik) => {
    const { values, errors, touched, handleChange, handleBlur, setFieldValue } = formik;
    
    switch (activeTab) {
      case 'general':
        return (
          <GeneralTab
            values={values.general}
            errors={errors.general || {}}
            touched={touched.general || {}}
            handleChange={handleChange}
            handleBlur={handleBlur}
            setFieldValue={setFieldValue}
          />
        );
      case 'vitals':
        return (
          <VitalsTab
            values={values.vitals}
            errors={errors.vitals || {}}
            touched={touched.vitals || {}}
            handleChange={handleChange}
            handleBlur={handleBlur}
            setFieldValue={setFieldValue}
          />
        );
      case 'medication':
        return (
          <MedicationTab
            medications={values.medication}
            errors={errors.medication || {}}
            touched={touched.medication || {}}
            setFieldValue={setFieldValue}
          />
        );
      case 'immunization':
        return (
          <ImmunizationTab
            immunizations={values.immunization}
            errors={errors.immunization || {}}
            touched={touched.immunization || {}}
            setFieldValue={setFieldValue}
          />
        );
      case 'labResults':
        return (
          <LabResultsTab
            labResults={values.labResults}
            errors={errors.labResults || {}}
            touched={touched.labResults || {}}
            setFieldValue={setFieldValue}
          />
        );
      case 'radiology':
        return (
          <RadiologyTab
            radiologyReports={values.radiology}
            errors={errors.radiology || {}}
            touched={touched.radiology || {}}
            setFieldValue={setFieldValue}
          />
        );
      case 'hospital':
        return (
          <HospitalTab
            hospitalRecords={values.hospital}
            errors={errors.hospital || {}}
            touched={touched.hospital || {}}
            setFieldValue={setFieldValue}
          />
        );
      case 'surgery':
        return (
          <SurgeryTab
            surgeryRecords={values.surgery}
            errors={errors.surgery || {}}
            touched={touched.surgery || {}}
            setFieldValue={setFieldValue}
          />
        );
      default:
        return null;
    }
  };
  
  // Handle file upload
  const handleFileUpload = (files) => {
    // Validate file types and sizes
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    // Clear previous errors
    setAttachmentErrors(null);
    
    // Check file size and type
    const invalidFiles = Array.from(files).filter(
      file => file.size > maxFileSize || !allowedTypes.includes(file.type)
    );
    
    if (invalidFiles.length > 0) {
      setAttachmentErrors('Some files are invalid. Please ensure all files are under 5MB and are of the allowed types (images, PDFs, DOC, DOCX).');
      return;
    }
    
    // Add files to state
    setAttachments(prev => [...prev, ...Array.from(files)]);
  };
  
  // Remove file from attachments
  const handleRemoveFile = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };
  
  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={(values, { setSubmitting, setErrors }) => {
        try {
          // Add attachments to values - only send new files to be uploaded
          const formData = {
            ...values,
            attachments // Only new files, existing attachments stay on server
          };
          
          onSubmit(formData);
        } catch (error) {
          console.error('Error during form submission:', error);
          setErrors({ submit: error.message });
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {(formik) => (
        <Form className={styles.form}>
          <div className={styles.tabContent}>
            {renderTabContent(formik)}
          </div>
          
          <div className={styles.fileUploadSection}>
            <h3>Attachments</h3>
            <p>Upload any related documents or images for this consultation</p>
            
            <FileUpload
              name="attachments"
              accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx"
              multiple
              onChange={handleFileUpload}
              maxSize={5 * 1024 * 1024} // 5MB
              error={attachmentErrors}
              label="Add Documents or Images"
              helpText="Drag and drop files here, or click to browse (max 5MB per file)"
            />
            
            {(attachments.length > 0 || existingAttachments.length > 0) && (
              <div className={styles.attachmentsList}>
                <h4>Uploaded Files</h4>
                
                {/* Show existing attachments from server */}
                {existingAttachments.length > 0 && (
                  <div className={styles.existingAttachments}>
                    <h5>Existing Attachments</h5>
                    <FileViewer
                      files={existingAttachments.map((file, index) => ({
                        id: file._id || `existing-${index}`,
                        filename: file.filename,
                        originalName: file.originalName || file.filename,
                        size: file.size || 0,
                        mimetype: file.mimetype || file.type || 'application/octet-stream',
                        uploadDate: file.uploadDate || new Date().toISOString()
                      }))}
                      canDelete={false} // Don't allow deletion of existing attachments here
                      showActions={false}
                      emptyMessage="No existing files"
                    />
                  </div>
                )}
                
                {/* Show new files to be uploaded */}
                {attachments.length > 0 && (
                  <div className={styles.newAttachments}>
                    <h5>New Files to Upload</h5>
                    <FileViewer
                      files={attachments.map((file, index) => ({
                        id: `new-${index}`,
                        filename: file.name,
                        originalName: file.name,
                        size: file.size,
                        mimetype: file.type,
                        uploadDate: new Date().toISOString()
                      }))}
                      onDelete={(file) => {
                        const index = parseInt(file.id.split('-')[1]);
                        handleRemoveFile(index);
                      }}
                      canDelete={true}
                      showActions={true}
                      emptyMessage="No new files selected"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className={styles.formActions}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onSaveDraft(formik.values)}
              disabled={isSaving}
              className={styles.saveDraftButton}
            >
              Save Draft
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={isSaving || formik.isSubmitting}
              className={styles.submitButton}
              onClick={() => formik.handleSubmit()}
            >
              Save Consultation
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
};

ConsultationForm.propTypes = {
  initialValues: PropTypes.object.isRequired,
  activeTab: PropTypes.string.isRequired,
  onTabChange: PropTypes.func.isRequired,
  onSaveDraft: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  isSaving: PropTypes.bool
};

export default ConsultationForm; 