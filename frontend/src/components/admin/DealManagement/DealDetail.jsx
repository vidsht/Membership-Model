import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useNotification } from '../../../contexts/NotificationContext';
import api, { merchantApi } from '../../../services/api';
import Modal from '../../shared/Modal';
import { useModal } from '../../../hooks/useModal';
import './DealDetail.css';

const DealDetail = () => {  
  const { dealId } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { modal, showDeleteConfirm, hideModal } = useModal();
  
  const navigateToDealsTab = () => {
    // Navigate to admin dashboard with deals tab active
    navigate('/admin', { state: { activeTab: 'deals' } });
  };
  
  const [deal, setDeal] = useState(null);
  const [business, setBusiness] = useState(null);
  const [redemptions, setRedemptions] = useState([]);
  const [redemptionStats, setRedemptionStats] = useState({
    total: 0,
    thisMonth: 0,
    thisWeek: 0,
    today: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');

  // Enhanced tab list with business info
  const tabList = [
    { key: 'details', label: 'Deal Details', icon: 'fas fa-info-circle' },
    { key: 'business', label: 'Business Info', icon: 'fas fa-building' },
    { key: 'redemptions', label: 'Redemptions', icon: 'fas fa-ticket-alt' },
    { key: 'analytics', label: 'Analytics', icon: 'fas fa-chart-line' },
  ];
  
  useEffect(() => {
    fetchDealData();
  }, [dealId]);

  const fetchDealData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch deal details
      const dealResponse = await api.get(`/admin/deals/${dealId}`);
      const dealData = dealResponse.data.deal;
      setDeal(dealData);

      // Fetch business details
      // Use business info from dealData (already joined in backend)
      setBusiness({
        businessId: dealData.businessId,
        businessName: dealData.businessName,
        businessCategory: dealData.businessCategory,
        // Add more fields as needed from dealData
      });

      // Fetch redemptions with detailed stats
      try {
        const redemptionsResponse = await api.get(`/admin/deals/${dealId}/redemptions`);
        const redemptionsData = redemptionsResponse.data.redemptions || [];
        setRedemptions(redemptionsData);
        
        // Calculate redemption statistics
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const stats = {
          total: redemptionsData.length,
          today: redemptionsData.filter(r => new Date(r.redeemedAt) >= today).length,
          thisWeek: redemptionsData.filter(r => new Date(r.redeemedAt) >= thisWeek).length,
          thisMonth: redemptionsData.filter(r => new Date(r.redeemedAt) >= thisMonth).length
        };
        
        setRedemptionStats(stats);
      } catch (redemptionError) {
        console.error('Error fetching redemptions:', redemptionError);
        setRedemptions([]);
      }
      
    } catch (error) {
      console.error('Error fetching deal details:', error);
      showNotification('Could not load deal details', 'error');
      navigateToDealsTab();
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleStatusChange = async (newStatus) => {
    try {
      await api.patch(`/admin/deals/${dealId}/status`, { status: newStatus });
      setDeal({ ...deal, status: newStatus });
      showNotification(`Deal ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`, 'success');
    } catch (error) {
      console.error('Error updating deal status:', error);
      showNotification('Failed to update deal status', 'error');
    }
  };
    const handleDeleteDeal = async () => {
    const confirmed = await showDeleteConfirm(deal?.title || 'this deal', async () => {
      try {
        await api.delete(`/admin/deals/${dealId}`);
        showNotification('Deal deleted successfully', 'success');
        navigateToDealsTab();
      } catch (error) {
        console.error('Error deleting deal:', error);
        showNotification('Failed to delete deal', 'error');
      }
    }, {
      title: 'Delete Deal',
      message: 'Are you sure you want to delete this deal? This action cannot be undone.',
      confirmText: 'Delete Deal'
    });
  };

  const markRedemptionAsUsed = async (redemptionId) => {
    try {
      await api.patch(`/admin/redemptions/${redemptionId}/status`, { status: 'used' });
      // Refresh redemptions
      await fetchDealData();
      showNotification('Redemption marked as used', 'success');
    } catch (error) {
      console.error('Error updating redemption status:', error);
      showNotification('Error updating redemption status', 'error');
    }
  };
  
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading deal details...</p>
      </div>
    );
  }
  
  if (!deal) {
    return (
      <div className="not-found">
        <i className="fas fa-exclamation-triangle"></i>
        <h2>Deal Not Found</h2>
        <p>The requested deal could not be found or may have been deleted.</p>
        <button onClick={() => navigateToDealsTab()} className="btn-primary">
          Back to Deals
        </button>
      </div>
    );
  }
  
  const isExpired = new Date(deal.validUntil) < new Date();
  
  return (
    <div className="admin-deal-detail">
      <div className="page-header">
        <div className="page-title">
          <h1>{deal.title}</h1>
          <span className={`status-badge ${deal.status}`}>
            {isExpired && deal.status === 'active' ? 'Expired' : deal.status}
          </span>
        </div>
        <div className="page-actions">
          <button 
            className="btn-secondary" 
            onClick={() => navigateToDealsTab()}
          >
            <i className="fas fa-arrow-left"></i> Back to Deals
          </button>
          <button 
            className="btn-primary" 
            onClick={() => navigate(`/admin/deals/${dealId}/edit`)}
          >
            <i className="fas fa-edit"></i> Edit Deal
          </button>
        </div>
      </div>

      <div className="deal-content">
        {tabList && tabList.length > 0 ? (
          <div className="deal-tabs" role="tablist" aria-label="Deal Detail Tabs">
            {tabList.map(tab => (
              <button
                key={tab.key}
                className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
                role="tab"
                aria-selected={activeTab === tab.key}
                aria-controls={`tab-panel-${tab.key}`}
                id={`tab-${tab.key}`}
                tabIndex={activeTab === tab.key ? 0 : -1}
              >
                <i className={tab.icon}></i> {tab.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="tab-content">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="deal-details" id="tab-panel-details" role="tabpanel" aria-labelledby="tab-details">
              <div className="detail-grid">
                <div className="detail-section">
                  <div className="deal-image">
                    {deal.imageUrl ? (
                      <img src={deal.imageUrl} alt={deal.title} />
                    ) : (
                      <div className="no-image">
                        <i className="fas fa-tag"></i>
                        <span>No image available</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="deal-info-card">
                    <h3>Deal Information</h3>
                      <div className="info-row">
                      <span className="info-label">Business</span>
                      <span className="info-value">
                        {deal.businessName}
                        {deal.businessStatus && (
                          <span className={`business-status ${deal.businessStatus}`}>
                            ({deal.businessStatus})
                          </span>
                        )}
                      </span>
                    </div>
                    
                    <div className="info-row">
                      <span className="info-label">Business Owner</span>
                      <span className="info-value">{deal.businessOwner || 'N/A'}</span>
                    </div>
                    
                    <div className="info-row">
                      <span className="info-label">Category</span>
                      <span className="info-value">
                        {deal.category}
                        {deal.businessCategory && deal.businessCategory !== deal.category && (
                          <span className="business-category"> (Business: {deal.businessCategory})</span>
                        )}
                      </span>
                    </div>
                    
                    <div className="info-row">
                      <span className="info-label">Discount</span>
                      <span className="info-value">
                        {deal.discountType === 'percentage' && `${deal.discount}% off`}
                        {deal.discountType === 'fixed' && `GHS ${deal.discount} off`}
                        {deal.discountType === 'buyOneGetOne' && 'Buy One Get One Free'}
                        {deal.discountType === 'freeItem' && 'Free Item'}
                        {deal.originalPrice && (
                          <div className="price-breakdown">
                            <span className="original-price">Original: GHS {deal.originalPrice}</span>
                            {deal.discountedPrice && (
                              <span className="discounted-price">Discounted: GHS {deal.discountedPrice}</span>
                            )}
                          </div>
                        )}
                      </span>
                    </div>
                    
                    <div className="info-row">
                      <span className="info-label">Valid Period</span>
                      <span className="info-value">
                        {deal.validFrom && deal.validUntil ? (
                          `${new Date(deal.validFrom).toLocaleDateString()} to ${new Date(deal.validUntil).toLocaleDateString()}`
                        ) : deal.validUntil ? (
                          `Until ${new Date(deal.validUntil).toLocaleDateString()}`
                        ) : (
                          'No expiry date set'
                        )}
                      </span>
                    </div>
                    
                    <div className="info-row">
                      <span className="info-label">Membership Access</span>
                      <span className="info-value access-level">
                        {deal.accessLevel === 'basic' && 'Community (Basic)'}
                        {deal.accessLevel === 'intermediate' && 'Silver (Intermediate)'}
                        {deal.accessLevel === 'full' && 'Gold (Full)'}
                        {deal.accessLevel === 'all' && 'All Members'}
                        {deal.minPlanPriority && (
                          <span className="plan-priority"> (Min Priority: {deal.minPlanPriority})</span>
                        )}
                      </span>
                    </div>
                    
                    {deal.couponCode && (
                      <div className="info-row">
                        <span className="info-label">Coupon Code</span>
                        <span className="info-value coupon-code">{deal.couponCode}</span>
                      </div>
                    )}
                    
                    {deal.maxRedemptions > 0 && (
                      <div className="info-row">
                        <span className="info-label">Max Redemptions</span>
                        <span className="info-value">
                          {deal.redemptionCount || 0} / {deal.maxRedemptions}
                        </span>
                      </div>
                    )}
                    
                    <div className="info-row">
                      <span className="info-label">Created On</span>
                      <span className="info-value">
                        {new Date(deal.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="detail-section">
                  <div className="detail-card">
                    <h3>Description</h3>
                    <p>{deal.description}</p>
                  </div>
                  
                  {deal.termsConditions && (
                    <div className="detail-card">
                      <h3>Terms & Conditions</h3>
                      <p>{deal.termsConditions}</p>
                    </div>
                  )}
                  
                  <div className="detail-card actions-card">
                    <h3>Deal Actions</h3>
                    
                    <div className="action-buttons">
                      {deal.status === 'active' ? (
                        <button 
                          className="btn-action warning"
                          onClick={() => handleStatusChange('inactive')}
                        >
                          <i className="fas fa-pause-circle"></i>
                          Deactivate Deal
                        </button>
                      ) : (
                        <button 
                          className="btn-action success"
                          onClick={() => handleStatusChange('active')}
                          disabled={isExpired}
                        >
                          <i className="fas fa-play-circle"></i>
                          Activate Deal
                        </button>
                      )}
                      
                      <button 
                        className="btn-action danger"
                        onClick={handleDeleteDeal}
                      >
                        <i className="fas fa-trash-alt"></i>
                        Delete Deal
                      </button>
                    </div>
                    
                    {isExpired && deal.status === 'inactive' && (
                      <div className="expired-note">
                        <i className="fas fa-exclamation-circle"></i>
                        <span>This deal has expired and cannot be reactivated</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
            {/* Redemptions Tab */}
          {activeTab === 'redemptions' && (
            <div className="deal-redemptions" id="tab-panel-redemptions" role="tabpanel" aria-labelledby="tab-redemptions">
              {/* Redemption Statistics */}
              <div className="redemption-stats">
                <h4><i className="fas fa-chart-line"></i> Redemption Statistics</h4>
                <div className="stats-cards">
                  <div className="stat-card total">
                    <div className="stat-icon">
                      <i className="fas fa-ticket-alt"></i>
                    </div>
                    <div className="stat-content">
                      <span className="stat-number">{redemptionStats.total}</span>
                      <span className="stat-label">Total Redemptions</span>
                    </div>
                  </div>
                  <div className="stat-card today">
                    <div className="stat-icon">
                      <i className="fas fa-calendar-day"></i>
                    </div>
                    <div className="stat-content">
                      <span className="stat-number">{redemptionStats.today}</span>
                      <span className="stat-label">Today</span>
                    </div>
                  </div>
                  <div className="stat-card week">
                    <div className="stat-icon">
                      <i className="fas fa-calendar-week"></i>
                    </div>
                    <div className="stat-content">
                      <span className="stat-number">{redemptionStats.thisWeek}</span>
                      <span className="stat-label">This Week</span>
                    </div>
                  </div>
                  <div className="stat-card month">
                    <div className="stat-icon">
                      <i className="fas fa-calendar-alt"></i>
                    </div>
                    <div className="stat-content">
                      <span className="stat-number">{redemptionStats.thisMonth}</span>
                      <span className="stat-label">This Month</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Redemption Details */}
              {redemptions.length > 0 ? (
                <div className="redemptions-section">
                  <h4><i className="fas fa-list"></i> Redemption Details</h4>
                  <div className="redemptions-table-container">
                    <table className="redemptions-table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Redeemed On</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {redemptions.map(redemption => (
                          <tr key={redemption._id || redemption.id}>
                            <td>
                              <div className="user-info">
                                <div className="user-avatar">
                                  {redemption.userProfilePicture ? (
                                    <img src={redemption.userProfilePicture} alt={redemption.userName} />
                                  ) : (
                                    <i className="fas fa-user"></i>
                                  )}
                                </div>
                                <div className="user-details">
                                  <span className="user-name">{redemption.userName}</span>
                                  <span className="user-email">{redemption.userEmail}</span>
                                  {redemption.userPhone && (
                                    <span className="user-phone">{redemption.userPhone}</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="redemption-date">
                                <span className="date">{new Date(redemption.redeemedAt).toLocaleDateString()}</span>
                                <span className="time">{new Date(redemption.redeemedAt).toLocaleTimeString()}</span>
                              </div>
                            </td>
                            <td>
                              <span className={`status-badge ${redemption.status || 'redeemed'}`}>
                                {(redemption.status || 'redeemed').charAt(0).toUpperCase() + (redemption.status || 'redeemed').slice(1)}
                              </span>
                            </td>
                            <td>
                              <div className="redemption-actions">
                                <button 
                                  className="btn-sm btn-info"
                                  title="View User Details"
                                  onClick={() => navigate(`/admin/users/${redemption.userId}`)}
                                >
                                  <i className="fas fa-eye"></i>
                                </button>
                                {redemption.status === 'pending' && (
                                  <button 
                                    className="btn-sm btn-success"
                                    title="Mark as Used"
                                    onClick={() => markRedemptionAsUsed(redemption._id || redemption.id)}
                                  >
                                    <i className="fas fa-check"></i>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="no-redemptions">
                  <i className="fas fa-ticket-alt"></i>
                  <h3>No Redemptions Yet</h3>
                  <p>This deal hasn't been redeemed by any users yet.</p>
                </div>
              )}
            </div>
          )}
          
          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="deal-analytics" id="tab-panel-analytics" role="tabpanel" aria-labelledby="tab-analytics">
              <div className="analytics-cards">
                <div className="analytics-card">
                  <div className="analytics-icon">
                    <i className="fas fa-eye"></i>
                  </div>
                  <div className="analytics-details">
                    <h4>Views</h4>
                    <p className="analytics-value">{deal.viewCount || 0}</p>
                  </div>
                </div>
                
                <div className="analytics-card">
                  <div className="analytics-icon">
                    <i className="fas fa-ticket-alt"></i>
                  </div>
                  <div className="analytics-details">
                    <h4>Redemptions</h4>
                    <p className="analytics-value">{deal.redemptionCount || 0}</p>
                  </div>
                </div>
                
                <div className="analytics-card">
                  <div className="analytics-icon">
                    <i className="fas fa-chart-line"></i>
                  </div>
                  <div className="analytics-details">
                    <h4>Conversion Rate</h4>
                    <p className="analytics-value">
                      {deal.viewCount ? Math.round((deal.redemptionCount || 0) / deal.viewCount * 100) : 0}%
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="analytics-placeholder">
                <div className="placeholder-header">
                  <h3>Deal Performance</h3>
                  <div className="placeholder-actions">
                    <button className="btn-link">Last 7 Days</button>
                    <button className="btn-link active">Last 30 Days</button>
                    <button className="btn-link">All Time</button>
                  </div>
                </div>
                
                <div className="chart-placeholder">
                  <div className="chart-message">
                    <i className="fas fa-chart-bar fa-3x"></i>
                    <p>Analytics data visualization coming soon!</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Business Info Tab */}
          {activeTab === 'business' && (
            <div className="deal-business" id="tab-panel-business" role="tabpanel" aria-labelledby="tab-business">
              {business ? (
                <div className="business-info-container">
                  <div className="business-header">
                    <div className="business-image">
                      {business.logo ? (
                        <img src={business.logo} alt={business.businessName} />
                      ) : (
                        <div className="no-logo">
                          <i className="fas fa-building"></i>
                        </div>
                      )}
                    </div>                    <div className="business-title">
                      <h3>{business.businessName}</h3>
                      <p className="business-category">{business.businessCategory || business.category}</p>
                      <div className="business-status">
                        <span className={`status-badge ${business.status || business.businessStatus || 'active'}`}>
                          {(business.status || business.businessStatus || 'active').charAt(0).toUpperCase() + (business.status || business.businessStatus || 'active').slice(1)}
                        </span>
                        {business.isVerified && (
                          <span className="verified-badge">
                            <i className="fas fa-check-circle"></i> Verified
                          </span>
                        )}
                      </div>
                      <div className="business-id">
                        <small>Business ID: {business.businessId}</small>
                      </div>
                    </div>
                  </div>

                  <div className="business-details-grid">
                    <div className="business-section">
                      <h4><i className="fas fa-info-circle"></i> Business Information</h4>                      <div className="info-grid">
                        <div className="info-item">
                          <label>Owner:</label>
                          <span>{business.ownerName || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <label>Owner Email:</label>
                          <span>{business.ownerEmail || business.email || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <label>Business Email:</label>
                          <span>{business.businessEmail || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <label>Owner Phone:</label>
                          <span>{business.ownerPhone || business.phone || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <label>Business Phone:</label>
                          <span>{business.businessPhone || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <label>Website:</label>
                          <span>
                            {business.website ? (
                              <a href={business.website} target="_blank" rel="noopener noreferrer">
                                {business.website}
                              </a>
                            ) : 'N/A'}
                          </span>
                        </div>
                        <div className="info-item">
                          <label>Business License:</label>
                          <span>{business.businessLicense || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <label>Tax ID:</label>
                          <span>{business.taxId || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <label>Membership Level:</label>
                          <span className={`membership-level ${business.businessMembershipLevel || business.membershipLevel}`}>
                            {(business.businessMembershipLevel || business.membershipLevel || 'basic').toUpperCase()}
                          </span>
                        </div>
                        {business.verificationDate && (
                          <div className="info-item">
                            <label>Verified On:</label>
                            <span>{new Date(business.verificationDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        <div className="info-item">
                          <label>Joined:</label>
                          <span>{new Date(business.businessCreatedAt || business.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>                    <div className="business-section">
                      <h4><i className="fas fa-map-marker-alt"></i> Location</h4>
                      <div className="location-info">
                        <div className="business-address">
                          <strong>Business Address:</strong>
                          <p>{business.businessAddress || 'Address not provided'}</p>
                        </div>
                        {business.ownerAddress && business.ownerAddress !== business.businessAddress && (
                          <div className="owner-address">
                            <strong>Owner Address:</strong>
                            <p>{business.ownerAddress}</p>
                          </div>
                        )}
                        {(business.ownerCity || business.city) && (
                          <div className="location-details">
                            <p>
                              {business.ownerCity || business.city}
                              {(business.ownerState || business.state) && `, ${business.ownerState || business.state}`}
                              {(business.ownerCountry || business.country) && `, ${business.ownerCountry || business.country}`}
                            </p>
                          </div>
                        )}
                        {business.coordinates && (
                          <div className="coordinates">
                            <small>Coordinates: {business.coordinates.lat}, {business.coordinates.lng}</small>
                          </div>
                        )}
                      </div>
                    </div>

                    {business.businessDescription && (
                      <div className="business-section">
                        <h4><i className="fas fa-file-alt"></i> Business Description</h4>
                        <div className="business-description">
                          <p>{business.businessDescription}</p>
                        </div>
                      </div>
                    )}

                    <div className="business-section">
                      <h4><i className="fas fa-chart-bar"></i> Business Statistics</h4>
                      <div className="stats-grid">
                        <div className="stat-item">
                          <span className="stat-value">{business.totalDeals || 0}</span>
                          <span className="stat-label">Total Deals</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-value">{business.activeDeals || 0}</span>
                          <span className="stat-label">Active Deals</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-value">{business.totalRedemptions || 0}</span>
                          <span className="stat-label">Total Redemptions</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-value">{business.rating || 'N/A'}</span>
                          <span className="stat-label">Rating</span>
                        </div>
                      </div>
                    </div>

                    {business.description && (
                      <div className="business-section">
                        <h4><i className="fas fa-file-alt"></i> Description</h4>
                        <div className="business-description">
                          <p>{business.description}</p>
                        </div>
                      </div>
                    )}

                    <div className="business-section">
                      <h4><i className="fas fa-clock"></i> Business Hours</h4>
                      <div className="business-hours">
                        {business.hours ? (
                          Object.entries(business.hours).map(([day, hours]) => (
                            <div key={day} className="hours-item">
                              <span className="day">{day.charAt(0).toUpperCase() + day.slice(1)}:</span>
                              <span className="hours">{hours}</span>
                            </div>
                          ))
                        ) : (
                          <p>Business hours not specified</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="no-business-info">
                  <i className="fas fa-building"></i>
                  <p>Business information not available</p>
                </div>
              )}
            </div>
          )}        </div>
      </div>
      <Modal modal={modal} onClose={hideModal} />
    </div>
  );
};

export default DealDetail;
