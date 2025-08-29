import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAllDeals, redeemDeal, getAllPlans } from '../services/api';
import DealFilters from '../components/deals/DealFilters';
import PlanExpiryBanner from '../components/PlanExpiryBanner';
import usePlanAccess from '../hooks/usePlanAccess.jsx';
import '../styles/deals.css';
import { useImageUrl, SmartImage } from '../hooks/useImageUrl.jsx';

/**
 * Determines if a user can redeem a deal based on plan priority.
 * Higher priority numbers = higher tier plans (1=Silver, 2=Gold, 3=Platinum)
 * Users with higher tier plans (higher priority numbers) can access deals for lower tier plans.
 * @param {Object} user - The user object
 * @param {number} dealRequiredPlanPriority - The deal's minimum plan priority requirement
 * @param {Array} plans - Available plans array
 * @returns {boolean}
 */
function canRedeem(user, dealRequiredPlanPriority, plans) {
  if (!user || !plans || plans.length === 0) return false;
  if (dealRequiredPlanPriority === null || dealRequiredPlanPriority === undefined) return true;
  
  // Find the user's current plan with fuzzy matching to handle cases like "platinum_plus" → "platinum"
  const userPlan = plans.find(plan => {
    // Use membershipType (dynamic plan) instead of membership (enum field)
    const userMembershipType = user.membershipType || user.membership;
    if (!userMembershipType) return false;
    
    // Exact key match
    if (plan.key === userMembershipType) return true;
    
    // Exact name match (case insensitive)
    if (plan.name.toLowerCase() === userMembershipType.toLowerCase()) return true;
    
    // Fuzzy matching: check if user membership contains plan key or vice versa
    const userMembershipLower = userMembershipType.toLowerCase();
    const planKeyLower = plan.key.toLowerCase();
    const planNameLower = plan.name.toLowerCase();
    
    // Check if user membership starts with plan key (e.g., "platinum_plus" starts with "platinum")
    if (userMembershipLower.startsWith(planKeyLower)) return true;
    
    // Check if user membership contains plan name
    if (userMembershipLower.includes(planNameLower)) return true;
    
    return false;
  });
  
  if (!userPlan) {
    return false;
  }
  
  // User can redeem if their plan priority is >= deal's required priority (higher number = higher tier)
  return userPlan.priority >= dealRequiredPlanPriority;
}

/**
 * Get plan name by priority for display purposes
 * @param {number} priority - Plan priority
 * @param {Array} plans - Available plans array
 * @returns {string}
 */
function getPlanNameByPriority(priority, plans) {
  const plan = plans.find(p => p.priority === priority);
  return plan ? plan.name : 'Unknown Plan';
}

const Deals = () => {
  const { user } = useAuth();
  const planAccess = usePlanAccess();
  const { getDealBannerUrl, getMerchantLogoUrl } = useImageUrl();
  const [deals, setDeals] = useState([]);
  const [plans, setPlans] = useState([]);
  const [filteredDeals, setFilteredDeals] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    search: ''
  });
  const [loading, setLoading] = useState(true);
  const [redeemStatus, setRedeemStatus] = useState({});

  // Redemption confirmation modal state
  const [showRedemptionModal, setShowRedemptionModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [isRedeeming, setIsRedeeming] = useState(false);

  // Deal detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchDeals();
    fetchPlans();
  }, []);
  const fetchPlans = async () => {
    try {
      const plansResponse = await getAllPlans('user', true);
      setPlans(Array.isArray(plansResponse) ? plansResponse : plansResponse.plans || []);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      setPlans([]);
    }
  };useEffect(() => {
    let result = deals;
    
    // Filter out expired deals first
    result = result.filter(deal => {
      const expirationDate = deal.expirationDate || deal.validUntil || deal.expiration_date;
      if (expirationDate) {
        return new Date(expirationDate) >= new Date();
      }
      return true; // Include deals without expiration dates
    });
    
    // Status filter
    if (filters.status !== 'all') {
      result = result.filter(deal => {
        const expirationDate = deal.expirationDate || deal.validUntil || deal.expiration_date;
        if (filters.status === 'active') {
          return expirationDate ? new Date(expirationDate) > new Date() : true;
        }
        if (filters.status === 'expired') {
          return expirationDate ? new Date(expirationDate) < new Date() : false;
        }
        if (filters.status === 'upcoming') {
          const startDate = deal.validFrom || deal.start_date;
          return startDate && new Date(startDate) > new Date();
        }
        return true;
      });
    }
    
    // Category filter (case-insensitive, supports string or array categories)
    if (filters.category && filters.category !== 'all') {
      const selected = String(filters.category).toLowerCase();
      result = result.filter(deal => {
        if (!deal || !deal.category) return false;
        // If category stored as array
        if (Array.isArray(deal.category)) {
          return deal.category.map(c => String(c).toLowerCase()).includes(selected);
        }
        // String comparison
        return String(deal.category).toLowerCase() === selected;
      });
    }
    
    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(deal =>
        (deal.title && deal.title.toLowerCase().includes(search)) ||
        (deal.businessName && deal.businessName.toLowerCase().includes(search)) ||
        (deal.category && deal.category.toLowerCase().includes(search))
      );
    }
    
    setFilteredDeals(result);
  }, [filters, deals, plans]);

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const data = await getAllDeals();
      console.log('🔍 Deals data received:', data.map(deal => ({
        id: deal.id,
        businessName: deal.businessName,
        businessLogo: deal.businessLogo
      })));
      setDeals(data);
    } catch (error) {
      setDeals([]);
    } finally {
      setLoading(false);
    }
  };  const handleRedeem = async (dealId, minPlanPriority) => {
    if (!user) {
      setRedeemStatus({ ...redeemStatus, [dealId]: 'Please log in to redeem.' });
      return;
    }

    // Check if plan is expired
    if (!planAccess.canAccess('redeem')) {
      setRedeemStatus({ 
        ...redeemStatus, 
        [dealId]: planAccess.getBlockingMessage('redeem')
      });
      return;
    }

    if (!canRedeem(user, minPlanPriority, plans)) {
      setRedeemStatus({ ...redeemStatus, [dealId]: 'This deal is not available for your membership plan.' });
      return;
    }
    
    // Find the deal and show confirmation modal
    const deal = filteredDeals.find(d => d.id === dealId);
    if (deal) {
      setSelectedDeal(deal);
      setShowRedemptionModal(true);
    }
  };

  const confirmRedemption = async () => {
    if (!selectedDeal) return;
    
    setIsRedeeming(true);
    try {
      const response = await redeemDeal(selectedDeal.id);
      
      // Handle the new pending approval flow
      if (response.data?.isPending || response.data?.requiresApproval) {
        setRedeemStatus({ 
          ...redeemStatus, 
          [selectedDeal.id]: '🎉 Request submitted! Merchant will review and contact you.' 
        });
      } else {
        setRedeemStatus({ ...redeemStatus, [selectedDeal.id]: 'Redeemed!' });
      }
      
      setShowRedemptionModal(false);
      setSelectedDeal(null);
    } catch (error) {
      console.error('Redemption error:', error);
      let errorMessage = 'Failed to redeem. Try again.';
      
      // Handle specific error responses from backend
      if (error.response?.status === 403 && error.response?.data?.upgradeRequired) {
        const data = error.response.data;
        
        if (data.suggestedPlan) {
          const plan = data.suggestedPlan;
          if (plan.price && plan.currency) {
            errorMessage = `🔒 ${data.message || `Upgrade to ${plan.name} plan (${plan.currency} ${plan.price}) to redeem this deal!`}`;
          } else {
            errorMessage = `🔒 ${data.message || `Upgrade to ${plan.name} plan to redeem this deal!`}`;
          }
        } else if (data.availablePlans && data.availablePlans.length > 0) {
          const planNames = data.availablePlans.slice(0, 2).map(p => p.name).join(' or ');
          errorMessage = `🔒 Upgrade to ${planNames} to access this deal!`;
        } else {
          errorMessage = `🔒 ${data.message || 'Upgrade your plan to access this deal!'}`;
        }
      } else if (error.response?.data?.isPending) {
        errorMessage = '⏳ You already have a pending request for this deal.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data.message || 'You have already redeemed this deal.';
      }
      
      setRedeemStatus({ ...redeemStatus, [selectedDeal.id]: errorMessage });
      setShowRedemptionModal(false);
      setSelectedDeal(null);
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className="deals-page">
      {/* Hero Section */}
      <div className="deals-hero">
        <div className="deals-hero-content">
          <h1>Exclusive Member Deals</h1>
          <p>Discover amazing discounts and offers exclusively available to our community members</p>
          {/* <div className="deals-stats">
            <div className="stat">
              <span className="stat-number">{filteredDeals.length}</span>
              <span className="stat-label">Active Deals</span>
            </div>
            <div className="stat">
              <span className="stat-number">{user ? user.membership || 'Guest' : 'Guest'}</span>
              <span className="stat-label">Your Tier</span>
            </div>
          </div> */}
        </div>
      </div>

      {/* Plan Expiry Banner */}
      <div className="deals-content">
        <PlanExpiryBanner />
      </div>

      {/* Filters Section */}
      <div className="deals-filters-container">
        <DealFilters
          filters={filters}
          plans={plans}
          onFilterChange={update => setFilters(prev => ({ ...prev, ...update }))}
          onSearch={search => setFilters(prev => ({ ...prev, search }))}
        />
      </div>
      {loading ? (
        <div className="loading">Loading deals...</div>
      ) : filteredDeals.length === 0 ? (
        <div className="no-deals">No deals available.</div>
      ) : (
        <div className="deals-grid">
          {filteredDeals.map(deal => {
            const shortDescription = deal.description?.length > 100 
              ? `${deal.description.substring(0, 100)}...` 
              : deal.description;
            
            return (
            <div className="deal-card" key={deal.id}>
              {/* Deal Banner with Category Overlay */}
              <div className="deal-banner">
                <div className="deal-category-overlay">
                  <i className="fas fa-tag"></i>
                  {deal.category || 'General'}
                </div>
                {getDealBannerUrl(deal) ? (
                  <SmartImage 
                    src={getDealBannerUrl(deal)} 
                    alt={deal.title} 
                    className="deal-banner-image" 
                    fallbackClass="deal-banner-placeholder" 
                  />
                ) : (
                  <div className="deal-banner-placeholder">
                    <i className="fas fa-image"></i>
                    <span>No Banner</span>
                  </div>
                )}
              </div>

              {/* Deal Content */}
              <div className="deal-content">
                {/* Deal Title */}
                <h2 className="deal-title">{deal.title}</h2>
                
                {/* Business Info - Logo and Name */}
                <div className="deal-business-info">
                  <div className="business-logo-container">
                    <div className="business-logo">
                      <SmartImage
                        src={getMerchantLogoUrl({ logo: deal.businessLogo })}
                        alt={`${deal.businessName} Logo`}
                        placeholder={
                          <div className="image-fallback" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgb(243, 244, 246)', color: 'rgb(156, 163, 175)', fontSize: '14px', borderRadius: '8px'}}>
                            <div className="logo-placeholder"><span>{deal.businessName?.charAt(0) || 'B'}</span></div>
                          </div>
                        }
                        className="logo-image"
                        maxRetries={3}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: 'center'
                        }}
                      />
                    </div>
                  </div>
                  <div className="business-name-container">
                    <Link 
                      to="/business-directory"
                      state={{ highlightBusiness: deal.businessId }}
                      className="business-name-link"
                    >
                      {deal.businessName}
                    </Link>
                  </div>
                </div>

                {/* Pricing Section */}
                <div className="deal-pricing-compact">
                  {deal.originalPrice && (
                    <div className="price-row">
                      <span className="price-label">Original:</span>
                      <span className="original-price">GHS {parseFloat(deal.originalPrice).toFixed(2)}</span>
                    </div>
                  )}
                  {deal.discountedPrice && (
                    <div className="price-row">
                      <span className="price-label">Now:</span>
                      <span className="discounted-price">GHS {parseFloat(deal.discountedPrice).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Valid Until */}
                {(deal.expiration_date || deal.expirationDate || deal.validUntil) && (
                  <div className="deal-validity">
                    <i className="fas fa-calendar-times"></i>
                    <span>Valid Until: {new Date(deal.expiration_date || deal.expirationDate || deal.validUntil).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}</span>
                  </div>
                )}
              </div>

              {/* Action Section */}
              <div className="deal-actions">
                <button
                  className="btn-view-details"
                  onClick={() => {
                    setSelectedDeal(deal);
                    setShowDetailModal(true);
                  }}
                >
                  <i className="fas fa-eye"></i>
                  View Details
                </button>

                
                {user && !canRedeem(user, deal.minPlanPriority, plans) && (
                  <div className="upgrade-prompt">
                    {(() => {
                      const requiredPlan = plans.find(p => p.priority === (deal.minPlanPriority || deal.requiredPlanPriority));
                      if (requiredPlan) {
                        return (
                          <button className="btn-upgrade">
                            <i className="fas fa-arrow-up"></i>
                            Upgrade to {requiredPlan.name}
                            {requiredPlan.price && requiredPlan.currency && 
                              ` (${requiredPlan.currency} ${requiredPlan.price})`
                            }
                          </button>
                        );
                      }
                      return (
                        <button className="btn-upgrade">
                          <i className="fas fa-lock"></i>
                          Upgrade Required
                        </button>
                      );
                    })()}
                  </div>
                )}
                
                {redeemStatus[deal.id] && (
                  <div className={`redeem-status ${
                    redeemStatus[deal.id].includes('Upgrade') ? 'upgrade-required' : 
                    redeemStatus[deal.id] === 'Redeemed!' ? 'success' : 'error'
                  }`}>
                    <i className={`fas ${
                      redeemStatus[deal.id] === 'Redeemed!' ? 'fa-check-circle' : 
                      redeemStatus[deal.id].includes('Upgrade') ? 'fa-exclamation-triangle' : 'fa-times-circle'
                    }`}></i>
                    {redeemStatus[deal.id]}
                  </div>
                )}
              </div>
            </div>
          )})}
        </div>
      )}
      
      {/* Redemption Confirmation Modal */}
      {showRedemptionModal && selectedDeal && (
        <div className="modal-overlay">
          <div className="modal-content redemption-modal">
            <div className="modal-header">
              <h3>
                <i className="fas fa-hand-holding-heart"></i>
                Confirm Deal Redemption
              </h3>
              <button 
                className="close-btn" 
                onClick={() => setShowRedemptionModal(false)}
                disabled={isRedeeming}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="deal-summary">
                <div className="deal-image">
                  <i className="fas fa-percent"></i>
                </div>
                <div className="deal-details">
                  <h4>{selectedDeal.title}</h4>
                  <p className="deal-business">
                    <i className="fas fa-store"></i>
                    {selectedDeal.businessName}
                  </p>
                  <div className="deal-discount">
                    <span className="discount-value">
                      {selectedDeal.discount}% OFF
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="warning-notice">
                <div className="warning-icon">
                  <i className="fas fa-exclamation-triangle"></i>
                </div>
                <div className="warning-content">
                  <h4>⚠️ Merchant Review Required</h4>
                  <p>
                    Your redemption request will be sent to <strong>{selectedDeal.businessName}</strong> for review. 
                    The merchant will contact you using your phone number to verify and approve your request.
                  </p>
                  <ul>
                    <li>✅ Request will be submitted immediately</li>
                    <li>📞 Merchant will call you for verification</li>
                    <li>⏱️ You'll be notified once approved</li>
                    <li>🔄 You can redeem multiple times (after approval)</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowRedemptionModal(false)}
                disabled={isRedeeming}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={confirmRedemption}
                disabled={isRedeeming}
              >
                {isRedeeming ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Submitting Request...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane"></i>
                    Submit Redemption Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deal Detail Modal */}
      {showDetailModal && selectedDeal && (
        <div className="modal-overlay">
          <div className="modal-content deal-detail-modal">
            <div className="modal-header-compact">
              <h3 className="modal-title">
                {selectedDeal.title}
              </h3>
              <button 
                className="close-btn" 
                onClick={() => setShowDetailModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body-compact">
              <div className="modal-content-grid">
                {/* Left Side - Description and Deal Information */}
                <div className="modal-left-section">
                  <div className="modal-section">
                    <h4>Description</h4>
                    <p className="deal-description-full">{selectedDeal.description || 'No description available.'}</p>
                  </div>

                  <div className="modal-section">
                    <h4>Deal Information</h4>
                    <div className="info-list">
                      {selectedDeal.validFrom && (
                        <div className="info-item">
                          <i className="fas fa-calendar-check"></i>
                          <span>Valid From: {new Date(selectedDeal.validFrom).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}</span>
                        </div>
                      )}
                      {(selectedDeal.expiration_date || selectedDeal.expirationDate || selectedDeal.validUntil) && (
                        <div className="info-item">
                          <i className="fas fa-calendar-times"></i>
                          <span>
                            Expires: {new Date(selectedDeal.expiration_date || selectedDeal.expirationDate || selectedDeal.validUntil).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      )}
                      {selectedDeal.discount && (
                        <div className="info-item">
                          <i className="fas fa-percentage"></i>
                          <span>{selectedDeal.discount}{selectedDeal.discountType === 'percentage' ? '%' : ' GHS'} Discount</span>
                        </div>
                      )}
                      {selectedDeal.couponCode && (
                        <div className="info-item">
                          <i className="fas fa-ticket-alt"></i>
                          <span>Coupon Code: <strong>{selectedDeal.couponCode}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side - Pricing, Terms, Requirements */}
                <div className="modal-right-section">
                  {/* Pricing Information */}
                  {(selectedDeal.originalPrice || selectedDeal.discountedPrice) && (
                    <div className="modal-section">
                      <h4>Pricing Information</h4>
                      <div className="pricing-list">
                        {selectedDeal.originalPrice && (
                          <div className="price-item">
                            <span className="price-label">Original Price:</span>
                            <span className="original-price-modal">GHS {parseFloat(selectedDeal.originalPrice).toFixed(2)}</span>
                          </div>
                        )}
                        {selectedDeal.discountedPrice && (
                          <div className="price-item">
                            <span className="price-label">Discounted Price:</span>
                            <span className="discounted-price-modal">GHS {parseFloat(selectedDeal.discountedPrice).toFixed(2)}</span>
                          </div>
                        )}
                        {selectedDeal.originalPrice && selectedDeal.discountedPrice && (
                          <div className="price-item savings-item">
                            <span className="price-label">You Save:</span>
                            <span className="savings-modal">GHS {(parseFloat(selectedDeal.originalPrice) - parseFloat(selectedDeal.discountedPrice)).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Terms & Conditions */}
                  {selectedDeal.termsConditions && (
                    <div className="modal-section">
                      <h4>Terms & Conditions</h4>
                      <p className="terms-text">{selectedDeal.termsConditions}</p>
                    </div>
                  )}

                  {/* Membership Requirements */}
                  {((selectedDeal.minPlanPriority || selectedDeal.requiredPlanPriority) !== null && (selectedDeal.minPlanPriority || selectedDeal.requiredPlanPriority) !== undefined) && (
                    <div className="modal-section">
                      <h4>Membership Requirements</h4>
                      <div className="plan-badge-modal">
                        <i className="fas fa-crown"></i>
                        Available for {getPlanNameByPriority(selectedDeal.minPlanPriority || selectedDeal.requiredPlanPriority, plans)} Members & Above
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer - Now inside the grid */}
                <div className="modal-footer-compact">
                  {/* Notification/Status Display */}
                  {redeemStatus[selectedDeal.id] && (
                    <div className="modal-footer-info">
                      <div className="redemption-status">
                        <span>{redeemStatus[selectedDeal.id]}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="modal-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={() => setShowDetailModal(false)}
                    >
                      Close
                    </button>
                    <button
                      className={`btn btn-primary ${!user || !canRedeem(user, selectedDeal.minPlanPriority, plans) ? 'disabled' : ''}`}
                      disabled={!user || !canRedeem(user, selectedDeal.minPlanPriority, plans)}
                      onClick={() => {
                        setShowDetailModal(false);
                        handleRedeem(selectedDeal.id, selectedDeal.minPlanPriority);
                      }}
                    >
                      <i className="fas fa-gift"></i>
                      Redeem Deal
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Deals;
