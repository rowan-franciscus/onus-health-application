import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaSearch } from 'react-icons/fa';
import adminService from '../../services/admin.service';
import styles from './HealthProviders.module.css';
import Button from '../../components/common/Button';
import SearchBox from '../../components/common/SearchBox';
import Pagination from '../../components/common/Pagination';

const HealthProviders = () => {
  const [providers, setProviders] = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState('verified');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        setLoading(true);
        const status = activeTab === 'requests' ? 'pending' : 'approved';
        const response = await adminService.getProviderVerifications({ 
          status, 
          page: currentPage, 
          limit: 10 
        });
        
        setProviders(response.providers || []);
        setFilteredProviders(response.providers || []);
        setTotalPages(response.pagination.pages);
        setLoading(false);
      } catch (err) {
        setError('Failed to load providers');
        setLoading(false);
        console.error(err);
      }
    };

    fetchProviders();
  }, [activeTab, currentPage]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProviders(providers);
    } else {
      const filtered = providers.filter(provider => {
        const fullName = `${provider.firstName} ${provider.lastName}`.toLowerCase();
        const specialty = (provider.providerProfile?.specialty || '').toLowerCase();
        const practice = (provider.providerProfile?.practiceInfo?.name || '').toLowerCase();
        const email = provider.email.toLowerCase();
        
        return fullName.includes(searchQuery.toLowerCase()) || 
               specialty.includes(searchQuery.toLowerCase()) ||
               practice.includes(searchQuery.toLowerCase()) ||
               email.includes(searchQuery.toLowerCase());
      });
      setFilteredProviders(filtered);
    }
  }, [searchQuery, providers]);

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleViewProvider = (id) => {
    navigate(`/admin/health-providers/${id}`);
  };

  const handleViewRequest = (id) => {
    navigate(`/admin/health-providers/verify/${id}`);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {activeTab === 'verified' ? 'Verified Health Care Providers' : 'Health Care Provider Requests'}
        </h1>
        <div className={styles.searchContainer}>
          <SearchBox
            placeholder="Search..."
            onSearch={handleSearch}
            value={searchQuery}
            icon={<FaSearch />}
          />
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'verified' ? styles.activeTab : ''}`}
          onClick={() => handleTabChange('verified')}
        >
          Verified Providers
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'requests' ? styles.activeTab : ''}`}
          onClick={() => handleTabChange('requests')}
        >
          Verification Requests
        </button>
      </div>

      {loading ? (
        <div className={styles.loadingContainer}>Loading providers...</div>
      ) : error ? (
        <div className={styles.errorContainer}>{error}</div>
      ) : (
        <>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Specialist</th>
                  <th>Specialty</th>
                  <th>Practice / Clinic</th>
                  <th>Email Address</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProviders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className={styles.noResults}>
                      {searchQuery ? "No results found" : `No ${activeTab === 'verified' ? 'verified providers' : 'pending requests'}`}
                    </td>
                  </tr>
                ) : (
                  filteredProviders.map((provider) => (
                    <tr key={provider._id}>
                      <td>{formatDate(provider.createdAt)}</td>
                      <td>
                        {provider.title} {provider.firstName} {provider.lastName}
                      </td>
                      <td>{provider.providerProfile?.specialty || 'Not specified'}</td>
                      <td>{provider.providerProfile?.practiceInfo?.name || 'Not specified'}</td>
                      <td>{provider.email}</td>
                      <td>
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => 
                            activeTab === 'verified' 
                              ? handleViewProvider(provider._id) 
                              : handleViewRequest(provider._id)
                          }
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className={styles.paginationContainer}>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HealthProviders; 