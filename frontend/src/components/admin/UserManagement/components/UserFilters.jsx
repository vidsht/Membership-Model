// UserFilters.jsx - Filter component for User Management
import React from 'react';

const UserFilters = ({ filters, onFilterChange, referenceData, loading }) => {
  
  const handleInputChange = (key, value) => {
    onFilterChange({ [key]: value });
  };

  const clearFilters = () => {
    onFilterChange({
      search: '',
      status: 'all',
      userType: 'all',
      membershipType: 'all',
      dateFrom: '',
      dateTo: ''
    });
  };

  const hasActiveFilters = () => {
    return Object.entries(filters).some(([key, value]) => {
      if (key === 'search') return value.trim() !== '';
      if (key === 'dateFrom' || key === 'dateTo') return value !== '';
      return value !== 'all' && value !== '';
    });
  };

  return (
    <div className="user-filters">
      <div className="filters-row">
        {/* Search */}
        <div className="filter-group search-group">
          <div className="search-input">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={filters.search}
              onChange={(e) => handleInputChange('search', e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="filter-group">
          <label>Status</label>
          <select
            value={filters.status}
            onChange={(e) => handleInputChange('status', e.target.value)}
            disabled={loading}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {/* User Type Filter */}
        <div className="filter-group">
          <label>User Type</label>
          <select
            value={filters.userType}
            onChange={(e) => handleInputChange('userType', e.target.value)}
            disabled={loading}
          >
            <option value="all">All Types</option>
            {referenceData.userTypes.map(type => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Membership Plan Filter */}
        <div className="filter-group">
          <label>Plan</label>
          <select
            value={filters.membershipType}
            onChange={(e) => handleInputChange('membershipType', e.target.value)}
            disabled={loading}
          >
            <option value="all">All Plans</option>
            <option value="none">No Plan</option>
            {referenceData.plans.map(plan => (
              <option key={plan.id} value={plan.key}>
                {plan.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Filters */}
        <div className="filter-group date-group">
          <label>Registration Date</label>
          <div className="date-inputs">
            <input
              type="date"
              placeholder="From"
              value={filters.dateFrom}
              onChange={(e) => handleInputChange('dateFrom', e.target.value)}
              disabled={loading}
            />
            <span className="date-separator">to</span>
            <input
              type="date"
              placeholder="To"
              value={filters.dateTo}
              onChange={(e) => handleInputChange('dateTo', e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters() && (
          <div className="filter-group">
            <button
              className="btn btn-secondary btn-sm"
              onClick={clearFilters}
              disabled={loading}
              title="Clear all filters"
            >
              <i className="fas fa-times"></i>
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Filter Summary */}
      {hasActiveFilters() && (
        <div className="filter-summary">
          <span className="summary-text">Active filters:</span>
          {filters.search && (
            <span className="filter-tag">
              Search: "{filters.search}"
              <button onClick={() => handleInputChange('search', '')}>×</button>
            </span>
          )}
          {filters.status !== 'all' && (
            <span className="filter-tag">
              Status: {filters.status}
              <button onClick={() => handleInputChange('status', 'all')}>×</button>
            </span>
          )}
          {filters.userType !== 'all' && (
            <span className="filter-tag">
              Type: {filters.userType}
              <button onClick={() => handleInputChange('userType', 'all')}>×</button>
            </span>
          )}
          {filters.membershipType !== 'all' && (
            <span className="filter-tag">
              Plan: {filters.membershipType}
              <button onClick={() => handleInputChange('membershipType', 'all')}>×</button>
            </span>
          )}
          {(filters.dateFrom || filters.dateTo) && (
            <span className="filter-tag">
              Date: {filters.dateFrom || 'Any'} - {filters.dateTo || 'Any'}
              <button onClick={() => {
                handleInputChange('dateFrom', '');
                handleInputChange('dateTo', '');
              }}>×</button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default UserFilters;
