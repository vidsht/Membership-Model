// UserTable.jsx - Matching Old Version + Merchant Styling (Edit/Delete/Plan Buttons Removed)
import React from 'react';
import { Link } from 'react-router-dom';
import { useImageUrl, SmartImage, DefaultAvatar } from '../../../../hooks/useImageUrl.jsx';

const UserTable = ({
  users,
  selectedUsers,
  onUserSelect,
  onSelectAll,
  onUserAction,
  onStatusChange,
  onQuickEditRedemption,
  onQuickChangePassword,
  referenceData,
  loading,
  pagination,
  onPageChange,
  onPageSizeChange,
  calculatePlanValidity
}) => {
  const { getProfileImageUrl } = useImageUrl();
  
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

  // getPlanBadgeClass removed (plan assignment logic)

  const formatValidTill = (user) => {
    if (!user.planValidTill || user.planValidTill === 'No validity set') {
      return <span className="validity-none">No validity set</span>;
    }
    if (user.planValidTill === 'Expired') {
      return <span className="validity-expired">Expired</span>;
    }
    if (user.planValidTill === 'Lifetime') {
      return <span className="validity-lifetime">Lifetime</span>;
    }
    if (user.planValidTill === 'Invalid date') {
      return <span className="validity-error">Invalid date</span>;
    }
    // Otherwise, show the formatted date
    return <span className="validity-active">{user.planValidTill}</span>;
  };

  const handleStatusChange = (userId, newStatus) => {
    if (onStatusChange) {
      onStatusChange(userId, newStatus);
    }
  };

  // handlePlanChange removed (plan assignment logic)

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
        className="pagination-btn btn btn-sm btn-secondary"
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
          className="pagination-btn btn btn-sm btn-secondary"
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
          className={`pagination-btn btn btn-sm ${i === currentPage ? 'btn-primary active' : 'btn-secondary'}`}
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
          className="pagination-btn btn btn-sm btn-secondary"
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
        className="pagination-btn btn btn-sm btn-secondary"
      >
        <i className="fas fa-chevron-right"></i>
      </button>
    );

    return (
      <div className="table-pagination pagination-container">
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
      <div className="table-container merchants-table-container">
        <div className="loading-state merchant-management-loading">
          <div className="loading-spinner"></div>
          <p>Please wait while we fetch the user data...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="table-container merchants-table-container">
        <div className="table-wrapper">
          <table className="users-table merchants-table">
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
                <th>Redemption Limit</th>
                <th>Valid Till</th>
                <th>Status</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="10" className="no-data">
                    <div className="no-data-content no-merchants">
                      <i className="fas fa-users fa-3x"></i>
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
                      <div className="user-cell business-info">
                        <div className="user-avatar">
                          {user.profilePhoto ? (
                            <SmartImage 
                              src={getProfileImageUrl(user)} 
                              alt={user.fullName}
                              className="avatar-image user-avatar-image"
                              fallback={<DefaultAvatar size={40} name={user.fullName} />}
                            />
                          ) : (
                            <DefaultAvatar size={40} name={user.fullName} />
                          )}
                        </div>
                        <div className="user-info user-details">
                          <span className="user-name business-name">{user.fullName || 'Unknown'}</span>
                          {user.membershipNumber && (
                            <span className="membership-number business-desc">#{user.membershipNumber}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="contact-cell contact-info">
                        <span className="email">{user.email || 'N/A'}</span>
                        {user.phone && <span className="phone">{user.phone}</span>}
                      </div>
                    </td>
                    <td>
                      <span className="user-type category-badge">
                        {user.userType ? user.userType.charAt(0).toUpperCase() + user.userType.slice(1) : 'User'}
                      </span>
                    </td>
                    <td>
                      <div className="plan-cell">
                        <span className="plan-badge">
                          {user.membershipType ? user.membershipType.charAt(0).toUpperCase() + user.membershipType.slice(1) : 'None'}
                        </span>
                        {user.isPlanExpired && (
                          <span className="expired-indicator validity-expired">
                            <i className="fas fa-exclamation-triangle"></i>
                            Expired
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="redemption-limit-info">
                        {user.customRedemptionLimit ? (
                          <span className="custom-limit" title="Custom limit set by admin">
                            <i className="fas fa-star"></i> {user.customRedemptionLimit === -1 ? 'Unlimited' : `${user.customRedemptionLimit}/month`}
                          </span>
                        ) : (
                          <span className="plan-limit" title="Using plan default">
                            {user.planMaxDealRedemptions ? `${user.planMaxDealRedemptions}/month` : 'Plan Default'}
                          </span>
                        )}
                        {onQuickEditRedemption && user.userType === 'user' && (
                          <button
                            onClick={() => onQuickEditRedemption(user)}
                            className="btn-mini btn-edit-limit"
                            title="Edit Redemption Limit"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="validity-date">
                        {formatValidTill(user)}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(user.status)}`}>
                        {user.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : 'Unknown'}
                      </span>
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      <div className="action-buttons">
                        {/* View/Edit Button - Route Link (ONLY REMAINING ACTION) */}
                        <Link
                          to={`/admin/users/${user.id}/details`}
                          className="btn-icon btn-view btn btn-sm btn-info"
                          title="View/Edit Details"
                        >
                          <i className="fas fa-eye"></i>
                        </Link>

                        {/* Password Change Button */}
                        {onQuickChangePassword && (
                          <button
                            onClick={() => onQuickChangePassword(user)}
                            className="btn-icon btn-password btn btn-sm btn-warning"
                            title="Change Password"
                          >
                            <i className="fas fa-key"></i>
                          </button>
                        )}

                        {/* Status Actions (PRESERVED) */}
                        {user.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(user.id, 'approved')}
                              className="btn-icon btn-approve btn btn-sm btn-success"
                              title="Approve"
                            >
                              <i className="fas fa-check"></i>
                            </button>
                            <button
                              onClick={() => handleStatusChange(user.id, 'rejected')}
                              className="btn-icon btn-reject btn btn-sm btn-danger"
                              title="Reject"
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </>
                        )}

                        {user.status === 'approved' && (
                          <button
                            onClick={() => handleStatusChange(user.id, 'suspended')}
                            className="btn-icon btn-suspend btn btn-sm"
                            title="Suspend"
                          >
                            <i className="fas fa-ban"></i>
                          </button>
                        )}

                        {user.status === 'suspended' && (
                          <button
                            onClick={() => handleStatusChange(user.id, 'approved')}
                            className="btn-icon btn-activate btn btn-sm"
                            title="Activate"
                          >
                            <i className="fas fa-check-circle"></i>
                          </button>
                        )}

                        {/* Edit User Button - REMOVED */}
                        {/* Delete User Button - REMOVED */}
                        {/* Assign Plan Button - REMOVED */}
                        {/* More Actions Dropdown removed (plan assignment logic) */}
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
    </>
  );
};

export default UserTable;
