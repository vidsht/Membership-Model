// UserDetail.jsx - Fixed User Detail Component
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './UserDetail.css';
import useImageUrl from '../../../hooks/useImageUrl';

const UserDetail = ({ user, onClose, onApprove, onReject, onEdit, onDelete }) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [loading, setLoading] = useState(false);
  const { getProfileImageUrl } = useImageUrl();

  // Safety check - if user is null or undefined, show loading or error
  if (!user) {
    return (
      <div className="user-detail loading">
        <div className="loading-spinner"></div>
        <h3>Loading user details...</h3>
      </div>
    );
  }

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

  const handleApprove = async () => {
    if (!onApprove) return;
    
    try {
      setLoading(true);
      await onApprove(user.id); // Fixed: use user.id consistently
    } catch (error) {
      console.error('Error approving user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!onReject) return;
    
    try {
      setLoading(true);
      await onReject(user.id, rejectionReason); // Fixed: use user.id consistently
      setRejectionReason('');
      setIsRejecting(false);
    } catch (error) {
      console.error('Error rejecting user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(user);
    }
  };

  const handleDelete = () => {
    if (onDelete && window.confirm(`Are you sure you want to delete ${user.fullName}? This action cannot be undone.`)) {
      onDelete(user.id); // Fixed: use user.id consistently
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'status-badge status-approved';
      case 'pending':
        return 'status-badge status-pending';
      case 'rejected':
        return 'status-badge status-rejected';
      case 'suspended':
        return 'status-badge status-suspended';
      default:
        return 'status-badge status-unknown';
    }
  };

  const parseAddress = (address) => {
    if (!address) return 'N/A';
    
    if (typeof address === 'string') {
      try {
        const parsed = JSON.parse(address);
        return parsed.street || parsed.address || address;
      } catch (e) {
        return address;
      }
    }
    
    return typeof address === 'object' ? 
      (address.street || address.address || JSON.stringify(address)) : 
      String(address);
  };

  return (
    <div className="user-detail">
      <div className="user-detail-header">
        <div className="user-avatar-large">
          {user.profilePicture ? (
            <img src={getProfileImageUrl(user) || '/uploads/default-avatar.jpg'} alt="Profile" />
          ) : (
             <div className="avatar-placeholder">
               {user.fullName ? user.fullName.charAt(0).toUpperCase() : '?'}
             </div>
           )}
        </div>
        <div className="user-basic-info">
          <h2>{user.fullName || 'Unknown User'}</h2>
          <p className="user-email">
            <i className="fas fa-envelope"></i>
            {user.email || 'No email'}
          </p>
          <div className={getStatusBadgeClass(user.status)}>
            {user.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : 'Unknown'}
          </div>
        </div>
        <div className="header-actions">
          {onEdit && (
            <button onClick={handleEdit} className="btn btn-primary">
              <i className="fas fa-edit"></i> Edit
            </button>
          )}
          {onDelete && (
            <button onClick={handleDelete} className="btn btn-danger">
              <i className="fas fa-trash"></i> Delete
            </button>
          )}
          <button onClick={onClose} className="btn btn-secondary">
            <i className="fas fa-times"></i> Close
          </button>
        </div>
      </div>

      <div className="user-detail-content">
        <div className="detail-section">
          <h3>Personal Information</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Full Name:</label>
              <span>{user.fullName || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <label>Email:</label>
              <span>{user.email || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <label>Phone:</label>
              <span>{user.phone || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <label>Date of Birth:</label>
              <span>{user.dob ? formatDate(user.dob) : 'N/A'}</span>
            </div>
            <div className="detail-item">
              <label>User Type:</label>
              <span>{user.userType ? user.userType.charAt(0).toUpperCase() + user.userType.slice(1) : 'User'}</span>
            </div>
            <div className="detail-item">
              <label>Community:</label>
              <span>{user.community || user.communityName || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Address Information</h3>
          <div className="detail-grid">
            <div className="detail-item full-width">
              <label>Address:</label>
              <span>{parseAddress(user.address)}</span>
            </div>
            <div className="detail-item">
              <label>City:</label>
              <span>{user.city || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <label>State:</label>
              <span>{user.state || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <label>Country:</label>
              <span>{user.country || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Membership Information</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Membership Type:</label>
              <span>{user.membershipType ? user.membershipType.charAt(0).toUpperCase() + user.membershipType.slice(1) : 'Community'}</span>
            </div>
            <div className="detail-item">
              <label>Plan Name:</label>
              <span>{user.planName || user.membershipType || 'Community'}</span>
            </div>
            <div className="detail-item">
              <label>Membership Number:</label>
              <span>{user.membershipNumber || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <label>Plan Assigned:</label>
              <span>{user.planAssignedAt ? formatDate(user.planAssignedAt) : 'N/A'}</span>
            </div>
            <div className="detail-item">
              <label>Plan Expiry:</label>
              <span>
                {user.validationDate ? formatDate(user.validationDate) : 'N/A'}
                {user.isPlanExpired && <span className="expired-badge">Expired</span>}
              </span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Account Information</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Registration Date:</label>
              <span>{formatDate(user.createdAt)}</span> {/* Fixed: use consistent field */}
            </div>
            <div className="detail-item">
              <label>Last Login:</label>
              <span>{user.lastLogin ? formatDate(user.lastLogin) : 'Never'}</span>
            </div>
            <div className="detail-item">
              <label>Status:</label>
              <span className={getStatusBadgeClass(user.status)}>
                {user.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : 'Unknown'}
              </span>
            </div>
            <div className="detail-item">
              <label>Last Updated:</label>
              <span>{user.updated_at ? formatDate(user.updated_at) : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons for Pending Users */}
        {user.status === 'pending' && (
          <div className="detail-section">
            <h3>Approval Actions</h3>
            <div className="approval-actions">
              <button
                onClick={handleApprove}
                disabled={loading}
                className="btn btn-success btn-large"
              >
                <i className="fas fa-check"></i>
                {loading ? 'Approving...' : 'Approve User'}
              </button>

              {!isRejecting ? (
                <button
                  onClick={() => setIsRejecting(true)}
                  disabled={loading}
                  className="btn btn-danger btn-large"
                >
                  <i className="fas fa-times"></i>
                  Reject User
                </button>
              ) : (
                <div className="rejection-form">
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter reason for rejection (optional)"
                    className="rejection-reason"
                    rows={3}
                  />
                  <div className="rejection-actions">
                    <button
                      onClick={handleReject}
                      disabled={loading}
                      className="btn btn-danger"
                    >
                      <i className="fas fa-times"></i>
                      {loading ? 'Rejecting...' : 'Confirm Reject'}
                    </button>
                    <button
                      onClick={() => {
                        setIsRejecting(false);
                        setRejectionReason('');
                      }}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDetail;
