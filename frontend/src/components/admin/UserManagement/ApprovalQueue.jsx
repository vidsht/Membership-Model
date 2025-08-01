import React, { useState } from 'react';
// import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import api from '../../../services/api';
import './ApprovalQueue.css';

const ApprovalQueue = () => {
  const { validateSession, handleSessionExpired } = useAuth();
  const { showNotification } = useNotification();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  
  React.useEffect(() => {
    fetchPendingUsers();
  }, []);
  const fetchPendingUsers = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/admin/users?status=pending');
      setPendingUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching pending users:', error);
      console.error('Error response:', error.response?.data);
      showNotification('Error loading pending users. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSelectUser = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };
  
  const handleSelectAll = () => {
    if (selectedUsers.length === pendingUsers.length) {
      // If all are selected, deselect all
      setSelectedUsers([]);
    } else {
      // Otherwise, select all
      setSelectedUsers(pendingUsers.map(user => user._id));
    }
  };
  
  const handleApproveUser = async (userId) => {
    try {
      await api.post(`/admin/users/${userId}/approve`);
      fetchPendingUsers();
      showNotification('User approved successfully!', 'success');
    } catch (error) {
      console.error('Error approving user:', error);
      showNotification('Failed to approve user. Please try again.', 'error');
    }
  };
  
  const handleRejectUser = async (userId) => {
    try {
      await api.post(`/admin/users/${userId}/reject`);
      fetchPendingUsers();
      showNotification('User rejected successfully!', 'success');
    } catch (error) {
      console.error('Error rejecting user:', error);
      showNotification('Failed to reject user. Please try again.', 'error');
    }
  };
  const handleBulkAction = async (action) => {
    if (selectedUsers.length === 0) {
      showNotification('No users selected. Please select users first.', 'warning');
      return;
    }
    
    try {
      await api.post(`/admin/users/bulk-action`, { userIds: selectedUsers, action });
      fetchPendingUsers();
      setSelectedUsers([]);
      showNotification(`Selected users ${action}ed successfully!`, 'success');
    } catch (error) {
      console.error(`Error ${action}ing users:`, error);
      showNotification(`Failed to ${action} users. Please try again.`, 'error');
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
      fetchPendingUsers();
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
          <p>{pendingUsers.length} users awaiting approval</p>
        </div>
        <div className="header-actions">
          <button className="button primary" onClick={() => setShowAddUserModal(true)}>
            <i className="fas fa-plus"></i> Add User
          </button>
        </div>
      </div>

      <div className="section-content">
        {isLoading ? (
          <div className="loading-list">
            <div className="loading-item"></div>
            <div className="loading-item"></div>
            <div className="loading-item"></div>
          </div>
        ) : pendingUsers.length > 0 ? (
          <ul className="activity-list approval-list">
            {pendingUsers.map(user => (
              <li key={user._id} className="activity-item approval-activity-item">
                <div className="activity-icon">
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
                    <span className={`plan-badge ${user.membershipType}`}>
                      {user.membershipType.charAt(0).toUpperCase() + user.membershipType.slice(1)}
                    </span>
                    {user.phone && (
                      <span className="contact-info"><i className="fas fa-phone"></i> {user.phone}</span>
                    )}
                    {user.address?.city && (
                      <span className="contact-info"><i className="fas fa-map-marker-alt"></i> {user.address.city}, {user.address.country}</span>
                    )}
                  </div>
                  <div className="approval-actions">
                    <button className="btn-approve" onClick={() => handleApproveUser(user._id)}>
                      <i className="fas fa-check"></i> Approve
                    </button>
                    <button className="btn-reject" onClick={() => handleRejectUser(user._id)}>
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

// Add User Modal Component (reused from UserList)
const AddUserModal = ({ onClose, onSubmit }) => {  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    userType: 'user', // Changed from 'member' to 'user'
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
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h3>Add New User</h3>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-section">
            <h4>Personal Information</h4>
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
                <label htmlFor="userType">User Type</label>                <select
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
            </div>
          </div>

          <div className="form-section">
            <h4>Address Information</h4>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="address.street">Street</label>
                <input
                  type="text"
                  id="address.street"
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleChange}
                />
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
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="address.state">State</label>
                <input
                  type="text"
                  id="address.state"
                  name="address.state"
                  value={formData.address.state}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="address.zipCode">Zip Code</label>
                <input
                  type="text"
                  id="address.zipCode"
                  name="address.zipCode"
                  value={formData.address.zipCode}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="modal-actions">
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
