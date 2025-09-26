import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNotification } from '../../../contexts/NotificationContext';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';
import './Activities.css';

/**
 * Activities component for displaying system activities and audit logs in separate sections
 * @returns {React.ReactElement} The activities component
 */
const Activities = () => {
  const { showNotification } = useNotification();
  const { validateSession, handleSessionExpired } = useAuth();
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('all');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    pageSize: 20,
    totalActivities: 0
  });

  // Activity type configurations for separate sections
  const activitySections = {
    'plan_management': {
      title: 'Plan Management',
      icon: 'fas fa-crown',
      types: ['plan_expired', 'user_plan_expired', 'merchant_plan_expired', 'plan_expiring', 'plan_upgraded', 'plan_assigned', 'new_plan_assigned', 'custom_redemption_limit', 'custom_deal_limit', 'assigned_custom_deal_redemption', 'assigned_custom_deal_limit'],
      color: 'primary'
    },
    'deal_management': {
      title: 'Deal Management', 
      icon: 'fas fa-tags',
      types: ['deal_created', 'new_deal_posted', 'deal_approved', 'deal_rejected', 'deal_activated', 'deal_deactivated', 'deal_expired', 'deal_inactive'],
      color: 'success'
    },
    'redemption_activities': {
      title: 'Deal Redemptions',
      icon: 'fas fa-shopping-cart', 
      types: ['redemption_requested', 'pending_deal_redemption_by', 'redemption_approved', 'accepting_deal_redemption_by', 'redemption_rejected', 'rejected_deal_redemption_by'],
      color: 'info'
    },
    'user_activities': {
      title: 'User Management',
      icon: 'fas fa-users',
      types: ['user_registered', 'merchant_registered', 'user_status_changed', 'password_changed', 'password_changed_by_admin'],
      color: 'warning'
    },
    'merchant_management': {
      title: 'Merchant Management',
      icon: 'fas fa-store',
      types: ['merchant_registered', 'merchant_approved', 'merchant_rejected', 'merchant_status_changed', 'business_created', 'business_approved'],
      color: 'info'
    },
    'plan_user_management': {
      title: 'Plan & User Management',
      icon: 'fas fa-user-cog',
      types: ['plan_assigned', 'new_plan_assigned', 'plan_expired', 'user_plan_expired', 'merchant_plan_expired', 'plan_upgraded', 'user_status_changed', 'assigned_custom_deal_redemption', 'assigned_custom_deal_limit'],
      color: 'secondary'
    }
  };
  
  // Fetch activities when page, page size, or section changes
  useEffect(() => {
    fetchActivities();
  }, [pagination.currentPage, pagination.pageSize, activeSection]);

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      
      // Calculate offset from page number
      const offset = (pagination.currentPage - 1) * pagination.pageSize;
      
      // Request with offset and limit parameters as expected by backend
      const queryParams = new URLSearchParams({
        offset: offset,
        limit: pagination.pageSize
      });

      // Add type filter if specific section is selected
      if (activeSection !== 'all' && activitySections[activeSection]) {
        queryParams.append('types', activitySections[activeSection].types.join(','));
      }

      const response = await api.get(`/admin/activities?${queryParams}`);
      
      setActivities(response.data.activities || []);
      setPagination(prev => ({
        ...prev,
        totalPages: Math.ceil((response.data.total || 0) / pagination.pageSize),
        totalActivities: response.data.total || 0
      }));
    } catch (error) {
      console.error('Error fetching activities:', error);
      showNotification('Error loading activities. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'user_registered':
      case 'merchant_registered':
        return 'fas fa-user-plus';
      case 'user_approved':
      case 'user_accepted':
      case 'merchant_approved':
        return 'fas fa-check-circle';
      case 'user_rejected':
      case 'merchant_rejected':
        return 'fas fa-times-circle';
      case 'user_suspended':
      case 'merchant_suspended':
        return 'fas fa-ban';
      case 'user_pending':
      case 'merchant_pending':
        return 'fas fa-clock';
      case 'business_registered':
        return 'fas fa-store';
      case 'business_approved':
        return 'fas fa-handshake';
      case 'deal_created':
      case 'deal_active':
      case 'new_deal_posted':
        return 'fas fa-tag';
      case 'deal_updated':
        return 'fas fa-edit';
      case 'deal_approved':
        return 'fas fa-check-circle';
      case 'deal_rejected':
        return 'fas fa-times-circle';
      case 'deal_inactive':
        return 'fas fa-pause-circle';
      case 'deal_expired':
        return 'fas fa-calendar-times';
      case 'deal_expiring':
        return 'fas fa-exclamation-triangle';
      case 'plan_assigned':
      case 'new_plan_assigned':
        return 'fas fa-crown';
      case 'plan_expired':
      case 'user_plan_expired':
      case 'merchant_plan_expired':
        return 'fas fa-calendar-times';
      case 'plan_expiring':
      case 'user_plan_expiring':
      case 'merchant_plan_expiring':
        return 'fas fa-exclamation-triangle';
      case 'redemption_requested':
      case 'pending_deal_redemption_by':
        return 'fas fa-shopping-cart';
      case 'redemption_approved':
      case 'accepting_deal_redemption_by':
        return 'fas fa-check';
      case 'redemption_rejected':
      case 'rejected_deal_redemption_by':
        return 'fas fa-times';
      case 'assigned_custom_deal_redemption':
        return 'fas fa-gift';
      case 'assigned_custom_deal_limit':
        return 'fas fa-limit';
      case 'password_changed':
        return 'fas fa-key';
      case 'role_assigned':
        return 'fas fa-user-shield';
      case 'login':
        return 'fas fa-sign-in-alt';
      case 'admin_action':
        return 'fas fa-cogs';
      default:
        return 'fas fa-info-circle';
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'user_approved':
      case 'user_accepted':
      case 'merchant_approved':
      case 'business_approved':
      case 'deal_approved':
      case 'deal_active':
      case 'redemption_approved':
      case 'accepting_deal_redemption_by':
        return 'success';
      case 'user_rejected':
      case 'user_suspended':
      case 'merchant_rejected':
      case 'merchant_suspended':
      case 'deal_rejected':
      case 'deal_inactive':
      case 'redemption_rejected':
      case 'rejected_deal_redemption_by':
        return 'danger';
      case 'user_registered':
      case 'merchant_registered':
      case 'business_registered':
      case 'user_pending':
      case 'merchant_pending':
      case 'redemption_requested':
      case 'pending_deal_redemption_by':
        return 'info';
      case 'deal_created':
      case 'deal_updated':
      case 'deal_expiring':
      case 'plan_expiring':
      case 'user_plan_expiring':
      case 'merchant_plan_expiring':
      case 'new_deal_posted':
        return 'warning';
      case 'deal_expired':
      case 'plan_expired':
      case 'user_plan_expired':
      case 'merchant_plan_expired':
        return 'danger';
      case 'plan_assigned':
      case 'new_plan_assigned':
      case 'role_assigned':
      case 'assigned_custom_deal_redemption':
      case 'assigned_custom_deal_limit':
        return 'primary';
      case 'password_changed':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    // Format as actual date and time
    try {
      return date.toLocaleString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false // Use 24-hour format
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const handleSectionChange = (section) => {
    setActiveSection(section);
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset to first page when changing sections
  };

  const getFilteredActivities = () => {
    if (activeSection === 'all') {
      return activities;
    }
    
    if (activitySections[activeSection]) {
      return activities.filter(activity => 
        activitySections[activeSection].types.includes(activity.type)
      );
    }
    
    return activities;
  };

  return (
    <div className="user-management">
      <div className="section-header">
        <div className="header-content">
          <h2>System Activities</h2>
          <p>Monitor and track all system activities and user actions by category</p>
        </div>
      </div>

      {/* Activity Section Navigation */}
      <div className="activity-sections">
        <div className="section-tabs">
          <button
            className={`section-tab ${activeSection === 'all' ? 'active' : ''}`}
            onClick={() => handleSectionChange('all')}
          >
            <i className="fas fa-list"></i>
            All Activities
          </button>
          {Object.entries(activitySections).map(([key, section]) => (
            <button
              key={key}
              className={`section-tab ${activeSection === key ? 'active' : ''}`}
              onClick={() => handleSectionChange(key)}
            >
              <i className={section.icon}></i>
              {section.title}
            </button>
          ))}
        </div>
      </div>

      {/* Simple toolbar: removed filters per request. Keep reload action. */}
      <div className="user-filters">
        <div className="filter-controls">
          <div className="filter-group">
            <button className="btn-refresh" onClick={fetchActivities}>
              <i className="fas fa-sync"></i> Reload Activities
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-table">
          <div className="loading-row header"></div>
          <div className="loading-row"></div>
          <div className="loading-row"></div>
          <div className="loading-row"></div>
          <div className="loading-row"></div>
        </div>
      ) : activities.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-calendar-times"></i>
          <p>No recent activities in {activeSection === 'all' ? 'any category' : activitySections[activeSection]?.title || 'this section'}.</p>
          <button className="btn-outline" onClick={fetchActivities}>
            Reload
          </button>
        </div>
      ) : (
        <>
          {/* Section Context Header */}
          <div className="section-context">
            <div className="context-info">
              <i className={activeSection === 'all' ? 'fas fa-list' : activitySections[activeSection]?.icon || 'fas fa-info-circle'}></i>
              <span>
                Showing {activeSection === 'all' ? 'All Activities' : activitySections[activeSection]?.title || 'Activities'}
                {pagination.totalActivities > 0 && ` (${pagination.totalActivities} total)`}
              </span>
              {activeSection !== 'all' && (
                <div className="filter-indicator">
                  <small>Filtered by: {activitySections[activeSection]?.types.join(', ')}</small>
                </div>
              )}
            </div>
          </div>

          <table className="user-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Activity</th>
                <th>Type</th>
                <th>User</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((activity, index) => (
                <tr key={activity.id}>
                  <td data-label="#">
                    <div style={{
                      background: '#007bff',
                      color: 'white',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      margin: '0 auto'
                    }}>
                      {(pagination.currentPage - 1) * pagination.pageSize + index + 1}
                    </div>
                  </td>
                  <td data-label="Activity">
                    <div className="user-name-cell">
                      <div>
                        <strong>{activity.title}</strong>
                        <div style={{ fontSize: '0.875rem', color: 'var(--neutral-medium)' }}>
                          {activity.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td data-label="Type">
                    <span className={`status-badge ${getActivityColor(activity.type)}`}>
                      {activity.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td data-label="User">
                    {activity.user ? (
                      <div>
                        <div>
                          {activity.user.userType === 'merchant' ? 
                            `${activity.user.fullName || activity.user.email} (Business)` : 
                            `${activity.user.fullName || activity.user.email} (User)`
                          }
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--neutral-medium)' }}>
                          {activity.user.email}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--neutral-medium)' }}>System</span>
                    )}
                  </td>
                  <td data-label="Date">
                    <div style={{ fontSize: '0.875rem' }}>
                      {formatDateTime(activity.timestamp || activity.createdAt)}
                    </div>
                  </td>
                  <td data-label="Status">
                    <span className="status-badge approved">
                      Completed
                    </span>
                  </td>
                  <td data-label="Actions">                    <div className="user-actions">
                      <button className="btn-icon" title="View Details">
                        <i className="fas fa-eye"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pagination">
            <div className="pagination-info">
              <span>Showing {((pagination.currentPage - 1) * pagination.pageSize) + 1} to {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalActivities)} of {pagination.totalActivities} activities</span>
              <div className="page-size-selector">
                <label>Show:</label>
                <select
                  value={pagination.pageSize}
                  onChange={(e) => setPagination(prev => ({ ...prev, pageSize: parseInt(e.target.value), currentPage: 1 }))}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
            <div className="pagination-controls">
              <button
                className="btn-page"
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              
              {[...Array(pagination.totalPages)].map((_, index) => {
                const pageNumber = index + 1;
                if (
                  pageNumber === 1 ||
                  pageNumber === pagination.totalPages ||
                  (pageNumber >= pagination.currentPage - 1 && pageNumber <= pagination.currentPage + 1)
                ) {
                  return (
                    <button
                      key={pageNumber}
                      className={`btn-page ${pageNumber === pagination.currentPage ? 'active' : ''}`}
                      onClick={() => handlePageChange(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  );
                } else if (
                  pageNumber === pagination.currentPage - 2 ||
                  pageNumber === pagination.currentPage + 2
                ) {
                  return <span key={pageNumber} className="pagination-ellipsis">...</span>;
                }
                return null;
              })}
              
              <button
                className="btn-page"
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Activities;
