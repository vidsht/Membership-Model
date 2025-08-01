import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import ApprovalQueue from './UserManagement/ApprovalQueue';
import UserManagement from './UserManagement/UserManagement';
import BusinessPartners from './BusinessPartners/PartnerList';
import DealManagement from './DealManagement/DealManagement';
import PlanManagement from './PlanManagement/PlanManagement';
import Settings from './Settings/Settings';
import Activities from './Activities/Activities';
import api from '../../services/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user, validateSession, handleSessionExpired } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  
  // Navigation state
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalMerchants: 0,
    pendingApprovals: 0,
    activeBusinesses: 0,
    totalRevenue: 0,
    userPlanCounts: {},
    merchantPlanCounts: {},
    planKeys: []
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Helper function to get activity icon
  const getActivityIcon = (type) => {
    switch (type) {
      case 'user_registered':
        return 'fas fa-user-plus';
      case 'user_approved':
        return 'fas fa-check-circle';
      case 'user_rejected':
        return 'fas fa-times-circle';
      case 'business_registered':
        return 'fas fa-store';
      case 'business_approved':
        return 'fas fa-handshake';
      case 'deal_created':
        return 'fas fa-tag';
      case 'plan_assigned':
        return 'fas fa-crown';
      case 'role_assigned':
        return 'fas fa-user-shield';
      default:
        return 'fas fa-info-circle';
    }
  };
  
  // Helper function to format time ago
  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else if (diffInHours < 168) {
      const days = Math.floor(diffInHours / 24);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };
    const testSessionValidation = async () => {
    try {
      const isValid = await validateSession();
      showNotification(
        isValid ? 'Session is valid!' : 'Session is invalid!', 
        isValid ? 'success' : 'error'
      );
    } catch (error) {
      showNotification('Error validating session', 'error');
    }
  };
  
  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        setIsLoading(true);
        
        // Fetch stats
        const statsResponse = await api.get('/admin/stats');
        setStats(prevStats => ({
          ...prevStats,
          ...(statsResponse.data || {})
        }));
        
        // Fetch recent activities
        const activitiesResponse = await api.get('/admin/activities?limit=5&dateRange=7');
        setRecentActivities(activitiesResponse.data?.activities || []);
        
      } catch (error) {
        console.error('Error fetching admin data:', error);
        console.error('Error response:', error.response?.data);
        showNotification('Error fetching dashboard data. Please try again.', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAdminStats();
  }, [showNotification]);
    const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
    { id: 'users', label: 'User Management', icon: 'fas fa-users' },
    { id: 'merchants', label: 'Business Partners', icon: 'fas fa-handshake' },
    { id: 'deals', label: 'Deal Management', icon: 'fas fa-tags' },
    { id: 'plans', label: 'Plan Management', icon: 'fas fa-crown' },
    { id: 'approvals', label: 'Approvals', icon: 'fas fa-check-circle' },
    { id: 'activities', label: 'Activities', icon: 'fas fa-history' },
    { id: 'settings', label: 'Settings', icon: 'fas fa-cog' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboardContent();
      case 'users':
        return <UserManagement />;
      case 'merchants':
        return <BusinessPartners />;
      case 'deals':
        return <DealManagement />;
      case 'plans':
        return <PlanManagement />;
      case 'approvals':
        return <ApprovalQueue />;
      case 'activities':
        return <Activities />;
      case 'settings':
        return <Settings />;
      default:
        return renderDashboardContent();
    }
  };

  const renderDashboardContent = () => (
    <div className="dashboard-content">
      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-users"></i>
          </div>
          <div className="stat-info">
            <h3>{stats.totalUsers}</h3>
            <p>Total Users</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-store"></i>
          </div>
          <div className="stat-info">
            <h3>{stats.totalMerchants}</h3>
            <p>Merchants</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-clock"></i>
          </div>
          <div className="stat-info">
            <h3>{stats.pendingApprovals}</h3>
            <p>Pending Approvals</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-chart-line"></i>
          </div>
          <div className="stat-info">
            <h3>{stats.activeBusinesses}</h3>
            <p>Active Businesses</p>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="recent-activities">
        <h3>Recent Activities</h3>
        <div className="activities-list">
          {recentActivities.length > 0 ? (
            recentActivities.slice(0, 10).map((activity, index) => (
              <div key={index} className="activity-item">
                <div className="activity-icon">
                  <i className={getActivityIcon(activity.type)}></i>
                </div>
                <div className="activity-details">
                  <p className="activity-description">{activity.description}</p>
                  <span className="activity-time">{formatTimeAgo(activity.createdAt)}</span>
                </div>
              </div>
            ))
          ) : (
            <p>No recent activities</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="admin-dashboard">
      {/* Sidebar Navigation */}
      <div className="admin-sidebar">
        <div className="sidebar-header">
          <h2><i className="fas fa-shield-alt"></i> Admin Panel</h2>
          <p>{user?.fullName || 'Administrator'}</p>
        </div>
        
        <nav className="sidebar-nav">
          <ul>
            {tabs.map(tab => (
              <li key={tab.id} className={activeTab === tab.id ? 'active' : ''}>
                <button 
                  onClick={() => setActiveTab(tab.id)}
                  className="nav-button"
                >
                  <i className={tab.icon}></i>
                  <span>{tab.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="sidebar-footer">
          <button 
            onClick={() => navigate('/dashboard')}
            className="back-button"
          >
            <i className="fas fa-arrow-left"></i>
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="admin-main">
        <div className="admin-header">
          <h1>{tabs.find(tab => tab.id === activeTab)?.label || 'Dashboard'}</h1>
          <div className="header-actions">
            <button 
              onClick={() => window.location.reload()}
              className="refresh-btn"
            >
              <i className="fas fa-sync-alt"></i>
              Refresh
            </button>
          </div>
        </div>
        
        <div className="admin-content">
          {isLoading ? (
            <div className="loading-container">
              <i className="fas fa-spinner fa-spin"></i>
              <p>Loading admin dashboard...</p>
            </div>
          ) : (
            renderTabContent()
          )}
        </div>
      </div>
    </div>
  );
            {/* Role Management removed */}
            <li>
              <Link to="/admin/deals">
                <i className="fas fa-tags"></i>
                <span>Deal Management</span>
              </Link>
            </li>
            <li>
              <Link to="/admin/plans-settings">
                <i className="fas fa-crown"></i>
                <span>Plan Settings</span>
              </Link>
            </li>
            <li>
              <Link to="/admin/settings">
                <i className="fas fa-cog"></i>
                <span>Admin Settings</span>
              </Link>
            </li>
            <li>
              <Link to="/admin/activities">
                <i className="fas fa-history"></i>
                <span>Activities</span>
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      
      <div className="admin-main">
        <div className="admin-header">
          <h1>
            <i className="fas fa-tachometer-alt"></i>
            Dashboard Overview
          </h1>
            <div className="admin-actions">
            <button onClick={testSessionValidation} className="btn-secondary">
              <i className="fas fa-shield-alt"></i>
              Check Session
            </button>
            <div className="admin-profile">
              <span>Welcome, {user?.fullName?.split(' ')[0] || 'Admin'}</span>
              <button onClick={() => navigate('/settings')} className="btn-icon">
                <i className="fas fa-user-circle"></i>
              </button>
            </div>
            
            <button onClick={() => navigate('/')} className="btn-secondary">
              <i className="fas fa-sign-out-alt"></i>
              Exit Admin
            </button>
          </div>
        </div>
        
        <div className="admin-content">
          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-users"></i>
              </div>
              <div className="stat-details">
                <h3>Total Users</h3>
                {isLoading ? (
                  <div className="stat-loading"></div>
                ) : (
                  <p className="stat-number">{stats.totalUsers || 0}</p>
                )}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-store"></i>
              </div>
              <div className="stat-details">
                <h3>Total Merchants</h3>
                {isLoading ? (
                  <div className="stat-loading"></div>
                ) : (
                  <p className="stat-number">{stats.totalMerchants || 0}</p>
                )}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-user-clock"></i>
              </div>
              <div className="stat-details">
                <h3>Pending Approvals</h3>
                {isLoading ? (
                  <div className="stat-loading"></div>
                ) : (
                  <p className="stat-number">{stats.pendingApprovals || 0}</p>
                )}
                {(stats.pendingApprovals || 0) > 0 && (
                  <Link to="/admin/users?filter=pending" className="stat-link">Review Now</Link>
                )}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-store"></i>
              </div>
              <div className="stat-details">
                <h3>Active Businesses</h3>
                {isLoading ? (
                  <div className="stat-loading"></div>
                ) : (
                  <p className="stat-number">{stats.activeBusinesses || 0}</p>
                )}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-coins"></i>
              </div>
              <div className="stat-details">
                <h3>Total Revenue</h3>
                {isLoading ? (
                  <div className="stat-loading"></div>
                ) : (
                  <p className="stat-number">
                    GHS {(stats.totalRevenue || 0).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div className="dashboard-sections">
            <div className="dashboard-section">
              <div className="section-header">
                <h2>Recent Activities</h2>
                <Link to="/admin/activities" className="view-all">View All</Link>
              </div>
              <div className="section-content">
                {isLoading ? (
                  <div className="loading-list">
                    <div className="loading-item"></div>
                    <div className="loading-item"></div>
                    <div className="loading-item"></div>
                  </div>                ) : recentActivities.length > 0 ? (
                  <ul className="activity-list">
                    {recentActivities.map((activity) => (
                      <li key={activity.id} className="activity-item">
                        <div className="activity-icon">
                          <i className={getActivityIcon(activity.type)}></i>
                        </div>
                        <div className="activity-content">
                          <p>{activity.description}</p>
                          <span className="activity-time">{formatTimeAgo(activity.createdAt)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="empty-activities">
                    <p>No recent activities</p>
                  </div>
                )}
              </div>
            </div>
              <div className="dashboard-section">
              <ApprovalQueue />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
