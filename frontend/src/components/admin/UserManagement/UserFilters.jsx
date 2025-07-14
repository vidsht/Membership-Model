import React, { useState } from 'react';
import './UserFilters.css';

const UserFilters = ({ filters, onFilterChange, onSearch }) => {
  const [showFilters, setShowFilters] = useState(true);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onFilterChange({ [name]: value });
  };
  
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(filters.search);
  };
  
  const clearFilters = () => {
    onFilterChange({
      status: 'all',
      plan: 'all',
      search: '',
      dateFrom: '',
      dateTo: ''
    });
  };
  
  const hasActiveFilters = () => {
    return (
      filters.status !== 'all' ||
      filters.plan !== 'all' ||
      filters.dateFrom ||
      filters.dateTo
    );
  };
  
  return (
    <div className="user-filters">
      <div className="search-container">
        <i className="fas fa-search"></i>
        <input
          type="text"
          name="search"
          value={filters.search || ''}
          onChange={handleInputChange}
          onKeyUp={(e) => e.key === 'Enter' && handleSearchSubmit(e)}
          placeholder="Search by name, email, or phone..."
        />
      </div>
      
      <div className="filters-container">
        <div className="filters-header">
          <h3>Filter Users</h3>
          <button 
            className="toggle-filters" 
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? (
              <>
                <i className="fas fa-chevron-up"></i>
                Hide Filters
              </>
            ) : (
              <>
                <i className="fas fa-chevron-down"></i>
                Show Filters
              </>
            )}
          </button>
        </div>
        
        {showFilters && (
          <>
            <div className="filters-content">
              <div className="filter-group">
                <label htmlFor="status">Status</label>
                <select 
                  id="status" 
                  name="status" 
                  value={filters.status || 'all'} 
                  onChange={handleInputChange}
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label htmlFor="plan">Membership Plan</label>
                <select 
                  id="plan" 
                  name="plan" 
                  value={filters.plan || 'all'} 
                  onChange={handleInputChange}
                >
                  <option value="all">All Plans</option>
                  <option value="community">Community</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label htmlFor="dateFrom">From Date</label>
                <input 
                  type="date" 
                  id="dateFrom"
                  name="dateFrom" 
                  value={filters.dateFrom || ''} 
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="filter-group">
                <label htmlFor="dateTo">To Date</label>
                <input 
                  type="date" 
                  id="dateTo"
                  name="dateTo" 
                  value={filters.dateTo || ''} 
                  onChange={handleInputChange}
                />
              </div>
            </div>
            
            <div className="filters-actions">
              <button className="btn-reset" onClick={clearFilters}>
                Reset Filters
              </button>
              <button 
                className="btn-apply" 
                onClick={handleSearchSubmit}
              >
                Apply Filters
              </button>
            </div>
            
            {hasActiveFilters() && (
              <div className="active-filters">
                {filters.status !== 'all' && (
                  <div className="filter-tag">
                    <span>Status: {filters.status}</span>
                    <button onClick={() => onFilterChange({ status: 'all' })}>
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                )}
                
                {filters.plan !== 'all' && (
                  <div className="filter-tag">
                    <span>Plan: {filters.plan}</span>
                    <button onClick={() => onFilterChange({ plan: 'all' })}>
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                )}
                
                {(filters.dateFrom || filters.dateTo) && (
                  <div className="filter-tag">
                    <span>
                      Date: {filters.dateFrom || 'Any'} - {filters.dateTo || 'Any'}
                    </span>
                    <button onClick={() => onFilterChange({ dateFrom: '', dateTo: '' })}>
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UserFilters;
