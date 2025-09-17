// MerchantFilters.jsx - Similar to UserFilters component
import React, { useState } from 'react';
import { useDynamicFields } from '../../../../hooks/useDynamicFields';
import './MerchantFilters.css';


const MerchantFilters = ({ 
  filters, 
  onFilterChange, 
  onClearFilters, 
  onExport, 
  loading, 
  referenceData = {},
  headerActions
}) => {
  const { getBusinessCategoryOptions, isLoading: fieldsLoading } = useDynamicFields();
  const [isExpanded, setIsExpanded] = useState(true);

  const handleFilterChange = (field, value) => {
    onFilterChange({ [field]: value });
  };

  const handleClearFilters = () => {
    onClearFilters();
  };

  return (
    <div className="merchant-filters">
      <div className="filters-container">
        <div className="filters-header">
          <h3>Search & Filter Merchants</h3>
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
              <label htmlFor="search">Search Merchants</label>
              <div className="search-container">
                <i className="fas fa-search"></i>
                <input
                  id="search"
                  type="text"
                  placeholder="Search by business name, owner name, email..."
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

            {/* Business Category Filter */}
            <div className="filter-group">
              <label htmlFor="category">Business Category</label>
              <select
                id="category"
                value={filters.category || 'all'}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <option value="all">All Categories</option>
                {fieldsLoading ? (
                  <option disabled>Loading categories...</option>
                ) : (
                  getBusinessCategoryOptions().map(option => (
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
                    <option value="free">Free</option>
                    <option value="premium">Premium</option>
                    <option value="business">Business</option>
                    <option value="basic_business">Basic Business</option>
                    <option value="premium_business">Premium Business</option>
                  </>
                )}
              </select>
            </div>

            {/* Registration Date From */}
            <div className="filter-group">
              <label htmlFor="dateFrom">Registered From</label>
              <input
                id="dateFrom"
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>

            {/* Registration Date To */}
            <div className="filter-group">
              <label htmlFor="dateTo">Registered To</label>
              <input
                id="dateTo"
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>

            {/* Plan Status */}
            <div className="filter-group">
              <label htmlFor="planStatus">Plan Status</label>
              <select
                id="planStatus"
                value={filters.planStatus || 'all'}
                onChange={(e) => handleFilterChange('planStatus', e.target.value)}
              >
                <option value="all">All Plan Status</option>
                <option value="active">Active Plans</option>
                <option value="expired">Expired Plans</option>
                <option value="expiring_soon">Expiring Soon</option>
                <option value="no_plan">No Plan Set</option>
              </select>
            </div>

            {/* Deal Limit Filter */}
            <div className="filter-group">
              <label htmlFor="dealLimit">Deal Limit</label>
              <select
                id="dealLimit"
                value={filters.dealLimit || 'all'}
                onChange={(e) => handleFilterChange('dealLimit', e.target.value)}
              >
                <option value="all">All Deal Limits</option>
                <option value="custom">Custom Limit</option>
                <option value="default">Default Limit</option>
                <option value="unlimited">Unlimited</option>
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
              Export Merchants
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MerchantFilters;