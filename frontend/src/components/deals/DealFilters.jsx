import React, { useState } from 'react';
import './UserFilters.css';


/**
 * DealFilters component for advanced deal filtering.
 * @param {Object} props
 * @param {Object} props.filters - Current filter values
 * @param {Function} props.onFilterChange - Callback for filter changes
 * @param {Function} props.onSearch - Callback for search
 */
const DealFilters = ({ filters, onFilterChange, onSearch }) => {
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
      membershipLevel: 'all',
      accessLevel: 'all',
      discountType: 'all',
      search: '',
      terms: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  /**
   * Checks if any filter is active.
   */
  const hasActiveFilters = () => {
    return (
      filters.status !== 'all' ||
      filters.category !== 'all' ||
      filters.membershipLevel !== 'all' ||
      filters.accessLevel !== 'all' ||
      filters.discountType !== 'all' ||
      filters.terms ||
      filters.dateFrom ||
      filters.dateTo
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
        <header className="user-filters__filters-header">
          <h3>Filter Deals</h3>
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
        </header>
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
              <div className="user-filters__filter-group">
                <label htmlFor="membershipLevel">Membership Level</label>
                <select 
                  id="membershipLevel" 
                  name="membershipLevel" 
                  value={filters.membershipLevel || 'all'} 
                  onChange={handleInputChange}
                  aria-label="Membership level"
                >
                  <option value="all">All Levels</option>
                  <option value="community">Community</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                </select>
              </div>
              <div className="user-filters__filter-group">
                <label htmlFor="accessLevel">Deal Access Level</label>
                <select 
                  id="accessLevel" 
                  name="accessLevel" 
                  value={filters.accessLevel || 'all'} 
                  onChange={handleInputChange}
                  aria-label="Deal access level"
                >
                  <option value="all">All Access Levels</option>
                  <option value="community">Community</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                </select>
              </div>
              <div className="user-filters__filter-group">
                <label htmlFor="discountType">Discount Type</label>
                <select 
                  id="discountType" 
                  name="discountType" 
                  value={filters.discountType || 'all'} 
                  onChange={handleInputChange}
                  aria-label="Discount type"
                >
                  <option value="all">All Types</option>
                  <option value="percent">Percent</option>
                  <option value="flat">Flat</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="user-filters__filter-group">
                <label htmlFor="terms">Terms/Keyword</label>
                <input
                  type="text"
                  id="terms"
                  name="terms"
                  value={filters.terms || ''}
                  onChange={handleInputChange}
                  placeholder="Search terms or conditions..."
                  aria-label="Terms or keyword"
                />
              </div>
              <div className="user-filters__filter-group">
                <label htmlFor="dateFrom">From Date</label>
                <input 
                  type="date" 
                  id="dateFrom"
                  name="dateFrom" 
                  value={filters.dateFrom || ''} 
                  onChange={handleInputChange}
                  aria-label="From date"
                />
              </div>
              <div className="user-filters__filter-group">
                <label htmlFor="dateTo">To Date</label>
                <input 
                  type="date" 
                  id="dateTo"
                  name="dateTo" 
                  value={filters.dateTo || ''} 
                  onChange={handleInputChange}
                  aria-label="To date"
                />
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
                {filters.membershipLevel !== 'all' && (
                  <div className="user-filters__filter-tag">
                    <span>Membership: {filters.membershipLevel}</span>
                    <button aria-label="Clear membership filter" onClick={() => onFilterChange({ membershipLevel: 'all' })}>
                      <i className="fas fa-times" aria-hidden="true"></i>
                    </button>
                  </div>
                )}
                {filters.accessLevel !== 'all' && (
                  <div className="user-filters__filter-tag">
                    <span>Access: {filters.accessLevel}</span>
                    <button aria-label="Clear access filter" onClick={() => onFilterChange({ accessLevel: 'all' })}>
                      <i className="fas fa-times" aria-hidden="true"></i>
                    </button>
                  </div>
                )}
                {filters.discountType !== 'all' && (
                  <div className="user-filters__filter-tag">
                    <span>Discount: {filters.discountType}</span>
                    <button aria-label="Clear discount filter" onClick={() => onFilterChange({ discountType: 'all' })}>
                      <i className="fas fa-times" aria-hidden="true"></i>
                    </button>
                  </div>
                )}
                {filters.terms && (
                  <div className="user-filters__filter-tag">
                    <span>Terms: {filters.terms}</span>
                    <button aria-label="Clear terms filter" onClick={() => onFilterChange({ terms: '' })}>
                      <i className="fas fa-times" aria-hidden="true"></i>
                    </button>
                  </div>
                )}
                {(filters.dateFrom || filters.dateTo) && (
                  <div className="user-filters__filter-tag">
                    <span>
                      Date: {filters.dateFrom || 'Any'} - {filters.dateTo || 'Any'}
                    </span>
                    <button aria-label="Clear date filter" onClick={() => onFilterChange({ dateFrom: '', dateTo: '' })}>
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
