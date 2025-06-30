import React, { useState, useEffect } from 'react';
import styles from './ProviderSearch.module.css';
import Card from '../common/Card';
import Button from '../common/Button';
import SearchBox from '../common/SearchBox';
import ConnectionService from '../../services/connection.service';
import { toast } from 'react-toastify';

const ProviderSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Handle search for providers with proper debouncing
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    
    // Debounce the search
    const delayDebounceFn = setTimeout(async () => {
      try {
        const results = await ConnectionService.searchProviders(searchTerm);
        setSearchResults(results);
        setIsSearching(false);
      } catch (error) {
        console.error('Error searching for providers:', error);
        toast.error('Failed to search for providers. Please try again.');
        setIsSearching(false);
      }
    }, 500);
    
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSearch = (value) => {
    setSearchTerm(value);
  };

  // Handle provider selection
  const handleSelectProvider = (provider) => {
    setSelectedProvider(provider);
  };

  // Handle connection request submission
  const handleRequestConnection = async () => {
    if (!selectedProvider) return;
    
    setIsConnecting(true);
    
    try {
      await ConnectionService.createConnection({
        providerId: selectedProvider._id,
        notes: 'Connection requested by patient'
      });
      
      toast.success(`Connection request sent to ${selectedProvider.firstName} ${selectedProvider.lastName}`);
      setSelectedProvider(null);
      setSearchResults([]);
      setSearchTerm('');
    } catch (error) {
      console.error('Error sending connection request:', error);
      toast.error('Failed to send connection request. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Card className={styles.providerSearchCard}>
      <h2>Find Health Providers</h2>
      <p>Search for healthcare providers to connect with</p>
      
      <div className={styles.searchContainer}>
        <SearchBox
          placeholder="Search for providers by name, specialty, or practice..."
          value={searchTerm}
          onChange={handleSearch}
          className={styles.searchBox}
        />
      </div>
      
      {isSearching ? (
        <div className={styles.searching}>Searching for providers...</div>
      ) : searchResults.length > 0 ? (
        <div className={styles.searchResults}>
          {searchResults.map((provider) => (
            <div 
              key={provider._id} 
              className={`${styles.providerItem} ${selectedProvider && selectedProvider._id === provider._id ? styles.selected : ''}`}
              onClick={() => handleSelectProvider(provider)}
            >
              <div className={styles.providerInfo}>
                <h3>{provider.firstName} {provider.lastName}</h3>
                <p>Specialty: {provider.providerProfile?.specialty || 'Not specified'}</p>
                <p>Practice: {provider.providerProfile?.practiceName || 'Not specified'}</p>
              </div>
            </div>
          ))}
        </div>
      ) : searchTerm && (
        <div className={styles.noResults}>No providers found matching "{searchTerm}"</div>
      )}
      
      {selectedProvider && (
        <div className={styles.connectionRequest}>
          <h3>Request Connection</h3>
          <p>You are about to request a connection with:</p>
          <p className={styles.selectedProvider}>
            {selectedProvider.firstName} {selectedProvider.lastName} ({selectedProvider.providerProfile?.specialty || 'Not specified'})
          </p>
          <div className={styles.actionButtons}>
            <Button 
              onClick={handleRequestConnection}
              disabled={isConnecting}
              className={styles.connectButton}
            >
              {isConnecting ? 'Sending Request...' : 'Send Request'}
            </Button>
            <Button 
              onClick={() => setSelectedProvider(null)}
              variant="secondary"
              className={styles.cancelButton}
              disabled={isConnecting}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ProviderSearch; 