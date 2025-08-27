import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import ApprovalQueue from './UserManagement/ApprovalQueue.jsx';
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
  const location = useLocation();
    // Navigation state - check for activeTab in location state
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
    const [stats, setStats] = useState({
    totalUsers: 0,
    totalMerchants: 0,
    pendingApprovals: 0,
    activeBusinesses: 0,
    totalRevenue: 0,
    totalDeals: 0,
    totalPlans: 0,
    planSubscribers: 0
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

  // Handle navigation from other components (like deals returning to deals tab)
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
      // Clear the state to prevent issues with back/forward navigation
      window.history.replaceState(null, '');
    }
  }, [location.state]);


  // Load admin statistics
  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        setIsLoading(true);
        
        // Fetch dashboard statistics with fallback
        try {
          const [statsResponse, planStatsResponse] = await Promise.all([
            api.get('/admin/stats'),
            api.get('/admin/plans/statistics').catch(() => ({ data: { success: false } }))
          ]);
          
          let baseStats = {};
          if (statsResponse.data.success) {
            baseStats = statsResponse.data.stats;
          }
          
          // Add plan statistics
          if (planStatsResponse.data.success) {
            const planStats = planStatsResponse.data.statistics;
            baseStats.totalPlans = planStats.summary.userPlans.total + planStats.summary.merchantPlans.total;
            baseStats.planSubscribers = planStats.summary.userPlans.totalSubscribers + planStats.summary.merchantPlans.totalSubscribers;
          }
          
          setStats(baseStats);
        } catch (statsError) {
          console.error('❌ AdminDashboard - Error fetching stats:', statsError);
          
          // Set fallback stats
          setStats({
            totalUsers: 0,
            totalMerchants: 0,
            pendingApprovals: 0,
            activeBusinesses: 0,
            totalRevenue: 0,
            totalDeals: 0,
            totalPlans: 0,
            planSubscribers: 0
          });
        }
        
        // Fetch recent activities with fallback
        try {
          const activitiesResponse = await api.get('/admin/activities');
          if (activitiesResponse.data.success) {
            setRecentActivities(activitiesResponse.data.activities || []);
          }
        } catch (activitiesError) {
          console.error('❌ AdminDashboard - Error fetching activities:', activitiesError);
          setRecentActivities([]);
        }
        
      } catch (error) {
        console.error('❌ AdminDashboard - General error fetching admin data:', error);
        // Use a ref to avoid infinite re-renders
        if (showNotification) {
          showNotification('Some admin data could not be loaded. Please check your connection.', 'warning');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAdminStats();
  }, []); // Remove showNotification dependency to prevent re-renders
  const renderTabContent = () => {
    try {
      switch (activeTab) {
        case 'dashboard':
          return renderDashboardContent();
        case 'users':
          return <UserManagement />;
        case 'merchants':
          return <MerchantManagementEnhanced />;
        case 'deals':
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
    } catch (error) {
      console.error('AdminDashboard - Error rendering tab content:', error);
      return (
        <div className="error-content">
          <h3>Error Loading Content</h3>
          <p>There was an error loading this section: {error.message}</p>
          <p>Active Tab: {activeTab}</p>
          <button onClick={() => setActiveTab('dashboard')}>Back to Dashboard</button>
        </div>
      );
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
        
        <div className="stat-card">
          <div className="stat-icon plans">
            <i className="fas fa-crown"></i>
          </div>
          <div className="stat-info">
            <h3>{stats.totalPlans}</h3>
            <p>Total Plans</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon subscribers">
            <i className="fas fa-user-check"></i>
          </div>
          <div className="stat-info">
            <h3>{stats.planSubscribers}</h3>
            <p>Plan Subscribers</p>
          </div>
        </div>      </div>

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
                  onClick={() => {
                    setActiveTab(tab.id);
                  }}
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
c
        </div>
      </div>  
      {/* Main Content */}
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
