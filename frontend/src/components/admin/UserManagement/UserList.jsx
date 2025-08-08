// UserList.jsx - Fixed User List Component
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import api from '../../../services/api';
import UserDetail from './UserDetail';
import Modal from '../../shared/Modal';
import { useModal } from '../../../hooks/useModal';
import './UserList.css';

const UserList = () => {
  const { validateSession, handleSessionExpired } = useAuth();
  const { showNotification } = useNotification();
  const { modal, showAlert, hideModal } = useModal();
  const [searchParams, setSearchParams] = useSearchParams();

  const [users, setUsers] = useState([]);
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
      const totalUsersCount = response.data?.total || 0;

      setUsers(usersData);
      setPagination({
        ...pagination,
        totalPages: Math.ceil(totalUsersCount / pagination.pageSize),
        totalUsers: totalUsersCount
      });
    } catch (error) {
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
    setPagination({ ...pagination, pageSize: size, currentPage: 1 });
  };

  const handleUserAction = async (userId, action, comment = '') => {
    // Show confirmation for destructive actions
    if (action === 'suspend' || action === 'reject') {
      const user = users.find(u => u.id === userId); // Fixed: use u.id instead of u._id
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
      // Fixed: Use correct endpoint format
      let endpoint, data;
      
      if (action === 'approve' || action === 'reject' || action === 'suspend' || action === 'activate') {
        const statusMap = {
          approve: 'approved',
          reject: 'rejected',
          suspend: 'suspended',
          activate: 'approved'
        };
        
        endpoint = `/admin/users/${userId}/status`;
        data = { status: statusMap[action] };
        await api.put(endpoint, data);
      } else {
        // For other actions, use the generic format
        endpoint = `/admin/users/${userId}/${action}`;
        data = comment ? { comment } : {};
        await api.post(endpoint, data);
      }

      // Refresh user list
      fetchUsers();

      // Show notification
      const message = action === 'approve' ? 'User approved successfully!' :
                     action === 'reject' ? 'User rejected successfully!' :
                     action === 'suspend' ? 'User suspended successfully!' :
                     action === 'activate' ? 'User activated successfully!' :
                     `User ${action}ed successfully!`;
      
      showNotification(message, 'success');

      // Close detail modal if open
      if (selectedUser && selectedUser.id === userId) { // Fixed: use selectedUser.id
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

      console.log('Adding user with data:', userData);
      const response = await api.post('/admin/users', userData);

      showNotification('User added successfully!', 'success');
      setShowAddUserModal(false);
      fetchUsers();
    } catch (error) {
      console.error('Error adding user:', error);
      console.error('Error response:', error.response?.data);

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

      // Fixed: Use correct bulk action endpoint
      const response = await api.post('/admin/users/bulk-action', {
        action,
        userIds
      });

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
      setSelectedUsers(users.map(u => u.id)); // Fixed: use u.id instead of u._id
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
    <div className="user-list">
      <div className="user-list-header">
        <h2>User Management</h2>
        <p>View and manage all users in the system</p>
      </div>

      {/* User Table */}
      <div className="user-table-container">
        <table className="user-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedUsers.length === users.length && users.length > 0}
                  onChange={handleSelectAll}
                  disabled={users.length === 0}
                />
              </th>
              <th>User</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Registration Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="8" className="loading-cell">
                  <div className="loading-spinner"></div>
                  Loading users...
                </td>
              </tr>
            ) : users.length > 0 ? (
              users.map((user) => (
                <tr key={user.id}> {/* Fixed: use user.id */}
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)} {/* Fixed: use user.id */}
                      onChange={() => handleUserToggle(user.id)}
                    />
                  </td>
                  <td>
                    <div className="user-info">
                      {user.profilePicture ? (
                        <img src={user.profilePicture} alt="Profile" className="user-avatar" />
                      ) : (
                        <div className="user-avatar-placeholder">
                          {user.fullName || 'Unknown User'}
                          <span className="avatar-initials">
                            {user.fullName ? user.fullName.split(' ').map(n => n[0]).join('') : 'U'}
                          </span>
                        </div>
                      )}
                      <span className="user-name">{user.fullName}</span>
                    </div>
                  </td>
                  <td>{user.email || 'N/A'}</td>
                  <td>{user.phone || 'N/A'}</td>
                  <td>
                    <span className="plan-badge">
                      {user.membershipType ? 
                        (user.membershipType.charAt(0).toUpperCase() + user.membershipType.slice(1)) : 
                        'Community'
                      }
                    </span>
                  </td>
                  <td>
                    <span className={getStatusBadgeClass(user.status)}>
                      {user.status ? 
                        (user.status.charAt(0).toUpperCase() + user.status.slice(1)) : 
                        'Pending'
                      }
                    </span>
                  </td>
                  <td>{formatDate(user.createdAt)}</td> {/* Fixed: use consistent field name */}
                  <td>
                    <div className="action-buttons">
                      {user.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleUserAction(user.id, 'approve')}
                            className="btn btn-success btn-sm"
                            title="Approve"
                          >
                            <i className="fas fa-check"></i>
                          </button>
                          <button
                            onClick={() => handleUserAction(user.id, 'reject')}
                            className="btn btn-danger btn-sm"
                            title="Reject"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </>
                      )}
                      {user.status !== 'pending' && user.status !== 'suspended' && (
                        <button
                          onClick={() => handleUserAction(user.id, 'suspend')}
                          className="btn btn-warning btn-sm"
                          title="Suspend"
                        >
                          <i className="fas fa-ban"></i>
                        </button>
                      )}
                      {user.status === 'suspended' && (
                        <button
                          onClick={() => handleUserAction(user.id, 'activate')}
                          className="btn btn-info btn-sm"
                          title="Activate"
                        >
                          <i className="fas fa-check-circle"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="empty-state">
                  <div className="empty-content">
                    <i className="fas fa-users"></i>
                    <h3>No users found</h3>
                    <p>No users found matching the current filters</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Dialog */}
      {confirmationDialog.show && (
        <Modal onClose={handleCancelAction}>
          <div className="confirmation-dialog">
            <h3>Confirm Action</h3>
            <p>
              Are you sure you want to {confirmationDialog.action}
              <br />
              <strong>{confirmationDialog.userName}</strong>?
            </p>
            <div className="dialog-actions">
              <button
                onClick={handleCancelAction}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className="btn btn-danger"
              >
                Confirm
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default UserList;
