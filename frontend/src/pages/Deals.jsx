import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAllDeals, getExpiredDeals, getUpcomingDeals, redeemDeal, getAllPlans, trackDealView } from '../services/api';
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

/**
 * Check if user has reached their redemption limit for the month
 * @param {Object} user - The user object
 * @returns {Object} - {canRedeem: boolean, message: string}
 */
function checkRedemptionLimit(user) {
  if (!user) {
    return { canRedeem: false, message: 'Please log in to redeem deals.' };
  }

  // Check if user has redemption limit data from backend
  const monthlyRedemptionsRemaining = user.monthlyRedemptionsRemaining;
  const monthlyRedemptionLimit = user.monthlyRedemptionLimit || user.customRedemptionLimit;
  const monthlyRedemptionCount = user.monthlyRedemptionCount || 0;
  const pendingRequestsCount = user.pendingRequestsCount || 0;

  // Consistent logic: always check total requests (completed + pending) against limit
  if (monthlyRedemptionLimit !== undefined && monthlyRedemptionLimit !== null) {
    if (monthlyRedemptionLimit === -1) {
      return { canRedeem: true, message: '' };
    }
    
    // Check total requests (completed + pending) against limit
    const totalRequests = monthlyRedemptionCount + pendingRequestsCount;
    if (totalRequests >= monthlyRedemptionLimit) {
      return { 
        canRedeem: false, 
        message: `You have reached your monthly redemption limit of ${monthlyRedemptionLimit}. ${pendingRequestsCount > 0 ? `You have ${pendingRequestsCount} pending request(s). ` : ''}Upgrade your plan for more redemptions.` 
      };
    }
    return { canRedeem: true, message: '' };
  }

  // If backend provides remaining count as backup, use it but still account for pending requests
  if (monthlyRedemptionsRemaining !== undefined && monthlyRedemptionsRemaining !== null) {
    if (monthlyRedemptionsRemaining === -1) {
      return { canRedeem: true, message: '' };
    }
    // Subtract pending requests from remaining to ensure consistency
    const effectiveRemaining = monthlyRedemptionsRemaining - pendingRequestsCount;
    if (effectiveRemaining <= 0) {
      return { 
        canRedeem: false, 
        message: `You have reached your monthly redemption limit. ${pendingRequestsCount > 0 ? `You have ${pendingRequestsCount} pending request(s). ` : ''}Upgrade your plan for more redemptions.` 
      };
    }
    return { canRedeem: true, message: '' };
  }

  // Default behavior if no limit data is available
  return { canRedeem: true, message: '' };
}

const Deals = () => {
  const { user } = useAuth();
  const location = useLocation();
  const planAccess = usePlanAccess();
  const { getDealBannerUrl, getMerchantLogoUrl } = useImageUrl();
  const [deals, setDeals] = useState([]);
  const [expiredDeals, setExpiredDeals] = useState([]);
  const [upcomingDeals, setUpcomingDeals] = useState([]);
  const [plans, setPlans] = useState([]);
  const [filteredDeals, setFilteredDeals] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    search: ''
  });
  const [loading, setLoading] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const dealsPerPage = 6; // Show 6 deals per page
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
    fetchExpiredDeals(); // Always fetch expired deals for the bottom section
    fetchUpcomingDeals(); // Always fetch upcoming deals
  }, []);

  // Fetch specific deals when filters change
  useEffect(() => {
    if (filters.status === 'expired') {
      fetchExpiredDeals();
    } else if (filters.status === 'upcoming') {
      fetchUpcomingDeals();
    }
  }, [filters.status]);

  // Handle shared URLs - auto-open deal modal if ID is in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const dealId = urlParams.get('id');
    
    if (dealId && deals.length > 0) {
      const deal = deals.find(d => d.id === parseInt(dealId));
      if (deal) {
        handleViewDetails(deal);
      }
    }
  }, [location.search, deals]);
  
  const fetchPlans = async () => {
    try {
      const plansResponse = await getAllPlans('user', true);
      setPlans(Array.isArray(plansResponse) ? plansResponse : plansResponse.plans || []);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      setPlans([]);
    }
  };

  const fetchExpiredDeals = async () => {
    try {
      const expiredData = await getExpiredDeals();
      setExpiredDeals(expiredData);
    } catch (error) {
      console.error('Failed to fetch expired deals:', error);
      setExpiredDeals([]);
    }
  };

  const fetchUpcomingDeals = async () => {
    try {
      const upcomingData = await getUpcomingDeals();
      setUpcomingDeals(upcomingData);
    } catch (error) {
      console.error('Failed to fetch upcoming deals:', error);
      setUpcomingDeals([]);
    }
  };

  useEffect(() => {
    let result = [];
    
    // Select the appropriate deals based on status filter
    if (filters.status === 'expired') {
      result = [...expiredDeals];
    } else if (filters.status === 'upcoming') {
      result = [...upcomingDeals];
    } else {
      result = [...deals];
      
      // Filter based on status for non-expired/non-upcoming deals
      if (filters.status !== 'all') {
        result = result.filter(deal => {
          const expirationDate = deal.expirationDate || deal.validUntil || deal.expiration_date;
          const startDate = deal.validFrom || deal.start_date;
          const now = new Date();
          
          if (filters.status === 'active') {
            // Active deals: started and not expired
            const hasStarted = !startDate || new Date(startDate) <= now;
            const notExpired = !expirationDate || new Date(expirationDate) >= now;
            return hasStarted && notExpired;
          }
          return true;
        });
      }
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
    setCurrentPage(1); // Reset to first page when filters change
  }, [filters, deals, expiredDeals, upcomingDeals, plans]);

  // Calculate pagination values
  const totalPages = Math.ceil(filteredDeals.length / dealsPerPage);
  const startIndex = (currentPage - 1) * dealsPerPage;
  const endIndex = startIndex + dealsPerPage;
  const currentDeals = filteredDeals.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

    // Check if user is a merchant - merchants cannot redeem deals
    if (user.userType === 'merchant') {
      setRedeemStatus({ 
        ...redeemStatus, 
        [dealId]: '❌ Merchants cannot redeem deals. Please create a user account to access deals.' 
      });
      return;
    }

    // Check redemption limit FIRST
    const redemptionCheck = checkRedemptionLimit(user);
    if (!redemptionCheck.canRedeem) {
      setRedeemStatus({ ...redeemStatus, [dealId]: redemptionCheck.message });
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
    
    // Double-check redemption limit before confirming
    const redemptionCheck = checkRedemptionLimit(user);
    if (!redemptionCheck.canRedeem) {
      setRedeemStatus({ ...redeemStatus, [selectedDeal.id]: redemptionCheck.message });
      setShowRedemptionModal(false);
      setSelectedDeal(null);
      return;
    }
    
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
        setRedeemStatus({ ...redeemStatus, [selectedDeal.id]: 'Request submitted!' });
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

  // Share deal function
  const handleShareDeal = async (deal) => {
    const dealUrl = `${window.location.origin}/deals?id=${deal.id}`;
    const shareText = `🎉 Check out this amazing deal: *${deal.title}* at ${deal.businessName}! 

💰 ${deal.discount}% OFF - Was ₵${deal.originalPrice}, now ₵${deal.discountedPrice}

Click to view details: ${dealUrl}

Join Indians in Ghana Community for exclusive deals!`;
    
    // Use Web Share API only if it can reliably share rich content
    if (canShareRichContent()) {
      try {
        // Always use consistent text+url format for rich content sharing
        const shareData = {
          title: `${deal.title} - ${deal.businessName}`,
          text: shareText,
          url: dealUrl
        };
        
        await navigator.share(shareData);
        return; // Successfully shared via Web Share API
      } catch (error) {
        console.log('Error sharing via Web Share API:', error);
        // User cancelled or sharing failed, fall through to clipboard method
      }
    }
    
    // Fallback for desktop or when Web Share API fails: copy full formatted text with URL
    copyToClipboard(shareText, deal.title);
  };

  // Copy to clipboard function
  const copyToClipboard = async (text, dealTitle) => {
    try {
      await navigator.clipboard.writeText(text);
      // Show a temporary success message
      setRedeemStatus({ 
        ...redeemStatus, 
        [dealTitle]: '📋 Deal information copied to clipboard! You can now paste this in any messaging app to share the full deal details and link.' 
      });
      // Clear the message after 3 seconds
      setTimeout(() => {
        setRedeemStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[dealTitle];
          return newStatus;
        });
      }, 3000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      setRedeemStatus({ 
        ...redeemStatus, 
        [dealTitle]: '📋 Deal information copied to clipboard! You can now paste this in any messaging app to share the full deal details and link.' 
      });
      setTimeout(() => {
        setRedeemStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[dealTitle];
          return newStatus;
        });
      }, 3000);
    }
  };

  // Handle view details with view tracking
  const handleViewDetails = async (deal) => {
    console.log('[DEBUG] Viewing deal details:', deal.id, deal.title);
    
    // Track the view if user is logged in
    if (user) {
      try {
        await trackDealView(deal.id);
        console.log('[DEBUG] Deal view tracked successfully for deal:', deal.id);
      } catch (error) {
        console.log('[DEBUG] View tracking failed (non-critical):', error.message);
      }
    }
    
    // Set selected deal and show modal
    setSelectedDeal(deal);
    setShowDetailModal(true);
  };

  return (
    <div className="deals-page">
      {/* Hero Section */}
      <div className="deals-hero">
        <div className="deals-hero-content">
          <h1>Exclusive Member Deals</h1>
          <p>Discover amazing discounts and offers exclusively available to our community members</p>
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
        <div className="deals-container">
          <div className="deals-grid">
            {currentDeals.map(deal => {
               const shortDescription = deal.description?.length > 100 
                 ? `${deal.description.substring(0, 100)}...` 
                 : deal.description;
               
               return (
               <div className="deal-card" key={deal.id}>
                 {/* Deal Banner with Category Overlay */}
                 <div 
                   className="deal-banner clickable-banner" 
                   onClick={() => handleViewDetails(deal)}
                   title="Click to view deal details"
                 >
                   <div className="deal-category-overlay">
                     <i className="fas fa-tag"></i>
                     {deal.category || 'General'}
                   </div>
                   {/* Limited Badge - Show when member limit is set */}
                   {(deal.member_limit || deal.memberLimit) && (
                     <div className="deal-limited-badge">
                       <i className="fas fa-users"></i>
                       Limited
                     </div>
                   )}
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
                             <div className="image-fallback" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgb(243, 244, 246)', color: 'rgb(156, 163, 175)', fontSize: '14px', borderRadius: '8px', width: '100%', height: '100%'}}>
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
                     onClick={() => handleViewDetails(deal)}
                   >
                     <i className="fas fa-eye"></i>
                     View Details
                   </button>

                   <button 
                     className="btn-share-deal"
                     onClick={() => handleShareDeal(deal)}
                     title="Share this deal"
                   >
                     <i className="fas fa-share-alt"></i>
                     Share
                   </button>
                   
                   {redeemStatus[deal.id] && (
                     <div className={`redeem-status ${
                       redeemStatus[deal.id].includes('Upgrade') ? 'upgrade-required' : 
                       redeemStatus[deal.id].includes('Request submitted!') ? 'success' : 'error'
                     }`}>
                       <i className={`fas ${
                         redeemStatus[deal.id].includes('Request submitted!') ? 'fa-check-circle' : 
                         redeemStatus[deal.id].includes('Upgrade') ? 'fa-exclamation-triangle' : 'fa-times-circle'
                       }`}></i>
                       {redeemStatus[deal.id]}
                     </div>
                   )}
                 </div>
               </div>
             );
           })}
          </div>
          
          {/* Pagination Controls (sibling of the grid, like BusinessDirectory) */}
          {filteredDeals.length > dealsPerPage && (
            <div className="pagination-container">
              <div className="pagination">
                <button
                  className={`pagination-btn ${currentPage === 1 ? 'disabled' : ''}`}
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  ‹ Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
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
                Showing {startIndex + 1}-{Math.min(endIndex, filteredDeals.length)} of {filteredDeals.length} deals
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expired Deals Section - Show only when not filtering for expired deals specifically */}
      {filters.status !== 'expired' && expiredDeals.length > 0 && (
        <div className="expired-deals-section">
          <div className="expired-deals-header">
            <h3>Recently Expired Deals</h3>
            <p>Check out these deals that recently ended - similar offers might return!</p>
          </div>
          <div className="expired-deals-grid">
            {expiredDeals.slice(0, 6).map(deal => (
              <div key={deal.id} className="deal-card expired-deal-card" onClick={() => handleViewDetails(deal)}>
                <div className="expired-badge">
                  <i className="fas fa-clock"></i>
                  Expired
                </div>
                <div className="deal-image-container">
                  <SmartImage
                    src={getDealBannerUrl(deal)}
                    alt={deal.title}
                    className="deal-image"
                    style={{
                      width: '100%',
                      height: '180px',
                      objectFit: 'cover'
                    }}
                  />
                </div>
                <div className="deal-content">
                  <div className="deal-header">
                    <h3 className="deal-title">{deal.title}</h3>
                    <div className="business-info">
                      <span className="business-name">{deal.businessName}</span>
                    </div>
                  </div>
                  <p className="deal-description">
                    {deal.description && deal.description.length > 100
                      ? `${deal.description.substring(0, 100)}...`
                      : deal.description}
                  </p>
                  <div className="deal-footer">
                    <div className="deal-pricing">
                      {deal.originalPrice && deal.discountedPrice ? (
                        <>
                          <span className="original-price">GHS {parseFloat(deal.originalPrice).toFixed(2)}</span>
                          <span className="discounted-price">GHS {parseFloat(deal.discountedPrice).toFixed(2)}</span>
                        </>
                      ) : deal.discount ? (
                        <span className="discount-badge">
                          {deal.discount}{deal.discountType === 'percentage' ? '%' : ' GHS'} OFF
                        </span>
                      ) : null}
                    </div>
                    <span className="expired-date">
                      Expired: {new Date(deal.expirationDate || deal.validUntil || deal.expiration_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {expiredDeals.length > 6 && (
            <div className="expired-deals-footer">
              <button 
                className="btn btn-outline"
                onClick={() => setFilters({...filters, status: 'expired'})}
              >
                View All Expired Deals ({expiredDeals.length})
              </button>
            </div>
          )}
        </div>
      )}

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

                  {/* Login/Register Requirement Notice - Compact */}
                  <div className="modal-notice-compact">
                    <i className="fas fa-info-circle"></i>
                    <span>Login required to redeem</span>
                  </div>

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
