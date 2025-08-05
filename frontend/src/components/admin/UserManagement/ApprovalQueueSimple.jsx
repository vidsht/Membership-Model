import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import api from '../../../services/api';
import './ApprovalQueue.css';

const ApprovalQueue = () => {
  const { validateSession, handleSessionExpired } = useAuth();
  const { showNotification } = useNotification();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingMerchants, setPendingMerchants] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedMerchants, setSelectedMerchants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  
  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      setIsLoading(true);
      
      // Fetch pending users
      const usersResponse = await api.get('/admin/users?status=pending&userType=user');
      setPendingUsers(usersResponse.data.users || []);
      
      // Fetch pending merchants
      const merchantsResponse = await api.get('/admin/users?status=pending&userType=merchant');
      setPendingMerchants(merchantsResponse.data.users || []);
      
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      showNotification('Error loading pending approvals. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveUser = async (userId, userType) => {
    try {
      if (userType === 'merchant') {
        await api.post(`/admin/merchants/${userId}/approve`);
      } else {
        await api.put(`/admin/users/${userId}/status`, { status: 'approved' });
      }
      fetchPendingApprovals();
      showNotification('User approved successfully!', 'success');
    } catch (error) {
      console.error('Error approving user:', error);
      showNotification('Failed to approve user. Please try again.', 'error');
    }
  };
  
  const handleRejectUser = async (userId) => {
    try {
      await api.post(`/admin/users/${userId}/reject`);
      fetchPendingApprovals();
      showNotification('User rejected successfully!', 'success');
    } catch (error) {
      console.error('Error rejecting user:', error);
      showNotification('Failed to reject user. Please try again.', 'error');
    }
  };

  const handleBulkApprove = async () => {
    const selectedIds = activeTab === 'users' ? selectedUsers : selectedMerchants;
    if (selectedIds.length === 0) {
      showNotification(`Please select ${activeTab} to approve`, 'warning');
      return;
    }

    try {
      await api.post('/admin/users/bulk-action', {
        action: 'approve',
        userIds: selectedIds
      });
      
      showNotification(`${selectedIds.length} ${activeTab} approved successfully!`, 'success');
      setSelectedUsers([]);
      setSelectedMerchants([]);
      fetchPendingApprovals();
    } catch (error) {
      console.error('Error approving users:', error);
      showNotification('Failed to approve selected users. Please try again.', 'error');
    }
  };

  const handleBulkReject = async () => {
    const selectedIds = activeTab === 'users' ? selectedUsers : selectedMerchants;
    if (selectedIds.length === 0) {
      showNotification(`Please select ${activeTab} to reject`, 'warning');
      return;
    }

    try {
      await api.post('/admin/users/bulk-action', {
        action: 'reject',
        userIds: selectedIds
      });
      
      showNotification(`${selectedIds.length} ${activeTab} rejected successfully!`, 'success');
      setSelectedUsers([]);
      setSelectedMerchants([]);
      fetchPendingApprovals();
    } catch (error) {
      console.error('Error rejecting users:', error);
      showNotification('Failed to reject selected users. Please try again.', 'error');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const currentData = activeTab === 'users' ? pendingUsers : pendingMerchants;
  const selectedIds = activeTab === 'users' ? selectedUsers : selectedMerchants;
  const setSelected = activeTab === 'users' ? setSelectedUsers : setSelectedMerchants;

  return (
    <div className="approval-queue">
      <div className="section-header">
        <div className="header-content">
          <h2>Pending Approvals</h2>
          <p>
            {pendingUsers.length} users and {pendingMerchants.length} merchants awaiting approval
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="approval-tabs">
        <button 
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <i className="fas fa-user"></i> 
          Users ({pendingUsers.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'merchants' ? 'active' : ''}`}
          onClick={() => setActiveTab('merchants')}
        >
          <i className="fas fa-store"></i> 
          Merchants ({pendingMerchants.length})
        </button>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="bulk-actions">
          <span className="selected-count">
            {selectedIds.length} selected
          </span>
          <button className="btn btn-success" onClick={handleBulkApprove}>
            <i className="fas fa-check"></i> Approve Selected
          </button>
          <button className="btn btn-danger" onClick={handleBulkReject}>
            <i className="fas fa-times"></i> Reject Selected
          </button>
        </div>
      )}

      <div className="section-content">
        {isLoading ? (
          <div className="loading-list">
            <div className="loading-item"></div>
            <div className="loading-item"></div>
            <div className="loading-item"></div>
          </div>
        ) : currentData.length > 0 ? (
          <div className="approval-list">
            {currentData.map(user => (
              <div key={user.id} className="approval-item">
                <div className="user-info">
                  <div className="user-avatar">
                    {user.profilePicture ? (
                      <img src={user.profilePicture} alt={user.fullName} />
                    ) : (
                      <div className="user-initials">
                        {user.fullName.split(' ').map(n => n[0]).join('')}
                      </div>
                    )}
                  </div>
                  <div className="user-details">
                    <h3>{user.fullName}</h3>
                    <p>{user.email}</p>
                    <span className="registration-date">
                      Registered: {formatDate(user.created_at || user.createdAt)}
                    </span>
                    {user.phone && (
                      <span className="phone">{user.phone}</span>
                    )}
                  </div>
                </div>
                <div className="approval-actions">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(user.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelected(prev => [...prev, user.id]);
                      } else {
                        setSelected(prev => prev.filter(id => id !== user.id));
                      }
                    }}
                  />
                  <button 
                    className="btn-approve" 
                    onClick={() => handleApproveUser(user.id, user.userType)}
                  >
                    <i className="fas fa-check"></i> Approve
                  </button>
                  <button 
                    className="btn-reject" 
                    onClick={() => handleRejectUser(user.id)}
                  >
                    <i className="fas fa-times"></i> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <i className="fas fa-check-circle"></i>
            <h3>No Pending Approvals</h3>
            <p>All {activeTab} registrations have been processed.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovalQueue;
