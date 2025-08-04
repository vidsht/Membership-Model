import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import ApprovalQueue from './UserManagement/ApprovalQueue';
import UserManagement from './UserManagement/UserManagement';
import MerchantManagementEnhanced from './BusinessPartners/MerchantManagementEnhanced';
import DealList from './DealManagement/DealList';
import PlanManagement from './PlanManagement/PlanManagement';
import AdminSettings from './Settings/AdminSettings';
import Activities from './Activities/Activities';
import api from '../../services/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user, validateSession } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
    // Navigation state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalMerchants: 0,
    pendingApprovals: 0,
    activeBusinesses: 0,
    totalRevenue: 0,
    activePlans: 0,
    totalDeals: 0,
    userPlanCounts: {},
    merchantPlanCounts: {}
  });
  
  const [recentActivities, setRecentActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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

  // Helper function to get activity icon
  const getActivityIcon = (type) => {
    switch (type) {
      case 'user_registered': return 'fas fa-user-plus';
      case 'user_approved': return 'fas fa-check-circle';
      case 'user_rejected': return 'fas fa-times-circle';
      case 'business_registered': return 'fas fa-store';
      case 'business_approved': return 'fas fa-handshake';
      case 'deal_created': return 'fas fa-tag';
      case 'plan_assigned': return 'fas fa-crown';
      case 'role_assigned': return 'fas fa-user-shield';
      default: return 'fas fa-info-circle';
    }
  };

  // Helper function to format time ago
  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    if (diffInHours < 168) {
      const days = Math.floor(diffInHours / 24);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
    return date.toLocaleDateString();
  };

  // Load admin statistics
  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        setIsLoading(true);
        
        // Fetch dashboard statistics
        const statsResponse = await api.get('/admin/stats');
        if (statsResponse.data.success) {
          setStats(statsResponse.data.stats);
        }
        
        // Fetch recent activities
        const activitiesResponse = await api.get('/admin/activities');
        if (activitiesResponse.data.success) {
          setRecentActivities(activitiesResponse.data.activities || []);
        }
        
      } catch (error) {
        console.error('Error fetching admin data:', error);
        showNotification('Error loading admin dashboard', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAdminStats();
  }, [showNotification]);  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboardContent();
      case 'users':
        return <UserManagement />;      case 'merchants':
        return <MerchantManagementEnhanced />;      case 'deals':
        return <DealList />;
      case 'plans':
        return <PlanManagement />;
      case 'approvals':
        return <ApprovalQueue />;
      case 'activities':
        return <Activities />;
      case 'settings':
        return <AdminSettings />;
      default:
        return renderDashboardContent();
    }
  };

  const renderDashboardContent = () => (
    <div className="dashboard-content">
      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon users">
            <i className="fas fa-users"></i>
          </div>
          <div className="stat-info">
            <h3>{stats.totalUsers}</h3>
            <p>Total Users</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon merchants">
            <i className="fas fa-store"></i>
          </div>
          <div className="stat-info">
            <h3>{stats.totalMerchants}</h3>
            <p>Merchants</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon pending">
            <i className="fas fa-clock"></i>
          </div>
          <div className="stat-info">
            <h3>{stats.pendingApprovals}</h3>
            <p>Pending Approvals</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon deals">
            <i className="fas fa-tags"></i>
          </div>
          <div className="stat-info">
            <h3>{stats.totalDeals}</h3>
            <p>Active Deals</p>
          </div>
        </div>
      </div>

      {/* Plan Distribution */}
      <div className="charts-section">
        <div className="chart-container">
          <h3>User Plan Distribution</h3>
          <div className="plan-breakdown">
            {Object.entries(stats.userPlanCounts).map(([plan, count]) => (
              <div key={plan} className="plan-stat">
                <span className="plan-name">{plan}</span>
                <span className="plan-count">{count}</span>
                <div className="plan-bar">
                  <div 
                    className="plan-fill" 
                    style={{ width: `${(count / stats.totalUsers) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="chart-container">
          <h3>Merchant Plan Distribution</h3>
          <div className="plan-breakdown">
            {Object.entries(stats.merchantPlanCounts).map(([plan, count]) => (
              <div key={plan} className="plan-stat">
                <span className="plan-name">{plan}</span>
                <span className="plan-count">{count}</span>
                <div className="plan-bar">
                  <div 
                    className="plan-fill" 
                    style={{ width: `${(count / stats.totalMerchants) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
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
            <div className="empty-state">
              <i className="fas fa-history"></i>
              <p>No recent activities</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <button 
            onClick={() => setActiveTab('users')}
            className="action-btn users"
          >
            <i className="fas fa-user-plus"></i>
            Manage Users
          </button>
          <button 
            onClick={() => setActiveTab('merchants')}
            className="action-btn merchants"
          >
            <i className="fas fa-handshake"></i>
            Review Partners
          </button>
          <button 
            onClick={() => setActiveTab('deals')}
            className="action-btn deals"
          >
            <i className="fas fa-tags"></i>
            Manage Deals
          </button>
          <button 
            onClick={() => setActiveTab('plans')}
            className="action-btn plans"
          >
            <i className="fas fa-crown"></i>
            Plan Settings
          </button>
        </div>
      </div>
    </div>
  );
  return (
    <div className="admin-dashboard">
      {/* Sidebar Navigation */}
      <div className={`admin-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
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
                  {tab.id === 'approvals' && stats.pendingApprovals > 0 && (
                    <span className="badge">{stats.pendingApprovals}</span>
                  )}
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
      </div>      {/* Main Content */}
      <div className="admin-main">
        <div className="admin-header">
          <div className="header-left">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="sidebar-toggle"
            >
              <i className="fas fa-bars"></i>
            </button>
            <h1>
              <i className={tabs.find(tab => tab.id === activeTab)?.icon}></i>
              {tabs.find(tab => tab.id === activeTab)?.label || 'Dashboard'}
            </h1>
          </div>
          <div className="header-actions">
            <button 
              onClick={() => window.location.reload()}
              className="refresh-btn"
              disabled={isLoading}
            >
              <i className={`fas ${isLoading ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i>
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
};

export default AdminDashboard;
