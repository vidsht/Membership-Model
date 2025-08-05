import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './UserDetail.css';

const UserDetail = ({ user, onClose, onApprove, onReject }) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  
  // Safety check - if user is null or undefined, show loading or error
  if (!user) {
    return (
      <div className="user-detail-overlay">
        <div className="user-detail-modal">
          <div className="modal-header">
            <h3>User Details</h3>
            <button className="btn-close" onClick={onClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="modal-body">
            <div className="loading-state">
              <i className="fas fa-spinner fa-spin"></i>
              <p>Loading user details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  const handleReject = () => {
    if (!isRejecting) {
      setIsRejecting(true);
      return;
    }
    
    onReject(rejectionReason);
  };
  const getMembershipBadge = (membership) => {
    switch (type) {
      case 'community':
        return <span className="membership-badge community">Community</span>;
      case 'silver':
        return <span className="membership-badge silver">Silver</span>;
      case 'gold':
        return <span className="membership-badge gold">Gold</span>;
      default:
        return <span className="membership-badge">Community</span>;
    }
  };
  
  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="status-badge approved">Approved</span>;
      case 'pending':
        return <span className="status-badge pending">Pending</span>;
      case 'rejected':
        return <span className="status-badge rejected">Rejected</span>;
      case 'suspended':
        return <span className="status-badge suspended">Suspended</span>;
      default:
        return <span className="status-badge">Unknown</span>;
    }
  };
  
  return (
    <div className="user-detail-overlay">
      <div className="user-detail-modal">
        <div className="modal-header">
          <h3>User Details</h3>
          <button className="btn-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="modal-body">
          <div className="user-profile-header">            <div className="user-profile-image">
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt={user.fullName || 'User'} />
              ) : (
                <div className="user-initials">
                  {user?.fullName ? 
                    user.fullName.split(' ').map(n => n[0]).join('') : 
                    'U'
                  }
                </div>
              )}
            </div>
            
            <div className="user-profile-info">
              <h2>{user?.fullName || 'Unknown User'}</h2>
              <p className="user-email">{user?.email || 'No email'}</p>
              <div className="user-status">
                {getMembershipTypeBadge(user?.membershipType)}
                {getStatusBadge(user?.status)}
                <span className="member-id">ID: {user?.membershipNumber || 'N/A'}</span>
              </div>
            </div>
          </div>
          
          <div className="user-details-sections">
            <div className="details-section">
              <h4>Personal Information</h4>
              
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">Phone</span>
                  <span className="detail-value">{user.phone || 'N/A'}</span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">Address</span>
                  <span className="detail-value">
                    {user.address?.street ? (
                      <>
                        {user.address.street}, {user.address.city}, {user.address.state}{' '}
                        {user.address.zipCode}, {user.address.country}
                      </>
                    ) : (
                      'N/A'
                    )}
                  </span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">Member Since</span>
                  <span className="detail-value">{formatDate(user.createdAt)}</span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">Last Login</span>
                  <span className="detail-value">{formatDate(user.lastLogin)}</span>
                </div>
              </div>
            </div>
            
            <div className="details-section">
              <h4>Membership Details</h4>
              
              <div className="details-grid">                <div className="detail-item">
                  <span className="detail-label">Membership Type</span>
                  <span className="detail-value">
                    {user?.membershipType ? 
                      user.membershipType.charAt(0).toUpperCase() + user.membershipType.slice(1) :
                      'Community'
                    }
                  </span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">Membership ID</span>
                  <span className="detail-value">{user?.membershipNumber || 'N/A'}</span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">Account Status</span>
                  <span className="detail-value">{getStatusBadge(user?.status)}</span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">User Type</span>
                  <span className="detail-value">
                    {user?.userType ? 
                      user.userType.charAt(0).toUpperCase() + user.userType.slice(1) :
                      'User'
                    }
                  </span>
                </div>
              </div>
            </div>
            
            <div className="details-section">
              <h4>Preferences</h4>
              
              <div className="preferences-list">
                <div className="preference-item">
                  <span className="preference-name">Newsletter</span>
                  <span className={`preference-status ${user.preferences?.newsletter ? 'enabled' : 'disabled'}`}>
                    {user.preferences?.newsletter ? 'Subscribed' : 'Not subscribed'}
                  </span>
                </div>
                
                <div className="preference-item">
                  <span className="preference-name">Event Notifications</span>
                  <span className={`preference-status ${user.preferences?.eventNotifications ? 'enabled' : 'disabled'}`}>
                    {user.preferences?.eventNotifications ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                
                <div className="preference-item">
                  <span className="preference-name">Member Directory Listing</span>
                  <span className={`preference-status ${user.preferences?.memberDirectory ? 'enabled' : 'disabled'}`}>
                    {user.preferences?.memberDirectory ? 'Visible' : 'Hidden'}
                  </span>
                </div>
              </div>
            </div>
            
            {user.businessInfo && user.userType === 'merchant' && (
              <div className="details-section">
                <h4>Business Information</h4>
                
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Business Name</span>
                    <span className="detail-value">{user.businessInfo.businessName || 'N/A'}</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-label">Category</span>
                    <span className="detail-value">
                      {user.businessInfo.businessCategory?.charAt(0).toUpperCase() + user.businessInfo.businessCategory?.slice(1) || 'N/A'}
                    </span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-label">Phone</span>
                    <span className="detail-value">{user.businessInfo.businessPhone || 'N/A'}</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-label">Email</span>
                    <span className="detail-value">{user.businessInfo.businessEmail || 'N/A'}</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-label">Website</span>
                    <span className="detail-value">
                      {user.businessInfo.website ? (
                        <a href={user.businessInfo.website} target="_blank" rel="noopener noreferrer">
                          {user.businessInfo.website}
                        </a>
                      ) : (
                        'N/A'
                      )}
                    </span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-label">Business Address</span>
                    <span className="detail-value">
                      {user.businessInfo.businessAddress?.street ? (
                        <>
                          {user.businessInfo.businessAddress.street}, {user.businessInfo.businessAddress.city},{' '}
                          {user.businessInfo.businessAddress.state} {user.businessInfo.businessAddress.zipCode},{' '}
                          {user.businessInfo.businessAddress.country}
                        </>
                      ) : (
                        'N/A'
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
          <div className="modal-footer">
          {user.status === 'pending' ? (
            !isRejecting ? (
              <>
                <button className="btn-primary" onClick={onApprove}>
                  <i className="fas fa-check"></i> Approve User
                </button>
                <button className="btn-danger" onClick={handleReject}>
                  <i className="fas fa-times"></i> Reject User
                </button>
              </>
            ) : (
              <div className="rejection-form">
                <label htmlFor="rejectionReason">Rejection Reason:</label>
                <textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  rows={3}
                ></textarea>
                <div className="rejection-actions">
                  <button className="btn-secondary" onClick={() => setIsRejecting(false)}>
                    Cancel
                  </button>
                  <button 
                    className="btn-danger" 
                    onClick={handleReject}
                    disabled={!rejectionReason.trim()}
                  >
                    Confirm Rejection
                  </button>
                </div>              </div>
            )
          ) : (
            <div className="user-actions">
              {/* Assign Plan button removed as per requirements */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDetail;
