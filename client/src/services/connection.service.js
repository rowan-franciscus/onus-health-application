import api from './api.service';

/**
 * Service for handling patient-provider connections
 */
const ConnectionService = {
  /**
   * Get all connections for the current user
   * @param {Object} params - Query parameters
   * @returns {Promise} - A promise that resolves to the connections data
   */
  getConnections: async (params = {}) => {
    try {
      const data = await api.get('/connections', { params });
      // api.get already returns response.data, so data is the response body
      if (Array.isArray(data?.connections)) return data.connections;
      if (Array.isArray(data)) return data;
      return [];
    } catch (error) {
      console.error('Error getting connections:', error);
      // Return empty array on error to prevent undefined errors
      return [];
    }
  },

  /**
   * Get a specific connection by ID
   * @param {string} id - Connection ID
   * @returns {Promise} - A promise that resolves to the connection data
   */
  getConnectionById: async (id) => {
    try {
      const response = await api.get(`/connections/${id}`);
      return response?.connection || null;
    } catch (error) {
      console.error(`Error getting connection ${id}:`, error);
      return null;
    }
  },

  /**
   * Create a new connection request (provider initiated)
   * @param {Object} connectionData - Connection data
   * @returns {Promise} - A promise that resolves to the created connection
   */
  createConnection: async (connectionData) => {
    try {
      const response = await api.post('/connections', connectionData);
      // api.post already returns response.data, so response IS the data
      return response || null;
    } catch (error) {
      console.error('Error creating connection:', error);
      throw error;
    }
  },

  /**
   * Request full access for an existing connection
   * @param {string} connectionId - Connection ID
   * @returns {Promise} - A promise that resolves to the updated connection
   */
  requestFullAccess: async (connectionId) => {
    try {
      const response = await api.post(`/connections/provider/request-full-access/${connectionId}`);
      return response || null;
    } catch (error) {
      console.error(`Error requesting full access for connection ${connectionId}:`, error);
      throw error;
    }
  },

  /**
   * Get pending full access requests for a patient
   * @returns {Promise} - A promise that resolves to the requests data
   */
  getPatientConnectionRequests: async () => {
    try {
      const response = await api.get('/connections/patient/requests');
      return response?.requests || [];
    } catch (error) {
      console.error('Error getting patient connection requests:', error);
      return [];
    }
  },

  /**
   * Respond to a full access request (approve/deny)
   * @param {string} requestId - Request ID
   * @param {string} action - 'approve' or 'deny'
   * @returns {Promise} - A promise that resolves when the request is processed
   */
  respondToConnectionRequest: async (requestId, action) => {
    try {
      const response = await api.post(`/connections/patient/respond/${requestId}`, { action });
      return response || null;
    } catch (error) {
      console.error(`Error responding to connection request ${requestId}:`, error);
      throw error;
    }
  },

  /**
   * Revoke provider access (patient removes provider)
   * @param {string} connectionId - Connection ID
   * @returns {Promise} - A promise that resolves when the access is revoked
   */
  revokeConnection: async (connectionId) => {
    try {
      const response = await api.post(`/connections/patient/revoke/${connectionId}`);
      return response || null;
    } catch (error) {
      console.error(`Error revoking connection ${connectionId}:`, error);
      throw error;
    }
  },

  /**
   * Grant full access directly to a provider (patient action)
   * @param {string} connectionId - Connection ID
   * @returns {Promise} - A promise that resolves when full access is granted
   */
  grantFullAccess: async (connectionId) => {
    try {
      const response = await api.post(`/connections/patient/grant-full-access/${connectionId}`);
      return response || null;
    } catch (error) {
      console.error(`Error granting full access to connection ${connectionId}:`, error);
      throw error;
    }
  },

  /**
   * Update connection (for updating permissions, etc.)
   * @param {string} connectionId - Connection ID
   * @param {object} updateData - Data to update
   * @returns {Promise} - A promise that resolves to the updated connection
   */
  updateConnection: async (connectionId, updateData) => {
    try {
      const response = await api.put(`/connections/${connectionId}`, updateData);
      return response || null;
    } catch (error) {
      console.error(`Error updating connection ${connectionId}:`, error);
      throw error;
    }
  },

  /**
   * Delete a connection completely
   * @param {string} id - Connection ID
   * @returns {Promise} - A promise that resolves when the connection is deleted
   */
  deleteConnection: async (id) => {
    try {
      const response = await api.delete(`/connections/${id}`);
      return response || { success: false };
    } catch (error) {
      console.error(`Error deleting connection ${id}:`, error);
      throw error;
    }
  },

  /**
   * Search for health providers
   * @param {string} query - Search query
   * @returns {Promise} - A promise that resolves to the search results
   */
  searchProviders: async (query) => {
    try {
      const response = await api.get('/users/providers/search', { params: { query } });
      return response?.providers || [];
    } catch (error) {
      console.error('Error searching providers:', error);
      return [];
    }
  }
};

export default ConnectionService; 