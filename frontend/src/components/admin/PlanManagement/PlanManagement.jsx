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
        // Fetch stats
        const statsResponse = await api.get('/admin/stats');
        setStats(statsResponse.data.stats || {});
        
        // Fetch user plans from the new plans endpoint
        const userPlansResponse = await api.get('/plans?type=user&isActive=true');
        console.log('User plans response:', userPlansResponse.data);
        setUserPlans(userPlansResponse.data.plans || []);
        
        // Fetch merchant plans from the new plans endpoint  
        const merchantPlansResponse = await api.get('/plans?type=merchant&isActive=true');
        console.log('Merchant plans response:', merchantPlansResponse.data);
        setMerchantPlans(merchantPlansResponse.data.plans || []);
        
        // Fetch users
        const usersResponse = await api.get('/admin/users?userType=user');
        setUsers(usersResponse.data.users || []);
          // Fetch merchants
        const merchantsResponse = await api.get('/admin/users?userType=merchant');
        setMerchants(merchantsResponse.data.users || []);
        
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
        const expiringMerchants = merchantsResponse.data.users?.filter(merchant => {
          if (!merchant.planExpiryDate) return false;
          const expiryDate = new Date(merchant.planExpiryDate);
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
  };  const handlePlanAssignment = (userId) => {
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
          {userPlans.length > 0 ? userPlans.map(plan => (
            <div key={plan.id} className={`plan-card ${plan.key} ${!plan.isActive ? 'inactive' : ''}`}>
              <div className="plan-header">
                <h3>{plan.name}</h3>
                <div className="plan-pricing">
                  <span className="price">{formatPrice(plan.price, plan.currency)}</span>
                  <span className="billing-cycle">/{formatBillingCycle(plan.billingCycle)}</span>
                </div>
                <button 
                  className="btn btn-sm btn-danger" 
                  onClick={() => handleDeletePlan(plan.id, plan.name)} 
                  title="Delete Plan"
                >
                  <i className="fas fa-trash"></i>
                </button>
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
          {merchantPlans.length > 0 ? merchantPlans.map(plan => (
            <div key={plan.id} className={`plan-card ${plan.key} ${!plan.isActive ? 'inactive' : ''}`}>
              <div className="plan-header">
                <h3>{plan.name}</h3>
                <div className="plan-pricing">
                  <span className="price">{formatPrice(plan.price, plan.currency)}</span>
                  <span className="billing-cycle">/{formatBillingCycle(plan.billingCycle)}</span>
                </div>
                <button 
                  className="btn btn-sm btn-danger" 
                  onClick={() => handleDeletePlan(plan.id, plan.name)} 
                  title="Delete Plan"
                >
                  <i className="fas fa-trash"></i>
                </button>
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
              <th>User</th>
              <th>Email</th>
              <th>Current Plan</th>
              <th>Join Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>            {users.slice(0, 10).map(user => (
              <tr key={user.id}>
                <td>
                  <div className="user-info">
                    <div className="user-avatar">
                      <i className="fas fa-user"></i>
                    </div>
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
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
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
        {users.length > 10 && (
          <div className="table-footer">
            <Link to="/admin/users" className="btn btn-secondary">
              View All Users
            </Link>
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
              <th>Business</th>
              <th>Owner</th>
              <th>Email</th>
              <th>Current Plan</th>
              <th>Join Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>            {merchants.slice(0, 10).map(merchant => (
              <tr key={merchant.id}>
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
                <td>{new Date(merchant.createdAt).toLocaleDateString()}</td>
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
        {merchants.length > 10 && (
          <div className="table-footer">
            <Link to="/admin/users?userType=merchant" className="btn btn-secondary">
              View All Merchants
            </Link>
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
              />
            </div>
            <div className="chart-container-wrapper">
              <SimpleBarChart 
                data={revenueData} 
                title="Estimated Revenue by Plan (GHS)" 
                height={250}
              />
            </div>
            <div className="chart-container-wrapper">
              <SimpleBarChart 
                data={userPlanData} 
                title="User Plan Distribution" 
                height={200}
              />
            </div>
            <div className="chart-container-wrapper">
              <SimpleBarChart 
                data={merchantPlanData} 
                title="Merchant Plan Distribution" 
                height={200}
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
                {(analytics.upcomingExpiries?.users || 0) > 0 && (
                  <button className="btn btn-warning btn-sm">
                    <i className="fas fa-envelope"></i>
                    Send Renewal Notices
                  </button>
                )}
              </div>
            </div>
            <div className="alert-card merchants">
              <div className="alert-icon">
                <i className="fas fa-store"></i>
              </div>
              <div className="alert-content">
                <h5>Merchant Plans Expiring</h5>
                <p>{analytics.upcomingExpiries?.merchants || 0} merchants in next 7 days</p>
                {(analytics.upcomingExpiries?.merchants || 0) > 0 && (
                  <button className="btn btn-warning btn-sm">
                    <i className="fas fa-envelope"></i>
                    Send Renewal Notices
                  </button>
                )}
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
          <Link to="/admin" className="btn-secondary" style={{marginLeft: '0.5rem'}}>
            <i className="fas fa-arrow-left"></i> Back to Dashboard
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
