import React, { useState, useEffect } from 'react';
import styles from './Connections.module.css';

// Component imports
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import SearchBox from '../../components/common/SearchBox';
import ProviderSearch from '../../components/patient/ProviderSearch';
import ProviderPermissions from '../../components/patient/ProviderPermissions';
import { toast } from 'react-toastify';
import ConnectionService from '../../services/connection.service';

// Icon imports
import { IoCheckmarkCircle, IoCloseCircle } from 'react-icons/io5';
import { RiUserSettingsLine } from 'react-icons/ri';

const PatientConnections = () => {
  const [connectionRequests, setConnectionRequests] = useState([]);
  const [connectedProviders, setConnectedProviders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({ id: null, action: null });
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  // Fetch connections data
  const fetchConnectionsData = async () => {
    setIsLoading(true);
    
    try {
      // Get pending full access requests
      const pendingRequests = await ConnectionService.getPatientConnectionRequests();
      
      // Get all connections (both limited and full access)
      const allConnections = await ConnectionService.getConnections();
      
      // Ensure we have arrays, even if the service returns unexpected data
      const pendingArray = Array.isArray(pendingRequests) ? pendingRequests : [];
      const connectionsArray = Array.isArray(allConnections) ? allConnections : [];
      
      setConnectionRequests(pendingArray);
      setFilteredRequests(pendingArray);
      setConnectedProviders(connectionsArray);
      setFilteredProviders(connectionsArray);
    } catch (error) {
      console.error('Error fetching connections data:', error);
      toast.error('Failed to load connection data. Please refresh the page.');
      // Set empty arrays to prevent undefined errors
      setConnectionRequests([]);
      setFilteredRequests([]);
      setConnectedProviders([]);
      setFilteredProviders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConnectionsData();
  }, []);

  // Handle search input
  const handleSearch = (value) => {
    setSearchTerm(value);
    
    if (!value.trim()) {
      setFilteredRequests(connectionRequests || []);
      setFilteredProviders(connectedProviders || []);
      return;
    }
    
    const lowercasedTerm = value.toLowerCase();
    
    // Filter connection requests - safely handle potentially undefined values
    const filteredReqs = Array.isArray(connectionRequests) ? connectionRequests.filter(
      (request) => {
        if (!request) return false;
        
        const name = request.name || '';
        const specialty = request.specialty || '';
        const practice = request.practice || '';
        
        return name.toLowerCase().includes(lowercasedTerm) ||
               specialty.toLowerCase().includes(lowercasedTerm) ||
               practice.toLowerCase().includes(lowercasedTerm);
      }
    ) : [];
    
    // Filter connected providers - safely handle potentially undefined values
    const filteredProvs = Array.isArray(connectedProviders) ? connectedProviders.filter(
      (connection) => {
        if (!connection || !connection.provider) return false;
        
        const firstName = connection.provider.firstName || '';
        const lastName = connection.provider.lastName || '';
        const specialty = connection.provider.providerProfile?.specialty || '';
        const practiceName = connection.provider.providerProfile?.practiceInfo?.name || '';
        
        return firstName.toLowerCase().includes(lowercasedTerm) ||
               lastName.toLowerCase().includes(lowercasedTerm) ||
               specialty.toLowerCase().includes(lowercasedTerm) ||
               practiceName.toLowerCase().includes(lowercasedTerm);
      }
    ) : [];
    
    setFilteredRequests(filteredReqs);
    setFilteredProviders(filteredProvs);
  };

  // Handle approve full access request
  const handleApproveRequest = async (requestId) => {
    setActionLoading({ id: requestId, action: 'approve' });
    
    try {
      await ConnectionService.respondToConnectionRequest(requestId, 'approve');
      
      // Refresh connections data
      await fetchConnectionsData();
      toast.success('Full access request approved');
    } catch (error) {
      console.error('Error approving connection request:', error);
      toast.error('Failed to approve request. Please try again.');
    } finally {
      setActionLoading({ id: null, action: null });
    }
  };

  // Handle deny full access request
  const handleDenyRequest = async (requestId) => {
    setActionLoading({ id: requestId, action: 'deny' });
    
    try {
      await ConnectionService.respondToConnectionRequest(requestId, 'deny');
      
      // Refresh connections data
      await fetchConnectionsData();
      toast.success('Full access request denied');
    } catch (error) {
      console.error('Error denying connection request:', error);
      toast.error('Failed to deny request. Please try again.');
    } finally {
      setActionLoading({ id: null, action: null });
    }
  };

  // Handle revoke provider access
  const handleRevokeProvider = async (connectionId) => {
    setActionLoading({ id: connectionId, action: 'revoke' });
    
    try {
      await ConnectionService.revokeConnection(connectionId);
      
      // Refresh connections data
      await fetchConnectionsData();
      toast.success('Provider access revoked');
    } catch (error) {
      console.error('Error revoking provider access:', error);
      toast.error('Failed to revoke access. Please try again.');
    } finally {
      setActionLoading({ id: null, action: null });
    }
  };

  // Handle opening permissions modal
  const handleManagePermissions = (connection) => {
    if (!connection) return;
    setSelectedConnection(connection);
    setShowPermissionsModal(true);
    setShowOverlay(true);
  };

  // Handle closing permissions modal
  const handleClosePermissionsModal = () => {
    setShowPermissionsModal(false);
    setShowOverlay(false);
    setSelectedConnection(null);
  };

  // Format date to readable string
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  // Get access level display text
  const getAccessLevelDisplay = (connection) => {
    if (!connection) return 'Unknown';
    return connection.accessLevel === 'full' ? 'Full Access' : 'Limited Access';
  };

  // Get access level badge class
  const getAccessLevelBadgeClass = (connection) => {
    if (!connection) return styles.limitedBadge;
    return connection.accessLevel === 'full' ? styles.fullBadge : styles.limitedBadge;
  };

  return (
    <>
      <div className={styles.connectionsContainer}>
        <div className={styles.header}>
          <h1>Connections</h1>
          <p>Manage your healthcare provider connections and access requests</p>
        </div>
        
        <div className={styles.searchContainer}>
          <SearchBox
            placeholder="Search providers by name, specialty, or practice..."
            value={searchTerm}
            onChange={handleSearch}
            className={styles.searchBox}
          />
        </div>
        
        {/* Provider Search Section */}
        <ProviderSearch />
        
        {/* Full Access Requests */}
        <Card className={styles.connectionsSection}>
          <h2>Full Access Requests</h2>
          <p className={styles.sectionDescription}>
            Healthcare providers requesting full access to all your medical data
          </p>
          
          {isLoading ? (
            <div className={styles.loading}>Loading access requests...</div>
          ) : Array.isArray(filteredRequests) && filteredRequests.length > 0 ? (
            <div className={styles.connectionsList}>
              {filteredRequests.map((request) => (
                request && request.id ? (
                  <div key={request.id} className={styles.connectionItem}>
                    <div className={styles.providerInfo}>
                      <h3>{request.name || 'Unknown Provider'}</h3>
                      <p>Specialty: {request.specialty || 'Not specified'}</p>
                      <p>Practice: {request.practice || 'Not specified'}</p>
                      <p>Request Date: {formatDate(request.requestDate)}</p>
                      <p>Current Access: {request.currentAccess || 'Limited Access'}</p>
                      {request.notes && <p>Notes: {request.notes}</p>}
                    </div>
                    <div className={styles.connectionActions}>
                      <Button
                        onClick={() => handleApproveRequest(request.id)}
                        className={styles.acceptButton}
                        disabled={actionLoading.id === request.id}
                        icon={<IoCheckmarkCircle />}
                      >
                        {actionLoading.id === request.id && actionLoading.action === 'approve'
                          ? 'Approving...'
                          : 'Approve'}
                      </Button>
                      <Button
                        onClick={() => handleDenyRequest(request.id)}
                        variant="secondary"
                        className={styles.rejectButton}
                        disabled={actionLoading.id === request.id}
                        icon={<IoCloseCircle />}
                      >
                        {actionLoading.id === request.id && actionLoading.action === 'deny'
                          ? 'Denying...'
                          : 'Deny'}
                      </Button>
                    </div>
                  </div>
                ) : null
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>No pending full access requests</div>
          )}
        </Card>
        
        {/* Connected Providers */}
        <Card className={styles.connectionsSection}>
          <h2>Connected Healthcare Providers</h2>
          <p className={styles.sectionDescription}>
            Healthcare providers who have access to your medical data
          </p>
          
          {isLoading ? (
            <div className={styles.loading}>Loading connected providers...</div>
          ) : Array.isArray(filteredProviders) && filteredProviders.length > 0 ? (
            <div className={styles.connectionsList}>
              {filteredProviders.map((connection) => (
                connection && connection._id ? (
                  <div key={connection._id} className={styles.connectionItem}>
                    <div className={styles.providerInfo}>
                      <div className={styles.providerHeader}>
                        <h3>{connection.provider?.firstName || 'Unknown'} {connection.provider?.lastName || ''}</h3>
                        <span className={getAccessLevelBadgeClass(connection)}>
                          {getAccessLevelDisplay(connection)}
                        </span>
                      </div>
                      <p>Specialty: {connection.provider?.providerProfile?.specialty || 'Not specified'}</p>
                      <p>Practice: {connection.provider?.providerProfile?.practiceInfo?.name || 'Not specified'}</p>
                      <p>Connected Since: {formatDate(connection.createdAt)}</p>
                      <p>Email: {connection.provider?.email || 'Not available'}</p>
                      {connection.notes && <p>Notes: {connection.notes}</p>}
                    </div>
                    <div className={styles.connectionActions}>
                      <Button
                        onClick={() => handleManagePermissions(connection)}
                        className={styles.permissionsButton}
                        disabled={actionLoading.id === connection._id}
                        icon={<RiUserSettingsLine />}
                      >
                        Manage Access
                      </Button>
                      <Button
                        onClick={() => handleRevokeProvider(connection._id)}
                        variant="danger"
                        className={styles.removeButton}
                        disabled={actionLoading.id === connection._id}
                        icon={<IoCloseCircle />}
                      >
                        {actionLoading.id === connection._id && actionLoading.action === 'revoke'
                          ? 'Revoking...'
                          : 'Revoke Access'}
                      </Button>
                    </div>
                  </div>
                ) : null
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>No connected providers</div>
          )}
        </Card>
      </div>
      
      {/* Permissions Modal */}
      {showPermissionsModal && selectedConnection && (
        <>
          {showOverlay && <div className={styles.overlay} onClick={handleClosePermissionsModal} />}
          <ProviderPermissions
            connection={selectedConnection}
            onClose={handleClosePermissionsModal}
            onUpdate={fetchConnectionsData}
          />
        </>
      )}
    </>
  );
};

export default PatientConnections; 