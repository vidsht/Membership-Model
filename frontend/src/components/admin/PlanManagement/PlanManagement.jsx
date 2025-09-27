import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotification } from '../../../contexts/NotificationContext';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';
import { SimpleBarChart, SimplePieChart } from '../../shared/Charts';
import Modal from '../../shared/Modal';
import { useModal } from '../../../hooks/useModal';
import './PlanManagement.css';

/**
 * PlanManagement component for viewing and managing membership plans
 * @returns {React.ReactElement} The plan management component
 */
const PlanManagement = () => {
  const { showNotification } = useNotification();
  const { validateSession, handleSessionExpired } = useAuth();
  const navigate = useNavigate();
  const { modalState, showDeleteConfirm, closeModal } = useModal();
  
  // Force close modal on component mount to prevent stuck modals
  useEffect(() => {
    closeModal();
  }, [closeModal]);
  // Add state for plans
  const [userPlans, setUserPlans] = useState([]);
  const [merchantPlans, setMerchantPlans] = useState([]);
  const [users, setUsers] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Add merchant pagination state
  const [merchantPagination, setMerchantPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    pageSize: 10,
    totalMerchants: 0
  });
  
  // Add user pagination state
  const [userPagination, setUserPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    pageSize: 10,
    totalUsers: 0
  });
  
  // Add search states
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [merchantSearchTerm, setMerchantSearchTerm] = useState('');
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    communityUsers: 0,
    silverUsers: 0,
    goldUsers: 0,
    totalMerchants: 0,
    basicBusinessUsers: 0,
    professionalBusinessUsers: 0,
    enterpriseBusinessUsers: 0
  });
  // Add analytics state
  const [analytics, setAnalytics] = useState({
    planUsage: [],
    upgradeConversions: [],
    upcomingExpiries: { users: 0, merchants: 0 }
  });

  useEffect(() => {
    const fetchPlanStatsAndPlansAndUsers = async () => {
      try {
        setIsLoading(true);
        // Fetch dashboard stats (for userPlanCounts, merchantPlanCounts)
        const dashboardResponse = await api.get('/admin/dashboard');
        const dashboardStats = dashboardResponse.data.stats || {};
        setStats(prev => ({
          ...prev,
          ...dashboardStats,
          userPlanCounts: dashboardStats.userPlanCounts || {},
          merchantPlanCounts: dashboardStats.merchantPlanCounts || {}
        }));
        // Fetch user plans from the new plans endpoint
        const userPlansResponse = await api.get('/plans?type=user&isActive=true');
        setUserPlans(userPlansResponse.data.plans || []);
        // Fetch merchant plans from the new plans endpoint  
        const merchantPlansResponse = await api.get('/plans?type=merchant&isActive=true');
        setMerchantPlans(merchantPlansResponse.data.plans || []);
        // Fetch users
        const usersResponse = await api.get('/admin/users?userType=user');
        setUsers(usersResponse.data.users || []);
        
        // Set initial pagination data for users
        const totalUsers = usersResponse.data.users?.length || 0;
        setUserPagination(prev => ({
          ...prev,
          totalUsers: totalUsers,
          totalPages: Math.ceil(totalUsers / prev.pageSize)
        }));
        
        // Fetch merchants using the partners endpoint which includes business info
        const merchantsResponse = await api.get('/admin/partners');
        setMerchants(merchantsResponse.data.merchants || []);
        
        // Set initial pagination data for merchants
        const totalMerchants = merchantsResponse.data.merchants?.length || 0;
        setMerchantPagination(prev => ({
          ...prev,
          totalMerchants: totalMerchants,
          totalPages: Math.ceil(totalMerchants / prev.pageSize)
        }));
        // Fetch analytics data
        try {
          const analyticsResponse = await api.get('/admin/plan-analytics');
          setAnalytics(analyticsResponse.data.analytics || {
            planUsage: [],
            upgradeConversions: [],
            upcomingExpiries: { users: 0, merchants: 0 }
          });
        } catch (analyticsError) {
          console.log('Analytics not available:', analyticsError.message);
        }
        // Calculate upcoming expiries from user data
        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        // Count expiring users
        const expiringUsers = usersResponse.data.users?.filter(user => {
          if (!user.planExpiryDate) return false;
          const expiryDate = new Date(user.planExpiryDate);
          return expiryDate >= now && expiryDate <= sevenDaysFromNow;
        }).length || 0;
        // Count expiring merchants
        const expiringMerchants = merchantsResponse.data.merchants?.filter(merchant => {
          if (!merchant.validationDate) return false;
          const expiryDate = new Date(merchant.validationDate);
          return expiryDate >= now && expiryDate <= sevenDaysFromNow;
        }).length || 0;
        // Update analytics with calculated expiries
        setAnalytics(prev => ({
          ...prev,
          upcomingExpiries: {
            users: expiringUsers,
            merchants: expiringMerchants
          }
        }));
      } catch (error) {
        console.error('Error fetching plan stats, plans, or users:', error);
        if (error.response?.status === 401) {
          handleSessionExpired();
          return;
        }
        showNotification('Error loading plan stats, plans, or users', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPlanStatsAndPlansAndUsers();
  }, []);
  const formatPrice = (price, currency = 'GHS') => {
    if (price === 0) return 'Free';
    return `${currency} ${price}`;
  };

  const formatBillingCycle = (cycle) => {
    const cycles = {
      'monthly': 'month',
      'yearly': 'year',
      'lifetime': 'lifetime'
    };
    return cycles[cycle] || cycle;
  };

  // Use backend stats for plan counts
  const getUserCountForPlan = (planKey, userType = 'user') => {
    if (userType === 'user') {
      return stats.userPlanCounts?.[planKey] || 0;
    } else {
      return stats.merchantPlanCounts?.[planKey] || 0;
    }
  };

  // Helper function to get expiry status and CSS class
  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) {
      return { status: 'no-expiry', class: 'expiry-none', text: 'N/A' };
    }

    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { 
        status: 'expired', 
        class: 'expiry-expired', 
        text: expiry.toLocaleDateString('en-GB', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        })
      };
    } else if (diffDays <= 15) {
      return { 
        status: 'expiring-soon', 
        class: 'expiry-warning', 
        text: expiry.toLocaleDateString('en-GB', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        })
      };
    } else {
      return { 
        status: 'active', 
        class: 'expiry-active', 
        text: expiry.toLocaleDateString('en-GB', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        })
      };
    }
  };

  const handlePlanAssignment = (userId) => {
    if (!userId) {
      showNotification('Error: No user ID provided for plan assignment', 'error');
      return;
    }
    
    try {
      navigate(`/admin/plan-management/users/${userId}/assign-plan`);
    } catch (error) {
      console.error('Error during navigation:', error);
      showNotification('Error navigating to plan assignment page', 'error');
    }
  };

  // Merchant pagination functions
  const handleMerchantPageChange = (page) => {
    setMerchantPagination(prev => ({ ...prev, currentPage: page }));
  };

  const getPaginatedMerchants = () => {
    const filteredMerchants = getFilteredMerchants();
    const startIndex = (merchantPagination.currentPage - 1) * merchantPagination.pageSize;
    const endIndex = startIndex + merchantPagination.pageSize;
    return filteredMerchants.slice(startIndex, endIndex);
  };

  // User pagination functions
  const handleUserPageChange = (page) => {
    setUserPagination(prev => ({ ...prev, currentPage: page }));
  };

  const getFilteredUsers = () => {
    if (!userSearchTerm.trim()) {
      return users;
    }
    return users.filter(user => 
      user.fullName?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.membershipType?.toLowerCase().includes(userSearchTerm.toLowerCase())
    );
  };

  const getPaginatedUsers = () => {
    const filteredUsers = getFilteredUsers();
    const startIndex = (userPagination.currentPage - 1) * userPagination.pageSize;
    const endIndex = startIndex + userPagination.pageSize;
    return filteredUsers.slice(startIndex, endIndex);
  };

  // Merchant search and filter functions
  const getFilteredMerchants = () => {
    if (!merchantSearchTerm.trim()) {
      return merchants;
    }
    return merchants.filter(merchant => 
      merchant.fullName?.toLowerCase().includes(merchantSearchTerm.toLowerCase()) ||
      merchant.email?.toLowerCase().includes(merchantSearchTerm.toLowerCase()) ||
      merchant.businessName?.toLowerCase().includes(merchantSearchTerm.toLowerCase()) ||
      merchant.businessCategory?.toLowerCase().includes(merchantSearchTerm.toLowerCase()) ||
      merchant.membershipType?.toLowerCase().includes(merchantSearchTerm.toLowerCase())
    );
  };

  // Search handlers
  const handleUserSearch = (searchTerm) => {
    setUserSearchTerm(searchTerm);
    // Calculate filtered users count
    const filteredCount = searchTerm.trim() ? 
      users.filter(user => 
        user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.membershipType?.toLowerCase().includes(searchTerm.toLowerCase())
      ).length : users.length;
    
    setUserPagination(prev => ({ 
      ...prev, 
      currentPage: 1,
      totalUsers: filteredCount,
      totalPages: Math.ceil(filteredCount / prev.pageSize)
    }));
  };

  const handleMerchantSearch = (searchTerm) => {
    setMerchantSearchTerm(searchTerm);
    // Calculate filtered merchants count
    const filteredCount = searchTerm.trim() ? 
      merchants.filter(merchant => 
        merchant.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        merchant.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        merchant.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        merchant.businessCategory?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        merchant.membershipType?.toLowerCase().includes(searchTerm.toLowerCase())
      ).length : merchants.length;
    
    setMerchantPagination(prev => ({ 
      ...prev, 
      currentPage: 1,
      totalMerchants: filteredCount,
      totalPages: Math.ceil(filteredCount / prev.pageSize)
    }));
  };  // Delete plan handler
  const handleDeletePlan = async (planId, planName) => {
    if (!planId) return;
    
    try {
      const confirmed = await showDeleteConfirm(planName);
      
      if (confirmed) {
        setIsLoading(true);
        await api.delete(`/plans/${planId}`);
        
        // Refetch stats and plans after deletion
        const statsResponse = await api.get('/admin/stats');
        setStats(statsResponse.data.stats || {});
        
        // Refetch plans
        const userPlansResponse = await api.get('/plans?type=user&isActive=true');
        setUserPlans(userPlansResponse.data.plans || []);
        
        const merchantPlansResponse = await api.get('/plans?type=merchant&isActive=true');
        setMerchantPlans(merchantPlansResponse.data.plans || []);
        
        showNotification(`Plan "${planName}" deleted successfully.`, 'success');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
      showNotification(error.response?.data?.error || 'Failed to delete plan.', 'error');
      setIsLoading(false);
    }
  };

  // In renderOverview, use userPlans and merchantPlans for plan cards
  const renderOverview = () => (
    <div className="plan-overview">
      <div className="overview-stats">
        <div className="stat-cards">
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="stat-content">
              <h3>Total Users</h3>
              <p className="stat-number">{stats.totalUsers}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-store"></i>
            </div>
            <div className="stat-content">
              <h3>Total Merchants</h3>
              <p className="stat-number">{stats.totalMerchants}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-crown"></i>
            </div>
            <div className="stat-content">
              <h3>User Plans</h3>
              <p className="stat-number">{userPlans.length}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-briefcase"></i>
            </div>
            <div className="stat-content">
              <h3>Business Plans</h3>
              <p className="stat-number">{merchantPlans.length}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="stat-content">
              <h3>Active Plans</h3>
              <p className="stat-number">{[...userPlans, ...merchantPlans].filter(p => p.isActive).length}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-chart-line"></i>
            </div>
            <div className="stat-content">
              <h3>Total Plans</h3>
              <p className="stat-number">{userPlans.length + merchantPlans.length}</p>
            </div>
          </div>
        </div>
      </div>
      {/* User Plans Section */}
      <div className="plan-section">
        <div className="section-header">
          <h2>
            <i className="fas fa-users"></i>
            User Plans
          </h2>
          <p>Membership plans for individual users</p>
        </div>        <div className="plan-cards">
          {userPlans.length > 0 ? userPlans.map((plan, index) => (
            <div key={plan.id} className={`plan-card ${plan.key} ${!plan.isActive ? 'inactive' : ''}`}>
              <div className="plan-header">
                <div className="serial-number">#{index + 1}</div>
                <h3>{plan.name}</h3>
                <div className="plan-pricing">
                  <span className="price">{formatPrice(plan.price, plan.currency)}</span>
                  <span className="billing-cycle">/{formatBillingCycle(plan.billingCycle)}</span>
                </div>
              </div>
              <div className="plan-content">
                <div className="plan-priority">
                  <span className="priority-badge">Priority: {plan.priority}</span>
                  <span className="redemption-limit">
                    {plan.maxRedemptions === -1 ? 'Unlimited' : `${plan.maxRedemptions || 0}`} redemptions/month
                  </span>
                </div>
                <ul className="plan-features">
                  {(plan.features || []).slice(0, 4).map((feature, index) => (
                    <li key={index}>
                      <i className="fas fa-check"></i>
                      {feature.trim()}
                    </li>
                  ))}
                  {(plan.features || []).length > 4 && (
                    <li className="more-features">
                      <i className="fas fa-plus"></i>
                      {plan.features.length - 4} more features
                    </li>
                  )}
                </ul>
              </div>
              <div className="plan-footer">
                <div className="plan-stats">
                  <span className="user-count">
                    <i className="fas fa-users"></i>
                    {getUserCountForPlan(plan.key, 'user')} users
                  </span>
                </div>
              </div>
            </div>
          )) : (
            <div className="empty-plans-state">
              <i className="fas fa-crown"></i>
              <h3>No User Plans</h3>
              <p>Create user plans to get started</p>
              <Link to="/admin/plans-settings" className="btn btn-primary">
                <i className="fas fa-plus"></i>
                Add User Plans
              </Link>
            </div>
          )}
        </div>
      </div>
      {/* Merchant Plans Section */}
      <div className="plan-section">
        <div className="section-header">
          <h2>
            <i className="fas fa-store"></i>
            Business Plans
          </h2>
          <p>Membership plans for business merchants</p>
        </div>        <div className="plan-cards">
          {merchantPlans.length > 0 ? merchantPlans.map((plan, index) => (
            <div key={plan.id} className={`plan-card ${plan.key} ${!plan.isActive ? 'inactive' : ''}`}>
              <div className="plan-header">
                <div className="serial-number">#{index + 1}</div>
                <h3>{plan.name}</h3>
                <div className="plan-pricing">
                  <span className="price">{formatPrice(plan.price, plan.currency)}</span>
                  <span className="billing-cycle">/{formatBillingCycle(plan.billingCycle)}</span>
                </div>
              </div>
              <div className="plan-content">
                <div className="plan-priority">
                  <span className="priority-badge">Priority: {plan.priority}</span>
                  <span className="posting-limit">
                    {plan.dealPostingLimit === -1 ? 'Unlimited' : `${plan.dealPostingLimit || 0}`} deals/month
                  </span>
                </div>
                <ul className="plan-features">
                  {(plan.features || []).slice(0, 4).map((feature, index) => (
                    <li key={index}>
                      <i className="fas fa-check"></i>
                      {feature.trim()}
                    </li>
                  ))}
                  {(plan.features || []).length > 4 && (
                    <li className="more-features">
                      <i className="fas fa-plus"></i>
                      {plan.features.length - 4} more features
                    </li>
                  )}
                </ul>
              </div>
              <div className="plan-footer">
                <div className="plan-stats">
                  <span className="user-count">
                    <i className="fas fa-store"></i>
                    {getUserCountForPlan(plan.key, 'merchant')} merchants
                  </span>
                </div>
              </div>
            </div>
          )) : (
            <div className="empty-plans-state">
              <i className="fas fa-briefcase"></i>
              <h3>No Business Plans</h3>
              <p>Create business plans to get started</p>
              <Link to="/admin/plans-settings" className="btn btn-primary">
                <i className="fas fa-plus"></i>
                Add Business Plans
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // User Management Tab: show user plan stats and user names
  const renderUserManagement = () => (
    <div className="plan-user-management">
      <div className="user-management-header">
        <h3>User Plan Management</h3>
        <p>Manage individual user plan assignments</p>
      </div>

      {/* Compact User Search Bar */}
      <div className="search-bar-container">
        <div className="compact-search-bar">
          <i className="fas fa-search search-icon"></i>
          <input
            type="text"
            placeholder="Search users by name, email, or plan..."
            value={userSearchTerm}
            onChange={(e) => handleUserSearch(e.target.value)}
            className="search-input"
          />
          {userSearchTerm && (
            <button
              onClick={() => handleUserSearch('')}
              className="clear-search"
              title="Clear search"
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
      </div>      <div className="plan-stats-bar">
        {userPlans.map(plan => (
          <span key={plan.id} className={`plan-badge ${plan.key}`}>
            {plan.name}: {getUserCountForPlan(plan.key, 'user')} users
          </span>
        ))}
      </div>
      <div className="user-table-container">
        <table className="user-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>User</th>
              <th>Email</th>
              <th>Current Plan</th>
              <th>Join Date</th>
              <th>Plan Expiry</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>            {getPaginatedUsers().map((user, index) => (
              <tr key={user.id}>
                <td>{(userPagination.currentPage - 1) * userPagination.pageSize + index + 1}</td>
                <td>
                  <div className="user-info">
                    <div>
                      <strong>{user.fullName}</strong>
                    </div>
                  </div>
                </td>
                <td>{user.email}</td>
                <td>
                  <span className={`plan-badge ${user.membershipType || 'none'}`}>
                    {user.membershipType?.charAt(0).toUpperCase() + user.membershipType?.slice(1) || 'No Plan'}
                  </span>
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString('en-GB', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
                })}</td>
                <td>
                  {(() => {
                    const expiryInfo = getExpiryStatus(user.planExpiryDate || user.validationDate);
                    return (
                      <span className={`expiry-date ${expiryInfo.class}`}>
                        {expiryInfo.text}
                      </span>
                    );
                  })()}
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handlePlanAssignment(user.id || user._id || user.userId)}
                  >
                    <i className="fas fa-edit"></i>
                    Change Plan
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* User Pagination */}
        {getFilteredUsers().length > 0 && (
          <div className="user-pagination">
            <div className="pagination-info">
              <span>
                Showing {((userPagination.currentPage - 1) * userPagination.pageSize) + 1} to {Math.min(userPagination.currentPage * userPagination.pageSize, getFilteredUsers().length)} of {getFilteredUsers().length} users
                {userSearchTerm && <span className="search-indicator"> (filtered)</span>}
              </span>
            </div>
            <div className="pagination-controls">
              <button
                className="btn-page"
                onClick={() => handleUserPageChange(userPagination.currentPage - 1)}
                disabled={userPagination.currentPage === 1}
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              
              {[...Array(userPagination.totalPages)].map((_, index) => {
                const pageNumber = index + 1;
                if (
                  pageNumber === 1 ||
                  pageNumber === userPagination.totalPages ||
                  (pageNumber >= userPagination.currentPage - 1 && pageNumber <= userPagination.currentPage + 1)
                ) {
                  return (
                    <button
                      key={pageNumber}
                      className={`btn-page ${pageNumber === userPagination.currentPage ? 'active' : ''}`}
                      onClick={() => handleUserPageChange(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  );
                } else if (
                  pageNumber === userPagination.currentPage - 2 ||
                  pageNumber === userPagination.currentPage + 2
                ) {
                  return <span key={pageNumber} className="pagination-ellipsis">...</span>;
                }
                return null;
              })}
              
              <button
                className="btn-page"
                onClick={() => handleUserPageChange(userPagination.currentPage + 1)}
                disabled={userPagination.currentPage === userPagination.totalPages}
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Merchant Management Tab: show merchant plan stats and business partner names
  const renderMerchantManagement = () => (
    <div className="plan-merchant-management">
      <div className="merchant-management-header">
        <h3>Merchant Plan Management</h3>
        <p>Manage individual merchant plan assignments</p>
      </div>

      {/* Compact Merchant Search Bar */}
      <div className="search-bar-container">
        <div className="compact-search-bar">
          <i className="fas fa-search search-icon"></i>
          <input
            type="text"
            placeholder="Search merchants by name, business, email, or plan..."
            value={merchantSearchTerm}
            onChange={(e) => handleMerchantSearch(e.target.value)}
            className="search-input"
          />
          {merchantSearchTerm && (
            <button
              onClick={() => handleMerchantSearch('')}
              className="clear-search"
              title="Clear search"
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
      </div>      <div className="plan-stats-bar">
        {merchantPlans.map(plan => (
          <span key={plan.id} className={`plan-badge ${plan.key}`}>
            {plan.name}: {getUserCountForPlan(plan.key, 'merchant')} merchants
          </span>
        ))}
      </div>
      <div className="merchant-table-container">
        <table className="merchant-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Business</th>
              <th>Owner</th>
              <th>Email</th>
              <th>Current Plan</th>
              <th>Join Date</th>
              <th>Plan Expiry</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>            {getPaginatedMerchants().map((merchant, index) => (
              <tr key={merchant.id}>
                <td>{(merchantPagination.currentPage - 1) * merchantPagination.pageSize + index + 1}</td>
                <td>
                  <div className="merchant-info">
                    <div className="merchant-avatar">
                      <i className="fas fa-store"></i>
                    </div>
                    <div>
                      <strong>{merchant.businessName || 'N/A'}</strong>
                      <br />
                      <small>{merchant.businessCategory || 'Other'}</small>
                    </div>
                  </div>
                </td>
                <td>{merchant.fullName}</td>
                <td>{merchant.email}</td>
                <td>
                  <span className={`plan-badge ${merchant.membershipType || 'none'}`}>
                    {merchant.membershipType ? 
                      merchant.membershipType.split('_').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ') : 
                      'No Plan'
                    }
                  </span>
                </td>
                <td>{new Date(merchant.createdAt).toLocaleDateString('en-GB', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
                })}</td>
                <td>
                  {(() => {
                    // Enhanced expiry calculation logic matching MerchantManagement
                    const calculateExpiryDate = (merchant) => {
                      // Priority 1: validationDate (custom expiry from plan management)
                      if (merchant.validationDate && merchant.validationDate !== 'null' && merchant.validationDate !== null) {
                        try {
                          const validationDate = new Date(merchant.validationDate);
                          if (!isNaN(validationDate.getTime())) {
                            return validationDate.toISOString();
                          }
                        } catch (error) {
                          console.warn('Invalid validationDate:', merchant.validationDate);
                        }
                      }
                      
                      // Priority 2: planExpiryDate (fallback)
                      if (merchant.planExpiryDate && merchant.planExpiryDate !== 'null' && merchant.planExpiryDate !== null) {
                        try {
                          const planExpiryDate = new Date(merchant.planExpiryDate);
                          if (!isNaN(planExpiryDate.getTime())) {
                            return planExpiryDate.toISOString();
                          }
                        } catch (error) {
                          console.warn('Invalid planExpiryDate:', merchant.planExpiryDate);
                        }
                      }
                      
                      // Priority 3: Calculate based on planAssignedAt and billing cycle
                      const baseDate = merchant.planAssignedAt || merchant.createdAt;
                      if (baseDate && baseDate !== 'null' && baseDate !== null) {
                        try {
                          const assignedDate = new Date(baseDate);
                          if (isNaN(assignedDate.getTime())) return null;
                          
                          // Get billing cycle from merchant data or default to yearly
                          const billingCycle = merchant.billingCycle || merchant.planExpiry || 'yearly';
                          let validityDate = new Date(assignedDate);
                          
                          switch (billingCycle.toLowerCase()) {
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
                              return 'lifetime';
                            case 'weekly':
                              validityDate.setDate(validityDate.getDate() + 7);
                              break;
                            default:
                              // Default to yearly
                              validityDate.setFullYear(validityDate.getFullYear() + 1);
                              break;
                          }
                          
                          return validityDate.toISOString();
                        } catch (error) {
                          console.warn('Error calculating expiry from planAssignedAt:', error);
                        }
                      }
                      
                      return null;
                    };
                    
                    const calculatedExpiryDate = calculateExpiryDate(merchant);
                    
                    // Handle lifetime plans
                    if (calculatedExpiryDate === 'lifetime') {
                      return (
                        <span className="expiry-date expiry-lifetime">
                          Lifetime
                        </span>
                      );
                    }
                    
                    const expiryInfo = getExpiryStatus(calculatedExpiryDate);
                    
                    return (
                      <span className={`expiry-date ${expiryInfo.class}`}>
                        {expiryInfo.text}
                      </span>
                    );
                  })()}
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handlePlanAssignment(merchant.id || merchant._id || merchant.userId)}
                  >
                    <i className="fas fa-edit"></i>
                    Change Plan
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Merchant Pagination */}
        {getFilteredMerchants().length > 0 && (
          <div className="merchant-pagination">
            <div className="pagination-info">
              <span>
                Showing {((merchantPagination.currentPage - 1) * merchantPagination.pageSize) + 1} to {Math.min(merchantPagination.currentPage * merchantPagination.pageSize, getFilteredMerchants().length)} of {getFilteredMerchants().length} merchants
                {merchantSearchTerm && <span className="search-indicator"> (filtered)</span>}
              </span>
            </div>
            <div className="pagination-controls">
              <button
                className="btn-page"
                onClick={() => handleMerchantPageChange(merchantPagination.currentPage - 1)}
                disabled={merchantPagination.currentPage === 1}
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              
              {[...Array(merchantPagination.totalPages)].map((_, index) => {
                const pageNumber = index + 1;
                if (
                  pageNumber === 1 ||
                  pageNumber === merchantPagination.totalPages ||
                  (pageNumber >= merchantPagination.currentPage - 1 && pageNumber <= merchantPagination.currentPage + 1)
                ) {
                  return (
                    <button
                      key={pageNumber}
                      className={`btn-page ${pageNumber === merchantPagination.currentPage ? 'active' : ''}`}
                      onClick={() => handleMerchantPageChange(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  );
                } else if (
                  pageNumber === merchantPagination.currentPage - 2 ||
                  pageNumber === merchantPagination.currentPage + 2
                ) {
                  return <span key={pageNumber} className="pagination-ellipsis">...</span>;
                }
                return null;
              })}
              
              <button
                className="btn-page"
                onClick={() => handleMerchantPageChange(merchantPagination.currentPage + 1)}
                disabled={merchantPagination.currentPage === merchantPagination.totalPages}
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
  // Analytics Dashboard Tab
  const renderAnalytics = () => {
    // Prepare data for charts
    const planUsageData = userPlans.concat(merchantPlans).map(plan => ({
      label: plan.name,
      value: (users.filter(u => u.membershipType === plan.key).length + 
              merchants.filter(m => m.membershipType === plan.key).length)
    }));

    const userPlanData = userPlans.map(plan => ({
      label: plan.name,
      value: users.filter(u => u.membershipType === plan.key).length
    }));

    const merchantPlanData = merchantPlans.map(plan => ({
      label: plan.name,
      value: merchants.filter(m => m.membershipType === plan.key).length
    }));

    const revenueData = userPlans.concat(merchantPlans).map(plan => {
      const userCount = users.filter(u => u.membershipType === plan.key).length;
      const merchantCount = merchants.filter(m => m.membershipType === plan.key).length;
      const totalRevenue = (userCount + merchantCount) * (plan.price || 0);
      
      return {
        label: plan.name,
        value: totalRevenue
      };
    });

    return (
      <div className="plan-analytics">
        <div className="analytics-header">
          <h3><i className="fas fa-chart-pie"></i> Plan Analytics Dashboard</h3>
          <p>Revenue insights, usage statistics, and plan performance metrics</p>
        </div>
        
        {/* Charts Section */}
        <div className="analytics-charts">
          <div className="charts-grid">
            <div className="chart-container-wrapper">
              <SimplePieChart 
                data={planUsageData.filter(d => d.value > 0)} 
                title="Plan Usage Distribution" 
                height={500}
              />
            </div>
            <div className="chart-container-wrapper">
              <SimpleBarChart 
                data={revenueData} 
                title="Estimated Revenue by Plan (GHS)" 
                height={500}
              />
            </div>
            <div className="chart-container-wrapper">
              <SimpleBarChart 
                data={userPlanData} 
                title="User Plan Distribution" 
                height={500}
              />
            </div>
            <div className="chart-container-wrapper">
              <SimpleBarChart 
                data={merchantPlanData} 
                title="Merchant Plan Distribution" 
                height={500}
              />
            </div>
          </div>
        </div>

        {/* Upgrade Analytics */}
        {analytics.upgradeConversions && analytics.upgradeConversions.length > 0 && (
          <div className="analytics-section">
            <h4><i className="fas fa-arrow-up"></i> Upgrade Conversions</h4>
            <div className="upgrade-analytics">
              {analytics.upgradeConversions.map((conversion, index) => (
                <div key={index} className="conversion-item">
                  <div className="conversion-path">
                    <span className={`plan-badge ${conversion.fromPlan}`}>
                      {conversion.fromPlan}
                    </span>
                    <i className="fas fa-arrow-right"></i>
                    <span className={`plan-badge ${conversion.toPlan}`}>
                      {conversion.toPlan}
                    </span>
                  </div>
                  <div className="conversion-count">
                    {conversion.upgradeCount} upgrades
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expiry Alerts */}
        <div className="analytics-section">
          <h4><i className="fas fa-exclamation-triangle"></i> Upcoming Plan Expiries</h4>
          <div className="expiry-alerts">
            <div className="alert-card users">
              <div className="alert-icon">
                <i className="fas fa-users"></i>
              </div>
              <div className="alert-content">
                <h5>User Plans Expiring</h5>
                <p>{analytics.upcomingExpiries?.users || 0} users in next 7 days</p>
              </div>
            </div>
            <div className="alert-card merchants">
              <div className="alert-icon">
                <i className="fas fa-store"></i>
              </div>
              <div className="alert-content">
                <h5>Merchant Plans Expiring</h5>
                <p>{analytics.upcomingExpiries?.merchants || 0} merchants in next 7 days</p>
              </div>
            </div>
          </div>        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="plan-management">
      <div className="plan-management-header">
        <div className="header-content">
          <h1>Plan Management</h1>
          <p>Manage membership plans and user assignments</p>
        </div>
        <div className="header-actions">
          <Link to="/admin/plans-settings" className="btn btn-secondary">
            <i className="fas fa-cog"></i>
            Plan Settings
          </Link>
        </div>
      </div>
      <div className="plan-tabs">
        <button
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <i className="fas fa-chart-pie"></i>
          Overview
        </button>
        <button
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <i className="fas fa-users"></i>
          User Management
        </button>
        <button
          className={`tab-button ${activeTab === 'merchants' ? 'active' : ''}`}
          onClick={() => setActiveTab('merchants')}
        >
          <i className="fas fa-store"></i>
          Merchant Management
        </button>
        <button
          className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <i className="fas fa-chart-line"></i>
          Analytics
        </button>
      </div>      <div className="plan-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'users' && renderUserManagement()}
        {activeTab === 'merchants' && renderMerchantManagement()}
        {activeTab === 'analytics' && renderAnalytics()}
      </div>
      <Modal 
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        showCancel={modalState.showCancel}
        onConfirm={modalState.onConfirm}
        onCancel={modalState.onCancel || closeModal}
      />
    </div>
  );
};

export default PlanManagement;
