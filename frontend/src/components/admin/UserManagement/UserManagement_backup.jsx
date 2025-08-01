import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { useNotification } from '../../../contexts/NotificationContext';
import './UserManagement.css';

const UserManagement = () => {
  const { showNotification } = useNotification();
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
      const response = await api.get('/admin/users');
      if (response.data.success) {
        setUsers(response.data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      showNotification('Error loading users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId, newStatus) => {
    try {
      const response = await api.put(`/admin/users/${userId}/status`, {
        status: newStatus
      });
      
      if (response.data.success) {
        setUsers(users.map(user => 
          user.id === userId ? { ...user, status: newStatus } : user
        ));
        showNotification(`User ${newStatus} successfully`, 'success');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      showNotification('Error updating user status', 'error');
    }
  };

  const handlePlanAssignment = async (userId, planKey) => {
    try {
      const response = await api.post(`/admin/users/${userId}/assign-plan`, {
        planKey
      });
      
      if (response.data.success) {
        setUsers(users.map(user => 
          user.id === userId ? { ...user, currentPlan: planKey } : user
        ));
        showNotification('Plan assigned successfully', 'success');
      }
    } catch (error) {
      console.error('Error assigning plan:', error);
      showNotification('Error assigning plan', 'error');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesPlan = planFilter === 'all' || user.currentPlan === planFilter;
    
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'approved': return 'status-approved';
      case 'pending': return 'status-pending';
      case 'rejected': return 'status-rejected';
      case 'suspended': return 'status-suspended';
      default: return 'status-unknown';
    }
  };

  const getPlanBadgeClass = (plan) => {
    switch (plan) {
      case 'community': return 'plan-community';
      case 'silver': return 'plan-silver';
      case 'gold': return 'plan-gold';
      default: return 'plan-none';
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <i className="fas fa-spinner fa-spin"></i>
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="management-header">
        <h2>User Management</h2>
        <div className="header-stats">
          <span>Total Users: {users.length}</span>
          <span>Filtered: {filteredUsers.length}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-group">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </select>
          
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
          >
            <option value="all">All Plans</option>
            <option value="community">Community</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Contact</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td>
                  <div className="user-info">
                    <div className="user-avatar">
                      {user.fullName?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div className="user-name">{user.fullName || 'Unknown'}</div>
                      <div className="user-community">{user.community || 'N/A'}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="contact-info">
                    <div>{user.email}</div>
                    <div className="phone">{user.phone || 'N/A'}</div>
                  </div>
                </td>
                <td>
                  <span className={`plan-badge ${getPlanBadgeClass(user.currentPlan)}`}>
                    {user.currentPlan ? user.currentPlan.toUpperCase() : 'None'}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${getStatusBadgeClass(user.status)}`}>
                    {user.status || 'Unknown'}
                  </span>
                </td>
                <td>
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </td>
                <td>
                  <div className="action-buttons">
                    {user.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(user.id, 'approved')}
                          className="btn-approve"
                          title="Approve User"
                        >
                          <i className="fas fa-check"></i>
                        </button>
                        <button
                          onClick={() => handleStatusChange(user.id, 'rejected')}
                          className="btn-reject"
                          title="Reject User"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </>
                    )}
                    
                    {user.status === 'approved' && (
                      <button
                        onClick={() => handleStatusChange(user.id, 'suspended')}
                        className="btn-suspend"
                        title="Suspend User"
                      >
                        <i className="fas fa-ban"></i>
                      </button>
                    )}
                    
                    {user.status === 'suspended' && (
                      <button
                        onClick={() => handleStatusChange(user.id, 'approved')}
                        className="btn-reactivate"
                        title="Reactivate User"
                      >
                        <i className="fas fa-undo"></i>
                      </button>
                    )}
                    
                    <div className="plan-actions">
                      <select
                        onChange={(e) => handlePlanAssignment(user.id, e.target.value)}
                        value={user.currentPlan || ''}
                        className="plan-select"
                      >
                        <option value="">Assign Plan</option>
                        <option value="community">Community</option>
                        <option value="silver">Silver</option>
                        <option value="gold">Gold</option>
                      </select>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredUsers.length === 0 && (
          <div className="empty-state">
            <i className="fas fa-users"></i>
            <p>No users found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
