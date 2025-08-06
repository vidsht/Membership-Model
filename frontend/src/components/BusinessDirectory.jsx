import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './BusinessDirectory.css';

const BusinessDirectory = () => {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // Get unique categories from businesses (match Home page logic)
  const categories = businesses.length > 0
    ? [...new Set(businesses.map(business => business.category || business.sector || business.businessCategory).filter(Boolean))]
    : [];

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        setLoading(true);
        // Use the same logic as Home.jsx
        const response = await api.get('/businesses');
        // Home.jsx uses setBusinesses(response.data)
        setBusinesses(Array.isArray(response.data) ? response.data : (response.data.businesses || []));
        setError(null);
      } catch (err) {
        console.error('Error fetching businesses:', err);
        setError('Failed to load businesses. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchBusinesses();
  }, []);

  // Filter businesses based on search and category (match Home page fields)
  const filteredBusinesses = businesses.filter(business => {
    const name = business.businessName || business.name || '';
    const desc = business.businessDescription || business.description || '';
    const address = business.businessAddress || business.address || '';
    const category = business.businessCategory || business.category || business.sector || '';
    const matchesSearch = filter === '' || 
      name.toLowerCase().includes(filter.toLowerCase()) ||
      desc.toLowerCase().includes(filter.toLowerCase()) ||
      address.toLowerCase().includes(filter.toLowerCase());
    const matchesCategory = selectedCategory === '' || category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="business-directory-container">
      {/* Hero Section */}
      <div className="directory-hero">
        <div className="directory-hero-content">
          <h1>Business Directory</h1>
          <p>Discover Indian businesses in Ghana. Connect with our community partners and find the services you need.</p>
          <div className="directory-stats">
            <div className="stat">
              <span className="stat-number">{filteredBusinesses.length}</span>
              <span className="stat-label">Listed Businesses</span>
            </div>
            <div className="stat">
              <span className="stat-number">{categories.length}</span>
              <span className="stat-label">Categories</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="directory-filters-container">
        <div className="directory-filters">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search businesses..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <i className="fas fa-search"></i>
          </div>

          <div className="category-filter">
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading businesses...</p>
        </div>
      ) : error ? (
        <div className="error-message">
          <i className="fas fa-exclamation-circle"></i>
          <p>{error}</p>
        </div>
      ) : (
        <div className="businesses-grid">
          {filteredBusinesses.length === 0 ? (
            <div className="no-results">
              <i className="fas fa-search"></i>
              <p>No businesses found matching your criteria.</p>
            </div>
          ) : (
            filteredBusinesses.map((business, idx) => {
              const name = business.businessName || business.name || '';
              const desc = business.businessDescription || business.description || '';
              const category = business.businessCategory || business.category || business.sector || 'General';
              const address = business.businessAddress || business.address || '';
              const phone = business.businessPhone || business.phone || '';
              const email = business.businessEmail || business.email || '';
              const logo = business.logo;
              const website = business.website;
              const id = business.businessId || business.id || idx;
              // Show badge for all for now (or use business.isVerified if available)
              return (
                <div key={id} className="business-card">
                  <div className="business-logo">
                    {logo ? (
                      <img src={logo} alt={`${name} logo`} />
                    ) : (
                      <div className="logo-placeholder">
                        <span>{name.charAt(0) || "B"}</span>
                      </div>
                    )}
                    <div className="business-badge" title="Verified Partner">
                      <i className="fas fa-certificate"></i>
                    </div>
                  </div>
                  <div className="business-info">
                    <h3>{name}</h3>
                    <p className="business-category"><i className="fas fa-briefcase"></i> {category}</p>
                    <p className="business-description">{desc || "No description available."}</p>
                    <div className="business-contact">
                      {phone && (
                        <a href={`tel:${phone}`} className="contact-item" title="Call">
                          <i className="fas fa-phone"></i>
                        </a>
                      )}
                      {email && (
                        <a href={`mailto:${email}`} className="contact-item" title="Email">
                          <i className="fas fa-envelope"></i>
                        </a>
                      )}
                      {address && (
                        <div className="contact-item" title="Address">
                          <i className="fas fa-map-marker-alt"></i>
                        </div>
                      )}
                    </div>
                    <div className="business-actions">
                      {website && (
                        <a href={website} target="_blank" rel="noopener noreferrer" className="website-link">
                          <i className="fas fa-globe"></i> Visit Website
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default BusinessDirectory;
