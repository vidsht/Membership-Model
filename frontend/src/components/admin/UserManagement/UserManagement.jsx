// UserManagement.jsx - UPDATED with Route Navigation
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../../contexts/NotificationContext';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';
import UserTable from './components/UserTable';
import UserFilters from './components/UserFilters';
import UserModal from './components/UserModal';
import BulkActions from './components/BulkActions';
import './UserManagement.css';

const UserManagement = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { validateSession, handleSessionExpired } = useAuth();

  // Core State Management
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modal State Management - Only for delete and plan assignment
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: null,
    user: null,
    title: '',
    data: null
  });

  // Filter & Pagination State
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    userType: 'all',
    community: 'all'
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Reference Data State
  const [referenceData, setReferenceData] = useState({
    communities: [],
    plans: [],
    userPlans: [],
    merchantPlans: [],
    userTypes: ['user', 'merchant', 'admin'],
    statuses: ['pending', 'approved', 'rejected', 'suspended']
  });


  // Memoized fallback plans
  const fallbackPlans = useMemo(() => [
    {
      id: 1, key: 'community', name: 'Community Plan', type: 'user', price: 0,
      currency: 'FREE', billingCycle: 'yearly', features: 'Basic directory access,Community updates,Basic support',
      dealAccess: 'Limited community deals', isActive: true, priority: 1
    },
    {
      id: 2, key: 'silver', name: 'Silver Plan', type: 'user', price: 50,
      currency: 'GHS', billingCycle: 'yearly', features: 'All community features,Priority support,Exclusive deals',
      dealAccess: 'Silver + Community deals', isActive: true, priority: 2
    },
    {
      id: 3, key: 'gold', name: 'Gold Plan', type: 'user', price: 150,
      currency: 'GHS', billingCycle: 'yearly', features: 'All silver features,VIP events,Premium support',
      dealAccess: 'All exclusive deals', isActive: true, priority: 3
    },
    {
      id: 4, key: 'basic_business', name: 'Basic Business', type: 'merchant', price: 100,
      currency: 'GHS', billingCycle: 'monthly', features: 'Basic business listing,Contact information',
      dealAccess: 'Basic deal posting', isActive: true, priority: 4
    },
    {
      id: 5, key: 'premium_business', name: 'Premium Business', type: 'merchant', price: 200,
      currency: 'GHS', billingCycle: 'monthly', features: 'Premium listing,Photos,Reviews,Analytics',
      dealAccess: 'Unlimited deal posting', isActive: true, priority: 5
    }
  ], []);

  // Memoized stats calculation
  const stats = useMemo(() => {
    const totalUsers = users.length;
    const pendingApprovals = users.filter(user => user.status === 'pending').length;
    const activeUsers = users.filter(user => user.status === 'approved').length;
    const suspendedUsers = users.filter(user => user.status === 'suspended').length;
    return { totalUsers, pendingApprovals, activeUsers, suspendedUsers };
  }, [users]);

  // Calculate plan validity
  const calculatePlanValidity = useCallback((user, planDetails) => {
    // If validationDate is present, use it
    if (user.validationDate) {
      try {
        const validationDate = new Date(user.validationDate);
        const now = new Date();
        if (validationDate < now) {
          return 'Expired';
        }
        return validationDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      } catch (error) {
        return 'Invalid date';
      }
    }
    // If no validationDate, fallback to planAssignedAt + billingCycle (like MerchantManagement)
    const baseDate = user.planAssignedAt || user.createdAt;
    if (!baseDate) return 'No validity set';
    let validityDate = new Date(baseDate);
    const billingCycle = (planDetails && planDetails.billingCycle) ? planDetails.billingCycle.toLowerCase() : 'yearly';
    switch (billingCycle) {
      case 'monthly':
        validityDate.setMonth(validityDate.getMonth() + 1);
        break;
      case 'quarterly':
        validityDate.setMonth(validityDate.getMonth() + 3);
        break;
      case 'yearly':
      case 'annual':
        validityDate.setFullYear(validityDate.getFullYear() + 1);
        break;
      case 'lifetime':
        return 'Lifetime';
      case 'weekly':
        validityDate.setDate(validityDate.getDate() + 7);
        break;
      default:
        validityDate.setFullYear(validityDate.getFullYear() + 1);
        break;
    }
    const now = new Date();
    if (validityDate < now) {
      return 'Expired';
    }
    return validityDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  // Stable callback functions
  const clearSelections = useCallback(() => {
    setSelectedUsers([]);
  }, []);

  const refreshData = useCallback(() => {
    console.log('🔄 Refreshing user data...');
    setRefreshTrigger(prev => prev + 1);
    clearSelections();
  }, [clearSelections]);

  const closeModal = useCallback(() => {
    setModalState({
      isOpen: false,
      type: null,
      user: null,
      title: '',
      data: null
    });
    setPlanAssignmentState({
      isLoading: false,
      selectedUser: null,
      availablePlans: [],
      userType: null
    });
  }, []);

  // Initialize component
  const initializeComponent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const sessionValid = await validateSession();
      if (!sessionValid) {
        handleSessionExpired();
        return;
      }
      await fetchReferenceData();
      console.log('✅ User Management initialized successfully');
    } catch (err) {
      console.error('❌ Error initializing User Management:', err);
      setError('Failed to initialize user management');
      showNotification('Failed to load user management', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch reference data
  const fetchReferenceData = useCallback(async () => {
    try {
      console.log('📋 Fetching reference data...');
      const [communitiesRes, allPlansRes, userPlansRes, merchantPlansRes] = await Promise.allSettled([
        api.get('/admin/communities'),
        api.get('/admin/plans'),
        api.get('/admin/plans?userType=user'),
        api.get('/admin/plans?userType=merchant')
      ]);

      // Handle communities
      let communities = [];
      if (communitiesRes.status === 'fulfilled' && communitiesRes.value?.data?.success) {
        communities = communitiesRes.value.data.communities || [];
      } else {
        communities = [
          'Gujarati', 'Bengali', 'Tamil', 'Punjabi', 'Hindi', 'Marathi', 'Telugu',
          'Kannada', 'Malayalam', 'Sindhi', 'Rajasthani', 'Other Indian', 'Mixed Heritage'
        ].map(name => ({ name, isActive: true }));
      }

      // Handle all plans
      let allPlans = [];
      if (allPlansRes.status === 'fulfilled' && allPlansRes.value?.data?.success) {
        allPlans = allPlansRes.value.data.plans || [];
      } else {
        allPlans = fallbackPlans;
      }

      // Handle user plans
      let userPlans = [];
      if (userPlansRes.status === 'fulfilled' && userPlansRes.value?.data?.success) {
        userPlans = userPlansRes.value.data.plans.filter(plan => plan.type === 'user') || [];
      } else {
        userPlans = allPlans.filter(plan => plan.type === 'user');
      }

      // Handle merchant plans
      let merchantPlans = [];
      if (merchantPlansRes.status === 'fulfilled' && merchantPlansRes.value?.data?.success) {
        merchantPlans = merchantPlansRes.value.data.plans.filter(plan => plan.type === 'merchant') || [];
      } else {
        merchantPlans = allPlans.filter(plan => plan.type === 'merchant');
      }

      setReferenceData({
        communities,
        plans: allPlans,
        userPlans,
        merchantPlans,
        userTypes: ['user', 'merchant', 'admin'],
        statuses: ['pending', 'approved', 'rejected', 'suspended']
      });

      console.log('✅ Reference data loaded:', {
        communities: communities.length,
        allPlans: allPlans.length,
        userPlans: userPlans.length,
        merchantPlans: merchantPlans.length
      });
    } catch (err) {
      console.error('❌ Error fetching reference data:', err);
      setReferenceData({
        communities: [{ name: 'General', isActive: true }],
        plans: fallbackPlans,
        userPlans: fallbackPlans.filter(plan => plan.type === 'user'),
        merchantPlans: fallbackPlans.filter(plan => plan.type === 'merchant'),
        userTypes: ['user', 'merchant', 'admin'],
        statuses: ['pending', 'approved', 'rejected', 'suspended']
      });
    }
  }, [fallbackPlans]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all' && (typeof value !== 'string' || value.trim() !== '')) {
          queryParams.set(key, value);
        }
      });

      const response = await api.get(`/admin/users?${queryParams}`);
      
      if (response.data.success) {
        const fetchedUsers = response.data.users || [];
        const paginationData = response.data.pagination || {};

        const processedUsers = fetchedUsers.map(user => {
          const planDetails = referenceData.plans.find(plan => plan.key === user.membershipType);
          return {
            ...user,
            planValidTill: calculatePlanValidity(user, planDetails),
            isPlanExpired: user.validationDate ? new Date(user.validationDate) < new Date() : false
          };
        });

        setUsers(processedUsers);
        setPagination(prev => ({
          ...prev,
          total: paginationData.total || response.data.total || 0,
          totalPages: paginationData.totalPages || response.data.totalPages || 1
        }));

        console.log('👥 Users loaded:', processedUsers.length);
      } else {
        throw new Error(response.data.message || 'Failed to fetch users');
      }
    } catch (err) {
      console.error('❌ Error fetching users:', err);
      setError(err.response?.data?.message || 'Failed to load users');
      if (err.response?.status === 401) {
        handleSessionExpired();
        return;
      }
      showNotification('Failed to load users', 'error');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit, showNotification, handleSessionExpired, referenceData.plans, calculatePlanValidity]);



  // Get plans for specific user type
  const getPlansForUserType = useCallback((userType) => {
    console.log(`🔍 Getting plans for userType: ${userType}`);
    let plans = [];
    if (userType === 'merchant') {
      plans = referenceData.merchantPlans.filter(plan => plan.type === 'merchant');
    } else if (userType === 'user' || userType === 'admin') {
      plans = referenceData.userPlans.filter(plan => plan.type === 'user');
    }
    console.log(`✅ Filtered plans for ${userType}:`, plans);
    return plans;
  }, [referenceData.merchantPlans, referenceData.userPlans]);


  // User action handlers

  const handleStatusChange = useCallback(async (userId, status) => {
    try {
      const response = await api.put(`/admin/users/${userId}/status`, { status });
      
      if (response.data.success) {
        showNotification(`User ${status} successfully`, 'success');
        refreshData();
      } else {
        throw new Error(response.data.message || 'Failed to update status');
      }
    } catch (err) {
      console.error('❌ Error updating status:', err);
      const message = err.response?.data?.message || 'Failed to update status';
      showNotification(message, 'error');
    }
  }, [showNotification, refreshData]);

  const handleBulkAction = useCallback(async (action, userIds = selectedUsers) => {
    if (!userIds.length) {
      showNotification('No users selected', 'warning');
      return;
    }

    try {
      let response;
      if (action === 'delete') {
        const promises = userIds.map(id => api.delete(`/admin/users/${id}`));
        await Promise.all(promises);
        response = { data: { success: true } };
      } else {
        response = await api.post('/admin/users/bulk-action', { action, userIds });
      }

      if (response.data.success) {
        const actionText = action === 'approve' ? 'approved' : 
                          action === 'reject' ? 'rejected' : 
                          action === 'suspend' ? 'suspended' : 
                          action === 'activate' ? 'activated' : 
                          action === 'delete' ? 'deleted' : action;
        
        showNotification(`Successfully ${actionText} ${userIds.length} users`, 'success');
        refreshData();
        closeModal();
      } else {
        throw new Error(response.data.message || 'Bulk action failed');
      }
    } catch (err) {
      console.error('❌ Error performing bulk action:', err);
      const message = err.response?.data?.message || 'Bulk action failed';
      showNotification(message, 'error');
    }
  }, [selectedUsers, showNotification, refreshData, closeModal]);

  // UI handlers
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handlePageChange = useCallback((page) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const handlePageSizeChange = useCallback((limit) => {
    setPagination(prev => ({ ...prev, limit, page: 1 }));
  }, []);

  const handleUserSelect = useCallback((userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedUsers.length === users.length && users.length > 0) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user.id));
    }
  }, [selectedUsers.length, users]);

  const openModal = useCallback((type, user = null, additionalData = {}) => {
    const titles = {
      delete: 'Delete User',
      bulkDelete: `Delete ${selectedUsers.length} Users`,
      assignPlan: `Assign Plan to ${user?.fullName || 'User'}`
    };

    setModalState({
      isOpen: true,
      type,
      user,
      title: titles[type] || 'User Action',
      data: additionalData
    });
  }, [selectedUsers.length]);

  const handleExportUsers = useCallback(async (exportFilters = filters) => {
    try {
      const queryParams = new URLSearchParams(exportFilters);
      const response = await api.get(`/admin/users/export?${queryParams}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `users-export-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showNotification('Users exported successfully', 'success');
    } catch (err) {
      console.error('❌ Error exporting users:', err);
      showNotification('Failed to export users', 'error');
    }
  }, [filters, showNotification]);

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      status: 'all',
      userType: 'all',
      community: 'all'
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  // Effects
  useEffect(() => {
    initializeComponent();
  }, []);

  useEffect(() => {
    if (referenceData.plans.length > 0 || refreshTrigger > 0) {
      fetchUsers();
    }
  }, [referenceData.plans.length, filters, pagination.page, refreshTrigger]);

  // Loading state
  if (loading && users.length === 0) {
    return (
      <div className="user-management-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Please wait while we load your user data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && users.length === 0) {
    return (
      <div className="user-management-container">
        <div className="error-state">
          <i className="fas fa-exclamation-triangle"></i>
          <h3>Error Loading Users</h3>
          <p>{error}</p>
          <button onClick={initializeComponent} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-left">
            {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="stat-content">
              <h3>{stats.totalUsers}</h3>
              <p>Total Users</p>
            </div>
          </div>
          <div className="stat-card pending">
            <div className="stat-icon">
              <i className="fas fa-clock"></i>
            </div>
            <div className="stat-content">
              <h3>{stats.pendingApprovals}</h3>
              <p>Pending Approvals</p>
            </div>
          </div>
          <div className="stat-card active">
            <div className="stat-icon">
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="stat-content">
              <h3>{stats.activeUsers}</h3>
              <p>Active Users</p>
            </div>
          </div>
          <div className="stat-card suspended">
            <div className="stat-icon">
              <i className="fas fa-ban"></i>
            </div>
            <div className="stat-content">
              <h3>{stats.suspendedUsers}</h3>
              <p>Suspended Users</p>
            </div>
          </div>
        </div>
          </div>

          <div className="header-actions">
            <button
              onClick={() => navigate('/admin/users/create')}
              className="btn btn-primary"
            >
              <i className="fas fa-plus"></i>
              Add User
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <UserFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
        onExport={handleExportUsers}
        referenceData={referenceData}
        loading={loading}
      />

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <BulkActions
          selectedCount={selectedUsers.length}
          onBulkAction={handleBulkAction}
          onClearSelection={clearSelections}
          loading={loading}
        />
      )}

      {/* Users Table */}
      <UserTable
        users={users}
        selectedUsers={selectedUsers}
        onUserSelect={handleUserSelect}
        onSelectAll={handleSelectAll}
  onUserAction={() => {}}
        onStatusChange={handleStatusChange}
        referenceData={referenceData}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        getPlansForUserType={getPlansForUserType}
        calculatePlanValidity={calculatePlanValidity}
      />

      {/* Modal for Delete and Plan Assignment only */}
      {modalState.isOpen && (
        <UserModal
          type={modalState.type}
          user={modalState.user}
          title={modalState.title}
          referenceData={referenceData}
          selectedUsers={selectedUsers}
          onClose={closeModal}
    onSubmit={null}
        />
      )}
    </div>
  );
};

export default UserManagement;
