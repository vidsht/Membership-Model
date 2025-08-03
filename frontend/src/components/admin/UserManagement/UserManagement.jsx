import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { useNotification } from '../../../contexts/NotificationContext';
import Modal from '../../shared/Modal';
import { useModal } from '../../../hooks/useModal';
import './UserManagement.css';

const UserManagement = () => {
  const { showNotification } = useNotification();
  const { modal, showConfirm, showDeleteConfirm, hideModal } = useModal();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    userType: '',
    status: '',
    membershipType: '',
    community: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [communities, setCommunities] = useState([]);
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    fetchUsers();
    fetchCommunities();
    fetchPlans();
  }, [filters, pagination.page]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      });
      
      const response = await api.get(`/admin/users?${params}`);
      setUsers(response.data.users || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination?.total || 0,
        pages: response.data.pagination?.pages || 0
      }));
    } catch (err) {
      setError('Failed to fetch users');
      console.error('Error fetching users:', err);
      showNotification('Error loading users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCommunities = async () => {
    try {
      const response = await api.get('/admin/communities');
      setCommunities(response.data.communities || []);
    } catch (err) {
      console.error('Error fetching communities:', err);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await api.get('/admin/plans');
      setPlans(response.data.plans || []);
    } catch (err) {
      console.error('Error fetching plans:', err);
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

  const handleUserSelect = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user.id));
    }
  };
  const handleBulkAction = async (action) => {
    if (selectedUsers.length === 0) {
      showNotification('Please select users first', 'warning');
      return;
    }

    const confirmed = await showConfirm(
      `Confirm Bulk ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      `Are you sure you want to ${action} ${selectedUsers.length} selected users?`,
      `${action.charAt(0).toUpperCase() + action.slice(1)} Users`
    );
    
    if (!confirmed) return;

    try {
      await Promise.all(
        selectedUsers.map(userId => 
          api.put(`/admin/users/${userId}/status`, { status: action })
        )
      );
      
      setSelectedUsers([]);
      fetchUsers();
      showNotification(`Successfully ${action}ed selected users`, 'success');
    } catch (err) {
      showNotification(`Failed to ${action} users`, 'error');
      console.error('Bulk action error:', err);
    }
  };

  const handleStatusUpdate = async (userId, newStatus) => {
    try {
      await api.put(`/admin/users/${userId}/status`, { status: newStatus });
      fetchUsers();
      showNotification('User status updated successfully', 'success');
    } catch (err) {
      showNotification('Failed to update user status', 'error');
      console.error('Status update error:', err);
    }
  };

  const handleUserEdit = (user) => {
    setEditingUser({ ...user });
    setShowUserDetails(true);
  };

  const handleUserSave = async () => {
    try {
      await api.put(`/admin/users/${editingUser.id}`, editingUser);
      setEditingUser(null);
      setShowUserDetails(false);
      fetchUsers();
      showNotification('User updated successfully', 'success');
    } catch (err) {
      showNotification('Failed to update user', 'error');
      console.error('User update error:', err);
    }
  };

  const handleAddUser = async (userData) => {
    try {
      await api.post('/auth/register', userData);
      setShowAddUser(false);
      fetchUsers();
      showNotification('User added successfully', 'success');
    } catch (err) {
      showNotification('Failed to add user', 'error');
      console.error('Add user error:', err);
    }  };  const handleDeleteUser = async (userId, userName) => {
    const confirmed = await showDeleteConfirm(userName, async () => {
      try {
        await api.delete(`/admin/users/${userId}`);
        showNotification('User deleted successfully', 'success');
        fetchUsers();
      } catch (err) {
        showNotification('Failed to delete user', 'error');
        console.error('Delete user error:', err);
      }
    }, {
      title: 'Delete User',
      message: `Are you sure you want to delete user "${userName}"? This action cannot be undone.`,
      confirmText: 'Delete User'
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      userType: '',
      status: '',
      membershipType: '',
      community: ''
    });
  };

  if (loading && users.length === 0) {
    return <div className="loading">Loading users...</div>;
  }

  return (
    <div className="user-management">
      <div className="user-management-header">
        <h2>User Management</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddUser(true)}
        >
          <i className="fas fa-plus"></i> Add User
        </button>
      </div>      {/* Enhanced Filters */}
      <div className="filters-section">
        <div className="filters-row">
          <div className="filter-group">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filter-group">
            <select 
              value={filters.userType} 
              onChange={(e) => handleFilterChange('userType', e.target.value)}
              className="filter-select"
            >
              <option value="">All User Types</option>
              <option value="user">Regular User</option>
              <option value="merchant">Merchant</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          
          <div className="filter-group">
            <select 
              value={filters.status} 
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          
          <div className="filter-group">            <select 
              value={filters.membershipType} 
              onChange={(e) => handleFilterChange('membershipType', e.target.value)}
              className="filter-select"
            >
              <option value="">All Plans</option>
              {plans.map(plan => (
                <option key={plan.id} value={plan.key}>{plan.name}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <select 
              value={filters.community} 
              onChange={(e) => handleFilterChange('community', e.target.value)}
              className="filter-select"
            >
              <option value="">All Communities</option>
              {communities.map(community => (
                <option key={community.id || community.name} value={community.name}>{community.name}</option>
              ))}
            </select>
          </div>        </div>
      </div>

      {/* Clear Filters Button */}
      <div className="filters-actions">
        <button onClick={clearFilters} className="btn btn-secondary">
          <i className="fas fa-times"></i> Clear Filters
        </button>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <div className="bulk-actions">
          <span className="selected-count">{selectedUsers.length} users selected</span>
          <div className="bulk-buttons">
            <button 
              onClick={() => handleBulkAction('approved')}
              className="btn btn-success btn-sm"
            >
              <i className="fas fa-check"></i> Approve
            </button>
            <button 
              onClick={() => handleBulkAction('rejected')}
              className="btn btn-danger btn-sm"
            >
              <i className="fas fa-times"></i> Reject
            </button>
            <button 
              onClick={() => handleBulkAction('suspended')}
              className="btn btn-warning btn-sm"
            >
              <i className="fas fa-ban"></i> Suspend
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedUsers.length === users.length && users.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th>User</th>
              <th>Contact</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Registered</th>
              <th>Plan Expiry</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => handleUserSelect(user.id)}
                  />
                </td>
                <td>
                  <div className="user-info">
                    <div className="user-name">{user.fullName}</div>
                    <div className="user-meta">
                      {user.membershipNumber && (
                        <span className="membership-number">#{user.membershipNumber}</span>
                      )}
                      <span className="user-type">{user.userType}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="contact-info">
                    <div>{user.email}</div>
                    {user.phone && <div>{user.phone}</div>}
                  </div>
                </td>
                <td>
                  <span className={`plan-badge ${user.membershipType || 'none'}`}>
                    {user.membershipType || 'No Plan'}
                  </span>
                </td>
                <td>
                  <select
                    value={user.status}
                    onChange={(e) => handleStatusUpdate(user.id, e.target.value)}
                    className={`status-select status-${user.status}`}
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </td>
                <td>{formatDate(user.created_at || user.createdAt)}</td>
                <td>{formatDate(user.validationDate)}</td>
                <td>                  <div className="action-buttons">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowUserDetails(true);
                      }}
                      className="btn btn-info btn-sm"
                      title="View Details"
                    >
                      <i className="fas fa-eye"></i>
                    </button>
                    <button
                      onClick={() => handleUserEdit(user)}
                      className="btn btn-primary btn-sm"
                      title="Edit User"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    {user.status === 'suspended' && (
                      <div className="action-warning" title="User is suspended">
                        <i className="fas fa-exclamation-triangle text-warning"></i>
                      </div>
                    )}
                    {user.status === 'rejected' && (
                      <div className="action-warning" title="User is rejected">
                        <i className="fas fa-times-circle text-danger"></i>
                      </div>
                    )}
                    {user.status === 'pending' && (
                      <div className="action-warning" title="Pending approval">
                        <i className="fas fa-clock text-warning"></i>
                      </div>
                    )}
                    <button
                      onClick={() => handleDeleteUser(user.id, user.fullName)}
                      className="btn btn-danger btn-sm"
                      title="Delete User - This action cannot be undone!"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button
          onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
          disabled={pagination.page === 1}
          className="btn btn-secondary btn-sm"
        >
          Previous
        </button>
        <span className="pagination-info">
          Page {pagination.page} of {pagination.pages} ({pagination.total} total)
        </span>
        <button
          onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
          disabled={pagination.page === pagination.pages}
          className="btn btn-secondary btn-sm"
        >
          Next
        </button>
      </div>

      {/* User Details Modal */}
      {showUserDetails && (selectedUser || editingUser) && (
        <UserDetailsModal
          user={editingUser || selectedUser}
          isEditing={!!editingUser}
          communities={communities}
          plans={plans}
          onClose={() => {
            setShowUserDetails(false);
            setSelectedUser(null);
            setEditingUser(null);
          }}
          onSave={handleUserSave}
          onEdit={(user) => setEditingUser({ ...user })}
          onChange={setEditingUser}
        />
      )}

      {/* Add User Modal */}
      {showAddUser && (        <AddUserModal
          communities={communities}
          plans={plans}
          onClose={() => setShowAddUser(false)}
          onSave={handleAddUser}
        />
      )}
      <Modal modal={modal} onClose={hideModal} />
    </div>
  );
};

// User Details Modal Component
const UserDetailsModal = ({ user, isEditing, communities, plans, onClose, onSave, onEdit, onChange }) => {
  const [editData, setEditData] = useState(user);

  const handleInputChange = (field, value) => {
    const newData = { ...editData, [field]: value };
    setEditData(newData);
    if (onChange) onChange(newData);
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
    <div className="modal-overlay">
      <div className="modal-content user-details-modal">
        <div className="modal-header">
          <h3>{isEditing ? 'Edit User' : 'User Details'}</h3>
          <button onClick={onClose} className="close-btn">
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="modal-body">
          <div className="user-details-grid">
            <div className="detail-section">
              <h4>Personal Information</h4>
              <div className="detail-row">
                <label>Full Name:</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.fullName || ''}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                  />
                ) : (
                  <span>{user.fullName}</span>
                )}
              </div>
              <div className="detail-row">
                <label>Email:</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={editData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                ) : (
                  <span>{user.email}</span>
                )}
              </div>
              <div className="detail-row">
                <label>Phone:</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editData.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                ) : (
                  <span>{user.phone || 'N/A'}</span>
                )}
              </div>
              <div className="detail-row">
                <label>Address:</label>
                {isEditing ? (
                  <textarea
                    value={editData.address || ''}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                  />
                ) : (
                  <span>{user.address || 'N/A'}</span>
                )}
              </div>
              <div className="detail-row">
                <label>Date of Birth:</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={editData.dob || ''}
                    onChange={(e) => handleInputChange('dob', e.target.value)}
                  />
                ) : (
                  <span>{formatDate(user.dob)}</span>
                )}
              </div>
            </div>

            <div className="detail-section">
              <h4>Community & Location</h4>
              <div className="detail-row">
                <label>Community:</label>
                {isEditing ? (
                  <select
                    value={editData.community || ''}
                    onChange={(e) => handleInputChange('community', e.target.value)}
                  >
                    <option value="">Select Community</option>
                    {communities.map(community => (
                      <option key={community.id} value={community.name}>
                        {community.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span>{user.community || 'N/A'}</span>
                )}
              </div>
              <div className="detail-row">
                <label>Country:</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.country || ''}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                  />
                ) : (
                  <span>{user.country || 'N/A'}</span>
                )}
              </div>
              <div className="detail-row">
                <label>State:</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.state || ''}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                  />
                ) : (
                  <span>{user.state || 'N/A'}</span>
                )}
              </div>
              <div className="detail-row">
                <label>City:</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.city || ''}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                  />
                ) : (
                  <span>{user.city || 'N/A'}</span>
                )}
              </div>
            </div>            <div className="detail-section">
              <h4>Membership Information</h4>
              <div className="detail-row">
                <label>Membership Number:</label>
                <span>{user.membershipNumber || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <label>User Type:</label>
                {isEditing ? (
                  <select
                    value={editData.userType || ''}
                    onChange={(e) => handleInputChange('userType', e.target.value)}
                  >
                    <option value="user">Regular User</option>
                    <option value="merchant">Merchant</option>
                    <option value="admin">Admin</option>
                  </select>
                ) : (
                  <span className="user-type-badge">{user.userType}</span>
                )}
              </div>
              <div className="detail-row">
                <label>Status:</label>
                {isEditing ? (
                  <select
                    value={editData.status || ''}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="suspended">Suspended</option>
                  </select>
                ) : (
                  <span className={`status-badge ${user.status}`}>{user.status}</span>
                )}
              </div>
              <div className="detail-row">
                <label>Membership Plan:</label>
                {isEditing ? (
                  <select
                    value={editData.membershipType || ''}
                    onChange={(e) => handleInputChange('membershipType', e.target.value)}
                  >
                    <option value="">No Plan</option>
                    {plans.map(plan => (
                      <option key={plan.id} value={plan.key}>
                        {plan.name} - {plan.currency} {plan.price}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span>
                    {user.planName ? `${user.planName} - ${user.currency || 'GHS'} ${user.planPrice || '0'}` : user.membershipType || 'No Plan'}
                  </span>
                )}
              </div>
              <div className="detail-row">
                <label>User Category:</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.userCategory || ''}
                    onChange={(e) => handleInputChange('userCategory', e.target.value)}
                  />
                ) : (
                  <span>{user.userCategory || 'N/A'}</span>
                )}
              </div>
              <div className="detail-row">
                <label>Registration Date:</label>
                <span>{formatDate(user.created_at || user.createdAt)}</span>
              </div>
              <div className="detail-row">
                <label>Plan Assigned:</label>
                <span>{formatDate(user.planAssignedAt)}</span>
              </div>              <div className="detail-row">
                <label>Plan Expiry:</label>
                <span>{formatDate(user.planExpiryDate || user.validationDate)}</span>
              </div>
              <div className="detail-row">
                <label>Last Login:</label>
                <span>{formatDate(user.lastLogin)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          {isEditing ? (
            <>
              <button onClick={onSave} className="btn btn-primary">
                Save Changes
              </button>
              <button onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
            </>
          ) : (
            <>
              <button onClick={() => onEdit(user)} className="btn btn-primary">
                Edit User
              </button>
              <button onClick={onClose} className="btn btn-secondary">
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Add User Modal Component
const AddUserModal = ({ communities, plans, onClose, onSave }) => {
  const [userData, setUserData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    dob: '',
    community: '',
    country: 'Ghana',
    state: '',
    city: '',
    userType: 'user',
    membershipType: '',
    status: 'approved',
    termsAccepted: true
  });

  const handleInputChange = (field, value) => {
    setUserData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(userData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content add-user-modal">
        <div className="modal-header">
          <h3>Add New User</h3>
          <button onClick={onClose} className="close-btn">
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-grid">
            <div className="form-section">
              <h4>Personal Information</h4>
              <div className="form-row">
                <label>Full Name *</label>
                <input
                  type="text"
                  required
                  value={userData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                />
              </div>
              <div className="form-row">
                <label>Email *</label>
                <input
                  type="email"
                  required
                  value={userData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
              <div className="form-row">
                <label>Password *</label>
                <input
                  type="password"
                  required
                  value={userData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                />
              </div>
              <div className="form-row">
                <label>Phone</label>
                <input
                  type="tel"
                  value={userData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>
              <div className="form-row">
                <label>Address</label>
                <textarea
                  value={userData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                />
              </div>
              <div className="form-row">
                <label>Date of Birth</label>
                <input
                  type="date"
                  value={userData.dob}
                  onChange={(e) => handleInputChange('dob', e.target.value)}
                />
              </div>
            </div>

            <div className="form-section">
              <h4>Community & Location</h4>
              <div className="form-row">
                <label>Community</label>
                <select
                  value={userData.community}
                  onChange={(e) => handleInputChange('community', e.target.value)}
                >
                  <option value="">Select Community</option>
                  {communities.map(community => (
                    <option key={community.id} value={community.name}>
                      {community.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label>Country</label>
                <input
                  type="text"
                  value={userData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                />
              </div>
              <div className="form-row">
                <label>State</label>
                <input
                  type="text"
                  value={userData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                />
              </div>
              <div className="form-row">
                <label>City</label>
                <input
                  type="text"
                  value={userData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                />
              </div>
            </div>

            <div className="form-section">
              <h4>Account Settings</h4>
              <div className="form-row">
                <label>User Type</label>
                <select
                  value={userData.userType}
                  onChange={(e) => handleInputChange('userType', e.target.value)}
                >
                  <option value="user">Regular User</option>
                  <option value="merchant">Merchant</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-row">
                <label>Membership Plan</label>
                <select
                  value={userData.membershipType}
                  onChange={(e) => handleInputChange('membershipType', e.target.value)}
                >
                  <option value="">No Plan</option>
                  {plans.map(plan => (
                    <option key={plan.id} value={plan.key}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label>Status</label>
                <select
                  value={userData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                >
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="submit" className="btn btn-primary">
              Add User
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserManagement;
