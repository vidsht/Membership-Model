import React from 'react';
import { Link } from 'react-router-dom';
import { useImageUrl, SmartImage, DefaultAvatar } from '../../../../hooks/useImageUrl.jsx';

// Utility function to format membership number with gaps after 4 digits
const formatMembershipNumber = (number) => {
  if (!number) return '';
  const numStr = number.toString();
  return numStr.replace(/(.{4})/g, '$1 ').trim();
};

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
      return new Date(dateString).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
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

  const getValidityStatus = (user) => {
    if (!user.validationDate) {
      return 'none';
    }
    
    try {
      const validationDate = new Date(user.validationDate);
      const now = new Date();
      const timeDiff = validationDate.getTime() - now.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      if (daysDiff < 0) {
        return 'expired';
      } else if (daysDiff <= 15) {
        return 'warning';
      } else {
        return 'active';
      }
    } catch (error) {
      return 'none';
    }
  };

  const formatValidTill = (user) => {
    if (!user.planValidTill || user.planValidTill === 'No validity set') {
      return <span className="validity-none">No validity set</span>;
    }
    if (user.planValidTill === 'Lifetime') {
      return <span className="validity-lifetime">Lifetime</span>;
    }
    if (user.planValidTill === 'Invalid date') {
      return <span className="validity-error">Invalid date</span>;
    }
    
    // Calculate remaining days and apply color coding based on expiry status
    if (user.validationDate) {
      try {
        const validationDate = new Date(user.validationDate);
        const now = new Date();
        const timeDiff = validationDate.getTime() - now.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        const validityStatus = getValidityStatus(user);
        let className = 'validity-active';
        let badgeText = '';
        let remainingDaysText = '';
        
        if (validityStatus === 'expired') {
          className = 'validity-expired';
          badgeText = 'EXPIRED';
          const expiredDays = Math.abs(daysDiff);
          remainingDaysText = `${expiredDays} day${expiredDays === 1 ? '' : 's'} ago`;
          
          return (
            <span className={className}>
              <div className="expired-badge">{badgeText}</div>
              <div className="validity-date">{user.planValidTill}</div>
              <div className="days-ago">{remainingDaysText}</div>
            </span>
          );
        } else if (validityStatus === 'warning') {
          className = 'validity-warning';
          remainingDaysText = ` (${daysDiff} day${daysDiff === 1 ? '' : 's'} left)`;
        } else {
          className = 'validity-active';
          remainingDaysText = ` (${daysDiff} day${daysDiff === 1 ? '' : 's'} left)`;
        }
        
        return (
          <span className={className}>
            {badgeText && <span className="expired-badge">{badgeText}</span>}
            {user.planValidTill}
            {remainingDaysText && <span className="remaining-days">{remainingDaysText}</span>}
          </span>
        );
      } catch (error) {
        // Fallback to original display if date calculation fails
        return <span className="validity-error">Invalid date</span>;
      }
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
    if (!pagination) return null;

    const total = (typeof pagination.total === 'number' ? pagination.total : (users && users.length) || 0);
    const limit = pagination.limit || 20;
    let totalPages = pagination.totalPages || Math.max(1, Math.ceil(total / limit));
    if (totalPages < 1) totalPages = 1;
    const currentPage = Math.min(Math.max(1, pagination.page || 1), totalPages);

    const pages = [];

    // Previous button
    pages.push(
      <button
        key="prev"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage <= 1 || total === 0}
        className="pagination-btn btn btn-sm btn-secondary"
      >
        <i className="fas fa-chevron-left"></i>
      </button>
    );

    // Page numbers (show a small window around current page)
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
      pages.push(
        <button
          key={1}
          onClick={() => onPageChange(1)}
          className="pagination-btn btn btn-sm btn-secondary"
          disabled={total === 0}
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
          disabled={total === 0}
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
          disabled={total === 0}
        >
          {totalPages}
        </button>
      );
    }

    // Next button
    pages.push(
      <button
        key="next"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage >= totalPages || total === 0}
        className="pagination-btn btn btn-sm btn-secondary"
      >
        <i className="fas fa-chevron-right"></i>
      </button>
    );

    return (
      <div className="table-pagination pagination-container">
        <div className="pagination-info">
          {total === 0
            ? 'No users to display.'
            : `Showing ${((currentPage - 1) * limit) + 1} to ${Math.min(currentPage * limit, total)} of ${total} users`}
        </div>
        <div className="pagination-controls">
          {pages}
        </div>
        <div className="page-size-selector">
          <select
            value={limit}
            onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
            disabled={total === 0}
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
          <table className="users-table merchants-table compact-table">
            <thead>
              <tr>
                <th className="checkbox-column">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length > 0 && selectedUsers.length === users.length}
                    onChange={onSelectAll}
                    disabled={users.length === 0}
                  />
                </th>
                <th className="serial-column">S.No</th>
                <th className="user-column">User & Type</th>
                <th className="contact-column">Contact Info</th>
                <th className="plan-column">Plan & Status</th>
                <th className="limit-column">Redemption Limit</th>
                <th className="validity-column">Valid Till</th>
                <th className="actions-column">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="8" className="no-data">
                    <div className="no-data-content no-merchants">
                      <i className="fas fa-users fa-3x"></i>
                      <h3>No Users Found</h3>
                      <p>No users match your current filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user, index) => (
                  <tr key={user.id}>
                    <td className="checkbox-cell" data-label="Select">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => onUserSelect(user.id)}
                      />
                    </td>
                    <td className="serial-number" data-label="S.No">
                      {((pagination?.page || 1) - 1) * (pagination?.limit || 20) + index + 1}
                    </td>
                    <td className="user-cell" data-label="User & Type">
                      <div className="user-info-compact">
                        <div className="user-details-compact">
                          <span className="user-name">
                            {user.fullName || 'Unknown'} ({user.userType ? user.userType.charAt(0).toUpperCase() + user.userType.slice(1) : 'User'})
                          </span>
                          {user.membershipNumber && (
                            <span className="membership-number">#{formatMembershipNumber(user.membershipNumber)}</span>
                          )}
                          <span className="registered-date">Joined : {formatDate(user.createdAt)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="contact-cell" data-label="Contact Info">
                      <div className="contact-info-stacked">
                        <span className="email">{user.email || 'N/A'}</span>
                        {user.phone && <span className="phone">Mob : {user.phone}</span>}
                      </div>
                    </td>
                    <td className="plan-cell" data-label="Plan & Status">
                      <div className="plan-status-info">
                        <span className="plan-badge">
                          {user.membershipType ? user.membershipType.charAt(0).toUpperCase() + user.membershipType.slice(1) : 'None'}
                        </span>
                        {user.isPlanExpired && (
                          <span className="expired-indicator validity-expired">
                            <i className="fas fa-exclamation-triangle"></i>
                            Expired
                          </span>
                        )}
                        <span className={`status-badge ${getStatusBadgeClass(user.status)}`}>
                          {user.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="limit-cell" data-label="Redemption Limit">
                      <div className="redemption-limit-info-compact">
                        {user.customRedemptionLimit ? (
                          <span className="custom-limit" title="Custom limit set by admin">
                            <i className="fas fa-star"></i> {user.customRedemptionLimit === -1 ? 'Unlimited' : `${user.customRedemptionLimit}/m`}
                          </span>
                        ) : (
                          <span className="plan-limit" title="Using plan default">
                            {user.planMaxDealRedemptions ? 
                              (user.planMaxDealRedemptions === -1 ? 'Unlimited' : `${user.planMaxDealRedemptions}/m`) 
                              : 'Plan Default'}
                          </span>
                        )}
                        {onQuickEditRedemption && user.userType === 'user' && (
                          <button
                            onClick={() => onQuickEditRedemption(user)}
                            className="btn-mini-compact"
                            title="Edit Redemption Limit"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="validity-cell" data-label="Valid Till">
                      <span className="validity-date-compact">
                        {formatValidTill(user)}
                      </span>
                    </td>
                    <td className="actions-cell" data-label="Actions">
                      <div className="action-buttons-compact">
                        {/* View/Edit Button - Route Link (ONLY REMAINING ACTION) */}
                        <Link
                          to={`/admin/users/${user.id}/details`}
                          className="btn-compact btn-info"
                          title="View/Edit Details"
                        >
                          <i className="fas fa-eye"></i>
                        </Link>

                        {/* Password Change Button */}
                        {onQuickChangePassword && (
                          <button
                            onClick={() => onQuickChangePassword(user)}
                            className="btn-compact btn-warning"
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
                              className="btn-compact btn-success"
                              title="Approve"
                            >
                              <i className="fas fa-check"></i>
                            </button>
                            <button
                              onClick={() => handleStatusChange(user.id, 'rejected')}
                              className="btn-compact btn-danger"
                              title="Reject"
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </>
                        )}

                        {user.status === 'approved' && (
                          <button
                            onClick={() => handleStatusChange(user.id, 'suspended')}
                            className="btn-compact btn-suspend"
                            title="Suspend"
                          >
                            <i className="fas fa-ban"></i>
                          </button>
                        )}

                        {user.status === 'suspended' && (
                          <button
                            onClick={() => handleStatusChange(user.id, 'approved')}
                            className="btn-compact btn-activate"
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
