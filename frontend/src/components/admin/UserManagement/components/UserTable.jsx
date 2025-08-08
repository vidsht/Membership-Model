// UserTable.jsx - Enhanced with Route Navigation Links
import React from 'react';
import { Link } from 'react-router-dom';

const UserTable = ({
  users,
  selectedUsers,
  onUserSelect,
  onSelectAll,
  onUserAction,
  onStatusChange,
  onPlanAssignment,
  referenceData,
  loading,
  pagination,
  onPageChange,
  onPageSizeChange,
  getPlansForUserType,
  calculatePlanValidity
}) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
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
      case 'basic': case 'basic_business': return 'plan-basic';
      case 'premium': case 'premium_business': return 'plan-premium';
      default: return 'plan-none';
    }
  };

  const formatValidTill = (user) => {
    if (!user.validationDate) {
      return <span className="validity-none">No validity set</span>;
    }
    
    try {
      const validationDate = new Date(user.validationDate);
      const now = new Date();
      
      if (validationDate < now) {
        return <span className="validity-expired">Expired</span>;
      }
      
      const diffTime = validationDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let className = 'validity-active';
      if (diffDays <= 7) {
        className = 'validity-expiring-soon';
      } else if (diffDays <= 30) {
        className = 'validity-expiring';
      }
      
      return (
        <span className={className}>
          {validationDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })} ({diffDays} days)
        </span>
      );
    } catch (error) {
      return <span className="validity-error">Invalid date</span>;
    }
  };

  const handleStatusChange = (userId, newStatus) => {
    if (onStatusChange) {
      onStatusChange(userId, newStatus);
    }
  };

  const handlePlanChange = (userId, planKey) => {
    if (onPlanAssignment) {
      onPlanAssignment(userId, planKey);
    }
  };

  const renderPagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null;

    const pages = [];
    const { page: currentPage, totalPages } = pagination;

    // Previous button
    pages.push(
      <button
        key="prev"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="pagination-btn"
      >
        <i className="fas fa-chevron-left"></i>
      </button>
    );

    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
      pages.push(
        <button
          key={1}
          onClick={() => onPageChange(1)}
          className="pagination-btn"
        >
          1
        </button>
      );
      if (startPage > 2) {
        pages.push(<span key="dots1" className="pagination-dots">...</span>);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => onPageChange(i)}
          className={`pagination-btn ${i === currentPage ? 'active' : ''}`}
        >
          {i}
        </button>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(<span key="dots2" className="pagination-dots">...</span>);
      }
      pages.push(
        <button
          key={totalPages}
          onClick={() => onPageChange(totalPages)}
          className="pagination-btn"
        >
          {totalPages}
        </button>
      );
    }

    // Next button
    pages.push(
      <button
        key="next"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="pagination-btn"
      >
        <i className="fas fa-chevron-right"></i>
      </button>
    );

    return (
      <div className="table-pagination">
        <div className="pagination-info">
          Showing {((currentPage - 1) * pagination.limit) + 1} to {Math.min(currentPage * pagination.limit, pagination.total)} of {pagination.total} users
        </div>
        <div className="pagination-controls">
          {pages}
        </div>
        <div className="page-size-selector">
          <select 
            value={pagination.limit} 
            onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="table-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Please wait while we fetch the user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="table-container">
      <div className="table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th className="select-column">
                <input
                  type="checkbox"
                  checked={selectedUsers.length > 0 && selectedUsers.length === users.length}
                  onChange={onSelectAll}
                  disabled={users.length === 0}
                />
              </th>
              <th>User</th>
              <th>Contact</th>
              <th>Type</th>
              <th>Plan</th>
              <th>Valid Till</th>
              <th>Status</th>
              <th>Registered</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="9" className="no-data">
                  <div className="no-data-content">
                    <i className="fas fa-users"></i>
                    <h3>No Users Found</h3>
                    <p>No users match your current filters</p>
                  </div>
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => onUserSelect(user.id)}
                    />
                  </td>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">
                        {user.profilePicture ? (
                          <img src={user.profilePicture} alt={user.fullName} />
                        ) : (
                          <div className="avatar-placeholder">
                            {user.fullName ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                          </div>
                        )}
                      </div>
                      <div className="user-info">
                        <span className="user-name">{user.fullName || 'Unknown'}</span>
                        {user.membershipNumber && (
                          <span className="membership-number">#{user.membershipNumber}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="contact-cell">
                      <span className="email">{user.email || 'N/A'}</span>
                      {user.phone && <span className="phone">{user.phone}</span>}
                    </div>
                  </td>
                  <td>
                    <span className="user-type">
                      {user.userType ? user.userType.charAt(0).toUpperCase() + user.userType.slice(1) : 'User'}
                    </span>
                  </td>
                  <td>
                    <div className="plan-cell">
                      <span className={`plan-badge ${getPlanBadgeClass(user.membershipType)}`}>
                        {user.membershipType ? user.membershipType.charAt(0).toUpperCase() + user.membershipType.slice(1) : 'None'}
                      </span>
                      {user.isPlanExpired && (
                        <span className="expired-indicator">
                          <i className="fas fa-exclamation-triangle"></i>
                          Expired
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    {formatValidTill(user)}
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(user.status)}`}>
                      {user.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : 'Unknown'}
                    </span>
                  </td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td>
                    <div className="action-buttons">
                      {/* View Button - Route Link */}
                      <Link
                        to={`/admin/users/${user.id}`}
                        className="btn-icon btn-view"
                        title="View Details"
                      >
                        <i className="fas fa-eye"></i>
                      </Link>

                      {/* Edit Button - Route Link */}
                      <Link
                        to={`/admin/users/${user.id}/edit`}
                        className="btn-icon btn-edit"
                        title="Edit User"
                      >
                        <i className="fas fa-edit"></i>
                      </Link>

                      {/* Status Actions */}
                      {user.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(user.id, 'approved')}
                            className="btn-icon btn-approve"
                            title="Approve"
                          >
                            <i className="fas fa-check"></i>
                          </button>
                          <button
                            onClick={() => handleStatusChange(user.id, 'rejected')}
                            className="btn-icon btn-reject"
                            title="Reject"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </>
                      )}

                      {user.status === 'approved' && (
                        <button
                          onClick={() => handleStatusChange(user.id, 'suspended')}
                          className="btn-icon btn-suspend"
                          title="Suspend"
                        >
                          <i className="fas fa-ban"></i>
                        </button>
                      )}

                      {user.status === 'suspended' && (
                        <button
                          onClick={() => handleStatusChange(user.id, 'approved')}
                          className="btn-icon btn-activate"
                          title="Activate"
                        >
                          <i className="fas fa-check-circle"></i>
                        </button>
                      )}

                      {/* Plan Assignment */}
                      <button
                        onClick={() => onUserAction(user.id, 'assignPlan')}
                        className="btn-icon btn-plan"
                        title="Assign Plan"
                      >
                        <i className="fas fa-crown"></i>
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => onUserAction(user.id, 'delete')}
                        className="btn-icon btn-delete"
                        title="Delete User"
                      >
                        <i className="fas fa-trash"></i>
                      </button>

                      {/* More Actions Dropdown */}
                      <div className="dropdown">
                        <button className="btn-icon btn-more" title="More Actions">
                          <i className="fas fa-ellipsis-v"></i>
                        </button>
                        <div className="dropdown-menu">
                          {/* Plan Quick Assignment Options */}
                          {getPlansForUserType && getPlansForUserType(user.userType)?.length > 0 && (
                            <>
                              <div className="dropdown-header">Quick Plan Assignment</div>
                              {getPlansForUserType(user.userType).map((plan) => (
                                <button
                                  key={plan.key}
                                  onClick={() => handlePlanChange(user.id, plan.key)}
                                  className={`dropdown-item ${user.membershipType === plan.key ? 'active' : ''}`}
                                >
                                  <i className={`fas ${plan.key === 'community' ? 'fa-users' : plan.key === 'silver' ? 'fa-medal' : plan.key === 'gold' ? 'fa-crown' : 'fa-briefcase'}`}></i>
                                  {plan.name}
                                  {user.membershipType === plan.key && (
                                    <i className="fas fa-check current-plan"></i>
                                  )}
                                </button>
                              ))}
                              <div className="dropdown-divider"></div>
                            </>
                          )}

                          {/* Additional Actions */}
                          <button
                            onClick={() => navigator.clipboard.writeText(user.email)}
                            className="dropdown-item"
                          >
                            <i className="fas fa-copy"></i>
                            Copy Email
                          </button>
                          
                          {user.phone && (
                            <button
                              onClick={() => navigator.clipboard.writeText(user.phone)}
                              className="dropdown-item"
                            >
                              <i className="fas fa-phone"></i>
                              Copy Phone
                            </button>
                          )}

                          <button
                            onClick={() => window.open(`mailto:${user.email}`, '_blank')}
                            className="dropdown-item"
                          >
                            <i className="fas fa-envelope"></i>
                            Send Email
                          </button>

                          <div className="dropdown-divider"></div>

                          {/* Status Change Actions */}
                          {user.status !== 'approved' && (
                            <button
                              onClick={() => handleStatusChange(user.id, 'approved')}
                              className="dropdown-item text-success"
                            >
                              <i className="fas fa-check-circle"></i>
                              Mark as Approved
                            </button>
                          )}

                          {user.status !== 'suspended' && (
                            <button
                              onClick={() => handleStatusChange(user.id, 'suspended')}
                              className="dropdown-item text-warning"
                            >
                              <i className="fas fa-ban"></i>
                              Suspend User
                            </button>
                          )}

                          {user.status !== 'rejected' && (
                            <button
                              onClick={() => handleStatusChange(user.id, 'rejected')}
                              className="dropdown-item text-danger"
                            >
                              <i className="fas fa-times-circle"></i>
                              Reject User
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {renderPagination()}
    </div>
  );
};

export default UserTable;
