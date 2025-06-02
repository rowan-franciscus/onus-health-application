import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import adminService from '../../services/admin.service';
import styles from './ViewProviderRequest.module.css';
import Button from '../../components/common/Button';
import Textarea from '../../components/common/Textarea';

const ViewProviderRequest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notes, setNotes] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    const fetchProvider = async () => {
      try {
        setLoading(true);
        console.log('Fetching provider request details for ID:', id);
        const response = await adminService.getUserById(id);
        
        if (!response) {
          setError('Failed to get response from server');
          setLoading(false);
          return;
        }
        
        // The API might return either response.user or the user directly
        const providerData = response.user || response;
        console.log('Provider request data received:', providerData);
        
        if (!providerData) {
          setError('Provider data not found in response');
          setLoading(false);
          return;
        }
        
        setProvider(providerData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching provider request details:', err);
        setError('Failed to load provider details: ' + (err.message || 'Unknown error'));
        setLoading(false);
      }
    };

    fetchProvider();
  }, [id]);

  const handleApprove = async () => {
    try {
      setProcessingAction(true);
      console.log('Approving provider verification for ID:', id);
      await adminService.processProviderVerification(id, 'approve', notes);
      navigate('/admin/health-providers', { 
        state: { success: 'Provider verification approved successfully' } 
      });
    } catch (err) {
      console.error('Failed to approve provider:', err);
      setError('Failed to approve provider: ' + (err.message || 'Unknown error'));
      setProcessingAction(false);
    }
  };

  const handleReject = async () => {
    try {
      setProcessingAction(true);
      console.log('Rejecting provider verification for ID:', id);
      await adminService.processProviderVerification(id, 'reject', notes);
      navigate('/admin/health-providers', { 
        state: { success: 'Provider verification rejected' } 
      });
    } catch (err) {
      console.error('Failed to reject provider:', err);
      setError('Failed to reject provider: ' + (err.message || 'Unknown error'));
      setProcessingAction(false);
    }
  };

  if (loading) {
    return <div className={styles.loadingContainer}>Loading provider details...</div>;
  }

  if (error) {
    return <div className={styles.errorContainer}>{error}</div>;
  }

  if (!provider) {
    return <div className={styles.errorContainer}>Provider not found</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link to="/admin/health-providers" className={styles.backLink}>
          ← Back to All Health Care Providers
        </Link>
        <div className={styles.actions}>
          <Button 
            variant="primary" 
            onClick={handleApprove}
            disabled={processingAction}
            className={styles.approveButton}
          >
            Approve
          </Button>
          <Button 
            variant="secondary" 
            onClick={handleReject}
            disabled={processingAction}
            className={styles.rejectButton}
          >
            Reject
          </Button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Professional Information</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.label}>Title:</span>
              <span className={styles.value}>{provider.title || '-'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>First Name:</span>
              <span className={styles.value}>{provider.firstName || '-'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>Last Name:</span>
              <span className={styles.value}>{provider.lastName || '-'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>Specialty:</span>
              <span className={styles.value}>{provider.providerProfile?.specialty || '-'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>Years of Experience in Practice:</span>
              <span className={styles.value}>{provider.providerProfile?.yearsOfExperience || '-'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>Practice License:</span>
              <span className={styles.value}>{provider.providerProfile?.practiceLicense || '-'}</span>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Practice Information</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.label}>Practice or Clinic Name:</span>
              <span className={styles.value}>{provider.providerProfile?.practiceInfo?.name || '-'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>Primary Practice Location:</span>
              <span className={styles.value}>{provider.providerProfile?.practiceInfo?.location || '-'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>Phone Number:</span>
              <span className={styles.value}>{provider.providerProfile?.practiceInfo?.phone || '-'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>Email:</span>
              <span className={styles.value}>{provider.email || '-'}</span>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Patient Management Details</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.label}>Average number of patients managed per week:</span>
              <span className={styles.value}>
                {provider.providerProfile?.patientManagement?.averagePatients || '-'}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>Do you currently collaborate with other specialists or departments?</span>
              <span className={styles.value}>
                {provider.providerProfile?.patientManagement?.collaboratesWithOthers === true ? 'Yes' :
                 provider.providerProfile?.patientManagement?.collaboration === true ? 'Yes' :
                 provider.providerProfile?.patientManagement?.collaboration === 'true' ? 'Yes' :
                 provider.providerProfile?.patientManagement?.collaboration === 'Yes' ? 'Yes' :
                 'No'}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Data & Access Preferences</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.label}>What patient information is most critical for your decision making?</span>
              <span className={styles.value}>
                {Array.isArray(provider.providerProfile?.dataPreferences?.criticalInformation) 
                  ? provider.providerProfile?.dataPreferences?.criticalInformation.join(', ') 
                  : provider.providerProfile?.dataPreferences?.criticalInfo || '-'}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>Do you require access to historical data trends?</span>
              <span className={styles.value}>
                {provider.providerProfile?.dataPreferences?.requiresHistoricalData ? 'Yes' : 
                 provider.providerProfile?.dataPreferences?.historicalData === 'true' ? 'Yes' : 
                 provider.providerProfile?.dataPreferences?.historicalData === true ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Data Sharing & Privacy Practices</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.label}>Are there specific data security or privacy practices you need to adhere to?</span>
              <span className={styles.value}>
                {provider.providerProfile?.dataPrivacyPractices || 
                 provider.providerProfile?.privacyPractices || '-'}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Support & Communication</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.label}>How would you prefer to receive technical support?</span>
              <span className={styles.value}>
                {provider.providerProfile?.supportPreferences?.technicalSupportPreference || 
                 provider.providerProfile?.communication?.supportPreference || '-'}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>Would you require training on how to use the Onus platform?</span>
              <span className={styles.value}>
                {(provider.providerProfile?.supportPreferences?.requiresTraining === true || 
                  provider.providerProfile?.communication?.trainingRequired === true || 
                  provider.providerProfile?.communication?.trainingRequired === 'Yes') 
                  ? 'Yes' : 'No'}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>How would you like to receive updates about new features or platform changes?</span>
              <span className={styles.value}>
                {provider.providerProfile?.supportPreferences?.updatePreference || 
                 provider.providerProfile?.communication?.updatePreference || '-'}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Admin Notes</h2>
          <Textarea
            placeholder="Add notes about this verification request (optional)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className={styles.notesTextarea}
          />
        </div>

        <div className={styles.buttonContainer}>
          <Button 
            variant="primary" 
            onClick={handleApprove}
            disabled={processingAction}
            className={styles.approveButton}
          >
            Approve
          </Button>
          <Button 
            variant="secondary" 
            onClick={handleReject}
            disabled={processingAction}
            className={styles.rejectButton}
          >
            Reject
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ViewProviderRequest; 