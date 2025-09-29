import React, { useState } from 'react';
import { useDynamicFields } from '../../../hooks/useDynamicFields';
import './DealFilters.css';

/**
 * Admin Deal Filters component for advanced deal filtering and search
 * @param {Object} props
 * @param {Object} props.filters - Current filter values
 * @param {Function} props.onFilterChange - Callback for filter changes
 * @param {Function} props.onSearch - Callback for search
 * @param {Array} props.businesses - List of businesses for business filter
 */
const DealFilters = ({ filters, onFilterChange, onSearch, onResetFilters, businesses = [], headerActions }) => {
  const { getDealCategoryOptions } = useDynamicFields();
  const [showFilters, setShowFilters] = useState(true);

  /**
   * Handles input changes for all filter fields
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onFilterChange({ [name]: value });
  };

  /**
   * Handles search submit (Enter key or button)
   */
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(filters.search);
  };

  /**
   * Clears all filters to default values
   */
  const clearFilters = () => {
    if (onResetFilters) {
      onResetFilters();
    } else {
      // Fallback if onResetFilters is not provided
      onFilterChange({
        status: 'all',
        category: 'all',
        businessId: 'all',
        search: '',
        minDiscount: '',
        maxDiscount: '',
        sortBy: 'created_at',
        sortOrder: 'desc'
      });
    }
  };

  /**
   * Applies the current filters
   */
  const applyFilters = () => {
    if (onSearch) onSearch();
  };

  return (
    <div className="deal-filters">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="search-container">
        <div className="search-input-group">
          <i className="fas fa-search search-icon"></i>
          <input
            type="text"
            name="search"
            placeholder="Search deals by title, business name, category, discount, coupon code, or any field..."
            value={filters.search || ''}
            onChange={handleInputChange}
            className="search-input"
          />
        </div>
      </form>

      {/* Filters Section */}
      <div className="filters-container">
        <div className="filters-header">
          <h3><i className="fas fa-filter"></i> Advanced Filters</h3>
          <button 
            type="button" 
            className="toggle-filters"
            onClick={() => setShowFilters(!showFilters)}
          >
            <i className={`fas fa-chevron-${showFilters ? 'up' : 'down'}`}></i>
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {showFilters && (
          <div className="filters-content">
            {/* Status Filter */}
            <div className="filter-group">
              <label>Status</label>
              <select
                name="status"
                value={filters.status || 'all'}
                onChange={handleInputChange}
                className="filter-select"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="filter-group">
              <label>Category</label>
              <select
                name="category"
                value={filters.category || 'all'}
                onChange={handleInputChange}
                className="filter-select"
              >
                <option value="all">All Categories</option>
                {getDealCategoryOptions && getDealCategoryOptions().map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Business Filter */}
            <div className="filter-group">
              <label>Business</label>
              <select
                name="businessId"
                value={filters.businessId || 'all'}
                onChange={handleInputChange}
                className="filter-select"
              >
                <option value="all">All Businesses</option>
                {businesses.map(business => (
                  <option key={business.businessId} value={business.businessId}>
                    {business.businessName}
                  </option>
                ))}
              </select>
            </div>

            {/* Discount Type Filter */}
            {/* Discount and date range filters removed per admin request */}

            {/* Sort Options */}
            <div className="filter-group">
              <label>Sort By</label>
              <select
                name="sortBy"
                value={filters.sortBy || 'created_at'}
                onChange={handleInputChange}
                className="filter-select"
              >
                <option value="created_at">Date Created</option>
                <option value="title">Title</option>
                <option value="discount">Discount Amount</option>
                <option value="validUntil">Expiry Date</option>
                <option value="status">Status</option>
                <option value="redemptions">Redemptions</option>
              </select>
            </div>

            {/* Sort Order control removed from UI (defaults preserved in logic) */}
          </div>
        )}

        {/* Filter Actions */}
        <div className="filter-actions">
          {headerActions && (
            <div className="header-actions-section">
              {headerActions}
            </div>
          )}
          <div>
            <button 
              type="button" 
              className="clear-btn"
              onClick={clearFilters}
            >
              <i className="fas fa-times"></i>
              Clear Filters
            </button>
            <button 
              type="button" 
              className="apply-btn"
              onClick={applyFilters}
            >
              <i className="fas fa-check"></i>
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DealFilters;
