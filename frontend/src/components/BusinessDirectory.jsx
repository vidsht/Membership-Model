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
  const [sortBy, setSortBy] = useState('name');
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

  // Helper function to get plan priority for sorting
  const getPlanPriority = (business) => {
    const membershipType = (business.membershipLevel || business.membershipType || business.membership || '').toLowerCase();
    
    // Higher priority values appear first in sort
    if (membershipType.includes('platinum')) return 5;
    if (membershipType.includes('gold')) return 4;
    if (membershipType.includes('silver')) return 3;
    if (membershipType.includes('premium')) return 2;
    return 1; // basic/free
  };

  // Helper function to get plan badge info
  const getPlanBadge = (business) => {
    const membershipType = (business.membershipLevel || business.membershipType || business.membership || '').toLowerCase();
    
    if (membershipType.includes('platinum')) {
      return { label: 'Platinum', color: '#E5E7EB', textColor: '#374151' }; // Platinum silver-gray
    }
    if (membershipType.includes('gold')) {
      return { label: 'Gold', color: '#F59E0B', textColor: '#FFFFFF' }; // Gold
    }
    if (membershipType.includes('silver')) {
      return { label: 'Silver', color: '#6B7280', textColor: '#FFFFFF' }; // Silver gray
    }
    if (membershipType.includes('premium')) {
      return { label: 'Premium', color: '#8B5CF6', textColor: '#FFFFFF' }; // Purple
    }
    return { label: 'Basic', color: '#10B981', textColor: '#FFFFFF' }; // Green for basic/free
  };

  // Filter and sort businesses based on search, category, and sort option
  const filteredAndSortedBusinesses = businesses
    .filter(business => {
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
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          const nameA = (a.businessName || a.name || '').toLowerCase();
          const nameB = (b.businessName || b.name || '').toLowerCase();
          return nameA.localeCompare(nameB);
        
        case 'plan':
          const priorityA = getPlanPriority(a);
          const priorityB = getPlanPriority(b);
          if (priorityA !== priorityB) {
            return priorityB - priorityA; // Higher priority first
          }
          // If same priority, sort by name
          const fallbackNameA = (a.businessName || a.name || '').toLowerCase();
          const fallbackNameB = (b.businessName || b.name || '').toLowerCase();
          return fallbackNameA.localeCompare(fallbackNameB);
        
        case 'category':
          const categoryA = (a.businessCategory || a.category || a.sector || '').toLowerCase();
          const categoryB = (b.businessCategory || b.category || b.sector || '').toLowerCase();
          if (categoryA !== categoryB) {
            return categoryA.localeCompare(categoryB);
          }
          // If same category, sort by name
          const fallbackNameA2 = (a.businessName || a.name || '').toLowerCase();
          const fallbackNameB2 = (b.businessName || b.name || '').toLowerCase();
          return fallbackNameA2.localeCompare(fallbackNameB2);
        
        case 'recent':
          const dateA = new Date(a.created_at || a.joinedDate || 0);
          const dateB = new Date(b.created_at || b.joinedDate || 0);
          return dateB - dateA; // Most recent first
        
        default:
          return 0;
      }
    });

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedBusinesses.length / businessesPerPage);
  const startIndex = (currentPage - 1) * businessesPerPage;
  const endIndex = startIndex + businessesPerPage;
  const currentBusinesses = filteredAndSortedBusinesses.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, selectedCategory, sortBy]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Share business function - Universal approach with modal
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
    
    // Show share modal with multiple options
    showBusinessShareModal(businessName, shareText, businessUrl, business);
  };

  // Create share modal with multiple sharing options for businesses
  const showBusinessShareModal = (title, text, url, business) => {
    // Remove any existing modals
    const existingModal = document.getElementById('business-share-modal');
    if (existingModal) {
      document.body.removeChild(existingModal);
    }

    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'business-share-modal';
    modalOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      backdrop-filter: blur(4px);
    `;

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      position: relative;
    `;

    // WhatsApp share URL
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    
    // Telegram share URL  
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    
    // Twitter share URL
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    
    // Facebook share URL
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;

    modalContent.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="margin: 0; color: #333; font-size: 20px;">Share "${title}"</h3>
        <button id="close-business-share-modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
      </div>
      
      <div style="margin-bottom: 20px;">
        <p style="color: #666; margin: 0 0 15px 0;">Choose how you'd like to share this business:</p>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 20px;">
          <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #25d366; color: white; text-decoration: none; border-radius: 8px; transition: background 0.2s;">
            <i class="fab fa-whatsapp" style="font-size: 20px;"></i>
            <span>WhatsApp</span>
          </a>
          
          <a href="${telegramUrl}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #0088cc; color: white; text-decoration: none; border-radius: 8px; transition: background 0.2s;">
            <i class="fab fa-telegram" style="font-size: 20px;"></i>
            <span>Telegram</span>
          </a>
          
          <a href="${twitterUrl}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #1da1f2; color: white; text-decoration: none; border-radius: 8px; transition: background 0.2s;">
            <i class="fab fa-twitter" style="font-size: 20px;"></i>
            <span>Twitter</span>
          </a>
          
          <a href="${facebookUrl}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #1877f2; color: white; text-decoration: none; border-radius: 8px; transition: background 0.2s;">
            <i class="fab fa-facebook" style="font-size: 20px;"></i>
            <span>Facebook</span>
          </a>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 16px;">
          <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">Or copy the link and message:</p>
          <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 12px; font-family: monospace; font-size: 14px; white-space: pre-wrap; word-break: break-all; max-height: 120px; overflow-y: auto;">${text}</div>
          <button id="copy-business-share-text" style="width: 100%; margin-top: 12px; padding: 10px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; transition: background 0.2s;">
            <i class="fas fa-copy"></i> Copy Link & Message
          </button>
        </div>
      </div>
    `;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    // Add event listeners
    document.getElementById('close-business-share-modal').onclick = () => {
      document.body.removeChild(modalOverlay);
    };

    document.getElementById('copy-business-share-text').onclick = async () => {
      try {
        await navigator.clipboard.writeText(text);
        const btn = document.getElementById('copy-business-share-text');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        btn.style.background = '#17a2b8';
        setTimeout(() => {
          if (btn) {
            btn.innerHTML = originalText;
            btn.style.background = '#28a745';
          }
        }, 2000);
      } catch (error) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        const btn = document.getElementById('copy-business-share-text');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        btn.style.background = '#17a2b8';
        setTimeout(() => {
          if (btn) {
            btn.innerHTML = originalText;
            btn.style.background = '#28a745';
          }
        }, 2000);
      }
    };

    // Close modal when clicking outside
    modalOverlay.onclick = (e) => {
      if (e.target === modalOverlay) {
        document.body.removeChild(modalOverlay);
      }
    };

    // Close modal with Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('business-share-modal');
        if (modal) {
          document.body.removeChild(modal);
        }
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
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
              <span className="stat-number">{filteredAndSortedBusinesses.length}</span>
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
          
          {/* Active Filters Display - Similar to Deals Page */}
          {(selectedCategory || filter) && (
            <div className="active-filters-container">
              <div className="active-filters-tags">
                {selectedCategory && (
                  <div className="filter-tag">
                    <span>Category: {selectedCategory}</span>
                    <button aria-label="Clear category filter" onClick={() => setSelectedCategory('')}>
                      <i className="fas fa-times" aria-hidden="true"></i>
                    </button>
                  </div>
                )}
                {filter && (
                  <div className="filter-tag">
                    <span>Search: {filter}</span>
                    <button aria-label="Clear search filter" onClick={() => setFilter('')}>
                      <i className="fas fa-times" aria-hidden="true"></i>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Sort By Filter Dropdown */}
          <div className="sort-filter-bar">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="sort-filter-select"
            >
              <option value="name">Sort by Name</option>
              <option value="plan">Sort by Plan</option>
              <option value="category">Sort by Category</option>
              <option value="recent">Sort by Recent</option>
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
          {filteredAndSortedBusinesses.length === 0 ? (
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
                {/* Plan Badge */}
                {(() => {
                  const badge = getPlanBadge(business);
                  return (
                    <div 
                      className="plan-badge"
                      style={{
                        backgroundColor: badge.color,
                        color: badge.textColor
                      }}
                    >
                      {badge.label}
                    </div>
                  );
                })()}
                
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
  {filteredAndSortedBusinesses.length > businessesPerPage && (
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
            Showing {startIndex + 1}-{Math.min(endIndex, filteredAndSortedBusinesses.length)} of {filteredAndSortedBusinesses.length} businesses
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
