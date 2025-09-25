// UserDetailPage.jsx - Fixed infinite re-rendering issue
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { useAdminNavigation } from '../../../hooks/useAdminNavigation';
import api from '../../../services/api';
import useImageUrl from '../../../hooks/useImageUrl';
import './UserDetailPage.css';

const UserDetailPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { navigateBackToAdmin } = useAdminNavigation();
  const { validateSession, handleSessionExpired } = useAuth();
  const { showNotification } = useNotification();
  const { getProfileImageUrl } = useImageUrl();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch user data - Fixed dependencies
  const fetchUserData = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/admin/users/${userId}`);
      
      if (response.data.success && response.data.user) {
        setUser(response.data.user);
      } else {
        throw new Error(response.data.message || 'User not found');
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      
      if (err.response?.status === 401) {
        handleSessionExpired();
        return;
      }
      
      if (err.response?.status === 404) {
        showNotification('User not found', 'error');
        navigate('/admin');
        return;
      }
      
      showNotification('Failed to load user data', 'error');
    } finally {
      setLoading(false);
    }
  }, [userId, handleSessionExpired, showNotification, navigate]);

  // Initialize component - Fixed to prevent infinite loop
  useEffect(() => {
    let isMounted = true;

    const initializeComponent = async () => {
      try {
        const sessionValid = await validateSession();
        if (!sessionValid) {
          handleSessionExpired();
          return;
        }
        
        if (isMounted) {
          await fetchUserData();
        }
      } catch (err) {
        console.error('Error initializing component:', err);
        if (isMounted) {
          showNotification('Failed to load user details', 'error');
        }
      }
    };

    initializeComponent();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [userId]); // Only depend on userId

  // Handle user approval
  const handleApprove = async () => {
    try {
      setActionLoading('approve');
      const response = await api.put(`/admin/users/${userId}/status`, { status: 'approved' });
      
      if (response.data.success) {
        showNotification(`${user.fullName} approved successfully`, 'success');
        // Refresh user data
        await fetchUserData();
      } else {
        throw new Error(response.data.message || 'Failed to approve user');
      }
    } catch (err) {
      console.error('Error approving user:', err);
      const message = err.response?.data?.message || 'Failed to approve user';
      showNotification(message, 'error');
    } finally {
      setActionLoading('');
    }
  };

  // Handle user rejection
  const handleReject = async () => {
    try {
      setActionLoading('reject');
      const response = await api.put(`/admin/users/${userId}/status`, { 
        status: 'rejected',
        rejectionReason: rejectionReason.trim() || 'No reason provided'
      });
      
      if (response.data.success) {
        showNotification(`${user.fullName} rejected successfully`, 'success');
        setShowRejectModal(false);
        setRejectionReason('');
        // Refresh user data
        await fetchUserData();
      } else {
        throw new Error(response.data.message || 'Failed to reject user');
      }
    } catch (err) {
      console.error('Error rejecting user:', err);
      const message = err.response?.data?.message || 'Failed to reject user';
      showNotification(message, 'error');
    } finally {
      setActionLoading('');
    }
  };

  // Handle user suspension
  const handleSuspend = async () => {
    try {
      setActionLoading('suspend');
      const response = await api.put(`/admin/users/${userId}/status`, { status: 'suspended' });
      
      if (response.data.success) {
        showNotification(`${user.fullName} suspended successfully`, 'success');
        // Refresh user data
        await fetchUserData();
      } else {
        throw new Error(response.data.message || 'Failed to suspend user');
      }
    } catch (err) {
      console.error('Error suspending user:', err);
      const message = err.response?.data?.message || 'Failed to suspend user';
      showNotification(message, 'error');
    } finally {
      setActionLoading('');
    }
  };

  // Handle user activation
  const handleActivate = async () => {
    try {
      setActionLoading('activate');
      const response = await api.put(`/admin/users/${userId}/status`, { status: 'approved' });
      
      if (response.data.success) {
        showNotification(`${user.fullName} activated successfully`, 'success');
        // Refresh user data
        await fetchUserData();
      } else {
        throw new Error(response.data.message || 'Failed to activate user');
      }
    } catch (err) {
      console.error('Error activating user:', err);
      const message = err.response?.data?.message || 'Failed to activate user';
      showNotification(message, 'error');
    } finally {
      setActionLoading('');
    }
  };

  // Handle user deletion
  const handleDelete = async () => {
    try {
      setActionLoading('delete');
      const response = await api.delete(`/admin/users/${userId}`);
      
      if (response.data.success) {
        showNotification(`${user.fullName} deleted successfully`, 'success');
        navigate('/admin');
      } else {
        throw new Error(response.data.message || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      const message = err.response?.data?.message || 'Failed to delete user';
      showNotification(message, 'error');
    } finally {
      setActionLoading('');
      setShowDeleteConfirm(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'status-approved';
      case 'pending': return 'status-pending';
      case 'rejected': return 'status-rejected';
      case 'suspended': return 'status-suspended';
      default: return 'status-unknown';
    }
  };

  // Format plan validity
  const formatValidTill = (user) => {
    if (!user.validationDate) {
      return <span className="validity-none">No validity set</span>;
    }
    
    try {
      const validationDate = new Date(user.validationDate);
      const now = new Date();
      
      if (validationDate < now) {
        return <span className="validity-expired">Expired</span>;
      }
      
      const diffTime = validationDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let className = 'validity-active';
      if (diffDays <= 7) {
        className = 'validity-expiring-soon';
      } else if (diffDays <= 30) {
        className = 'validity-expiring';
      }
      
      return (
        <span className={className}>
          {validationDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })} ({diffDays} days)
        </span>
      );
    } catch (error) {
      return <span className="validity-error">Invalid date</span>;
    }
  };

  if (loading) {
    return (
      <div className="user-detail-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading user details...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="user-detail-container">
        <div className="error-state">
          <i className="fas fa-user-times"></i>
          <h3>User Not Found</h3>
          <p>The requested user could not be found.</p>
          <button onClick={() => navigateBackToAdmin('users')} className="btn btn-primary">
            Back to Users
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="user-detail-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-left">
            <button onClick={() => navigateBackToAdmin('users')} className="btn-back">
              <i className="fas fa-arrow-left"></i>
            </button>
            <div className="header-info">
              <h1>User Details</h1>
              <div className="header-meta">
                <span className={`status-badge ${getStatusBadgeClass(user.status)}`}>
                  {user.status?.charAt(0).toUpperCase() + user.status?.slice(1) || 'Unknown'}
                </span>
                <span className="user-id">ID: {user.id}</span>
              </div>
            </div>
          </div>
          <div className="header-actions">
            <button
              onClick={() => navigate(`/admin/users/${userId}/edit`)}
              className="btn btn-secondary"
            >
              <i className="fas fa-edit"></i>
              Edit User
            </button>
          </div>
        </div>
      </div>

      {/* User Content */}
      <div className="user-content">
        {/* User Profile Card */}
        <div className="user-profile-card">
          <div className="profile-header">
            <div className="profile-avatar">
              {user.profilePicture ? (
                <img src={getProfileImageUrl(user) || '/uploads/default-avatar.jpg'} alt={user.fullName} />
              ) : (
                 <div className="user-avatar-placeholder">{user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}</div>
               )}
            </div>
            <div className="profile-info">
              <h2>{user.fullName || 'Unknown User'}</h2>
              <p className="profile-email">{user.email}</p>
              {user.membershipNumber && (
                <p className="membership-number">#{user.membershipNumber}</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          {user.status === 'pending' && (
            <div className="quick-actions">
              <button
                onClick={handleApprove}
                disabled={actionLoading === 'approve'}
                className="btn btn-success"
              >
                {actionLoading === 'approve' ? (
                  <>
                    <div className="btn-spinner"></div>
                    Approving...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check"></i>
                    Approve User
                  </>
                )}
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading === 'reject'}
                className="btn btn-danger"
              >
                <i className="fas fa-times"></i>
                Reject User
              </button>
            </div>
          )}

          {user.status === 'approved' && (
            <div className="quick-actions">
              <button
                onClick={handleSuspend}
                disabled={actionLoading === 'suspend'}
                className="btn btn-warning"
              >
                {actionLoading === 'suspend' ? (
                  <>
                    <div className="btn-spinner"></div>
                    Suspending...
                  </>
                ) : (
                  <>
                    <i className="fas fa-ban"></i>
                    Suspend User
                  </>
                )}
              </button>
            </div>
          )}

          {user.status === 'suspended' && (
            <div className="quick-actions">
              <button
                onClick={handleActivate}
                disabled={actionLoading === 'activate'}
                className="btn btn-success"
              >
                {actionLoading === 'activate' ? (
                  <>
                    <div className="btn-spinner"></div>
                    Activating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check-circle"></i>
                    Activate User
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* User Details Grid */}
        <div className="details-grid">
          {/* Contact Information */}
          <div className="detail-section">
            <h3>Contact Information</h3>
            <div className="detail-items">
              <div className="detail-item">
                <span className="label">Email:</span>
                <span className="value">{user.email || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="label">Phone:</span>
                <span className="value">{user.phone || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="label">Address:</span>
                <span className="value">
                  {typeof user.address === 'string' ? user.address : 
                   typeof user.address === 'object' ? JSON.stringify(user.address) : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="detail-section">
            <h3>Personal Information</h3>
            <div className="detail-items">
              <div className="detail-item">
                <span className="label">Date of Birth:</span>
                <span className="value">{user.dob ? formatDate(user.dob) : 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="label">Community:</span>
                <span className="value">{user.community || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="label">Location:</span>
                <span className="value">
                  {[user.city, user.state, user.country].filter(Boolean).join(', ') || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="detail-section">
            <h3>Account Information</h3>
            <div className="detail-items">
              <div className="detail-item">
                <span className="label">User Type:</span>
                <span className="value">
                  {user.userType ? user.userType.charAt(0).toUpperCase() + user.userType.slice(1) : 'User'}
                </span>
              </div>
              <div className="detail-item">
                <span className="label">Membership Plan:</span>
                <span className="value">
                  {user.membershipType ? 
                    user.membershipType.charAt(0).toUpperCase() + user.membershipType.slice(1) : 
                    'None'
                  }
                </span>
              </div>
              <div className="detail-item">
                <span className="label">Plan Valid Till:</span>
                <span className="value">{formatValidTill(user)}</span>
              </div>
              <div className="detail-item">
                <span className="label">Status:</span>
                <span className={`status-badge ${getStatusBadgeClass(user.status)}`}>
                  {user.status?.charAt(0).toUpperCase() + user.status?.slice(1) || 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          {/* Registration Information */}
          <div className="detail-section">
            <h3>Registration Information</h3>
            <div className="detail-items">
              <div className="detail-item">
                <span className="label">Registered:</span>
                <span className="value">{formatDate(user.createdAt)}</span>
              </div>
              <div className="detail-item">
                <span className="label">Last Updated:</span>
                <span className="value">{formatDate(user.updatedAt)}</span>
              </div>
              {user.lastLogin && (
                <div className="detail-item">
                  <span className="label">Last Login:</span>
                  <span className="value">{formatDate(user.lastLogin)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="danger-zone">
          <h3>Danger Zone</h3>
          <div className="danger-actions">
            <div className="danger-item">
              <div className="danger-info">
                <h4>Delete User</h4>
                <p>Permanently delete this user and all associated data. This action cannot be undone.</p>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="btn btn-danger"
              >
                <i className="fas fa-trash"></i>
                Delete User
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Delete User</h3>
              <button onClick={() => setShowDeleteConfirm(false)} className="modal-close">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="warning-box">
                <i className="fas fa-exclamation-triangle"></i>
                <div>
                  <h4>Are you sure you want to delete {user.fullName}?</h4>
                  <p>This action will permanently remove the user and all associated data. This cannot be undone.</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-secondary"
                disabled={actionLoading === 'delete'}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="btn btn-danger"
                disabled={actionLoading === 'delete'}
              >
                {actionLoading === 'delete' ? (
                  <>
                    <div className="btn-spinner"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-trash"></i>
                    Delete User
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Reject User</h3>
              <button onClick={() => setShowRejectModal(false)} className="modal-close">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="rejectionReason">Rejection Reason (Optional)</label>
                <textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  rows="4"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                className="btn btn-secondary"
                disabled={actionLoading === 'reject'}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="btn btn-danger"
                disabled={actionLoading === 'reject'}
              >
                {actionLoading === 'reject' ? (
                  <>
                    <div className="btn-spinner"></div>
                    Rejecting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-times"></i>
                    Reject User
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDetailPage;
