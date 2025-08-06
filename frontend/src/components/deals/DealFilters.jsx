import React, { useState } from 'react';
import './dealfilter.css';

/**
 * DealFilters component for advanced deal filtering.
 * @param {Object} props
 * @param {Object} props.filters - Current filter values
 * @param {Array} props.plans - Available membership plans
 * @param {Function} props.onFilterChange - Callback for filter changes
 * @param {Function} props.onSearch - Callback for search
 */
const DealFilters = ({ filters, plans = [], onFilterChange, onSearch }) => {
  const [showFilters, setShowFilters] = useState(true);

  /**
   * Handles input changes for all filter fields.
   * @param {React.ChangeEvent} e
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onFilterChange({ [name]: value });
  };

  /**
   * Handles search submit (Enter key or button).
   * @param {React.FormEvent} e
   */
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(filters.search);
  };

  /**
   * Clears all filters to default values.
   */
  const clearFilters = () => {
    onFilterChange({
      status: 'all',
      category: 'all',
      search: ''
    });
  };

  /**
   * Checks if any filter is active.
   */
  const hasActiveFilters = () => {
    return (
      filters.status !== 'all' ||
      filters.category !== 'all'
    );
  };

  return (
    <section className="user-filters" aria-label="Deal Filters">
      <div className="user-filters__search-container">
        <i className="fas fa-search" aria-hidden="true"></i>
        <input
          type="text"
          name="search"
          value={filters.search || ''}
          onChange={handleInputChange}
          onKeyUp={(e) => e.key === 'Enter' && handleSearchSubmit(e)}
          placeholder="Search by deal title, business, or category..."
          aria-label="Search deals"
        />
      </div>
      <div className="user-filters__filters-container">
        <div className="user-filters__filters-header">
          <button 
            className="user-filters__toggle-filters" 
            onClick={() => setShowFilters(!showFilters)}
            aria-label={showFilters ? 'Hide Filters' : 'Show Filters'}
          >
            {showFilters ? (
              <>
                <i className="fas fa-chevron-up" aria-hidden="true"></i>
                Hide Filters
              </>
            ) : (
              <>
                <i className="fas fa-chevron-down" aria-hidden="true"></i>
                Show Filters
              </>
            )}
          </button>
        </div>
        {showFilters && (
          <>
            <form className="user-filters__filters-content" onSubmit={handleSearchSubmit}>
              <div className="user-filters__filter-group">
                <label htmlFor="status">Status</label>
                <select 
                  id="status" 
                  name="status" 
                  value={filters.status || 'all'} 
                  onChange={handleInputChange}
                  aria-label="Deal status"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="upcoming">Upcoming</option>
                </select>
              </div>
              <div className="user-filters__filter-group">
                <label htmlFor="category">Category</label>
                <select 
                  id="category" 
                  name="category" 
                  value={filters.category || 'all'} 
                  onChange={handleInputChange}
                  aria-label="Deal category"
                >
                  <option value="all">All Categories</option>
                  <option value="food">Food</option>
                  <option value="shopping">Shopping</option>
                  <option value="services">Services</option>
                  <option value="travel">Travel</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="user-filters__filters-actions">
                <button type="button" className="user-filters__btn-reset" onClick={clearFilters}>
                  Reset Filters
                </button>
                <button 
                  type="submit"
                  className="user-filters__btn-apply"
                >
                  Apply Filters
                </button>
              </div>
            </form>
            {hasActiveFilters() && (
              <div className="user-filters__active-filters" aria-label="Active filters">
                {filters.status !== 'all' && (
                  <div className="user-filters__filter-tag">
                    <span>Status: {filters.status}</span>
                    <button aria-label="Clear status filter" onClick={() => onFilterChange({ status: 'all' })}>
                      <i className="fas fa-times" aria-hidden="true"></i>
                    </button>
                  </div>
                )}
                {filters.category !== 'all' && (
                  <div className="user-filters__filter-tag">
                    <span>Category: {filters.category}</span>
                    <button aria-label="Clear category filter" onClick={() => onFilterChange({ category: 'all' })}>
                      <i className="fas fa-times" aria-hidden="true"></i>
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default DealFilters;
