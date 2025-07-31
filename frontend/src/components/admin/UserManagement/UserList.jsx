import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import api from '../../../services/api';
import UserDetail from './UserDetail';
import './UserList.css';

const UserList = () => {
  const { validateSession, handleSessionExpired } = useAuth();
  const { showNotification } = useNotification();
  const [searchParams, setSearchParams] = useSearchParams();  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showBulkActionModal, setShowBulkActionModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  
  // Confirmation dialog state
  const [confirmationDialog, setConfirmationDialog] = useState({
    show: false,
    action: '',
    userId: '',
    userName: ''
  });
  
  // Filter states
  const [filters, setFilters] = useState({
    status: searchParams.get('filter') || 'all',
    plan: 'all',
    search: '',
    dateFrom: '',
    dateTo: ''
  });
  
  // Pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    pageSize: 10,
    totalUsers: 0
  });
  
  useEffect(() => {
    fetchUsers();
  }, [filters.status, filters.plan, pagination.currentPage, pagination.pageSize]);
  
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
        const queryParams = new URLSearchParams({
        status: filters.status,
        plan: filters.plan !== 'all' ? filters.plan : '',
        search: filters.search,
        page: pagination.currentPage,
        limit: pagination.pageSize,
        userType: 'user' // Only fetch users with userType 'user', exclude merchants
      });
      
      if (filters.dateFrom) {
        queryParams.append('dateFrom', filters.dateFrom);
      }
      
      if (filters.dateTo) {
        queryParams.append('dateTo', filters.dateTo);
      }
        const response = await api.get(`/admin/users?${queryParams}`);
      
      // Ensure users is always an array
      const usersData = response.data?.users || [];
      const totalUsersCount = response.data?.totalUsers || 0;
      
      setUsers(usersData);
      setPagination({
        ...pagination,
        totalPages: Math.ceil(totalUsersCount / pagination.pageSize),
        totalUsers: totalUsersCount
      });    } catch (error) {
      console.error('Error fetching users:', error);
      showNotification('Error loading users. Please try again.', 'error');
      // Ensure users is set to empty array on error
      setUsers([]);
      setPagination({
        ...pagination,
        totalPages: 1,
        totalUsers: 0
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFilterChange = (newFilters) => {
    setFilters({ ...filters, ...newFilters });
    setPagination({ ...pagination, currentPage: 1 });
    
    // Update URL params for status filter
    if (newFilters.status && newFilters.status !== 'all') {
      setSearchParams({ filter: newFilters.status });
    } else {
      setSearchParams({});
    }
  };
  
  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers();
  };
  
  const handlePageChange = (page) => {
    setPagination({ ...pagination, currentPage: page });
  };
  
  const handlePageSizeChange = (size) => {
    setPagination({
      ...pagination,
      pageSize: size,
      currentPage: 1
    });
  };
  const handleUserAction = async (userId, action, comment = '') => {
    // Show confirmation for destructive actions
    if (action === 'suspend' || action === 'reject') {
      const user = users.find(u => u._id === userId);
      setConfirmationDialog({
        show: true,
        action: action,
        userId: userId,
        userName: user?.fullName || 'this user'
      });
      return;
    }
    
    // Execute the action directly for non-destructive actions
    await executeUserAction(userId, action, comment);
  };
  
  const executeUserAction = async (userId, action, comment = '') => {
    try {
      const endpoint = `/admin/users/${userId}/${action}`;
      const data = comment ? { comment } : {};
      
      await api.post(endpoint, data);
      
      // Refresh user list
      fetchUsers();
      
      // Show notification
      const message = action === 'approve'
        ? 'User approved successfully!'
        : action === 'reject'
        ? 'User rejected successfully!'
        : action === 'suspend'
        ? 'User suspended successfully!'
        : action === 'activate'
        ? 'User activated successfully!'
        : `User ${action}ed successfully!`;
      
      showNotification(message, 'success');
      
      // Close detail modal if open
      if (selectedUser && selectedUser._id === userId) {
        setSelectedUser(null);
      }
      
      // Close confirmation dialog
      setConfirmationDialog({
        show: false,
        action: '',
        userId: '',
        userName: ''
      });
    } catch (error) {
      console.error(`Error ${action} user:`, error);
      showNotification(`Failed to ${action} user. Please try again.`, 'error');
    }
  };
  
  const handleConfirmAction = async () => {
    const { userId, action } = confirmationDialog;
    
    // Close dialog first
    setConfirmationDialog({
      show: false,
      action: '',
      userId: '',
      userName: ''
    });
    
    // Execute the action
    await executeUserAction(userId, action);
  };
    const handleCancelAction = () => {
    setConfirmationDialog({
      show: false,
      action: '',
      userId: '',
      userName: ''
    });
  };
  const handleAddUser = async (userData) => {
    try {
      // Validate required fields
      if (!userData.fullName || !userData.email) {
        showNotification('Please fill in all required fields: Full Name and Email', 'error');
        return;
      }

      const isSessionValid = await validateSession();
      if (!isSessionValid) {
        showNotification('Your session has expired. Please log in again.', 'error');
        return;
      }

      console.log('Adding user with data:', userData); // Debug log
      const response = await api.post('/admin/users', userData);
      showNotification('User added successfully!', 'success');
      setShowAddUserModal(false);
      fetchUsers();
    } catch (error) {
      console.error('Error adding user:', error);
      console.error('Error response:', error.response?.data); // Debug log
      if (error.response?.status === 401) {
        handleSessionExpired();
        return;
      }
      const errorMessage = error.response?.data?.message || 'Failed to add user. Please try again.';
      showNotification(errorMessage, 'error');
    }
  };

  const handleBulkAction = async (action, userIds) => {
    try {
      const isSessionValid = await validateSession();
      if (!isSessionValid) {
        showNotification('Your session has expired. Please log in again.', 'error');
        return;
      }

      const response = await api.post(`/admin/users/bulk-${action}`, { userIds });
      showNotification(`Successfully ${action}ed ${userIds.length} users.`, 'success');
      setShowBulkActionModal(false);
      setSelectedUsers([]);
      fetchUsers();
    } catch (error) {
      console.error(`Error performing bulk ${action}:`, error);
      if (error.response?.status === 401) {
        handleSessionExpired();
        return;
      }
      showNotification(`Failed to ${action} users. Please try again.`, 'error');
    }
  };

  const handleUserToggle = (userId) => {
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
      setSelectedUsers(users.map(u => u._id));    }
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
  
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'approved':
        return 'status-badge approved';
      case 'pending':
        return 'status-badge pending';
      case 'rejected':
        return 'status-badge rejected';
      case 'suspended':
        return 'status-badge suspended';
      default:
        return 'status-badge';
    }
  };
  return (
    <div className="user-management">
      <div className="section-header">
        <div className="header-content">
          <h2>User Management</h2>
          <p>View and manage all users in the system</p>
        </div>
        <div className="header-actions">
          <button 
            className="button primary"
            onClick={() => setShowAddUserModal(true)}
          >
            <i className="fas fa-plus"></i>
            Add User
          </button>
          {selectedUsers.length > 0 && (
            <button 
              className="button secondary"
              onClick={() => setShowBulkActionModal(true)}
            >
              <i className="fas fa-tasks"></i>
              Bulk Actions ({selectedUsers.length})
            </button>
          )}
          <Link to="/admin" className="btn-secondary" style={{marginLeft: '0.5rem'}}>
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </Link>
        </div>
      </div>
      
      <div className="user-filters">
        <form onSubmit={handleSearch}>
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
            <button type="submit">
              <i className="fas fa-search"></i>
            </button>
          </div>
          
          <div className="filter-controls">
            <div className="filter-group">
              <label>Status:</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange({ status: e.target.value })}
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label>Plan:</label>
              <select
                value={filters.plan}
                onChange={(e) => handleFilterChange({ plan: e.target.value })}
              >
                <option value="all">All Plans</option>
                <option value="community">Community</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
              </select>
            </div>
            
            <div className="date-range">
              <div className="filter-group">
                <label>From:</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange({ dateFrom: e.target.value })}
                />
              </div>
              
              <div className="filter-group">
                <label>To:</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange({ dateTo: e.target.value })}
                />              </div>
            </div>
            
            <div className="filter-actions">
              <button 
                type="button" 
                className="btn-clear"
                onClick={() => handleFilterChange({ status: 'all', plan: 'all', search: '', dateFrom: '', dateTo: '' })}
              >
                <i className="fas fa-times"></i>
                Clear Filters
              </button>
            </div>
          </div>
        </form>
      </div>
      
      <div className="user-list-container">
        {isLoading ? (
          <div className="loading-table">
            <div className="loading-row header"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="loading-row"></div>
            ))}
          </div>
        ) : (users && users.length > 0) ? (
          <>
            <table className="user-table">              <thead>
                <tr>
                  <th>
                    <input 
                      type="checkbox" 
                      checked={selectedUsers.length === users.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Registration Date</th>
                  <th>Actions</th>
                </tr>
              </thead>              <tbody>
                {(users || []).map((user) => (
                  <tr key={user._id}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedUsers.includes(user._id)}
                        onChange={() => handleUserToggle(user._id)}
                      />
                    </td>
                    <td>
                      <div className="user-name-cell">
                        <div className="user-avatar">
                          {user.profilePicture ? (
                            <img src={user.profilePicture} alt={user.fullName || 'User'} />
                          ) : (
                            <div className="user-initials">
                              {user.fullName ? 
                                user.fullName.split(' ').map(n => n[0]).join('') : 
                                'U'
                              }
                            </div>
                          )}
                        </div>
                        <span>{user.fullName || 'Unknown User'}</span>
                      </div>
                    </td>
                    <td>{user.email || 'N/A'}</td>
                    <td>{user.phone || 'N/A'}</td>
                    <td>
                      <span className={`plan-badge ${user.membershipType || 'community'}`}>
                        {user.membershipType ? 
                          (user.membershipType.charAt(0).toUpperCase() + user.membershipType.slice(1)) :
                          'Community'
                        }
                      </span>
                    </td>
                    <td>
                      <span className={getStatusBadgeClass(user.status || 'pending')}>
                        {user.status ? 
                          (user.status.charAt(0).toUpperCase() + user.status.slice(1)) : 
                          'Pending'
                        }
                      </span>
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      <div className="user-actions">
                        <button 
                          className="btn-icon" 
                          title="View Details"
                          onClick={() => setSelectedUser(user)}
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                        
                        {user.status === 'pending' && (
                          <>
                            <button 
                              className="btn-icon approve" 
                              title="Approve User"
                              onClick={() => handleUserAction(user._id, 'approve')}
                            >
                              <i className="fas fa-check"></i>
                            </button>
                            <button 
                              className="btn-icon reject" 
                              title="Reject User"
                              onClick={() => handleUserAction(user._id, 'reject')}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </>
                        )}
                        
                        {user.status !== 'pending' && user.status !== 'suspended' && (
                          <button 
                            className="btn-icon suspend" 
                            title="Suspend User"
                            onClick={() => handleUserAction(user._id, 'suspend')}
                          >
                            <i className="fas fa-ban"></i>
                          </button>
                        )}
                        
                        {user.status === 'suspended' && (
                          <button 
                            className="btn-icon activate" 
                            title="Activate User"
                            onClick={() => handleUserAction(user._id, 'activate')}
                          >
                            <i className="fas fa-check-circle"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="pagination">
              <div className="pagination-info">
                <span>
                  Showing {(pagination.currentPage - 1) * pagination.pageSize + 1} to{' '}
                  {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalUsers)} of{' '}
                  {pagination.totalUsers} users
                </span>
                
                <div className="page-size-selector">
                  <label>Show:</label>
                  <select 
                    value={pagination.pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
              
              <div className="pagination-controls">
                <button 
                  className="btn-page" 
                  disabled={pagination.currentPage === 1}
                  onClick={() => handlePageChange(1)}
                >
                  <i className="fas fa-angle-double-left"></i>
                </button>
                <button 
                  className="btn-page" 
                  disabled={pagination.currentPage === 1}
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                >
                  <i className="fas fa-angle-left"></i>
                </button>
                
                {/* Page numbers */}
                {[...Array(pagination.totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  if (
                    pageNum === 1 ||
                    pageNum === pagination.totalPages ||
                    (pageNum >= pagination.currentPage - 1 && pageNum <= pagination.currentPage + 1)
                  ) {
                    return (
                      <button 
                        key={pageNum}
                        className={`btn-page ${pageNum === pagination.currentPage ? 'active' : ''}`}
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (
                    (pageNum === pagination.currentPage - 2 && pagination.currentPage > 3) ||
                    (pageNum === pagination.currentPage + 2 && pagination.currentPage < pagination.totalPages - 2)
                  ) {
                    return <span key={pageNum} className="pagination-ellipsis">...</span>;
                  }
                  return null;
                })}
                
                <button 
                  className="btn-page" 
                  disabled={pagination.currentPage === pagination.totalPages}
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                >
                  <i className="fas fa-angle-right"></i>
                </button>
                <button 
                  className="btn-page" 
                  disabled={pagination.currentPage === pagination.totalPages}
                  onClick={() => handlePageChange(pagination.totalPages)}
                >
                  <i className="fas fa-angle-double-right"></i>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <i className="fas fa-users"></i>
            <p>No users found matching the current filters</p>            <button 
              className="btn-outline" 
              onClick={() => handleFilterChange({ status: 'all', plan: 'all', search: '', dateFrom: '', dateTo: '' })}
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
        {selectedUser && (
        <UserDetail 
          user={selectedUser} 
          onClose={() => setSelectedUser(null)}
          onApprove={() => handleUserAction(selectedUser._id, 'approve')}
          onReject={() => handleUserAction(selectedUser._id, 'reject')}
        />
      )}
      
      {/* Confirmation Dialog */}
      {confirmationDialog.show && (
        <div className="modal-overlay">
          <div className="confirmation-dialog">
            <div className="dialog-header">
              <i className={`fas ${confirmationDialog.action === 'suspend' ? 'fa-ban' : 'fa-times'}`}></i>
              <h3>Confirm {confirmationDialog.action === 'suspend' ? 'Suspension' : 'Rejection'}</h3>
            </div>
            
            <div className="dialog-content">
              <p>
                Are you sure you want to {confirmationDialog.action} <strong>{confirmationDialog.userName}</strong>?
              </p>
              
              {confirmationDialog.action === 'suspend' && (
                <div className="warning-message">
                  <i className="fas fa-exclamation-triangle"></i>
                  <span>This will prevent the user from accessing their account until they are reactivated.</span>
                </div>
              )}
              
              {confirmationDialog.action === 'reject' && (
                <div className="warning-message">
                  <i className="fas fa-exclamation-triangle"></i>
                  <span>This will permanently reject the user's registration request.</span>
                </div>
              )}
            </div>
            
            <div className="dialog-actions">
              <button 
                className="btn-secondary" 
                onClick={handleCancelAction}
              >
                Cancel
              </button>
              <button 
                className={`btn-${confirmationDialog.action === 'suspend' ? 'warning' : 'danger'}`}
                onClick={handleConfirmAction}
              >
                {confirmationDialog.action === 'suspend' ? 'Suspend User' : 'Reject User'}
              </button>            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <AddUserModal 
          onClose={() => setShowAddUserModal(false)}
          onSubmit={handleAddUser}
        />
      )}

      {/* Bulk Action Modal */}
      {showBulkActionModal && (
        <BulkActionModal 
          users={users.filter(u => selectedUsers.includes(u._id))}
          onClose={() => setShowBulkActionModal(false)}
          onSubmit={handleBulkAction}
        />
      )}
    </div>
  );
};

// Add User Modal Component
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
    
    // Validate required fields
    if (!formData.fullName || !formData.email) {
      alert('Please fill in all required fields: Full Name and Email');
      return;
    }
    
    console.log('Form data being submitted:', formData); // Debug log
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

// Bulk Action Modal Component
const BulkActionModal = ({ users, onClose, onSubmit }) => {
  const [action, setAction] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (users.length === 0) {
      return;
    }
    onSubmit(action, users.map(u => u._id));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Bulk Actions</h3>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Select Action</label>            <select 
              value={action} 
              onChange={(e) => setAction(e.target.value)}
              required
            >
              <option value="">Choose Action</option>
              <option value="approve">Approve Selected</option>
              <option value="suspend">Suspend Selected</option>
              <option value="reject">Reject Selected</option>
            </select>
          </div>

          <div className="user-selection">
            <div className="selection-header">
              <h4>Selected Users ({users.length})</h4>
            </div>
            <div className="user-list">
              {users.map(user => (
                <div key={user._id} className="user-item">
                  <div className="user-info">
                    <strong>{user.fullName}</strong>
                    <span>{user.email} - {user.membershipType}</span>
                    <span className={`status ${user.status}`}>{user.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="button secondary" onClick={onClose}>
              Cancel
            </button>            <button 
              type="submit" 
              className="button primary"
              disabled={users.length === 0 || !action}
            >
              {action === 'approve' ? 'Approve' : 
               action === 'suspend' ? 'Suspend' : 
               action === 'reject' ? 'Reject' : 'Execute'} ({users.length})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserList;
