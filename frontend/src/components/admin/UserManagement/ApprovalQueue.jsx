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
  const [pendingDeals, setPendingDeals] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedMerchants, setSelectedMerchants] = useState([]);
  const [selectedDeals, setSelectedDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [stats, setStats] = useState({
    totalPending: 0,
    pendingUsers: 0,
    pendingMerchants: 0,
    pendingDeals: 0,
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
      
      // Validate session before making API calls
      const sessionValid = await validateSession();
      if (!sessionValid) {
        handleSessionExpired();
        return;
      }
      
      // Fetch pending users, merchants, and deals in parallel
      console.log('🔧 DEBUG: Starting API calls...');
      const [usersResponse, merchantsResponse, dealsResponse] = await Promise.allSettled([
        api.get('/admin/users?status=pending&userType=user'),
        api.get('/admin/users?status=pending&userType=merchant'),
        api.get('/admin/deals?status=pending_approval&limit=100') // Use same endpoint as DealList with filter
      ]);
      console.log('🔧 DEBUG: API calls completed');

      // Handle users response
      console.log('🔧 DEBUG: usersResponse.status:', usersResponse.status);
      if (usersResponse.status === 'fulfilled') {
        console.log('🔧 DEBUG: usersResponse.value.data:', usersResponse.value.data);
      }
      const users = usersResponse.status === 'fulfilled' ? (usersResponse.value.data.users || []) : [];
      if (usersResponse.status === 'rejected') {
        console.warn('Failed to fetch pending users:', usersResponse.reason);
      }

      // Handle merchants response
      const merchants = merchantsResponse.status === 'fulfilled' ? (merchantsResponse.value.data.users || []) : [];
      if (merchantsResponse.status === 'rejected') {
        console.warn('Failed to fetch pending merchants:', merchantsResponse.reason);
      }

      // Handle deals response
      console.log('🔧 DEBUG: dealsResponse.status:', dealsResponse.status);
      if (dealsResponse.status === 'fulfilled') {
        console.log('🔧 DEBUG: dealsResponse.value:', dealsResponse.value);
        console.log('🔧 DEBUG: dealsResponse.value.data:', dealsResponse.value.data);
      } else if (dealsResponse.status === 'rejected') {
        console.error('🔧 DEBUG: dealsResponse.reason:', dealsResponse.reason);
        console.error('🔧 DEBUG: deals API call failed:', dealsResponse.reason.response?.status, dealsResponse.reason.response?.data);
        // If it's an authentication error, handle it
        if (dealsResponse.reason.response?.status === 401) {
          console.error('🔧 DEBUG: Authentication error when fetching deals');
          showNotification('Authentication error when fetching pending deals. Please refresh and try again.', 'error');
        }
      }
      const deals = dealsResponse.status === 'fulfilled' ? (dealsResponse.value.data.deals || []) : [];
      if (dealsResponse.status === 'rejected') {
        console.warn('Failed to fetch pending deals:', dealsResponse.reason);
      }
      console.log('🔧 DEBUG: Final deals array:', deals);
      console.log('🔧 DEBUG: Number of pending deals found:', deals.length);

      setPendingUsers(users);
      setPendingMerchants(merchants);
      setPendingDeals(deals);

      // Update stats
      const today = new Date().toISOString().split('T')[0];
      const todayRegistrations = [...users, ...merchants].filter(user => {
        const userDate = new Date(user.createdAt).toISOString().split('T')[0];
        return userDate === today;
      }).length;

      setStats({
        totalPending: users.length + merchants.length + deals.length,
        pendingUsers: users.length,
        pendingMerchants: merchants.length,
        pendingDeals: deals.length,
        todayRegistrations
      });

      console.log('✅ Pending approvals loaded:', { 
        users: users.length, 
        merchants: merchants.length, 
        deals: deals.length 
      });
    } catch (error) {
      console.error('❌ Error fetching pending approvals:', error);
      
      if (error.response?.status === 401) {
        handleSessionExpired();
        return;
      }
      
      showNotification('Error loading pending approvals. Please try again.', 'error');
      setPendingUsers([]);
      setPendingMerchants([]);
      setPendingDeals([]);
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
    } else if (activeTab === 'merchants') {
      setSelectedMerchants(prev => 
        prev.includes(userId) 
          ? prev.filter(id => id !== userId)
          : [...prev, userId]
      );
    } else if (activeTab === 'deals') {
      setSelectedDeals(prev => 
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
    } else if (activeTab === 'merchants') {
      if (selectedMerchants.length === pendingMerchants.length && pendingMerchants.length > 0) {
        setSelectedMerchants([]);
      } else {
        setSelectedMerchants(pendingMerchants.map(merchant => merchant.id)); // Fixed: use merchant.id
      }
    } else if (activeTab === 'deals') {
      if (selectedDeals.length === pendingDeals.length && pendingDeals.length > 0) {
        setSelectedDeals([]);
      } else {
        setSelectedDeals(pendingDeals.map(deal => deal.id));
      }
    }
  }, [activeTab, selectedUsers, selectedMerchants, selectedDeals, pendingUsers, pendingMerchants, pendingDeals]);

  /**
   * Handle individual user approval
   */
  const handleApproveUser = useCallback(async (userId, userType, userName) => {
    try {
      console.log('✅ Approving user:', { userId, userType, userName });

      // Validate session
      const sessionValid = await validateSession();
      if (!sessionValid) {
        handleSessionExpired();
        return;
      }

      // Call both users and partners endpoints (tolerate partial success)
      const [usersRes, partnersRes] = await Promise.allSettled([
        api.put(`/admin/users/${userId}/status`, { status: 'approved' }),
        api.put(`/admin/partners/${userId}/status`, { status: 'approved' })
      ]);

      const usersSuccess = usersRes.status === 'fulfilled' && usersRes.value?.data?.success;
      const partnersSuccess = partnersRes.status === 'fulfilled' && partnersRes.value?.data?.success;

      if (usersSuccess || partnersSuccess) {
        await fetchPendingApprovals();
        showNotification(`${userName || 'User'} approved successfully!`, 'success');
      } else {
        // Aggregate errors for debugging
        const uErr = usersRes.status === 'rejected' ? usersRes.reason : null;
        const pErr = partnersRes.status === 'rejected' ? partnersRes.reason : null;
        console.error('Approve user failed:', { uErr, pErr });
        throw new Error('Failed to approve user');
      }
    } catch (error) {
      console.error('❌ Error approving user:', error);

      if (error.response?.status === 401) {
        handleSessionExpired();
        return;
      }

      const message = error.response?.data?.message || 'Failed to approve user. Please try again.';
      showNotification(message, 'error');
    }
  }, [fetchPendingApprovals, showNotification, handleSessionExpired, validateSession]);

  /**
   * Handle individual user rejection
   */
  const handleRejectUser = useCallback(async (userId, userName) => {
    try {
      console.log('❌ Rejecting user:', { userId, userName });

      // Validate session
      const sessionValid = await validateSession();
      if (!sessionValid) {
        handleSessionExpired();
        return;
      }

      const payload = { status: 'rejected' };

      // Call both users and partners endpoints (tolerate partial success)
      const [usersRes, partnersRes] = await Promise.allSettled([
        api.put(`/admin/users/${userId}/status`, payload),
        api.put(`/admin/partners/${userId}/status`, payload)
      ]);

      const usersSuccess = usersRes.status === 'fulfilled' && usersRes.value?.data?.success;
      const partnersSuccess = partnersRes.status === 'fulfilled' && partnersRes.value?.data?.success;

      if (usersSuccess || partnersSuccess) {
        await fetchPendingApprovals();
        showNotification(`${userName || 'User'} rejected successfully!`, 'success');
      } else {
        const uErr = usersRes.status === 'rejected' ? usersRes.reason : null;
        const pErr = partnersRes.status === 'rejected' ? partnersRes.reason : null;
        console.error('Reject user failed:', { uErr, pErr });
        throw new Error('Failed to reject user');
      }
    } catch (error) {
      console.error('❌ Error rejecting user:', error);

      if (error.response?.status === 401) {
        handleSessionExpired();
        return;
      }

      const message = error.response?.data?.message || 'Failed to reject user. Please try again.';
      showNotification(message, 'error');
    }
  }, [fetchPendingApprovals, showNotification, handleSessionExpired, validateSession]);

  /**
   * Handle individual deal approval
   */
  const handleApproveDeal = useCallback(async (dealId, dealTitle) => {
    try {
      console.log('✅ Approving deal:', { dealId, dealTitle });

      // Validate session
      const sessionValid = await validateSession();
      if (!sessionValid) {
        handleSessionExpired();
        return;
      }

      const response = await api.put(`/admin/deals/${dealId}/approve`);
      
      if (response.data?.success) {
        await fetchPendingApprovals();
        showNotification(`${dealTitle || 'Deal'} approved successfully!`, 'success');
      } else {
        throw new Error('Failed to approve deal');
      }
    } catch (error) {
      console.error('❌ Error approving deal:', error);

      if (error.response?.status === 401) {
        handleSessionExpired();
        return;
      }

      const message = error.response?.data?.message || 'Failed to approve deal. Please try again.';
      showNotification(message, 'error');
    }
  }, [fetchPendingApprovals, showNotification, handleSessionExpired, validateSession]);

  /**
   * Handle individual deal rejection
   */
  const handleRejectDeal = useCallback(async (dealId, dealTitle, reason = '') => {
    try {
      console.log('❌ Rejecting deal:', { dealId, dealTitle, reason });

      // Validate session
      const sessionValid = await validateSession();
      if (!sessionValid) {
        handleSessionExpired();
        return;
      }

      const payload = { reason: reason || 'No reason provided' };
      const response = await api.put(`/admin/deals/${dealId}/reject`, payload);
      
      if (response.data?.success) {
        await fetchPendingApprovals();
        showNotification(`${dealTitle || 'Deal'} rejected successfully!`, 'success');
      } else {
        throw new Error('Failed to reject deal');
      }
    } catch (error) {
      console.error('❌ Error rejecting deal:', error);

      if (error.response?.status === 401) {
        handleSessionExpired();
        return;
      }

      const message = error.response?.data?.message || 'Failed to reject deal. Please try again.';
      showNotification(message, 'error');
    }
  }, [fetchPendingApprovals, showNotification, handleSessionExpired, validateSession]);

  /**
   * Handle bulk approval
   */
  const handleBulkApprove = useCallback(async () => {
    const selectedIds = activeTab === 'users' ? selectedUsers : 
                       activeTab === 'merchants' ? selectedMerchants : selectedDeals;
    const entityName = activeTab === 'users' ? 'users' : 
                      activeTab === 'merchants' ? 'merchants' : 'deals';
    
    if (selectedIds.length === 0) {
      showNotification(`Please select ${entityName} to approve`, 'warning');
      return;
    }

    try {
      console.log('✅ Bulk approving:', { entityName, count: selectedIds.length, ids: selectedIds });
      
      let endpoint, payload;
      if (activeTab === 'users') {
        endpoint = '/admin/users/bulk-action';
        payload = { action: 'approve', userIds: selectedIds };
      } else if (activeTab === 'merchants') {
        endpoint = '/admin/partners/bulk-action';
        payload = { action: 'approve', merchantIds: selectedIds };
      } else if (activeTab === 'deals') {
        endpoint = '/admin/deals/batch-approve';
        payload = { dealIds: selectedIds };
      }
      
      await api.post(endpoint, payload);

      showNotification(`${selectedIds.length} ${entityName} approved successfully!`, 'success');
      
      // Clear selections and refresh
      setSelectedUsers([]);
      setSelectedMerchants([]);
      setSelectedDeals([]);
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
  }, [activeTab, selectedUsers, selectedMerchants, selectedDeals, showNotification, fetchPendingApprovals, handleSessionExpired]);

  /**
   * Handle bulk rejection
   */
  const handleBulkReject = useCallback(async () => {
    const selectedIds = activeTab === 'users' ? selectedUsers : 
                       activeTab === 'merchants' ? selectedMerchants : selectedDeals;
    const entityName = activeTab === 'users' ? 'users' : 
                      activeTab === 'merchants' ? 'merchants' : 'deals';
    
    if (selectedIds.length === 0) {
      showNotification(`Please select ${entityName} to reject`, 'warning');
      return;
    }

    try {
      console.log('❌ Bulk rejecting:', { entityName, count: selectedIds.length, ids: selectedIds });
      
      let endpoint, payload;
      if (activeTab === 'users') {
        endpoint = '/admin/users/bulk-action';
        payload = { action: 'reject', userIds: selectedIds };
      } else if (activeTab === 'merchants') {
        endpoint = '/admin/partners/bulk-action';
        payload = { action: 'reject', merchantIds: selectedIds };
      } else if (activeTab === 'deals') {
        endpoint = '/admin/deals/batch-reject';
        payload = { dealIds: selectedIds, rejectionReason: 'Bulk rejection by admin' };
      }
      
      await api.post(endpoint, payload);

      showNotification(`${selectedIds.length} ${entityName} rejected successfully!`, 'success');
      
      // Clear selections and refresh
      setSelectedUsers([]);
      setSelectedMerchants([]);
      setSelectedDeals([]);
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
  }, [activeTab, selectedUsers, selectedMerchants, selectedDeals, showNotification, fetchPendingApprovals, handleSessionExpired]);

  /**
   * Format date for display
   */
  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      return new Intl.DateTimeFormat('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
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
  const currentData = activeTab === 'users' ? pendingUsers : 
                     activeTab === 'merchants' ? pendingMerchants : pendingDeals;
  const selectedIds = activeTab === 'users' ? selectedUsers : 
                     activeTab === 'merchants' ? selectedMerchants : selectedDeals;
  const entityName = activeTab === 'users' ? 'users' : 
                    activeTab === 'merchants' ? 'merchants' : 'deals';

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
        <button
          onClick={() => setActiveTab('deals')}
          className={`tab-button ${activeTab === 'deals' ? 'active' : ''}`}
        >
          <i className="fas fa-tags"></i>
          Deals
          {pendingDeals.length > 0 && <span className="tab-badge">{pendingDeals.length}</span>}
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
              {currentData.map((item) => (
                <div
                  key={item.id}
                  className={`approval-card ${selectedIds.includes(item.id) ? 'selected' : ''}`}
                >
                  <div className="card-header">
                    <label className="card-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => handleSelectUser(item.id)}
                        disabled={isLoading}
                      />
                    </label>
                    
                    {/* Deal Card Header */}
                    {activeTab === 'deals' ? (
                      <div className="deal-info">
                        <div className="deal-details">
                          <h4 className="deal-title">{item.title || 'Untitled Deal'}</h4>
                          <div className="deal-meta">
                            <span className="deal-business">
                              <i className="fas fa-store"></i>
                              {item.businessName || item.business_name || 'Unknown Business'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* User/Merchant Card Header */
                      <div className="user-info">
                        <div className="user-details">
                          <h4 className="user-name">{item.fullName || 'No Name Provided'}</h4>
                          <div className="user-meta">
                            <span className="user-email">
                              <i className="fas fa-envelope"></i>
                              {item.email}
                            </span>
                            {item.phone && (
                              <span className="user-phone">
                                <i className="fas fa-phone"></i>
                                {item.phone}
                              </span>
                            )}
                            {item.community && (
                              <span className="user-community">
                                <i className="fas fa-globe"></i>
                                {item.community}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="type-badge">
                      {activeTab === 'deals' ? (
                        <span className="deal-badge">
                          <i className="fas fa-tags"></i>
                          Deal
                        </span>
                      ) : (
                        <span className="user-type-badge">
                          <i className={`fas ${item.userType === 'merchant' ? 'fa-store' : 'fa-user'}`}></i>
                          {item.userType || 'user'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="card-body">
                    {activeTab === 'deals' ? (
                      /* Deal Card Body */
                      <div className="deal-info-section">
                        <div className="info-item">
                          <label>Description:</label>
                          <span>{item.description || 'No description provided'}</span>
                        </div>
                        <div className="info-item">
                          <label>Valid Until:</label>
                          <span>{item.validUntil ? formatDate(item.validUntil) : 'No expiry date'}</span>
                        </div>
                        <div className="info-item">
                          <label>Submitted:</label>
                          <span>{item.createdAt ? formatDate(item.createdAt) : (item.created_at ? formatDate(item.created_at) : (item.submittedAt ? formatDate(item.submittedAt) : 'Date not available'))}</span>
                          {(item.createdAt || item.created_at || item.submittedAt) && (
                            <small className="time-since">({getTimeSince(item.createdAt || item.created_at || item.submittedAt)})</small>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* User/Merchant Card Body */
                      <div className="registration-info">
                        <div className="info-item">
                          <label>Registered:</label>
                          <span>{formatDate(item.createdAt)}</span>
                          <small className="time-since">({getTimeSince(item.createdAt)})</small>
                        </div>
                        {item.address && (
                          <div className="info-item">
                            <label>Address:</label>
                            <span>{typeof item.address === 'string' ? item.address : JSON.stringify(item.address)}</span>
                          </div>
                        )}
                        {item.membershipType && (
                          <div className="info-item">
                            <label>Requested Plan:</label>
                            <span className="plan-badge">{item.membershipType}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="card-actions">
                    {activeTab === 'deals' ? (
                      /* Deal Actions */
                      <>
                        <button
                          onClick={() => handleApproveDeal(item.id, item.title)}
                          disabled={isLoading}
                          className="btn btn-success btn-sm"
                        >
                          <i className="fas fa-check"></i>
                          Approve Deal
                        </button>
                        <button
                          onClick={() => handleRejectDeal(item.id, item.title)}
                          disabled={isLoading}
                          className="btn btn-danger btn-sm"
                        >
                          <i className="fas fa-times"></i>
                          Reject Deal
                        </button>
                      </>
                    ) : (
                      /* User/Merchant Actions */
                      <>
                        <button
                          onClick={() => handleApproveUser(item.id, item.userType, item.fullName)}
                          disabled={isLoading}
                          className="btn btn-success btn-sm"
                        >
                          <i className="fas fa-check"></i>
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectUser(item.id, item.fullName)}
                          disabled={isLoading}
                          className="btn btn-danger btn-sm"
                        >
                          <i className="fas fa-times"></i>
                          Reject
                        </button>
                      </>
                    )}
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
              <p>All {entityName} {activeTab === 'deals' ? 'submissions' : 'registrations'} have been processed.</p>
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
              {pendingDeals.length > 0 && activeTab !== 'deals' && (
                <button
                  onClick={() => setActiveTab('deals')}
                  className="btn btn-primary"
                >
                  View Pending Deals ({pendingDeals.length})
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
