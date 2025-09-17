// UserFilters.jsx - COMPLETE FIXED Component
import React, { useState } from 'react';
import { useDynamicFields } from '../../../../hooks/useDynamicFields';
import './UserFilters.css';

const UserFilters = ({ 
  filters, 
  onFilterChange, 
  onClearFilters, 
  onExport, 
  referenceData, 
  loading,
  headerActions
}) => {
  const { getCommunityOptions, isLoading: fieldsLoading } = useDynamicFields();
  const [isExpanded, setIsExpanded] = useState(true);

  const handleFilterChange = (field, value) => {
    onFilterChange({ [field]: value });
  };

  const handleClearFilters = () => {
    onClearFilters();
  };

  return (
    <div className="user-filters">
      <div className="filters-container">
        <div className="filters-header">
          <h3>Search & Filter Users</h3>
          <button 
            className="toggle-filters"
            onClick={() => setIsExpanded(!isExpanded)}
            type="button"
          >
            {isExpanded ? 'Hide Filters' : 'Show Filters'}
            <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
          </button>
        </div>

        {isExpanded && (
          <div className="filters-content">
            {/* Search */}
            <div className="filter-group">
              <label htmlFor="search">Search Users</label>
              <div className="search-container">
                <i className="fas fa-search"></i>
                <input
                  id="search"
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="filter-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={filters.status || 'all'}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            {/* User Type Filter */}
            <div className="filter-group">
              <label htmlFor="userType">User Type</label>
              <select
                id="userType"
                value={filters.userType || 'all'}
                onChange={(e) => handleFilterChange('userType', e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="user">Users</option>
                <option value="merchant">Merchants</option>
                <option value="admin">Admins</option>
              </select>
            </div>


            {/* Community Filter */}
            <div className="filter-group">
              <label htmlFor="community">Community</label>
              <select
                id="community"
                value={filters.community || 'all'}
                onChange={(e) => handleFilterChange('community', e.target.value)}
              >
                <option value="all">All Communities</option>
                {fieldsLoading ? (
                  <option disabled>Loading communities...</option>
                ) : (
                  getCommunityOptions().map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Membership Plan Filter (dynamic from referenceData.plans) */}
            <div className="filter-group">
              <label htmlFor="membershipType">Membership Plan</label>
              <select
                id="membershipType"
                value={filters.membershipType || 'all'}
                onChange={(e) => handleFilterChange('membershipType', e.target.value)}
                disabled={fieldsLoading || loading}
              >
                <option value="all">All Plans</option>
                {(fieldsLoading || loading) ? (
                  <option disabled>Loading plans...</option>
                ) : referenceData?.plans && referenceData.plans.length > 0 ? (
                  referenceData.plans.map(plan => (
                    <option key={plan.key || plan.id} value={plan.key || plan.id}>
                      {plan.name || plan.key || `Plan ${plan.id}`}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="community">Community</option>
                    <option value="silver">Silver</option>
                    <option value="gold">Gold</option>
                    <option value="basic_business">Basic Business</option>
                    <option value="premium_business">Premium Business</option>
                  </>
                )}
              </select>
            </div>

            {/* Plan Expiry Status */}
            <div className="filter-group">
              <label htmlFor="planStatus">Plan Status</label>
              <select
                id="planStatus"
                value={filters.planStatus || 'all'}
                onChange={(e) => handleFilterChange('planStatus', e.target.value)}
              >
                <option value="all">All Plans</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="expiring_soon">Expiring Soon</option>
                <option value="no_plan">No Plan Set</option>
              </select>
            </div>

          </div>
        )}

        {/* Filter Actions */}
        <div className="filters-actions">
          {headerActions && (
            <div className="header-actions-section">
              {headerActions}
            </div>
          )}
          <div>
            <button 
              type="button" 
              className="btn-reset"
              onClick={handleClearFilters}
              disabled={loading}
            >
              <i className="fas fa-times"></i>
              Clear Filters
            </button>
            <button 
              type="button" 
              className="btn-apply"
              onClick={onExport}
              disabled={loading}
            >
              <i className="fas fa-download"></i>
              Export Users
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserFilters;
