import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNotification } from '../../../contexts/NotificationContext';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';
import './Activities.css';

/**
 * Activities component for displaying system activities and audit logs
 * @returns {React.ReactElement} The activities component
 */
const Activities = () => {
  const { showNotification } = useNotification();
  const { validateSession, handleSessionExpired } = useAuth();
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: 'all',
    dateRange: '7',
    search: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    pageSize: 20,
    totalActivities: 0
  });
  
  useEffect(() => {
    fetchActivities();
  }, [filters, pagination.currentPage]);

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      
      const queryParams = new URLSearchParams({
        type: filters.type,
        dateRange: filters.dateRange,
        search: filters.search,
        page: pagination.currentPage,
        limit: pagination.pageSize
      });

      const response = await api.get(`/admin/activities?${queryParams}`);
      
      setActivities(response.data.activities || []);
      setPagination(prev => ({
        ...prev,
        totalPages: Math.ceil((response.data.totalActivities || 0) / pagination.pageSize),
        totalActivities: response.data.totalActivities || 0
      }));
    } catch (error) {
      console.error('Error fetching activities:', error);
      showNotification('Error loading activities. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'user_registered':
        return 'fas fa-user-plus';
      case 'user_approved':
        return 'fas fa-check-circle';
      case 'user_rejected':
        return 'fas fa-times-circle';
      case 'user_suspended':
        return 'fas fa-ban';
      case 'business_registered':
        return 'fas fa-store';
      case 'business_approved':
        return 'fas fa-handshake';
      case 'deal_created':
        return 'fas fa-tag';
      case 'deal_updated':
        return 'fas fa-edit';
      case 'plan_assigned':
        return 'fas fa-crown';
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
      case 'business_approved':
        return 'success';
      case 'user_rejected':
      case 'user_suspended':
        return 'danger';
      case 'user_registered':
      case 'business_registered':
        return 'info';
      case 'deal_created':
      case 'deal_updated':
        return 'warning';
      case 'plan_assigned':
      case 'role_assigned':
        return 'primary';
      default:
        return 'secondary';
    }
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
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
      // Use a more reliable date formatting
      try {
        return date.toLocaleDateString('en-GB', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      } catch (error) {
        return 'Invalid Date';
      }
    }
  };

  return (
    <div className="user-management">
      <div className="section-header">
        <div className="header-content">
          <h2>System Activities</h2>
          <p>Monitor and track all system activities and user actions</p>
        </div>
      </div>

      <div className="user-filters">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search activities..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
          <button type="button">
            <i className="fas fa-search"></i>
          </button>
        </div>
        
        <div className="filter-controls">
          <div className="filter-group">
            <label htmlFor="type-filter">Activity Type</label>
            <select
              id="type-filter"
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <option value="all">All Activities</option>
              <option value="user_registered">User Registrations</option>
              <option value="user_approved">User Approvals</option>
              <option value="user_rejected">User Rejections</option>
              <option value="business_registered">Business Registrations</option>
              <option value="deal_created">Deal Creation</option>
              <option value="plan_assigned">Plan Assignments</option>
              <option value="role_assigned">Role Assignments</option>
              <option value="login">Login Activities</option>
              <option value="admin_action">Admin Actions</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="date-filter">Date Range</label>
            <select
              id="date-filter"
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
            >
              <option value="1">Last 24 hours</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>

          <div className="filter-actions">
            <button
              type="button"
              className="btn-clear"
              onClick={() => setFilters({ type: 'all', dateRange: '7', search: '' })}
            >
              <i className="fas fa-times"></i>
              Clear Filters
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
          <p>No activities match your current filters.</p>
          <button className="btn-outline" onClick={() => setFilters({ type: 'all', dateRange: '7', search: '' })}>
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          <table className="user-table">
            <thead>
              <tr>
                <th>Activity</th>
                <th>Type</th>
                <th>User</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((activity) => (
                <tr key={activity.id}>
                  <td data-label="Activity">
                    <div className="user-name-cell">
                      <div className="user-avatar">
                        <i className={getActivityIcon(activity.type)}></i>
                      </div>
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
                        <div>{activity.user.fullName || activity.user.email}</div>
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
                      {formatTimeAgo(activity.timestamp || activity.createdAt)}
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
