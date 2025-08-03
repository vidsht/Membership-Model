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
    membershipLevel: 'all',
    search: '',
    dateFrom: '',
    dateTo: ''
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
    
    // Membership Level filter - now using dynamic plan priorities
    if (filters.membershipLevel !== 'all') {
      result = result.filter(deal => {
        // Find the plan by name/key from the filter
        const filterPlan = plans.find(p => 
          p.name.toLowerCase() === filters.membershipLevel.toLowerCase() || 
          p.key === filters.membershipLevel
        );
        if (!filterPlan) return true; // If plan not found, show all
        
        // Show deals that require this plan priority or lower
        return deal.minPlanPriority <= filterPlan.priority;
      });
    }
    
    // Date filters
    if (filters.dateFrom) {
      result = result.filter(deal => {
        const expirationDate = deal.expirationDate || deal.validUntil || deal.expiration_date;
        return expirationDate ? new Date(expirationDate) >= new Date(filters.dateFrom) : true;
      });
    }
    if (filters.dateTo) {
      result = result.filter(deal => {
        const expirationDate = deal.expirationDate || deal.validUntil || deal.expiration_date;
        return expirationDate ? new Date(expirationDate) <= new Date(filters.dateTo) : true;
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
      <h1>Exclusive Deals</h1>      <DealFilters
        filters={filters}
        plans={plans}
        onFilterChange={update => setFilters(prev => ({ ...prev, ...update }))}
        onSearch={search => setFilters(prev => ({ ...prev, search }))}
      />
      {loading ? (
        <div className="loading">Loading deals...</div>
      ) : filteredDeals.length === 0 ? (
        <div className="no-deals">No deals available.</div>
      ) : (
        <div className="deals-grid">
          {filteredDeals.map(deal => (
            <div className="deal-card" key={deal.id}>
              {/* Business Info */}
              <div className="deal-business-info">
                <h3 className="business-name">{deal.businessName}</h3>
                {deal.businessDescription && <p className="business-desc">{deal.businessDescription}</p>}
                <div className="business-meta">
                  {deal.businessCategory && <span className="business-category">{deal.businessCategory}</span>}
                  {deal.businessAddress && <span className="business-address">{deal.businessAddress}</span>}
                  {deal.businessPhone && <span className="business-phone">{deal.businessPhone}</span>}
                  {deal.businessEmail && <span className="business-email">{deal.businessEmail}</span>}
                  {deal.website && <span className="business-website"><a href={deal.website} target="_blank" rel="noopener noreferrer">Website</a></span>}
                </div>
              </div>
              {/* Deal Info */}
              <h2>{deal.title}</h2>
              <p className="deal-desc">{deal.description}</p>              <div className="deal-meta">
                <span className="deal-category">{deal.category}</span>
                <span className="deal-expiry">Expires: {deal.expiration_date ? new Date(deal.expiration_date).toLocaleDateString() : ''}</span>
                {/* Access Level Badge - Dynamic Plan Display */}
                {deal.accessLevel && (
                  <span className={`deal-badge ${deal.accessLevel.toLowerCase().replace(/\s+/g, '-')}`}>
                    For {deal.accessLevel} Members & Above
                  </span>
                )}
                {/* Coupon Code */}
                {deal.couponCode && <span className="deal-coupon">Code: {deal.couponCode}</span>}
                {/* Valid From */}
                {deal.validFrom && <span className="deal-valid-from">Valid from: {new Date(deal.validFrom).toLocaleDateString()}</span>}
                {/* Discount Info */}
                {deal.discount && <span className="deal-discount">Discount: {deal.discount} {deal.discountType === 'percentage' ? '%' : deal.discountType === 'fixed' ? 'GHS' : deal.discountType}</span>}
                {/* Terms & Conditions */}
                {deal.termsConditions && <span className="deal-terms">Terms: {deal.termsConditions}</span>}
              </div>
              <button
                className="btn-redeem"
                disabled={!user || !canRedeem(user, deal.minPlanPriority, plans)}
                onClick={() => handleRedeem(deal.id, deal.minPlanPriority)}
              >
                Redeem
              </button>
              {/* Dynamic Upgrade Logic */}
              {user && !canRedeem(user, deal.minPlanPriority, plans) && (
                <div className="upgrade-toggle">
                  {(() => {
                    // Find the required plan for this deal
                    const requiredPlan = plans.find(p => p.priority === deal.minPlanPriority);
                    if (requiredPlan) {
                      return (
                        <button className="btn-upgrade">
                          Upgrade to {requiredPlan.name} Plan
                          {requiredPlan.price && requiredPlan.currency && ` (${requiredPlan.currency} ${requiredPlan.price})`}
                        </button>
                      );
                    }
                    return <button className="btn-upgrade">Upgrade Plan Required</button>;
                  })()}
                </div>
              )}
              {redeemStatus[deal.id] && (
                <div className={`redeem-status ${
                  redeemStatus[deal.id].includes('Upgrade') ? 'upgrade-required' : 
                  redeemStatus[deal.id] === 'Redeemed!' ? 'success' : 'error'
                }`}>
                  {redeemStatus[deal.id]}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Deals;
