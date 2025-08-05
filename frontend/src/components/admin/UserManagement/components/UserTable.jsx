// UserTable.jsx - User table component for User Management
import React from 'react';

const UserTable = ({
  users,
  selectedUsers,
  onUserSelect,
  onSelectAll,
  onUserAction,
  onStatusChange,
  loading,
  pagination,
  onPageChange
}) => {
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'status-approved';
      case 'pending': return 'status-pending';
      case 'rejected': return 'status-rejected';
      case 'suspended': return 'status-suspended';
      default: return 'status-unknown';
    }
  };

  const getPlanBadgeClass = (plan) => {
    switch (plan?.toLowerCase()) {
      case 'community': return 'plan-community';
      case 'silver': return 'plan-silver';
      case 'gold': return 'plan-gold';
      case 'basic': return 'plan-basic';
      default: return 'plan-none';
    }
  };

  if (loading) {
    return (
      <div className="table-loading">
        <div className="loading-rows">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="loading-row">
              <div className="loading-cell"></div>
              <div className="loading-cell"></div>
              <div className="loading-cell"></div>
              <div className="loading-cell"></div>
              <div className="loading-cell"></div>
              <div className="loading-cell"></div>
              <div className="loading-cell"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="user-table-container">
      <div className="table-wrapper">
        <table className="user-table">
          <thead>
            <tr>
              <th className="checkbox-col">
                <input
                  type="checkbox"
                  checked={users.length > 0 && selectedUsers.length === users.length}
                  onChange={onSelectAll}
                  disabled={users.length === 0}
                />
              </th>
              <th>User</th>
              <th>Contact</th>
              <th>Type</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Registered</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-state">
                  <div className="empty-content">
                    <i className="fas fa-users"></i>
                    <h3>No Users Found</h3>
                    <p>No users match your current filters</p>
                  </div>
                </td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id || user._id} className="user-row">
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id || user._id)}
                      onChange={() => onUserSelect(user.id || user._id)}
                    />
                  </td>
                  <td>
                    <div className="user-info">
                      <div className="user-avatar">
                        {user.profilePicture ? (
                          <img src={user.profilePicture} alt={user.fullName} />
                        ) : (
                          <div className="user-initials">
                            {user.fullName ? 
                              user.fullName.split(' ').map(n => n[0]).join('').toUpperCase() : 
                              'U'
                            }
                          </div>
                        )}
                      </div>
                      <div className="user-details">
                        <div className="user-name">{user.fullName || 'Unknown'}</div>
                        <div className="user-meta">
                          {user.membershipNumber && (
                            <span className="membership-number">#{user.membershipNumber}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="contact-info">
                      <div className="email">{user.email || 'N/A'}</div>
                      {user.phone && <div className="phone">{user.phone}</div>}
                    </div>
                  </td>
                  <td>
                    <span className={`user-type-badge ${user.userType || 'user'}`}>
                      {user.userType ? user.userType.charAt(0).toUpperCase() + user.userType.slice(1) : 'User'}
                    </span>
                  </td>
                  <td>
                    <span className={`plan-badge ${getPlanBadgeClass(user.membershipType)}`}>
                      {user.membershipType ? 
                        user.membershipType.charAt(0).toUpperCase() + user.membershipType.slice(1) : 
                        'None'
                      }
                    </span>
                  </td>
                  <td>
                    <select
                      value={user.status || 'pending'}
                      onChange={(e) => onStatusChange(user.id || user._id, e.target.value)}
                      className={`status-select ${getStatusBadgeClass(user.status)}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </td>
                  <td>
                    <span className="date-text">
                      {formatDate(user.created_at || user.createdAt)}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-action btn-view"
                        onClick={() => onUserAction('view', user)}
                        title="View Details"
                      >
                        <i className="fas fa-eye"></i>
                      </button>
                      <button
                        className="btn-action btn-edit"
                        onClick={() => onUserAction('edit', user)}
                        title="Edit User"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        className="btn-action btn-delete"
                        onClick={() => onUserAction('delete', user)}
                        title="Delete User"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="pagination">
          <div className="pagination-info">
            <span>
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} users
            </span>
          </div>
          <div className="pagination-controls">
            <button
              className="btn btn-sm"
              onClick={() => onPageChange(1)}
              disabled={pagination.page === 1}
            >
              <i className="fas fa-angle-double-left"></i>
            </button>
            <button
              className="btn btn-sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              <i className="fas fa-angle-left"></i>
            </button>
            <span className="page-info">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              className="btn btn-sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
            >
              <i className="fas fa-angle-right"></i>
            </button>
            <button
              className="btn btn-sm"
              onClick={() => onPageChange(pagination.totalPages)}
              disabled={pagination.page === pagination.totalPages}
            >
              <i className="fas fa-angle-double-right"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserTable;
