import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotification } from '../../../contexts/NotificationContext';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';
import './PlanManagement.css';

/**
 * PlanManagement component for viewing and managing membership plans
 * @returns {React.ReactElement} The plan management component
 */
const PlanManagement = () => {
  const { showNotification } = useNotification();
  const { validateSession, handleSessionExpired } = useAuth();
  const navigate = useNavigate();
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

  useEffect(() => {
    const fetchPlanStatsAndPlansAndUsers = async () => {
      try {
        setIsLoading(true);
        // Fetch stats
        const statsResponse = await api.get('/admin/stats');
        setStats(statsResponse.data || {});
        // Fetch user plans
        const userPlansResponse = await api.get('/admin/plans?userType=user');
        setUserPlans(userPlansResponse.data || []);
        // Fetch merchant plans
        const merchantPlansResponse = await api.get('/admin/plans?userType=merchant');
        setMerchantPlans(merchantPlansResponse.data || []);
        // Fetch users
        const usersResponse = await api.get('/admin/users?userType=user');
        setUsers(usersResponse.data.users || []);
        // Fetch merchants
        const merchantsResponse = await api.get('/admin/users?userType=merchant');
        setMerchants(merchantsResponse.data.users || []);
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
      navigate(`/admin/users/${userId}/assign-plan`);
    } catch (error) {
      console.error('Error during navigation:', error);
      showNotification('Error navigating to plan assignment page', 'error');
    }
  };
  // Delete plan handler
  const handleDeletePlan = async (planKey) => {
    const plan = stats.planKeys.find(p => p.key === planKey);
    if (!plan) return;
    if (!window.confirm(`Are you sure you want to delete the plan "${plan.name}"? This cannot be undone.`)) return;
    try {
      setIsLoading(true);
      // Find plan by key (need to fetch plan id)
      const plansRes = await api.get(`/admin/plans?userType=${plan.type}`);
      const planObj = (plansRes.data || []).find(p => p.key === planKey);
      if (!planObj) throw new Error('Plan not found');
      await api.delete(`/admin/plans/${planObj._id}`);
      // Refetch stats after deletion
      const statsResponse = await api.get('/admin/stats');
      setStats(statsResponse.data || {});
      showNotification(`Plan "${plan.name}" deleted successfully.`, 'success');
    } catch (error) {
      showNotification('Error deleting plan', 'error');
      console.error('Delete plan error:', error);
    } finally {
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
        </div>
        <div className="plan-cards">
          {userPlans.map(plan => (
            <div key={plan._id} className={`plan-card ${plan.key} ${!plan.isActive ? 'inactive' : ''}`}>
              <div className="plan-header">
                <h3>{plan.name}</h3>
                <button className="btn btn-sm btn-danger" onClick={() => handleDeletePlan(plan.key)} title="Delete Plan">
                  <i className="fas fa-trash"></i>
                </button>
              </div>
              <div className="plan-content">
                <p className="plan-description">{plan.description}</p>
                <ul className="plan-features">
                  {plan.features.slice(0, 4).map((feature, index) => (
                    <li key={index}>
                      <i className="fas fa-check"></i>
                      {feature}
                    </li>
                  ))}
                  {plan.features.length > 4 && (
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
          ))}
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
        </div>
        <div className="plan-cards">
          {merchantPlans.map(plan => (
            <div key={plan._id} className={`plan-card ${plan.key} ${!plan.isActive ? 'inactive' : ''}`}>
              <div className="plan-header">
                <h3>{plan.name}</h3>
                <button className="btn btn-sm btn-danger" onClick={() => handleDeletePlan(plan.key)} title="Delete Plan">
                  <i className="fas fa-trash"></i>
                </button>
              </div>
              <div className="plan-content">
                <p className="plan-description">{plan.description}</p>
                <ul className="plan-features">
                  {plan.features.slice(0, 4).map((feature, index) => (
                    <li key={index}>
                      <i className="fas fa-check"></i>
                      {feature}
                    </li>
                  ))}
                  {plan.features.length > 4 && (
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
          ))}
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
      <div className="plan-stats-bar">
        {userPlans.map(plan => (
          <span key={plan._id} className={`plan-badge ${plan.key}`}>
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
          <tbody>
            {users.slice(0, 10).map(user => (
              <tr key={user._id}>
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
                  <span className={`plan-badge ${user.membershipType}`}>
                    {user.membershipType?.charAt(0).toUpperCase() + user.membershipType?.slice(1)}
                  </span>
                </td>
                <td>{new Date(user.joinDate).toLocaleDateString()}</td>
                <td>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handlePlanAssignment(user._id)}
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
      </div>
      <div className="plan-stats-bar">
        {merchantPlans.map(plan => (
          <span key={plan._id} className={`plan-badge ${plan.key}`}>
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
          <tbody>
            {merchants.slice(0, 10).map(merchant => (
              <tr key={merchant._id}>
                <td>
                  <div className="merchant-info">
                    <div className="merchant-avatar">
                      <i className="fas fa-store"></i>
                    </div>
                    <div>
                      <strong>{merchant.businessInfo?.businessName || 'N/A'}</strong>
                      <br />
                      <small>{merchant.businessInfo?.businessCategory || 'Other'}</small>
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
                <td>{merchant.joinDate ? new Date(merchant.joinDate).toLocaleDateString() : new Date(merchant.createdAt).toLocaleDateString()}</td>
                <td>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handlePlanAssignment(merchant._id)}
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

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading plan data...</p>
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
      </div>
      <div className="plan-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'users' && renderUserManagement()}
        {activeTab === 'merchants' && renderMerchantManagement()}
      </div>
    </div>
  );
};

export default PlanManagement;
