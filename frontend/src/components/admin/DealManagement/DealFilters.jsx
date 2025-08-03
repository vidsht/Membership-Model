import React, { useState } from 'react';
import './DealFilters.css';

/**
 * Admin Deal Filters component for advanced deal filtering and search
 * @param {Object} props
 * @param {Object} props.filters - Current filter values
 * @param {Function} props.onFilterChange - Callback for filter changes
 * @param {Function} props.onSearch - Callback for search
 * @param {Array} props.businesses - List of businesses for business filter
 */
const DealFilters = ({ filters, onFilterChange, onSearch, businesses = [] }) => {
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
    onFilterChange({
      status: 'all',
      category: 'all',
      businessId: 'all',
      discountType: 'all',
      search: '',
      validFrom: '',
      validTo: '',
      minDiscount: '',
      maxDiscount: '',
      hasRedemptions: 'all',
      sortBy: 'created_at',
      sortOrder: 'desc'
    });
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
            placeholder="Search deals by title, description, or business name..."
            value={filters.search || ''}
            onChange={handleInputChange}
            className="search-input"
          />
        </div>
        <button type="submit" className="btn btn-primary search-btn">
          <i className="fas fa-search"></i>
          Search
        </button>
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
                <option value="pending">Pending</option>
                <option value="expired">Expired</option>
                <option value="suspended">Suspended</option>
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
                <option value="food">Food & Dining</option>
                <option value="retail">Retail & Shopping</option>
                <option value="services">Services</option>
                <option value="entertainment">Entertainment</option>
                <option value="health">Health & Wellness</option>
                <option value="travel">Travel</option>
                <option value="education">Education</option>
                <option value="automotive">Automotive</option>
                <option value="technology">Technology</option>
                <option value="general">General</option>
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
            <div className="filter-group">
              <label>Discount Type</label>
              <select
                name="discountType"
                value={filters.discountType || 'all'}
                onChange={handleInputChange}
                className="filter-select"
              >
                <option value="all">All Types</option>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
                <option value="bogo">Buy One Get One</option>
                <option value="free">Free Item</option>
              </select>
            </div>

            {/* Discount Range */}
            <div className="filter-group">
              <label>Discount Range</label>
              <div className="range-inputs">
                <input
                  type="number"
                  name="minDiscount"
                  placeholder="Min %"
                  value={filters.minDiscount || ''}
                  onChange={handleInputChange}
                  className="range-input"
                  min="0"
                  max="100"
                />
                <span>to</span>
                <input
                  type="number"
                  name="maxDiscount"
                  placeholder="Max %"
                  value={filters.maxDiscount || ''}
                  onChange={handleInputChange}
                  className="range-input"
                  min="0"
                  max="100"
                />
              </div>
            </div>

            {/* Valid Date Range */}
            <div className="filter-group">
              <label>Valid From</label>
              <input
                type="date"
                name="validFrom"
                value={filters.validFrom || ''}
                onChange={handleInputChange}
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label>Valid To</label>
              <input
                type="date"
                name="validTo"
                value={filters.validTo || ''}
                onChange={handleInputChange}
                className="filter-input"
              />
            </div>

            {/* Has Redemptions Filter */}
            <div className="filter-group">
              <label>Redemption Status</label>
              <select
                name="hasRedemptions"
                value={filters.hasRedemptions || 'all'}
                onChange={handleInputChange}
                className="filter-select"
              >
                <option value="all">All Deals</option>
                <option value="yes">Has Redemptions</option>
                <option value="no">No Redemptions</option>
                <option value="high">High Redemptions (10+)</option>
              </select>
            </div>

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

            <div className="filter-group">
              <label>Sort Order</label>
              <select
                name="sortOrder"
                value={filters.sortOrder || 'desc'}
                onChange={handleInputChange}
                className="filter-select"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        )}

        {/* Filter Actions */}
        <div className="filter-actions">
          <button 
            type="button" 
            className="btn btn-secondary clear-btn"
            onClick={clearFilters}
          >
            <i className="fas fa-times"></i>
            Clear Filters
          </button>
          <button 
            type="button" 
            className="btn btn-primary apply-btn"
            onClick={applyFilters}
          >
            <i className="fas fa-check"></i>
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default DealFilters;
