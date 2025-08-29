import React, { useState } from 'react';
import { useDynamicFields } from '../../hooks/useDynamicFields';
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
  const { getBusinessCategoryOptions, getDealCategoryOptions } = useDynamicFields();

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
   * Handles status filter button clicks.
   * @param {string} status
   */
  const handleStatusFilter = (status) => {
    onFilterChange({ status });
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
      <div className="user-filters__toggle-row">
        <button
          className="user-filters__toggle-btn"
          onClick={() => setShowFilters((prev) => !prev)}
          aria-label={showFilters ? 'Hide filters' : 'Show filters'}
        >
          {showFilters ? (
            <>
              <i className="fas fa-eye-slash"></i> Hide Filters
            </>
          ) : (
            <>
              <i className="fas fa-eye"></i> Show Filters
            </>
          )}
        </button>
      </div>
      {showFilters && (
        <>
          <div className="user-filters__main-row">
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
            
            <div className="user-filters__category-container">
              <select 
                id="category" 
                name="category" 
                value={filters.category || 'all'} 
                onChange={handleInputChange}
                aria-label="Deal category"
                className="user-filters__category-select"
              >
                <option value="all">All Categories</option>
                {getDealCategoryOptions().map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="user-filters__status-buttons">
            <button
              className={`user-filters__status-btn ${filters.status === 'all' ? 'active' : ''}`}
              onClick={() => handleStatusFilter('all')}
              aria-label="Show all deals"
            >
              <i className="fas fa-list" aria-hidden="true"></i>
              All Deals
            </button>
            <button
              className={`user-filters__status-btn ${filters.status === 'active' ? 'active' : ''}`}
              onClick={() => handleStatusFilter('active')}
              aria-label="Show active deals"
            >
              <i className="fas fa-check-circle" aria-hidden="true"></i>
              Active
            </button>
            <button
              className={`user-filters__status-btn ${filters.status === 'expired' ? 'active' : ''}`}
              onClick={() => handleStatusFilter('expired')}
              aria-label="Show expired deals"
            >
              <i className="fas fa-times-circle" aria-hidden="true"></i>
              Expired
            </button>
            <button
              className={`user-filters__status-btn ${filters.status === 'upcoming' ? 'active' : ''}`}
              onClick={() => handleStatusFilter('upcoming')}
              aria-label="Show upcoming deals"
            >
              <i className="fas fa-clock" aria-hidden="true"></i>
              Upcoming
            </button>
          </div>

          <div className="user-filters__filters-container">
            <div className="user-filters__filters-header">

              {hasActiveFilters() && (
                <button 
                  className="user-filters__btn-reset-small" 
                  onClick={clearFilters}
                  aria-label="Clear all filters"
                >
                  <i className="fas fa-times" aria-hidden="true"></i>
                  Clear All
                </button>
              )}
            </div>
            
            {showFilters && hasActiveFilters() && (
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
          </div>
        </>
      )}
    </section>
  );
};

export default DealFilters;
