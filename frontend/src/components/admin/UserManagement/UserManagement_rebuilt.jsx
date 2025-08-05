// UserManagement.jsx - COMPLETE REBUILD - Indians in Ghana Membership System
import React, { useState, useEffect } from 'react';
import { useNotification } from '../../../contexts/NotificationContext';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';
import UserTable from './components/UserTable';
import UserFilters from './components/UserFilters';
import UserModal from './components/UserModal';
import BulkActions from './components/BulkActions';
import './UserManagement.css';

/**
 * UserManagement Component - Complete Rebuild
 * Handles all user management operations: CRUD, Status Changes, Bulk Actions
 */
const UserManagement = () => {
  const { showNotification } = useNotification();
  const { validateSession, handleSessionExpired } = useAuth();

  // Core State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Modal State
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: null, // 'add', 'edit', 'view', 'delete'
    user: null
  });

  // Filter & Pagination State
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    userType: 'all',
    membershipType: 'all',
    dateFrom: '',
    dateTo: ''
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // Reference Data
  const [referenceData, setReferenceData] = useState({
    communities: [],
    plans: [],
    userTypes: ['user', 'merchant', 'admin']
  });

  // Effects
  useEffect(() => {
    initializeComponent();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchUsers();
    }
  }, [filters, pagination.page]);

  /**
   * Initialize component - fetch reference data first
   */
  const initializeComponent = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchReferenceData(),
      ]);
      // fetchUsers will be called by useEffect when loading becomes false
    } catch (err) {
      setError('Failed to initialize user management');
      showNotification('Failed to load user management', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch all reference data (communities, plans)
   */
  const fetchReferenceData = async () => {
    try {
      const [communitiesRes, plansRes] = await Promise.all([
        api.get('/admin/communities'),
        api.get('/admin/plans')
      ]);

      setReferenceData({
        communities: communitiesRes.data.communities || [],
        plans: plansRes.data.plans || [],
        userTypes: ['user', 'merchant', 'admin']
      });
    } catch (err) {
      console.error('Error fetching reference data:', err);
      // Don't throw error, just log it
    }
  };

  /**
   * Fetch users with current filters and pagination
   */
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const queryParams = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      });

      // Remove empty filters
      for (const [key, value] of queryParams.entries()) {
        if (!value || value === 'all') {
          queryParams.delete(key);
        }
      }

      const response = await api.get(`/admin/users?${queryParams}`);
      
      if (response.data.success) {
        setUsers(response.data.users || []);
        setPagination(prev => ({
          ...prev,
          total: response.data.total || 0,
          totalPages: response.data.totalPages || 1
        }));
        setError(null);
      } else {
        throw new Error(response.data.message || 'Failed to fetch users');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
      showNotification('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle filter changes
   */
  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  /**
   * Handle pagination changes
   */
  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, page }));
  };

  /**
   * Handle user selection
   */
  const handleUserSelect = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  /**
   * Handle select all users
   */
  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user.id));
    }
  };

  /**
   * Open modal for different operations
   */
  const openModal = (type, user = null) => {
    setModalState({
      isOpen: true,
      type,
      user
    });
  };

  /**
   * Close modal
   */
  const closeModal = () => {
    setModalState({
      isOpen: false,
      type: null,
      user: null
    });
  };

  /**
   * Handle adding a new user
   */
  const handleAddUser = async (userData) => {
    try {
      const response = await api.post('/admin/users', userData);
      
      if (response.data.success) {
        showNotification('User added successfully', 'success');
        closeModal();
        fetchUsers(); // Refresh the list
        
        // Show temp password to admin
        if (response.data.tempPassword) {
          showNotification(
            `User created with temporary password: ${response.data.tempPassword}. Please share this securely.`,
            'info'
          );
        }
      } else {
        throw new Error(response.data.message || 'Failed to add user');
      }
    } catch (err) {
      console.error('Error adding user:', err);
      const message = err.response?.data?.message || 'Failed to add user';
      showNotification(message, 'error');
    }
  };

  /**
   * Handle editing a user
   */
  const handleEditUser = async (userData) => {
    try {
      const response = await api.put(`/admin/users/${userData.id}`, userData);
      
      if (response.data.success) {
        showNotification('User updated successfully', 'success');
        closeModal();
        fetchUsers(); // Refresh the list
      } else {
        throw new Error(response.data.message || 'Failed to update user');
      }
    } catch (err) {
      console.error('Error updating user:', err);
      const message = err.response?.data?.message || 'Failed to update user';
      showNotification(message, 'error');
    }
  };

  /**
   * Handle deleting a user
   */
  const handleDeleteUser = async (userId) => {
    try {
      const response = await api.delete(`/admin/users/${userId}`);
      
      if (response.data.success) {
        showNotification('User deleted successfully', 'success');
        closeModal();
        fetchUsers(); // Refresh the list
        
        // Remove from selected users if it was selected
        setSelectedUsers(prev => prev.filter(id => id !== userId));
      } else {
        throw new Error(response.data.message || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      const message = err.response?.data?.message || 'Failed to delete user';
      showNotification(message, 'error');
    }
  };

  /**
   * Handle user status change
   */
  const handleStatusChange = async (userId, status) => {
    try {
      const response = await api.put(`/admin/users/${userId}/status`, { status });
      
      if (response.data.success) {
        showNotification(`User ${status} successfully`, 'success');
        fetchUsers(); // Refresh the list
      } else {
        throw new Error(response.data.message || 'Failed to update status');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      const message = err.response?.data?.message || 'Failed to update status';
      showNotification(message, 'error');
    }
  };

  /**
   * Handle bulk actions
   */
  const handleBulkAction = async (action, userIds = selectedUsers) => {
    if (!userIds.length) {
      showNotification('No users selected', 'warning');
      return;
    }

    try {
      const response = await api.post('/admin/users/bulk-action', {
        action,
        userIds
      });
      
      if (response.data.success) {
        showNotification(`Successfully ${action}ed ${userIds.length} users`, 'success');
        setSelectedUsers([]); // Clear selection
        fetchUsers(); // Refresh the list
      } else {
        throw new Error(response.data.message || 'Bulk action failed');
      }
    } catch (err) {
      console.error('Error performing bulk action:', err);
      const message = err.response?.data?.message || 'Bulk action failed';
      showNotification(message, 'error');
    }
  };

  // Show loading state
  if (loading && users.length === 0) {
    return (
      <div className="user-management-loading">
        <div className="loading-spinner"></div>
        <p>Loading user management...</p>
      </div>
    );
  }

  // Show error state
  if (error && users.length === 0) {
    return (
      <div className="user-management-error">
        <div className="error-icon">⚠️</div>
        <h3>Failed to Load Users</h3>
        <p>{error}</p>
        <button onClick={initializeComponent} className="btn btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="user-management">
      {/* Header */}
      <div className="user-management-header">
        <div className="header-info">
          <h2>User Management</h2>
          <p>Manage all users, their statuses, and perform bulk operations</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-primary"
            onClick={() => openModal('add')}
          >
            <i className="fas fa-plus"></i>
            Add User
          </button>
        </div>
      </div>

      {/* Filters */}
      <UserFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        referenceData={referenceData}
        loading={loading}
      />

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <BulkActions
          selectedCount={selectedUsers.length}
          onBulkAction={handleBulkAction}
        />
      )}

      {/* Users Table */}
      <UserTable
        users={users}
        selectedUsers={selectedUsers}
        onUserSelect={handleUserSelect}
        onSelectAll={handleSelectAll}
        onUserAction={openModal}
        onStatusChange={handleStatusChange}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
      />

      {/* Modal */}
      {modalState.isOpen && (
        <UserModal
          type={modalState.type}
          user={modalState.user}
          referenceData={referenceData}
          onClose={closeModal}
          onSubmit={
            modalState.type === 'add' ? handleAddUser :
            modalState.type === 'edit' ? handleEditUser :
            modalState.type === 'delete' ? handleDeleteUser :
            null
          }
        />
      )}
    </div>
  );
};

export default UserManagement;
