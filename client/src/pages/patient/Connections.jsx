import React, { useState, useEffect } from 'react';
import styles from './Connections.module.css';

// Component imports
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { toast } from 'react-toastify';
import ConnectionService from '../../services/connection.service';

// Icon imports
import { IoCheckmarkCircle, IoCloseCircle } from 'react-icons/io5';
import { RiUserSettingsLine } from 'react-icons/ri';

const PatientConnections = () => {
  const [connectionRequests, setConnectionRequests] = useState([]);
  const [connectedProviders, setConnectedProviders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({ id: null, action: null });

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
      setConnectedProviders(connectionsArray);
    } catch (error) {
      console.error('Error fetching connections data:', error);
      toast.error('Failed to load connection data. Please refresh the page.');
      // Set empty arrays to prevent undefined errors
      setConnectionRequests([]);
      setConnectedProviders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConnectionsData();
  }, []);

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

  // Handle grant full access
  const handleGrantFullAccess = async (connectionId) => {
    setActionLoading({ id: connectionId, action: 'grant' });
    
    try {
      await ConnectionService.grantFullAccess(connectionId);
      
      // Refresh connections data
      await fetchConnectionsData();
      toast.success('Full access granted to provider');
    } catch (error) {
      console.error('Error granting full access:', error);
      toast.error('Failed to grant full access. Please try again.');
    } finally {
      setActionLoading({ id: null, action: null });
    }
  };

  // Handle revoke to limited access
  const handleRevokeToLimited = async (connectionId) => {
    setActionLoading({ id: connectionId, action: 'revokeToLimited' });
    
    try {
      await ConnectionService.revokeConnection(connectionId);
      
      // Refresh connections data
      await fetchConnectionsData();
      toast.success('Provider access changed to limited');
    } catch (error) {
      console.error('Error changing access to limited:', error);
      toast.error('Failed to change access. Please try again.');
    } finally {
      setActionLoading({ id: null, action: null });
    }
  };

  // Handle remove provider (completely remove connection)
  const handleRemoveProvider = async (connectionId) => {
    setActionLoading({ id: connectionId, action: 'remove' });
    
    try {
      // When the provider has limited access and we call revokeConnection,
      // it will completely remove the connection
      await ConnectionService.revokeConnection(connectionId);
      
      // Refresh connections data
      await fetchConnectionsData();
      toast.success('Provider removed successfully');
    } catch (error) {
      console.error('Error removing provider:', error);
      toast.error('Failed to remove provider. Please try again.');
    } finally {
      setActionLoading({ id: null, action: null });
    }
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
        
        {/* Full Access Requests */}
        <Card className={styles.connectionsSection}>
          <h2>Full Access Requests</h2>
          <p className={styles.sectionDescription}>
            Healthcare providers requesting full access to all your medical data
          </p>
          
          {isLoading ? (
            <div className={styles.loading}>Loading access requests...</div>
          ) : Array.isArray(connectionRequests) && connectionRequests.length > 0 ? (
            <div className={styles.connectionsList}>
              {connectionRequests.map((request) => (
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
          ) : Array.isArray(connectedProviders) && connectedProviders.length > 0 ? (
            <div className={styles.connectionsList}>
              {connectedProviders.map((connection) => (
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
                        {connection.accessLevel === 'full' ? (
                          <Button
                            onClick={() => handleRevokeToLimited(connection._id)}
                            variant="secondary"
                            className={styles.revokeToLimitedButton}
                            disabled={actionLoading.id === connection._id}
                            icon={<IoCloseCircle />}
                          >
                            {actionLoading.id === connection._id && actionLoading.action === 'revokeToLimited'
                              ? 'Changing...'
                              : 'Revoke to limited access'}
                          </Button>
                        ) : (
                          <>
                            <Button
                              onClick={() => handleGrantFullAccess(connection._id)}
                              className={styles.allowFullAccessButton}
                              disabled={actionLoading.id === connection._id}
                              icon={<IoCheckmarkCircle />}
                            >
                              {actionLoading.id === connection._id && actionLoading.action === 'grant'
                                ? 'Granting...'
                                : 'Allow full access'}
                            </Button>
                            <Button
                              onClick={() => handleRemoveProvider(connection._id)}
                              variant="danger"
                              className={styles.removeButton}
                              disabled={actionLoading.id === connection._id}
                              icon={<IoCloseCircle />}
                            >
                              {actionLoading.id === connection._id && actionLoading.action === 'remove'
                                ? 'Removing...'
                                : 'Remove provider'}
                            </Button>
                          </>
                        )}
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
    </>
  );
};

export default PatientConnections; 