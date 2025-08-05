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
  const [showAddUserModal, setShowAddUserModal] = useState(false);
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

  const handleSelectUser = (userId) => {
    if (activeTab === 'users') {
      setSelectedUsers(prev => {
        if (prev.includes(userId)) {
          return prev.filter(id => id !== userId);
        } else {
          return [...prev, userId];
        }
      });
    } else {
      setSelectedMerchants(prev => {
        if (prev.includes(userId)) {
          return prev.filter(id => id !== userId);
        } else {
          return [...prev, userId];
        }
      });
    }
  };
  
  const handleSelectAll = () => {
    if (activeTab === 'users') {
      if (selectedUsers.length === pendingUsers.length) {
        setSelectedUsers([]);
      } else {
        setSelectedUsers(pendingUsers.map(user => user.id));
      }
    } else {
      if (selectedMerchants.length === pendingMerchants.length) {
        setSelectedMerchants([]);
      } else {
        setSelectedMerchants(pendingMerchants.map(merchant => merchant.id));
      }
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

  const handleBulkAction = async (action) => {
    const selectedIds = activeTab === 'users' ? selectedUsers : selectedMerchants;
    if (selectedIds.length === 0) {
      showNotification('No users selected. Please select users first.', 'warning');
      return;
    }
    
    try {
      await api.post(`/admin/users/bulk-action`, { userIds: selectedIds, action });
      fetchPendingApprovals();
      setSelectedUsers([]);
      setSelectedMerchants([]);
      showNotification(`Selected users ${action}ed successfully!`, 'success');
    } catch (error) {
      console.error(`Error ${action}ing users:`, error);
      showNotification(`Failed to ${action} users. Please try again.`, 'error');
    }
  };

  const handleApproveSelected = async () => {
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
      if (error.response?.status === 401) {
        handleSessionExpired();
        return;
      }
      showNotification('Failed to approve selected users. Please try again.', 'error');
    }
  };

  const handleRejectSelected = async () => {
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
      if (error.response?.status === 401) {
        handleSessionExpired();
        return;
      }
      showNotification('Failed to reject selected users. Please try again.', 'error');
    }
  };

  const handleAddUser = async (userData) => {
    try {
      const isSessionValid = await validateSession();
      if (!isSessionValid) {
        showNotification('Your session has expired. Please log in again.', 'error');
        return;
      }

      const response = await api.post('/admin/users', userData);
      showNotification('User added successfully!', 'success');
      setShowAddUserModal(false);
      fetchPendingApprovals();
    } catch (error) {
      console.error('Error adding user:', error);
      if (error.response?.status === 401) {
        handleSessionExpired();
        return;
      }
      showNotification('Failed to add user. Please try again.', 'error');
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

  return (
    <div className="approval-queue">
      <div className="section-header">
        <div className="header-content">
          <h2>Pending Approvals</h2>
          <p>
            {pendingUsers.length} users and {pendingMerchants.length} merchants awaiting approval
          </p>
        </div>
        <div className="header-actions">
          <button className="button primary" onClick={() => setShowAddUserModal(true)}>
            <i className="fas fa-plus"></i> Add User
          </button>
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
      {((activeTab === 'users' && selectedUsers.length > 0) || 
        (activeTab === 'merchants' && selectedMerchants.length > 0)) && (
        <div className="bulk-actions">
          <span className="selected-count">
            {activeTab === 'users' ? selectedUsers.length : selectedMerchants.length} selected
          </span>
          <button className="btn btn-success" onClick={handleApproveSelected}>
            <i className="fas fa-check"></i> Approve Selected
          </button>
          <button className="btn btn-danger" onClick={handleRejectSelected}>
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
        ) : (activeTab === 'users' ? pendingUsers : pendingMerchants).length > 0 ? (
          <>
            {/* Select All Checkbox */}
            <div className="select-all-container">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={(activeTab === 'users' ? selectedUsers : selectedMerchants).length === 
                          (activeTab === 'users' ? pendingUsers : pendingMerchants).length}
                  onChange={handleSelectAll}
                />
                Select All {activeTab}
              </label>
            </div>

            <ul className="activity-list approval-list">
              {(activeTab === 'users' ? pendingUsers : pendingMerchants).map(user => (
                <li key={user.id} className="activity-item approval-activity-item">
                  <div className="activity-icon">
                    <input
                      type="checkbox"
                      checked={(activeTab === 'users' ? selectedUsers : selectedMerchants).includes(user.id)}
                      onChange={() => handleSelectUser(user.id)}
                      className="user-checkbox"
                    />
                    <div className="user-avatar">
                      {user.profilePicture ? (
                        <img src={user.profilePicture} alt={user.fullName} />
                      ) : (
                        <div className="user-initials">
                          {user.fullName.split(' ').map(n => n[0]).join('')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="activity-content">
                    <div className="approval-user-details">
                      <h3>{user.fullName}</h3>
                      <p>{user.email}</p>
                      <span className="approval-date">Registered: {formatDate(user.created_at || user.createdAt)}</span>
                    </div>
                    <div className="approval-meta">
                      <span className={`plan-badge ${user.membershipType || 'none'}`}>
                        {user.membershipType && typeof user.membershipType === 'string' ? 
                          (user.membershipType.charAt(0).toUpperCase() + user.membershipType.slice(1)) : 
                          'No Plan'
                        }
                      </span>
                      {user.phone && (
                        <span className="contact-info"><i className="fas fa-phone"></i> {user.phone}</span>
                      )}
                      {user.address?.city && (
                        <span className="contact-info"><i className="fas fa-map-marker-alt"></i> {user.address.city}, {user.address.country}</span>
                      )}
                    </div>
                    <div className="approval-actions">
                      <button className="btn-approve" onClick={() => handleApproveUser(user.id, user.userType)}>
                        <i className="fas fa-check"></i> Approve
                      </button>
                      <button className="btn-reject" onClick={() => handleRejectUser(user.id)}>
                        <i className="fas fa-times"></i> Reject
                      </button>
                      <button className="btn-view">
                        <i className="fas fa-eye"></i> View
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="empty-activities">
            <i className="fas fa-check-circle"></i>
            <h3>No Pending Approvals</h3>
            <p>All user registrations have been processed.</p>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <AddUserModal 
          onClose={() => setShowAddUserModal(false)}
          onSubmit={handleAddUser}
        />
      )}
    </div>
  );
};

// Add User Modal Component
const AddUserModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    userType: 'user',
    membershipType: 'community',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Ghana'
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add New User</h3>
          <button className="close-button" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="user-form">
          <div className="form-grid">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="fullName">Full Name *</label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="phone">Phone</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="userType">User Type</label>
                <select
                  id="userType"
                  name="userType"
                  value={formData.userType}
                  onChange={handleChange}
                >
                  <option value="user">User</option>
                  <option value="merchant">Merchant</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="membershipType">Membership Type</label>
                <select
                  id="membershipType"
                  name="membershipType"
                  value={formData.membershipType}
                  onChange={handleChange}
                >
                  <option value="community">Community</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="address.city">City</label>
                <input
                  type="text"
                  id="address.city"
                  name="address.city"
                  value={formData.address.city}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
          
          <div className="form-actions">
            <button type="button" className="button secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button primary">
              Add User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApprovalQueue;
