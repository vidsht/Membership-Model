import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAllDeals, redeemDeal, getAllPlans } from '../services/api';
import DealFilters from '../components/deals/DealFilters';
import '../styles/deals.css';

/**
 * Determines if a user can redeem a deal based on plan priority.
 * Users with higher priority plans can access deals for lower priority plans.
 * @param {Object} user - The user object
 * @param {number} dealMinPlanPriority - The deal's minimum plan priority requirement
 * @param {Array} plans - Available plans array
 * @returns {boolean}
 */
function canRedeem(user, dealMinPlanPriority, plans) {
  if (!user || !plans || plans.length === 0) return false;
  
  // Find the user's current plan
  const userPlan = plans.find(plan => plan.key === user.membership || plan.name.toLowerCase() === user.membership?.toLowerCase());
  if (!userPlan) return false;
  
  // User can redeem if their plan priority is >= deal's minimum required priority
  return userPlan.priority >= dealMinPlanPriority;
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
    
    // Category filter
    if (filters.category !== 'all') {
      result = result.filter(deal => deal.category === filters.category);
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
    if (!canRedeem(user, minPlanPriority, plans)) {
      setRedeemStatus({ ...redeemStatus, [dealId]: 'This deal is not available for your membership plan.' });
      return;
    }
    try {
      await redeemDeal(dealId);
      setRedeemStatus({ ...redeemStatus, [dealId]: 'Redeemed!' });
    } catch (error) {
      console.error('Redemption error:', error);
      let errorMessage = 'Failed to redeem. Try again.';
      
      // Handle specific error responses from backend
      if (error.response?.status === 403 && error.response?.data?.upgradeRequired) {
        const data = error.response.data;
        
        if (data.suggestedPlan) {
          const plan = data.suggestedPlan;
          if (plan.price && plan.currency) {
            errorMessage = `Upgrade to ${plan.name} plan (${plan.currency} ${plan.price}) to redeem this deal!`;
          } else {
            errorMessage = `Upgrade to ${plan.name} plan to redeem this deal!`;
          }
        } else if (data.availablePlans && data.availablePlans.length > 0) {
          const planNames = data.availablePlans.slice(0, 2).map(p => p.name).join(' or ');
          errorMessage = `Upgrade to ${planNames} to access this exclusive deal.`;
        } else {
          errorMessage = data.message || 'This deal requires a higher membership plan. Please upgrade to continue.';
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data.message || 'You have already redeemed this deal.';
      }
      
      setRedeemStatus({ ...redeemStatus, [dealId]: errorMessage });
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
          {filteredDeals.map(deal => (
            <div className="deal-card" key={deal.id}>
              {/* Business Info Header */}
              <div className="deal-business-info">
                <div className="business-header">
                  <h3 className="business-name">{deal.businessName}</h3>
                  {deal.businessCategory && (
                    <span className="business-category">{deal.businessCategory}</span>
                  )}
                </div>
                {deal.businessDescription && (
                  <p className="business-desc">{deal.businessDescription}</p>
                )}
                <div className="business-meta">
                  {deal.businessAddress && (
                    <span className="business-address">
                      <i className="fas fa-map-marker-alt"></i>
                      {deal.businessAddress}
                    </span>
                  )}
                  {deal.businessPhone && (
                    <span className="business-phone">
                      <i className="fas fa-phone"></i>
                      {deal.businessPhone}
                    </span>
                  )}
                  {deal.businessEmail && (
                    <span className="business-email">
                      <i className="fas fa-envelope"></i>
                      {deal.businessEmail}
                    </span>
                  )}
                  {deal.website && (
                    <span className="business-website">
                      <i className="fas fa-globe"></i>
                      <a href={deal.website} target="_blank" rel="noopener noreferrer">
                        Visit Website
                      </a>
                    </span>
                  )}
                </div>
              </div>

              {/* Deal Content */}
              <div className="deal-content">
                <h2 className="deal-title">{deal.title}</h2>
                <p className="deal-desc">{deal.description}</p>
                
                {/* Price Information */}
                {(deal.originalPrice || deal.discountedPrice) && (
                  <div className="deal-pricing">
                    {deal.originalPrice && (
                      <div className="price-section">
                        <span className="original-price">
                          Original: GHS {parseFloat(deal.originalPrice).toFixed(2)}
                        </span>
                        {deal.discountedPrice && (
                          <span className="discounted-price">
                            Now: GHS {parseFloat(deal.discountedPrice).toFixed(2)}
                          </span>
                        )}
                        {deal.originalPrice && deal.discountedPrice && (
                          <span className="savings">
                            Save: GHS {(parseFloat(deal.originalPrice) - parseFloat(deal.discountedPrice)).toFixed(2)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="deal-meta">
                  <div className="deal-info-grid">
                    {deal.discount && (
                      <div className="deal-info-item discount">
                        <i className="fas fa-tag"></i>
                        <span>
                          {deal.discount}{deal.discountType === 'percentage' ? '%' : ' GHS'} OFF
                        </span>
                      </div>
                    )}
                    {deal.couponCode && (
                      <div className="deal-info-item coupon">
                        <i className="fas fa-ticket-alt"></i>
                        <span>Code: <strong>{deal.couponCode}</strong></span>
                      </div>
                    )}
                    {(deal.expiration_date || deal.expirationDate || deal.validUntil) && (
                      <div className="deal-info-item expiry">
                        <i className="fas fa-calendar-times"></i>
                        <span>
                          Expires: {new Date(deal.expiration_date || deal.expirationDate || deal.validUntil).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    )}
                    {deal.validFrom && (
                      <div className="deal-info-item valid-from">
                        <i className="fas fa-calendar-check"></i>
                        <span>From {new Date(deal.validFrom).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}</span>
                      </div>
                    )}
                    {deal.maxRedemptions && (
                      <div className="deal-info-item max-redemptions">
                        <i className="fas fa-users"></i>
                        <span>Limited to {deal.maxRedemptions} users</span>
                      </div>
                    )}
                  </div>
                  
                  {deal.accessLevel && (
                    <div className={`deal-badge ${deal.accessLevel.toLowerCase().replace(/\s+/g, '-')}`}>
                      <i className="fas fa-crown"></i>
                      For {deal.accessLevel} Members & Above
                    </div>
                  )}
                  
                  {deal.termsConditions && (
                    <div className="deal-terms">
                      <details className="terms-details">
                        <summary className="terms-summary">
                          <i className="fas fa-info-circle"></i>
                          <span>Terms & Conditions</span>
                          <i className="fas fa-chevron-down expand-icon"></i>
                        </summary>
                        <div className="terms-content">
                          {deal.termsConditions}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Section */}
              <div className="deal-actions">
                <button
                  className={`btn-redeem ${!user || !canRedeem(user, deal.minPlanPriority, plans) ? 'disabled' : ''}`}
                  disabled={!user || !canRedeem(user, deal.minPlanPriority, plans)}
                  onClick={() => handleRedeem(deal.id, deal.minPlanPriority)}
                >
                  <i className="fas fa-gift"></i>
                  Redeem Deal
                </button>
                
                {user && !canRedeem(user, deal.minPlanPriority, plans) && (
                  <div className="upgrade-prompt">
                    {(() => {
                      const requiredPlan = plans.find(p => p.priority === deal.minPlanPriority);
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
          ))}
        </div>
      )}
    </div>
  );
};

export default Deals;
