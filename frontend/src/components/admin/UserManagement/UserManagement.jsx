import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../../contexts/NotificationContext';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';
import useFilterPersistence from '../../../hooks/useFilterPersistence';
import UserTable from './components/UserTable';
import UserFilters from './components/UserFilters';
import UserModal from './components/UserModal';
import BulkActions from './components/BulkActions';
import QuickEditRedemptionLimit from './components/QuickEditRedemptionLimit';
import QuickChangePassword from './components/QuickChangePassword';
import './UserManagement.css';


const UserManagement = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { validateSession, handleSessionExpired } = useAuth();

  // State declarations
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  const [modalState, setModalState] = useState({
    isOpen: false,
    type: null,
    user: null,
    title: '',
    data: null
  });

  const [planAssignmentState, setPlanAssignmentState] = useState({
    isLoading: false,
    selectedUser: null,
    availablePlans: [],
    userType: null
  });

  const [warningState, setWarningState] = useState({
    isOpen: false,
    type: null,
    action: null,
    user: null,
    userIds: [],
    message: '',
    details: '',
    onConfirm: null
  });

  const [quickEditRedemptionState, setQuickEditRedemptionState] = useState({
    isOpen: false,
    user: null
  });

  const [quickChangePasswordState, setQuickChangePasswordState] = useState({
    isOpen: false,
    user: null
  });

  const [filters, setFilters, resetFilters] = useFilterPersistence('admin-user-management-filters', {
    search: '',
    status: 'all',
    userType: 'all',
    community: 'all',
    membershipType: 'all',
    bloodGroup: 'all',
    planStatus: 'all'
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20, // Increase default limit from 10 to 20
    total: 0,
    totalPages: 0
  });

  const [referenceData, setReferenceData] = useState({
    communities: [],
    plans: [],
    userPlans: [],
    merchantPlans: [],
    userTypes: ['user', 'merchant', 'admin'],
    statuses: ['pending', 'approved', 'rejected', 'suspended']
  });

  // Memoized values (useMemo)
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

  // Stats state - fetched from backend for full statistics
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingApprovals: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    expiredUsers: 0,
    expiringSoonUsers: 0
  });

  // Utility functions (useCallback)
  const calculatePlanValidity = useCallback((user, planDetails) => {
    // ONLY use validationDate - this is the source of truth for plan expiry
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
    return 'No validity set';
  }, []);

  const clearSelections = useCallback(() => {
    setSelectedUsers([]);
  }, []);

  // Define fetchUserStats before refreshData to avoid "Cannot access 'fetchUserStats' before initialization"
  const fetchUserStats = useCallback(async () => {
    try {
      const response = await api.get('/admin/users/statistics');
      if (response.data.success) {
        setStats(response.data.statistics || {
          totalUsers: 0,
          pendingApprovals: 0,
          activeUsers: 0,
          suspendedUsers: 0,
          expiredUsers: 0,
          expiringSoonUsers: 0
        });
      }
    } catch (err) {
      console.error('Failed to fetch user statistics:', err);
      // Keep existing stats on error
    }
  }, []);

  const refreshData = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    clearSelections();
    // Refresh stats whenever data is refreshed, but don't let stats errors affect the main operation
    try {
      fetchUserStats();
    } catch (statsError) {
      console.error('Error refreshing user stats:', statsError);
    }
  }, [clearSelections, fetchUserStats]);

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

  const showWarningDialog = useCallback((warningConfig) => {
    setWarningState({
      isOpen: true,
      type: warningConfig.type,
      action: warningConfig.action,
      user: warningConfig.user || null,
      userIds: warningConfig.userIds || [],
      message: warningConfig.message,
      details: warningConfig.details,
      onConfirm: warningConfig.onConfirm
    });
  }, []);

  const closeWarningDialog = useCallback(() => {
    setWarningState({
      isOpen: false,
      type: null,
      action: null,
      user: null,
      userIds: [],
      message: '',
      details: '',
      onConfirm: null
    });
  }, []);

  const handleWarningConfirm = useCallback(async () => {
    if (warningState.onConfirm) {
      try {
        await warningState.onConfirm();
        closeWarningDialog();
      } catch (error) {
        console.error('Warning action failed:', error);
        // Keep dialog open on error
      }
    } else {
      closeWarningDialog();
    }
  }, [warningState.onConfirm, closeWarningDialog]);

  const getPlansForUserType = useCallback((userType) => {
    let plans = [];
    if (userType === 'merchant') {
      plans = referenceData.merchantPlans.filter(plan => plan.type === 'merchant');
    } else if (userType === 'user' || userType === 'admin') {
      plans = referenceData.userPlans.filter(plan => plan.type === 'user');
    }
    return plans;
  }, [referenceData.merchantPlans, referenceData.userPlans]);

  // API functions
  const fetchReferenceData = useCallback(async () => {
    try {
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

      setReferenceData(prevData => {
      // Only update if plans actually changed
      if (JSON.stringify(prevData.plans) === JSON.stringify(allPlans)) {
        return prevData; // Prevent unnecessary re-render
      }
      return {
        communities,
        plans: allPlans,
        userPlans,
        merchantPlans,
        userTypes: ['user', 'merchant', 'admin'],
        statuses: ['pending', 'approved', 'rejected', 'suspended']
      };
    });

    } catch (err) {
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

      console.log('🔍 UserManagement API Response:', {
        success: response.data.success,
        usersCount: response.data.users?.length || 0,
        pagination: response.data.pagination,
        firstUser: response.data.users?.[0],
        lastUser: response.data.users?.[response.data.users?.length - 1]
      });

      if (response.data.success) {
        const fetchedUsers = response.data.users || [];
        const paginationData = response.data.pagination || {};

        const processedUsers = fetchedUsers.map(user => {
          const planDetails = referenceData.plans.find(plan => plan.key === user.membershipType);
          return {
            ...user,
            bloodGroup: user.bloodGroup || '',
            planValidTill: calculatePlanValidity(user, planDetails),
            isPlanExpired: user.validationDate ? new Date(user.validationDate) < new Date() : false
          };
        });

        console.log('🔍 UserManagement Processed Users:', {
          processedUsersCount: processedUsers.length,
          processedUsers: processedUsers.slice(0, 5), // First 5 users
          finalPagination: paginationData
        });

        setUsers(processedUsers);
        // Defensive: always set totalPages to at least 1, and compute if missing
        const total = paginationData.total || response.data.total || 0;
        const limit = paginationData.limit || response.data.limit || pagination.limit || 10;
        let totalPages = paginationData.totalPages || response.data.totalPages;
        if (!totalPages) {
          totalPages = Math.ceil(total / limit) || 1;
        }
        setPagination(prev => ({
          ...prev,
          total,
          limit, // Add limit to the pagination state update
          totalPages: totalPages < 1 ? 1 : totalPages
        }));

      } else {
        throw new Error(response.data.message || 'Failed to fetch users');
      }
    } catch (err) {
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
  }, [filters, pagination.page, pagination.limit, handleSessionExpired, referenceData.plans, calculatePlanValidity]);

  const initializeComponent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const sessionValid = await validateSession();
      if (!sessionValid) {
        handleSessionExpired();
        return;
      }
      await Promise.all([
        fetchReferenceData(),
        fetchUserStats()
      ]);
    } catch (err) {
      setError('Failed to initialize user management');
      showNotification('Failed to load user management', 'error');
    } finally {
      setLoading(false);
    }
  }, [validateSession, handleSessionExpired, fetchReferenceData, fetchUserStats, showNotification]);

  // Event handlers
  const handleStatusChange = useCallback(async (userId, status) => {
    const user = users.find(u => u.id === userId);

    // Show warning for suspend action
    if (status === 'suspended') {
      showWarningDialog({
        type: 'suspend',
        action: 'suspend',
        user: user,
        message: `Are you sure you want to suspend ${user?.fullName}?`,
        details: 'This action will suspend the user\'s account and restrict their access to the platform.',
        onConfirm: async () => {
          try {
            // Validate session first
            const isSessionValid = await validateSession();
            if (!isSessionValid) {
              showNotification('Your session has expired. Please log in again.', 'error');
              return;
            }

            let successCount = 0;
            let lastError = null;

            // Call both endpoints: users and partners (similar to bulk action)
            try {
              const usersRes = await api.put(`/admin/users/${userId}/status`, { status });
              if (usersRes.data?.success) {
                successCount++;
              }
            } catch (userError) {
              console.log('Users endpoint error:', userError);
              lastError = userError;
            }

            try {
              const partnersRes = await api.put(`/admin/partners/${userId}/status`, { status });
              if (partnersRes.data?.success) {
                successCount++;
              }
            } catch (partnerError) {
              console.log('Partners endpoint error:', partnerError);
              if (!lastError) lastError = partnerError;
            }

            if (successCount > 0) {
              showNotification(`User suspended successfully`, 'success');
              refreshData();
            } else {
              throw lastError || new Error('Failed to suspend user');
            }
          } catch (err) {
            const message = err.response?.data?.message || 'Failed to suspend user';
            showNotification(message, 'error');
            throw err; // Re-throw to keep dialog open
          }
        }
      });
      return;
    }

    // For other status changes, proceed directly with both endpoints
    try {
      // Validate session first
      const isSessionValid = await validateSession();
      if (!isSessionValid) {
        showNotification('Your session has expired. Please log in again.', 'error');
        return;
      }

      let successCount = 0;
      let lastError = null;

      // Call both endpoints: users and partners (similar to bulk action)
      try {
        const usersRes = await api.put(`/admin/users/${userId}/status`, { status });
        if (usersRes.data?.success) {
          successCount++;
        }
      } catch (userError) {
        console.log('Users endpoint error:', userError);
        lastError = userError;
      }

      try {
        const partnersRes = await api.put(`/admin/partners/${userId}/status`, { status });
        if (partnersRes.data?.success) {
          successCount++;
        }
      } catch (partnerError) {
        console.log('Partners endpoint error:', partnerError);
        if (!lastError) lastError = partnerError;
      }

      if (successCount > 0) {
        showNotification(`User ${status} successfully`, 'success');
        refreshData();
      } else {
        throw lastError || new Error('Failed to update status');
      }
    } catch (err) {
      console.error('Status change error:', err);
      if (err.response?.status === 401) {
        handleSessionExpired();
        return;
      }
      const message = err.response?.data?.message || err.message || 'Failed to update status';
      showNotification(message, 'error');
    }
  }, [users, showWarningDialog, showNotification, refreshData, validateSession, handleSessionExpired]);

  const handleBulkAction = useCallback(async (action, userIds = selectedUsers) => {
    if (!userIds || userIds.length === 0) {
      showNotification('No users selected', 'warning');
      return;
    }

    const actionMessages = {
      approve: {
        message: `Are you sure you want to approve ${userIds.length} selected users?`,
        details: 'This will grant access to the platform for all selected users.',
        confirmText: 'approved'
      },
      reject: {
        message: `Are you sure you want to reject ${userIds.length} selected users?`,
        details: 'This will deny access to the platform for all selected users.',
        confirmText: 'rejected'
      },
      suspend: {
        message: `Are you sure you want to suspend ${userIds.length} selected users?`,
        details: 'This will suspend all selected users and restrict their access to the platform.',
        confirmText: 'suspended'
      },
      activate: {
        message: `Are you sure you want to activate ${userIds.length} selected users?`,
        details: 'This will restore access to the platform for all selected users.',
        confirmText: 'activated'
      },
      delete: {
        message: `Are you sure you want to delete ${userIds.length} selected users?`,
        details: 'This action cannot be undone. All user data will be permanently removed.',
        confirmText: 'deleted'
      }
    };

    const config = actionMessages[action];
    if (!config) {
      showNotification('Invalid bulk action', 'error');
      return;
    }

    showWarningDialog({
      type: 'bulk',
      action: action,
      userIds: userIds,
      message: config.message,
      details: config.details,
      onConfirm: async () => {
        try {
          // Validate session first
          const isSessionValid = await validateSession();
          if (!isSessionValid) {
            showNotification('Your session has expired. Please log in again.', 'error');
            return;
          }

          // Call both endpoints: users and partners
          const [usersRes, partnersRes] = await Promise.allSettled([
            api.post('/admin/users/bulk-action', { action, userIds }),
            api.post('/admin/partners/bulk-action', { action, merchantIds: userIds })
          ]);

          const usersSuccess = usersRes.status === 'fulfilled' && usersRes.value?.data?.success;
          const partnersSuccess = partnersRes.status === 'fulfilled' && partnersRes.value?.data?.success;

          if (usersSuccess || partnersSuccess) {
            const totalCount = Array.isArray(userIds) ? userIds.length : 0;
            showNotification(`Successfully ${config.confirmText} ${totalCount} users/partners.`, 'success');
            setSelectedUsers([]);
            // Refresh data
            try {
              await fetchUsers();
            } catch (e) {
              // ignore fetch error, still trigger refresh
            }
            refreshData();
          } else {
            // Aggregate errors
            const userErr = usersRes.status === 'rejected' ? usersRes.reason : null;
            const partnerErr = partnersRes.status === 'rejected' ? partnersRes.reason : null;
            console.error('Bulk action failures:', { userErr, partnerErr });
            throw new Error(usersRes.status === 'rejected' ? usersRes.reason?.message || 'Users bulk action failed' : partnerErr?.message || 'Partners bulk action failed');
          }
        } catch (err) {
          console.error('Bulk action error:', err);
          if (err.response?.status === 401) {
            handleSessionExpired();
            return;
          }
          const message = err.response?.data?.message || err.message || 'Bulk action failed';
          showNotification(message, 'error');
          throw err; // Re-throw to keep dialog open
        }
      }
    });
  }, [selectedUsers, showWarningDialog, validateSession, handleSessionExpired, refreshData, fetchUsers]);

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

  const handleQuickEditRedemption = useCallback((user) => {
    setQuickEditRedemptionState({
      isOpen: true,
      user: user
    });
  }, []);

  const closeQuickEditRedemption = useCallback(() => {
    setQuickEditRedemptionState({
      isOpen: false,
      user: null
    });
  }, []);

  const handleQuickEditUpdate = useCallback(() => {
    // Refresh users data after update
    fetchUsers();
    closeQuickEditRedemption();
  }, []);

  const handleQuickChangePassword = useCallback((user) => {
    setQuickChangePasswordState({
      isOpen: true,
      user: user
    });
  }, []);

  const closeQuickChangePassword = useCallback(() => {
    setQuickChangePasswordState({
      isOpen: false,
      user: null
    });
  }, []);

  const handlePasswordChangeUpdate = useCallback(() => {
    // Close the modal after successful password change
    closeQuickChangePassword();
    // Optionally refresh users data if needed
    // fetchUsers();
  }, []);

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

  const handleExportUsers = useCallback(async () => {
    try {
      showNotification('Preparing user export...', 'info');
      // Build query params the same way as fetchUsers to avoid sending empty/'all' values
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all' && (typeof value !== 'string' || value.trim() !== '')) {
          queryParams.set(key, value);
        }
      });

      const queryString = queryParams.toString();
      const url = queryString ? `/admin/users/export?${queryString}` : `/admin/users/export`;

      const response = await api.get(url, {
        responseType: 'blob'
      });

      // If backend returned JSON (error) as a blob, parse and surface message
      if (response.data && response.data.type && response.data.type.includes('application/json')) {
        try {
          const text = await response.data.text();
          const json = JSON.parse(text);
          const msg = json?.message || json?.error || 'Failed to export users';
          showNotification(msg, 'error');
          return;
        } catch (e) {
          console.error('Failed to parse JSON error blob from export response', e);
          showNotification('Failed to export users', 'error');
          return;
        }
      }

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `users-export-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);

      showNotification('Users exported successfully', 'success');
    } catch (err) {
      console.error('Export error:', err);
      // If server returned a JSON error as a blob (axios error with blob body), parse it
      try {
        const errData = err.response?.data;
        if (errData && typeof errData.text === 'function') {
          const text = await errData.text();
          try {
            const json = JSON.parse(text);
            const message = json?.message || json?.error || 'Failed to export users';
            showNotification(message, 'error');
            return;
          } catch (parseErr) {
            // not JSON
            showNotification('Failed to export users', 'error');
            return;
          }
        }
      } catch (e) {
        // ignore parsing errors
      }
      const message = err.response?.data?.message || 'Failed to export users';
      showNotification(message, 'error');
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

  // Effects (useEffect)
  useEffect(() => {
  if (!isInitialized) {
    initializeComponent().then(() => setIsInitialized(true));
    }
  }, [isInitialized, initializeComponent]);

  useEffect(() => {
    if (referenceData.plans.length > 0) {
      fetchUsers();
    }
  }, [fetchUsers, referenceData.plans.length, filters, pagination.page, refreshTrigger]); // Removed fetchUsers dependency

  // Render logic
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
      {/* User Statistics Bar - Matching Deal Management Style */}
      <div className="user-stats-bar">
        <div className="user-stat">
          <div className="stat-label">Total Users</div>
          <div className="stat-value">{stats.totalUsers}</div>
        </div>
        <div className="user-stat">
          <div className="stat-label">Pending Approvals</div>
          <div className="stat-value">{stats.pendingApprovals}</div>
        </div>
        <div className="user-stat">
          <div className="stat-label">Active Users</div>
          <div className="stat-value">{stats.activeUsers}</div>
        </div>
        <div className="user-stat">
          <div className="stat-label">Suspended Users</div>
          <div className="stat-value">{stats.suspendedUsers}</div>
        </div>
        <div className="user-stat expired">
          <div className="stat-label">Expired Users</div>
          <div className="stat-value">{stats.expiredUsers}</div>
        </div>
        <div className="user-stat expiring-soon">
          <div className="stat-label">Expiring Soon</div>
          <div className="stat-value">{stats.expiringSoonUsers}</div>
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
        headerActions={
          <button
            onClick={() => navigate('/admin/users/create')}
            className="btn btn-primary"
          >
            <i className="fas fa-plus"></i>
            Add User
          </button>
        }
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
        onQuickEditRedemption={handleQuickEditRedemption}
        onQuickChangePassword={handleQuickChangePassword}
        referenceData={referenceData}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        getPlansForUserType={getPlansForUserType}
        calculatePlanValidity={calculatePlanValidity}
      />

      {/* Warning Dialog */}
      {warningState.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Confirm Action</h2>
              <button onClick={closeWarningDialog} className="modal-close">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className={`warning-box warning-${warningState.action === 'delete' ? 'danger' : warningState.action === 'suspend' ? 'warning' : 'info'}`}>
                <div className="warning-icon">
                  <i className={`fas ${warningState.action === 'delete' ? 'fa-trash' : warningState.action === 'suspend' ? 'fa-ban' : 'fa-exclamation-triangle'}`}></i>
                </div>
                <div className="warning-content">
                  <h3>{warningState.type === 'bulk' ? 'Bulk Action' : 'User Action'}</h3>
                  <p className="warning-message">{warningState.message}</p>
                  <p className="warning-details">{warningState.details}</p>
                </div>
                <div className="warning-actions">
                  <button 
                    onClick={closeWarningDialog} 
                    className="btn btn-secondary"
                    type="button"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleWarningConfirm}
                    className={`btn ${warningState.action === 'delete' ? 'btn-danger' : warningState.action === 'suspend' ? 'btn-warning' : 'btn-primary'}`}
                    type="button"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Edit Redemption Limit Modal */}
      <QuickEditRedemptionLimit
        user={quickEditRedemptionState.user}
        isOpen={quickEditRedemptionState.isOpen}
        onClose={closeQuickEditRedemption}
        onUpdate={handleQuickEditUpdate}
      />

      {/* Quick Change Password Modal */}
      <QuickChangePassword
        user={quickChangePasswordState.user}
        isOpen={quickChangePasswordState.isOpen}
        onClose={closeQuickChangePassword}
        onUpdate={handlePasswordChangeUpdate}
      />
    </div>
  );
};

export default UserManagement;
