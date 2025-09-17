import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useImageUrl, SmartImage, DefaultAvatar } from '../hooks/useImageUrl.jsx';
import api from '../services/api';
import { useDynamicFields } from '../hooks/useDynamicFields';
import './BusinessDirectory.css';


const BusinessDirectory = () => {
  const location = useLocation();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const businessesPerPage = 6;
  const { getMerchantLogoUrl } = useImageUrl();
  const { dynamicFields, isLoading: dynamicLoading } = useDynamicFields();

  // Ensure website URLs include protocol and won't be treated as internal navigation
  const sanitizeUrl = (u) => {
    if (!u) return '';
    return /^https?:\/\//i.test(u) ? u : `https://${u}`;
  };

  // Use dynamic business categories from hook
  const categories = dynamicFields.businessCategories && dynamicFields.businessCategories.length > 0
    ? dynamicFields.businessCategories.map(cat => cat.name || cat)
    : (businesses.length > 0
      ? [...new Set(businesses.map(business => business.category || business.sector || business.businessCategory).filter(Boolean))]
      : []);


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

  // Handle shared URLs - auto-open business modal if ID is in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const businessId = urlParams.get('id');
    
    if (businessId && businesses.length > 0) {
      const business = businesses.find(b => 
        (b.businessId && b.businessId.toString() === businessId) || 
        (b.id && b.id.toString() === businessId)
      );
      if (business) {
        setSelectedBusiness(business);
        setShowBusinessModal(true);
      }
    }
  }, [location.search, businesses]);


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

  // Pagination logic
  const totalPages = Math.ceil(filteredBusinesses.length / businessesPerPage);
  const startIndex = (currentPage - 1) * businessesPerPage;
  const endIndex = startIndex + businessesPerPage;
  const currentBusinesses = filteredBusinesses.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, selectedCategory]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Utility function to detect if device is mobile
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (navigator.maxTouchPoints && navigator.maxTouchPoints > 1) ||
           window.screen.width <= 768;
  };

  // Utility function to check if Web Share API can share text content properly
  const canShareRichContent = () => {
    if (!navigator.share) return false;
    
    // Web Share API is supported on mobile devices
    if (isMobileDevice()) return true;
    
    // On desktop, modern browsers also support navigator.share
    // Let's be less restrictive and try Web Share API on most modern browsers
    const isModernBrowser = navigator.share && typeof navigator.share === 'function';
    
    // Allow Web Share API on all browsers that support it, not just Safari
    return isModernBrowser;
  };

  // Share business function
  const handleShareBusiness = async (business) => {
    const businessUrl = `${window.location.origin}/business-directory?id=${business.businessId || business.id}`;
    const businessName = business.businessName || business.name;
    const businessCategory = business.businessCategory || business.category || business.sector;
    const businessAddress = business.businessAddress || business.address;
    const businessPhone = business.businessPhone || business.phone;
    
    const shareText = `🏪 Check out *${businessName}*${businessCategory ? ` - ${businessCategory}` : ''} in the Indians in Ghana Business Directory!

📍 ${businessAddress || 'Location available on website'}
${businessPhone ? `📞 ${businessPhone}` : ''}

Click to view full details: ${businessUrl}

Discover quality services and support our community businesses! 🇮🇳🇬🇭`;
    
    // Use Web Share API only if it can reliably share rich content
    if (canShareRichContent()) {
      try {
        const shareData = {
          title: `${businessName} - Indians in Ghana Business Directory`,
          text: shareText,
          url: businessUrl
        };
        
        await navigator.share(shareData);
        return;
      } catch (error) {
        console.log('Error sharing via Web Share API:', error);
        // Fall through to clipboard method
      }
    }
    
    // Fallback: Always copy the full formatted text with URL
    copyBusinessToClipboard(shareText, businessName);
  };

  // Copy business link to clipboard
  const copyBusinessToClipboard = async (text, businessName) => {
    try {
      await navigator.clipboard.writeText(text);
      // Show visual feedback to user
      alert(`📋 Business information copied to clipboard!\n\nYou can now paste this in any messaging app to share "${businessName}" with the full details and link.`);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert(`📋 Business information copied to clipboard!\n\nYou can now paste this in any messaging app to share "${businessName}" with the full details and link.`);
    }
  };


  return (
    <div className="business-directory-container">
      {/* Hero Section */}
      <div className="directory-hero">
        <div className="directory-hero-content">
          <h1>Business Directory</h1>
          <p>Discover Indian businesses in Ghana. Connect with our community partners and find the services you need.</p>
          {/* <div className="directory-stats">
            <div className="stat">
              <span className="stat-number">{filteredBusinesses.length}</span>
              <span className="stat-label">Listed Businesses</span>
            </div>
            <div className="stat">
              <span className="stat-number">{categories.length}</span>
              <span className="stat-label">Categories</span>
            </div>
          </div> */}
        </div>
      </div>


      {/* Filters Section */}
      <div className="directory-filters-container">
        <div className="directory-filters">
          <i className="fas fa-search"></i>
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search businesses..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          {/* Business Category Filter Dropdown */}
          <div className="category-filter-bar">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="category-filter-select"
            >
              <option value="">All Categories</option>
              {categories.map((cat, idx) => (
                <option key={cat + idx} value={cat}>{cat}</option>
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
            currentBusinesses.map((business, idx) => {
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
              <div key={id} className="business-card-directory" onClick={() => { setSelectedBusiness(business); setShowBusinessModal(true); }} style={{cursor: 'pointer'}}>
                <div className="business-card-header">
                  <div className="business-logo-container">
                    <SmartImage
                      src={getMerchantLogoUrl(business)}
                      alt={`${name} Logo`}
                      placeholder={
                        <div className="image-fallback" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgb(243, 244, 246)', color: '#D4BA90', fontSize: '14px', borderRadius: '8px', width: '57px', height: '100%'}}>
                          <div className="logo-placeholder"><span>{name.charAt(0) || 'P'}</span></div>
                        </div>
                      }
                      className="logo-image"
                      maxRetries={3}
                      // style={{
                      //   width: '100%',
                      //   height: '100%',
                      //   objectFit: 'cover',
                      //   objectPosition: 'center'
                      // }}
                    />
                  </div>
                  <div className="business-info">
                    <h3 className="business-title">{name}</h3>
                    <p className="business-category">
                      <i className="fas fa-briefcase"></i> {category}
                    </p>
                  </div>
                </div>
                
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
                    (() => {
                      const websiteUrl = sanitizeUrl(website);
                      return websiteUrl ? (
                        <a
                          href={websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="business-website"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <i className="fas fa-globe"></i> Visit Website
                        </a>
                      ) : null;
                    })()
                  )}
                  <button 
                    className="business-share-btn"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent opening the modal
                      handleShareBusiness(business);
                    }}
                    title="Share this business"
                  >
                    <i className="fas fa-share-alt"></i> Share
                  </button>
                </div>
              </div>
              );
            })
          )}
        </div>
      )}

      {/* Pagination Controls */}
      {filteredBusinesses.length > businessesPerPage && (
        <div className="pagination-container">
          <div className="pagination">
            <button 
              className={`pagination-btn ${currentPage === 1 ? 'disabled' : ''}`}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              ‹ Prev
            </button>
            
            {Array.from({ length: totalPages }, (_, index) => index + 1).map(page => (
              <button
                key={page}
                className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            ))}
            
            <button 
              className={`pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next ›
            </button>
          </div>
          <div className="pagination-info">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredBusinesses.length)} of {filteredBusinesses.length} businesses
          </div>
        </div>
      )}

      {/* Business Detail Modal Overlay */}
      {showBusinessModal && selectedBusiness && (
        <div className="modal-overlay business-modal-overlay">
          <div className="modal-content business-detail-modal">
            <div className="modal-header-compact">
              <h3 className="modal-title">{selectedBusiness.businessName || selectedBusiness.name}</h3>
              <button className="close-btn" onClick={() => setShowBusinessModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body-compact">
              <div className="modal-content-grid">
                {/* Left Section: Logo, Name, Category, Description */}
                <div className="modal-left-section">
                  <div className="modal-section">
                    <div className="business-logo-modal">
                      <SmartImage
                        src={getMerchantLogoUrl(selectedBusiness)}
                        alt={`${selectedBusiness.businessName || selectedBusiness.name} Logo`}
                        className="logo-image"
                        maxRetries={3}
                      />
                    </div>
                    <h4>{selectedBusiness.businessName || selectedBusiness.name}</h4>
                    <p className="business-category-modal">
                      <i className="fas fa-briefcase"></i> {selectedBusiness.businessCategory || selectedBusiness.category || selectedBusiness.sector || 'General'}
                    </p>
                  </div>
                  <div className="modal-section">
                    <h4>Description</h4>
                    <p className="business-description-modal">{selectedBusiness.businessDescription || selectedBusiness.description || 'No description available.'}</p>
                  </div>
                </div>
                {/* Right Section: Contact, Address, Website */}
                <div className="modal-right-section">
                  <div className="modal-section">
                    <h4>Contact Information</h4>
                    <div className="business-contact-modal">
                      {selectedBusiness.businessPhone || selectedBusiness.phone ? (
                        <div className="contact-item-modal">
                          <i className="fas fa-phone"></i> {selectedBusiness.businessPhone || selectedBusiness.phone}
                        </div>
                      ) : null}
                      {selectedBusiness.businessEmail || selectedBusiness.email ? (
                        <div className="contact-item-modal">
                          <i className="fas fa-envelope"></i> {selectedBusiness.businessEmail || selectedBusiness.email}
                        </div>
                      ) : null}
                      {selectedBusiness.businessAddress || selectedBusiness.address ? (
                        <div className="contact-item-modal">
                          <i className="fas fa-map-marker-alt"></i> {selectedBusiness.businessAddress || selectedBusiness.address}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {selectedBusiness.website && (
                    <div className="modal-section">
                      <h4>Website</h4>
                      {(() => {
                        const websiteUrlModal = sanitizeUrl(selectedBusiness.website);
                        return websiteUrlModal ? (
                          <a
                            href={websiteUrlModal}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="business-website-modal"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <i className="fas fa-globe"></i> {websiteUrlModal}
                          </a>
                        ) : null;
                      })()}
                      
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessDirectory;
