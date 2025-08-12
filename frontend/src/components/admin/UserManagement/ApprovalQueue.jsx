// ApprovalQueue.jsx - Enhanced Approval Queue with all fixes
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import api from '../../../services/api';
import './ApprovalQueue.css';

const ApprovalQueue = () => {
  const { validateSession, handleSessionExpired } = useAuth();
  const { showNotification } = useNotification();

  // State Management
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingMerchants, setPendingMerchants] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedMerchants, setSelectedMerchants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [stats, setStats] = useState({
    totalPending: 0,
    pendingUsers: 0,
    pendingMerchants: 0,
    todayRegistrations: 0
  });

  // Effects
  useEffect(() => {
    initializeComponent();
  }, []);

  /**
   * Initialize the component
   */
  const initializeComponent = async () => {
    try {
      const sessionValid = await validateSession();
      if (!sessionValid) {
        handleSessionExpired();
        return;
      }
      await fetchPendingApprovals();
    } catch (error) {
      console.error('Error initializing approval queue:', error);
      showNotification('Failed to initialize approval queue', 'error');
    }
  };

  /**
   * Fetch all pending approvals
   */
  const fetchPendingApprovals = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch pending users and merchants in parallel
      const [usersResponse, merchantsResponse] = await Promise.all([
        api.get('/admin/users?status=pending&userType=user'),
        api.get('/admin/users?status=pending&userType=merchant')
      ]);

      const users = usersResponse.data.users || [];
      const merchants = merchantsResponse.data.users || [];

      setPendingUsers(users);
      setPendingMerchants(merchants);

      // Update stats
      const today = new Date().toISOString().split('T')[0];
      const todayRegistrations = [...users, ...merchants].filter(user => {
        const userDate = new Date(user.createdAt).toISOString().split('T')[0];
        return userDate === today;
      }).length;

      setStats({
        totalPending: users.length + merchants.length,
        pendingUsers: users.length,
        pendingMerchants: merchants.length,
        todayRegistrations
      });

      console.log('✅ Pending approvals loaded:', { users: users.length, merchants: merchants.length });
    } catch (error) {
      console.error('❌ Error fetching pending approvals:', error);
      
      if (error.response?.status === 401) {
        handleSessionExpired();
        return;
      }
      
      showNotification('Error loading pending approvals. Please try again.', 'error');
      setPendingUsers([]);
      setPendingMerchants([]);
    } finally {
      setIsLoading(false);
    }
  }, [validateSession, handleSessionExpired, showNotification]);

  /**
   * Handle individual user selection
   */
  const handleSelectUser = useCallback((userId) => {
    if (activeTab === 'users') {
      setSelectedUsers(prev => 
        prev.includes(userId) 
          ? prev.filter(id => id !== userId)
          : [...prev, userId]
      );
    } else {
      setSelectedMerchants(prev => 
        prev.includes(userId) 
          ? prev.filter(id => id !== userId)
          : [...prev, userId]
      );
    }
  }, [activeTab]);

  /**
   * Handle select all toggle
   */
  const handleSelectAll = useCallback(() => {
    if (activeTab === 'users') {
      if (selectedUsers.length === pendingUsers.length && pendingUsers.length > 0) {
        setSelectedUsers([]);
      } else {
        setSelectedUsers(pendingUsers.map(user => user.id)); // Fixed: use user.id
      }
    } else {
      if (selectedMerchants.length === pendingMerchants.length && pendingMerchants.length > 0) {
        setSelectedMerchants([]);
      } else {
        setSelectedMerchants(pendingMerchants.map(merchant => merchant.id)); // Fixed: use merchant.id
      }
    }
  }, [activeTab, selectedUsers, selectedMerchants, pendingUsers, pendingMerchants]);

  /**
   * Handle individual user approval
   */
  const handleApproveUser = useCallback(async (userId, userType, userName) => {
    try {
      console.log('✅ Approving user:', { userId, userType, userName });
      
      // Fixed: Use consistent endpoint
      await api.put(`/admin/users/${userId}/status`, { status: 'approved' });
      
      await fetchPendingApprovals();
      showNotification(`${userName || 'User'} approved successfully!`, 'success');
    } catch (error) {
      console.error('❌ Error approving user:', error);
      
      if (error.response?.status === 401) {
        handleSessionExpired();
        return;
      }
      
      const message = error.response?.data?.message || 'Failed to approve user. Please try again.';
      showNotification(message, 'error');
    }
  }, [fetchPendingApprovals, showNotification, handleSessionExpired]);

  /**
   * Handle individual user rejection
   */
  const handleRejectUser = useCallback(async (userId, userName) => {
    try {
      console.log('❌ Rejecting user:', { userId, userName });
      
      // Fixed: Use consistent endpoint
      await api.put(`/admin/users/${userId}/status`, { status: 'rejected' });
      
      await fetchPendingApprovals();
      showNotification(`${userName || 'User'} rejected successfully!`, 'success');
    } catch (error) {
      console.error('❌ Error rejecting user:', error);
      
      if (error.response?.status === 401) {
        handleSessionExpired();
        return;
      }
      
      const message = error.response?.data?.message || 'Failed to reject user. Please try again.';
      showNotification(message, 'error');
    }
  }, [fetchPendingApprovals, showNotification, handleSessionExpired]);

  /**
   * Handle bulk approval
   */
  const handleBulkApprove = useCallback(async () => {
    const selectedIds = activeTab === 'users' ? selectedUsers : selectedMerchants;
    const entityName = activeTab === 'users' ? 'users' : 'merchants';
    
    if (selectedIds.length === 0) {
      showNotification(`Please select ${entityName} to approve`, 'warning');
      return;
    }

    try {
      console.log('✅ Bulk approving:', { entityName, count: selectedIds.length, ids: selectedIds });
      
      // Fixed: Use correct bulk-action endpoint
      const endpoint = activeTab === 'users' ? '/admin/users/bulk-action' : '/admin/partners/bulk-action';
      const payload = activeTab === 'users' 
        ? { action: 'approve', userIds: selectedIds }
        : { action: 'approve', merchantIds: selectedIds };
      
      await api.post(endpoint, payload);

      showNotification(`${selectedIds.length} ${entityName} approved successfully!`, 'success');
      
      // Clear selections and refresh
      setSelectedUsers([]);
      setSelectedMerchants([]);
      await fetchPendingApprovals();
    } catch (error) {
      console.error('❌ Error bulk approving:', error);
      
      if (error.response?.status === 401) {
        handleSessionExpired();
        return;
      }
      
      const message = error.response?.data?.message || `Failed to approve selected ${entityName}. Please try again.`;
      showNotification(message, 'error');
    }
  }, [activeTab, selectedUsers, selectedMerchants, showNotification, fetchPendingApprovals, handleSessionExpired]);

  /**
   * Handle bulk rejection
   */
  const handleBulkReject = useCallback(async () => {
    const selectedIds = activeTab === 'users' ? selectedUsers : selectedMerchants;
    const entityName = activeTab === 'users' ? 'users' : 'merchants';
    
    if (selectedIds.length === 0) {
      showNotification(`Please select ${entityName} to reject`, 'warning');
      return;
    }

    try {
      console.log('❌ Bulk rejecting:', { entityName, count: selectedIds.length, ids: selectedIds });
      
      const endpoint = activeTab === 'users' ? '/admin/users/bulk-action' : '/admin/partners/bulk-action';
      const payload = activeTab === 'users' 
        ? { action: 'reject', userIds: selectedIds }
        : { action: 'reject', merchantIds: selectedIds };
      
      await api.post(endpoint, payload);

      showNotification(`${selectedIds.length} ${entityName} rejected successfully!`, 'success');
      
      // Clear selections and refresh
      setSelectedUsers([]);
      setSelectedMerchants([]);
      await fetchPendingApprovals();
    } catch (error) {
      console.error('❌ Error bulk rejecting:', error);
      
      if (error.response?.status === 401) {
        handleSessionExpired();
        return;
      }
      
      const message = error.response?.data?.message || `Failed to reject selected ${entityName}. Please try again.`;
      showNotification(message, 'error');
    }
  }, [activeTab, selectedUsers, selectedMerchants, showNotification, fetchPendingApprovals, handleSessionExpired]);

  /**
   * Format date for display
   */
  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      return 'Invalid Date';
    }
  }, []);

  /**
   * Get time since registration
   */
  const getTimeSince = useCallback((dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      
      if (diffDays > 0) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
      } else if (diffHours > 0) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      } else {
        return 'Just now';
      }
    } catch (error) {
      return '';
    }
  }, []);

  // Get current data based on active tab
  const currentData = activeTab === 'users' ? pendingUsers : pendingMerchants;
  const selectedIds = activeTab === 'users' ? selectedUsers : selectedMerchants;
  const entityName = activeTab === 'users' ? 'users' : 'merchants';

  // Show loading state
  if (isLoading && currentData.length === 0) {
    return (
      <div className="approval-queue-loading">
        <div className="loading-spinner"></div>
        <h3>Loading approval queue...</h3>
        <p>Please wait while we fetch pending approvals...</p>
      </div>
    );
  }

  return (
    <div className="approval-queue">
      {/* Header Section */}
      <div className="approval-queue-header">
        <div className="header-info">
          <h2>Approval Queue</h2>
          <p>Review and manage pending user registrations</p>
        </div>
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-number">{stats.totalPending}</span>
            <span className="stat-label">Total Pending</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.todayRegistrations}</span>
            <span className="stat-label">Today</span>
          </div>
          <button
            onClick={fetchPendingApprovals}
            disabled={isLoading}
            className="btn btn-secondary"
          >
            <i className={`fas fa-sync ${isLoading ? 'fa-spin' : ''}`}></i>
            Refresh
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="approval-tabs">
        <button
          onClick={() => setActiveTab('users')}
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
        >
          <i className="fas fa-users"></i>
          Regular Users
          {stats.pendingUsers > 0 && <span className="tab-badge">{stats.pendingUsers}</span>}
        </button>
        <button
          onClick={() => setActiveTab('merchants')}
          className={`tab-button ${activeTab === 'merchants' ? 'active' : ''}`}
        >
          <i className="fas fa-store"></i>
          Merchants
          {stats.pendingMerchants > 0 && <span className="tab-badge">{stats.pendingMerchants}</span>}
        </button>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="bulk-actions">
          <div className="bulk-actions-header">
            <div className="selection-info">
              <i className="fas fa-check-circle"></i>
              <span>{selectedIds.length} {entityName} selected</span>
            </div>
            <div className="bulk-actions-buttons">
              <button
                onClick={handleBulkApprove}
                className="btn btn-success"
                disabled={isLoading}
              >
                <i className="fas fa-check"></i>
                Approve Selected
              </button>
              <button
                onClick={handleBulkReject}
                className="btn btn-danger"
                disabled={isLoading}
              >
                <i className="fas fa-times"></i>
                Reject Selected
              </button>
              <button
                onClick={() => {
                  setSelectedUsers([]);
                  setSelectedMerchants([]);
                }}
                className="btn btn-secondary"
              >
                <i className="fas fa-times"></i>
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval List */}
      <div className="approval-list-container">
        {currentData.length > 0 ? (
          <>
            {/* Select All Header */}
            <div className="select-all-header">
              <label className="select-all-checkbox">
                <input
                  type="checkbox"
                  checked={selectedIds.length === currentData.length && currentData.length > 0}
                  onChange={handleSelectAll}
                  disabled={isLoading}
                />
                <span>Select All ({currentData.length})</span>
              </label>
            </div>

            {/* Approval Cards */}
            <div className="approval-list">
              {currentData.map((user) => (
                <div
                  key={user.id} // Fixed: use user.id consistently
                  className={`approval-card ${selectedIds.includes(user.id) ? 'selected' : ''}`}
                >
                  <div className="card-header">
                    <label className="card-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(user.id)} // Fixed: use user.id consistently
                        onChange={() => handleSelectUser(user.id)}
                        disabled={isLoading}
                      />
                    </label>
                    <div className="user-info">
                      <div className="user-avatar">
                        {user.fullName ? user.fullName.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div className="user-details">
                        <h4 className="user-name">{user.fullName || 'No Name Provided'}</h4>
                        <div className="user-meta">
                          <span className="user-email">
                            <i className="fas fa-envelope"></i>
                            {user.email}
                          </span>
                          {user.phone && (
                            <span className="user-phone">
                              <i className="fas fa-phone"></i>
                              {user.phone}
                            </span>
                          )}
                          {user.community && (
                            <span className="user-community">
                              <i className="fas fa-globe"></i>
                              {user.community}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="user-type-badge">
                      <i className={`fas ${user.userType === 'merchant' ? 'fa-store' : 'fa-user'}`}></i>
                      {user.userType || 'user'}
                    </div>
                  </div>

                  <div className="card-body">
                    <div className="registration-info">
                      <div className="info-item">
                        <label>Registered:</label>
                        <span>{formatDate(user.createdAt)}</span> {/* Fixed: use createdAt consistently */}
                        <small className="time-since">({getTimeSince(user.createdAt)})</small>
                      </div>
                      {user.address && (
                        <div className="info-item">
                          <label>Address:</label>
                          <span>{typeof user.address === 'string' ? user.address : JSON.stringify(user.address)}</span>
                        </div>
                      )}
                      {user.membershipType && (
                        <div className="info-item">
                          <label>Requested Plan:</label>
                          <span className="plan-badge">{user.membershipType}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="card-actions">
                    <button
                      onClick={() => handleApproveUser(user.id, user.userType, user.fullName)}
                      disabled={isLoading}
                      className="btn btn-success btn-sm"
                    >
                      <i className="fas fa-check"></i>
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectUser(user.id, user.fullName)}
                      disabled={isLoading}
                      className="btn btn-danger btn-sm"
                    >
                      <i className="fas fa-times"></i>
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          // Empty State
          <div className="empty-state">
            <div className="empty-content">
              <i className="fas fa-check-circle"></i>
              <h3>No Pending {entityName.charAt(0).toUpperCase() + entityName.slice(1)}</h3>
              <p>All {entityName} registrations have been processed.</p>
              {stats.totalPending > 0 && activeTab === 'users' && (
                <button
                  onClick={() => setActiveTab('merchants')}
                  className="btn btn-primary"
                >
                  View Pending Merchants ({stats.pendingMerchants})
                </button>
              )}
              {stats.totalPending > 0 && activeTab === 'merchants' && (
                <button
                  onClick={() => setActiveTab('users')}
                  className="btn btn-primary"
                >
                  View Pending Users ({stats.pendingUsers})
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      {currentData.length > 0 && (
        <div className="approval-footer">
          <div className="footer-stats">
            <span>Showing {currentData.length} pending {entityName}</span>
            {selectedIds.length > 0 && (
              <span>{selectedIds.length} selected</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalQueue;
