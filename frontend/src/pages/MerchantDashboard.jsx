import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useDynamicFields } from '../hooks/useDynamicFields';
import usePlanAccess from '../hooks/usePlanAccess.jsx';
import { merchantApi, getNotifications, markNotificationAsRead, markAllNotificationsAsRead, getRedemptionRequests, approveRedemptionRequest, rejectRedemptionRequest, getAllPlans } from '../services/api';
import MerchantDealForm from '../components/MerchantDealForm';
import PlanExpiryBanner from '../components/PlanExpiryBanner';
import axios from 'axios';
import { useImageUrl, SmartImage } from '../hooks/useImageUrl.jsx';
import '../styles/MerchantDashboard.css';

const MerchantDashboard = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const { getDealBannerUrl, getMerchantLogoUrl } = useImageUrl(); 
  const { getBusinessCategoryOptions } = useDynamicFields();
  const planAccess = usePlanAccess();
  const [deals, setDeals] = useState([]);
  const [plans, setPlans] = useState([]);
  const [userPlans, setUserPlans] = useState([]);
  const [currentMerchantPlan, setCurrentMerchantPlan] = useState(null);
  const [upgradeRecommendations, setUpgradeRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDealForm, setShowDealForm] = useState(false);
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [businessInfo, setBusinessInfo] = useState({});
  const [planInfo, setPlanInfo] = useState({});
  const [userInfo, setUserInfo] = useState({});
  const [recentRedemptions, setRecentRedemptions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Redemption requests state
  const [redemptionRequests, setRedemptionRequests] = useState([]);
  const [showRedemptionRequests, setShowRedemptionRequests] = useState(false);
  const [processingRequest, setProcessingRequest] = useState(null);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionRequestId, setRejectionRequestId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Bulk actions state
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [processingBulk, setProcessingBulk] = useState(false);
  
  // Member verification state
  const [showMemberVerification, setShowMemberVerification] = useState(false);
  const [membershipSearch, setMembershipSearch] = useState('');
  const [memberVerificationResult, setMemberVerificationResult] = useState(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  
  // Pagination state
  const [redemptionRequestsPage, setRedemptionRequestsPage] = useState(1);
  const [recentRedemptionsPage, setRecentRedemptionsPage] = useState(1);
  const [dealsPage, setDealsPage] = useState(1);
  const itemsPerPage = 5;
  
  // Plan-based feature access
  const [featureAccess, setFeatureAccess] = useState({
    analytics: false,
    advancedStats: false,
    businessDashboard: false,
    dealPosting: 'none', // 'none', 'limited', 'enhanced', 'unlimited'
    priorityListing: false,
    featuredPlacement: false,
    statisticsPanel: false,
    viewAnalyticsButton: false,
    dealAnalyticsButton: false
  });
  const [stats, setStats] = useState({
    totalDeals: 0,
    activeDeals: 0,
    pendingDeals: 0,
    rejectedDeals: 0,
    expiredDeals: 0,
    totalViews: 0,
    totalRedemptions: 0,
    todayRedemptions: 0,
    thisMonthDeals: 0,
    dealsUsedThisMonth: 0,
    dealLimitRemaining: 0
  });

  useEffect(() => {
    if (user && user.id) {
      fetchDashboardData();
      fetchNotifications();
      fetchPlans();
    }
  }, [user?.id]); // Re-fetch data when user changes

  // Check plan expiry and handle deal expiration
  useEffect(() => {
    const checkPlanExpiryAndExpireDeals = async () => {
      if (!planAccess.canAccess('general') && deals.length > 0) {
        // Plan has expired, expire all active deals
        const activeDeals = deals.filter(deal => 
          deal.status === 'approved' && 
          new Date(deal.validUntil) >= new Date()
        );
        
        if (activeDeals.length > 0) {
          try {
            // Expire all active deals by updating their status
            const expirePromises = activeDeals.map(deal => 
              merchantApi.updateDeal(deal.id, { status: 'expired' })
            );
            
            await Promise.all(expirePromises);
            
            // Refresh deals to show updated status
            const updatedDeals = await merchantApi.getDeals();
            setDeals(updatedDeals);
            
            showNotification(`Your plan has expired. ${activeDeals.length} active deal(s) have been deactivated.`, 'warning');
          } catch (error) {
            console.error('Error expiring deals due to plan expiry:', error);
            showNotification('Error deactivating deals due to plan expiry. Please contact support.', 'error');
          }
        }
      }
    };

    if (userInfo.validationDate && deals.length > 0) {
      checkPlanExpiryAndExpireDeals();
    }
  }, [userInfo.validationDate, deals, planAccess]);

  // Fetch merchant plans for access level display
  const fetchPlans = async () => {
    try {
      // Fetch both merchant plans (for merchant upgrade recommendations) and user plans
      const [merchantPlansResponse, userPlansResponse] = await Promise.all([
        getAllPlans('merchant', true),
        getAllPlans('user', true)
      ]);

      const merchantPlans = Array.isArray(merchantPlansResponse) ? merchantPlansResponse : merchantPlansResponse.plans || [];
      const uPlans = Array.isArray(userPlansResponse) ? userPlansResponse : userPlansResponse.plans || [];

      // Merchant plans are used for merchant-specific upgrade recommendations
      setPlans(merchantPlans);
      // User plans are the canonical plans for requiredPlanPriority lookups
      setUserPlans(uPlans);

      // Find current merchant's plan (still match against merchant plans)
      const userPlanType = user?.membershipType || user?.membership || 'basic';
      const foundPlan = merchantPlans.find(plan => 
        plan.key?.toLowerCase() === userPlanType.toLowerCase()
      ) || merchantPlans.find(plan => 
        plan.name?.toLowerCase() === userPlanType.toLowerCase()
      ) || merchantPlans.find(plan => 
        plan.type === userPlanType
      );

      setCurrentMerchantPlan(foundPlan);

      // Get upgrade recommendations (plans with higher priority) from merchant plans
      const currentPriority = foundPlan?.priority || 0;
      const recommendations = merchantPlans
        .filter(plan => plan.priority > currentPriority && plan.isActive)
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 3); // Show max 3 upgrade options
      setUpgradeRecommendations(recommendations);
    } catch (error) {
      console.error('Error fetching plans:', error);
      setPlans([]);
    }
  };

  // Helper function to get plan name by priority
  const getPlanNameByPriority = (priority) => {
    if (!priority && priority !== 0) return 'All Members';

    // Prefer user plans (these correspond to requiredPlanPriority priorities used by backend)
    const plan = userPlans.find(p => p.priority === priority) || plans.find(p => p.priority === priority);
    if (plan) {
      return `${plan.name} (${plan.key})`;
    }

    // Fallback for unknown priorities
    if (priority === 1) return 'Silver';
    if (priority === 2) return 'Gold';  
    if (priority === 3) return 'Platinum';

    return `Priority ${priority}`;
  };

  // Helper functions for plan level determination based on membershipType
  const getUserPlanLevel = (membershipType) => {
    switch (membershipType) {
      case 'silver_merchant':
      case 'silver_business':
      case 'silver':
        return 'premium';
      case 'gold_merchant':
      case 'gold_business':
      case 'gold':
      case 'platinum_merchant':
      case 'platinum_business':
      case 'platinum_plus':
      case 'platinum_plus_business':
        return 'featured';
      default:
        return 'basic';
    }
  };

  const getPlanIcon = (membershipType) => {
    switch (membershipType) {
      case 'silver_merchant':
      case 'silver_business':
      case 'silver':
        return 'fa-star-half-o';
      case 'gold_merchant':
      case 'gold_business':
      case 'gold':
      case 'platinum_merchant':
      case 'platinum_business':
      case 'platinum_plus':
      case 'platinum_plus_business':
        return 'fa-star';
      default:
        return 'fa-star-o';
    }
  };

  const getPlanDisplayName = (membershipType) => {
    switch (membershipType) {
      case 'silver_merchant':
      case 'silver_business':
      case 'silver':
        return 'Silver Business';
      case 'gold_merchant':
      case 'gold_business':
      case 'gold':
        return 'Gold Business';
      case 'platinum_merchant':
      case 'platinum_business':
        return 'Platinum Business';
      case 'platinum_plus':
      case 'platinum_plus_business':
        return 'Platinum Plus Business';
      case 'basic':
      default:
        return 'Basic Business';
    }
  };

  const getPlanDescription = (membershipType) => {
    switch (membershipType) {
      case 'silver_merchant':
      case 'silver_business':
      case 'silver':
        return 'Standard business package with enhanced features';
      case 'gold_merchant':
      case 'gold_business':
      case 'gold':
        return 'Advanced business package with priority placement';
      case 'platinum_merchant':
      case 'platinum_business':
        return 'Premium business package with full analytics';
      case 'platinum_plus':
      case 'platinum_plus_business':
        return 'Ultimate business package with unlimited features';
      default:
        return 'Basic business listing with standard visibility';
    }
  };

  const isBasicPlan = (membershipType) => {
    return membershipType === 'basic' || !membershipType;
  };

  // Helper function to check if current user is on basic or silver plan (for hiding plan fields in verify member)
  const isBasicOrSilverUser = (membershipType) => {
    const basicOrSilverPlans = ['basic', 'silver', 'silver_merchant', 'silver_business'];
    return basicOrSilverPlans.includes(membershipType) || !membershipType;
  };

  // Helper functions for plan level restrictions (Task 3)
  const isStatisticsDisabled = (membershipType) => {
    // Statistics disabled for basic, silver, gold plans (enabled only for platinum+)
    const disabledPlans = ['basic', 'silver', 'silver_merchant', 'silver_business', 'gold', 'gold_merchant', 'gold_business'];
    return disabledPlans.includes(membershipType) || !membershipType;
  };

  const isAnalyticsDisabled = (membershipType) => {
    // Analytics disabled for basic, silver, gold, platinum plans (enabled only for platinum_plus)
    const disabledPlans = ['basic', 'silver', 'silver_merchant', 'silver_business', 'gold', 'gold_merchant', 'gold_business', 'platinum', 'platinum_merchant', 'platinum_business'];
    return disabledPlans.includes(membershipType) || !membershipType;
  };

  const isFeaturesDisabled = (membershipType) => {
    // Features disabled for basic, silver, gold plans (enabled for platinum+)
    const disabledPlans = ['basic', 'silver', 'silver_merchant', 'silver_business', 'gold', 'gold_merchant', 'gold_business'];
    return disabledPlans.includes(membershipType) || !membershipType;
  };

  // Helper function to check if contact info should be hidden for lower tier plans
  const shouldBlurContactInfo = (membershipType) => {
    // Blur contact info for silver and gold merchants (as per task requirement)
    // Only platinum+ merchants get full visibility
    switch (membershipType) {
      case 'silver_merchant':
      case 'silver_business':
      case 'silver':
      case 'gold_merchant':
      case 'gold_business':
      case 'gold':
        return true;
      case 'platinum_merchant':
      case 'platinum_business':
      case 'platinum_plus':
      case 'platinum_plus_business':
        return false;
      default:
        return true; // Hide for basic plans
    }
  };

  const shouldHideContactInfo = (membershipType) => {
    // Only hide completely for basic plans, blur for silver/gold
    return membershipType === 'basic' || !membershipType;
  };

  const blurText = (text, blurLength = 3) => {
    if (!text || text.length <= blurLength) return '***';
    return text.substring(0, Math.max(1, Math.floor(text.length / 3))) + '*'.repeat(blurLength) + text.substring(text.length - 1);
  };

  // Helper to format date as dd/mm/yyyy
  const formatDateDDMMYYYY = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  // Get merchant benefits based on plan data
  const getMerchantBenefits = (planData) => {
    // If we have plan data from the API, use its benefits
    if (planData?.benefits && Array.isArray(planData.benefits)) {
      return planData.benefits;
    }

    // Fallback to hardcoded benefits based on plan name/type
    const planName = planData?.name?.toLowerCase() || planData?.type?.toLowerCase() || 'basic';
    
    switch (planName) {
      case 'platinum':
      case 'platinum_business':
      case 'featured':
        return [
          'Unlimited deal creation and management',
          'Premium business listing with featured placement',
          'Advanced analytics and customer insights',
          'Priority customer support and account management',
          'Featured logo placement on homepage',
          'Monthly performance reports and recommendations',
          'Community networking events access',
          'Enhanced business profile customization'
        ];
      case 'gold':
      case 'gold_business':
      case 'premium':
        return [
          'Up to 20 deals per month',
          'Enhanced business listing with priority placement',
          'Basic analytics dashboard and insights',
          'Community networking access',
          'Email marketing support',
          'Monthly newsletter feature',
          'Business profile customization'
        ];
      case 'silver':
      case 'silver_business':
        return [
          'Up to 10 deals per month',
          'Standard business listing',
          'Basic business profile',
          'Community directory inclusion',
          'Event notifications',
          'Standard customer support'
        ];
      default:
        return [
          'Up to 5 deals per month',
          'Basic business listing',
          'Community directory access',
          'Basic customer support',
          'Event notifications'
        ];
    }
  };

  // Pagination helper component
  const PaginationComponent = ({ currentPage, totalItems, itemsPerPage, onPageChange, sectionName, scrollTarget }) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    if (totalPages <= 1) return null;

    const handlePageChange = (newPage) => {
      onPageChange(newPage);
      
      // Scroll to the target container if specified
      if (scrollTarget) {
        setTimeout(() => {
          const targetElement = document.querySelector(scrollTarget);
          if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100); // Small delay to allow page change to render
      }
    };
    
    return (
      <div className="pagination-wrapper">
        <div className="pagination-info">
          Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items
        </div>
        <div className="pagination-controls">
          <button 
            className="btn btn-sm btn-outline"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <i className="fas fa-chevron-left"></i> Previous
          </button>
          <span className="page-indicator">
            Page {currentPage} of {totalPages}
          </span>
          <button 
            className="btn btn-sm btn-outline"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
    );
  };

  // Determine feature access based on user's membershipType from users table
  const updateFeatureAccess = (membershipType = 'basic') => {
    let access = {
      analytics: false,
      advancedStats: false,
      businessDashboard: false,
      dealPosting: 'none',
      priorityListing: false,
      featuredPlacement: false,
      statisticsPanel: false,
      viewAnalyticsButton: false,
      dealAnalyticsButton: false
    };

    // Map membershipType to feature access levels
    switch (membershipType) {
      case 'basic':
        // Basic plan - no premium features
        access = {
          analytics: false,
          advancedStats: false,
          businessDashboard: false,
          dealPosting: 'none', // No deal posting
          priorityListing: false,
          featuredPlacement: false,
          statisticsPanel: false,
          viewAnalyticsButton: false,
          dealAnalyticsButton: false
        };
        break;
        
      case 'silver_merchant':
      case 'silver_business':
      case 'silver':
        // Silver plans - limited features (DISABLE statistics, analytics, view analytics, deal analytics)
        access = {
          analytics: false, // DISABLED for silver (per task requirement)
          advancedStats: false,
          businessDashboard: true,
          dealPosting: 'limited', // Limited deal posting
          priorityListing: true,
          featuredPlacement: false,
          statisticsPanel: false, // DISABLED for silver
          viewAnalyticsButton: false, // DISABLED for silver
          dealAnalyticsButton: false // DISABLED for silver
        };
        break;
        
      case 'gold_merchant':
      case 'gold_business':
      case 'gold':
        // Gold plans - full features (DISABLE statistics, analytics, view analytics and deal analytics)
        access = {
          analytics: false, // DISABLED for gold (per task requirement)
          advancedStats: true,
          businessDashboard: true,
          dealPosting: 'unlimited', // Maximum deal posting
          priorityListing: true,
          featuredPlacement: true,
          statisticsPanel: false, // DISABLED for gold (per task requirement)
          viewAnalyticsButton: false, // DISABLED for gold
          dealAnalyticsButton: false // DISABLED for gold
        };
        break;
        
      case 'platinum_merchant':
      case 'platinum_business':
      case 'platinum':
        // Platinum plans - premium features (DISABLE analytics and view analytics button)
        access = {
          analytics: false, // DISABLED for platinum (per task requirement)
          advancedStats: true,
          businessDashboard: true,
          dealPosting: 'unlimited', // Maximum deal posting
          priorityListing: true,
          featuredPlacement: true,
          statisticsPanel: true, // ENABLED for platinum
          viewAnalyticsButton: false, // DISABLED for platinum
          dealAnalyticsButton: true // ENABLED for platinum
        };
        break;
        
      case 'platinum_plus':
      case 'platinum_plus_business':
        // Platinum Plus plans - all features enabled
        access = {
          analytics: true,
          advancedStats: true,
          businessDashboard: true,
          dealPosting: 'unlimited', // Maximum deal posting
          priorityListing: true,
          featuredPlacement: true,
          statisticsPanel: true, // ENABLED for platinum plus
          viewAnalyticsButton: true, // ENABLED for platinum plus
          dealAnalyticsButton: true // ENABLED for platinum plus
        };
        break;
        
      default:
        // Default to basic if unknown membershipType
        access = {
          analytics: false,
          advancedStats: false,
          businessDashboard: false,
          dealPosting: 'none',
          priorityListing: false,
          featuredPlacement: false,
          statisticsPanel: false,
          viewAnalyticsButton: false,
          dealAnalyticsButton: false
        };
    }

    setFeatureAccess(access);
  };

  // Member verification function
  const verifyMembershipNumber = async (membershipNumber) => {
    if (!membershipNumber.trim()) {
      setMemberVerificationResult(null);
      return;
    }

    setVerificationLoading(true);
    try {
      // Remove spaces before sending to backend
      const cleanMembershipNumber = membershipNumber.replace(/\s/g, '');
      // Use merchantApi abstraction for correct path
      const response = await merchantApi.verifyMember(cleanMembershipNumber);
      if (response.success) {
        setMemberVerificationResult(response.member);
      } else {
        setMemberVerificationResult({ error: response.message || 'Member not found' });
      }
    } catch (error) {
      console.error('Error verifying membership:', error);
      setMemberVerificationResult({ 
        error: error.response?.data?.message || 'Error verifying membership number' 
      });
    } finally {
      setVerificationLoading(false);
    }
  };

  // Handle membership search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      verifyMembershipNumber(membershipSearch);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [membershipSearch]);

  // Format membership number as XXXX XXXX XXXX XXXX
  const formatMembershipNumber = (value) => {
    // Remove all non-alphanumeric characters
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '');
    // Add spaces every 4 characters
    const formatted = cleaned.replace(/(.{4})/g, '$1 ').trim();
    return formatted;
  };

  const handleMembershipInputChange = (e) => {
    const formatted = formatMembershipNumber(e.target.value);
    setMembershipSearch(formatted);
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await merchantApi.getDashboard();
      
      if (response.data) {
        setStats(response.data.stats || {});
        setDeals(response.data.deals || []);
        setBusinessInfo(response.data.business || {});
        setPlanInfo(response.data.plan || {});
        setUserInfo(response.data.user || {});
        setRecentRedemptions(response.data.recentRedemptions || []);
        
        // Fetch redemption requests
        await fetchRedemptionRequests();
        
        // Update feature access based on user's membershipType from users table
        const membershipType = response.data.user?.membershipType || response.data.plan?.key || 'basic';
        updateFeatureAccess(membershipType);
        
        // Store businessId for use in deal creation
        if (response.data.business?.businessId) {
          localStorage.setItem('merchantBusinessId', response.data.business.businessId);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      
      // Handle 403 status for pending business approval
      if (error.response?.status === 403 && error.response?.data?.status === 'pending') {
        setUserInfo({ status: 'pending' });
        setBusinessInfo({ status: 'pending' });
        setPlanInfo({ membershipType: 'basic' });
        updateFeatureAccess('basic');
        return; // Don't set mock data for pending approval
      }
      
      // Set default basic plan for other errors
      updateFeatureAccess('basic');
    } finally {
      setLoading(false);
    }
  };

  const handleDealCreated = async (newDeal) => {
    setShowDealForm(false);
    if (newDeal) {
      setDeals(prev => [newDeal, ...prev]);
    }
    await fetchDashboardData(); // Refresh the dashboard data
  };

  const fetchRedemptions = async (dealId) => {
    try {
      const response = await axios.get(`/api/deals/${dealId}/redemptions`, { withCredentials: true });
      return response.data;
    } catch (error) {
      return [];
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await getNotifications();
      setNotifications(response.notifications || []);
      setUnreadCount(response.notifications?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Don't log as error if it's just missing notifications endpoint or pending approval
      if (error.response?.status === 404 || error.response?.status === 403) {
        setNotifications([]);
        setUnreadCount(0);
      }
    }
  };

  const markNotificationAsReadHandler = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllNotificationsAsReadHandler = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Redemption request management functions
  const fetchRedemptionRequests = async () => {
    try {
      console.log('[DEBUG] Fetching redemption requests...');
      const response = await getRedemptionRequests();
      console.log('[DEBUG] Redemption requests response:', response);
      if (response.success) {
        console.log('[DEBUG] Redemption requests (pending):', response.requests);
        setRedemptionRequests(response.requests || []);
      } else {
        console.warn('[DEBUG] Redemption requests fetch not successful:', response);
      }
    } catch (error) {
      console.error('[DEBUG] Error fetching redemption requests:', error);
      if (error.response?.status === 404 || error.response?.status === 403) {
        setRedemptionRequests([]);
      }
    }
  };

  const handleApproveRequest = async (requestId) => {
    if (!planAccess.canAccess('general')) {
      showNotification(planAccess.getBlockingMessage('general'), 'warning');
      return;
    }
    
    try {
      setProcessingRequest(requestId);
      const response = await approveRedemptionRequest(requestId);
      
      if (response.success) {
        showNotification('Redemption request approved successfully!', 'success');
        await fetchRedemptionRequests(); // Refresh the list
        await fetchDashboardData(); // Refresh stats
      }
    } catch (error) {
      console.error('Error approving request:', error);
      showNotification('Error approving redemption request', 'error');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (requestId, reason = '') => {
    if (!planAccess.canAccess('general')) {
      showNotification(planAccess.getBlockingMessage('general'), 'warning');
      return;
    }
    
    if (!reason) {
      // Show rejection modal to get reason
      setRejectionRequestId(requestId);
      setRejectionReason('');
      setShowRejectionModal(true);
      return;
    }

    try {
      setProcessingRequest(requestId);
      const response = await rejectRedemptionRequest(requestId, reason);
      
      if (response.success) {
        showNotification('Redemption request rejected', 'success');
        await fetchRedemptionRequests(); // Refresh the list
        setShowRejectionModal(false);
        setRejectionRequestId(null);
        setRejectionReason('');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      showNotification('Error rejecting redemption request', 'error');
    } finally {
      setProcessingRequest(null);
    }
  };

  const confirmRejection = () => {
    if (rejectionReason.trim()) {
      handleRejectRequest(rejectionRequestId, rejectionReason.trim());
    } else {
      showNotification('Please provide a reason for rejection', 'error');
    }
  };

  // Bulk action handlers
  const handleSelectRequest = (requestId) => {
    setSelectedRequests(prev => {
      if (prev.includes(requestId)) {
        return prev.filter(id => id !== requestId);
      } else {
        return [...prev, requestId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRequests([]);
    } else {
      const visibleRequests = redemptionRequests.slice(
        (redemptionRequestsPage - 1) * itemsPerPage, 
        redemptionRequestsPage * itemsPerPage
      );
      setSelectedRequests(visibleRequests.map(request => request.id));
    }
    setSelectAll(!selectAll);
  };

  const handleBulkApprove = async () => {
    if (selectedRequests.length === 0) {
      showNotification('Please select requests to approve', 'warning');
      return;
    }

    if (!planAccess.canAccess('general')) {
      showNotification(planAccess.getBlockingMessage('general'), 'warning');
      return;
    }

    try {
      setProcessingBulk(true);
      let successful = 0;
      let failed = 0;

      for (const requestId of selectedRequests) {
        try {
          const response = await approveRedemptionRequest(requestId);
          if (response.success) {
            successful++;
          } else {
            failed++;
          }
        } catch (error) {
          failed++;
        }
      }

      if (successful > 0) {
        showNotification(`${successful} requests approved successfully!`, 'success');
      }
      if (failed > 0) {
        showNotification(`${failed} requests failed to approve`, 'error');
      }

      setSelectedRequests([]);
      setSelectAll(false);
      await fetchRedemptionRequests();
      await fetchDashboardData();
    } catch (error) {
      console.error('Error in bulk approve:', error);
      showNotification('Error approving requests', 'error');
    } finally {
      setProcessingBulk(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedRequests.length === 0) {
      showNotification('Please select requests to reject', 'warning');
      return;
    }

    if (!planAccess.canAccess('general')) {
      showNotification(planAccess.getBlockingMessage('general'), 'warning');
      return;
    }

    const reason = 'Bulk rejection by merchant';

    try {
      setProcessingBulk(true);
      let successful = 0;
      let failed = 0;

      for (const requestId of selectedRequests) {
        try {
          const response = await rejectRedemptionRequest(requestId, reason);
          if (response.success) {
            successful++;
          } else {
            failed++;
          }
        } catch (error) {
          failed++;
        }
      }

      if (successful > 0) {
        showNotification(`${successful} requests rejected`, 'success');
      }
      if (failed > 0) {
        showNotification(`${failed} requests failed to reject`, 'error');
      }

      setSelectedRequests([]);
      setSelectAll(false);
      await fetchRedemptionRequests();
    } catch (error) {
      console.error('Error in bulk reject:', error);
      showNotification('Error rejecting requests', 'error');
    } finally {
      setProcessingBulk(false);
    }
  };

  const handleBusinessUpdate = (updatedBusiness) => {
    setBusinessInfo(updatedBusiness);
    setShowBusinessForm(false);
    // Refresh dashboard data to get latest info
    fetchDashboardData();
  };

  // Email functionality for contacting admin and upgrading plan
  const handleUpgradePlanEmail = () => {
    const currentPlan = userInfo?.membershipType || 'basic';
    const subject = encodeURIComponent('Plan Upgrade Request - Indians in Ghana Membership');
    const body = encodeURIComponent(`Dear Admin,

I hope this email finds you well.

I would like to upgrade my current plan for my Indians in Ghana membership account.

Current Plan Details:
- Current Plan: ${currentPlan}
- Account Email: ${userInfo?.email || user?.email || 'N/A'}
- Business Name: ${businessInfo?.businessName || 'N/A'}

I am interested in upgrading to a higher tier plan to access additional features and benefits. Please provide me with:
1. Available upgrade options
2. Pricing details for each plan
3. Payment process
4. Timeline for plan activation

Thank you for your time and assistance.

Best regards,
${userInfo?.fullName || userInfo?.name || user?.fullName || user?.name || 'Merchant'}`);
    
    const mailtoLink = `mailto:cards@indiansinghana.com?subject=${subject}&body=${body}`;
    window.open(mailtoLink, '_blank');
  };

  // Deal management functions
  const [editingDeal, setEditingDeal] = useState(null);
  const [showDealAnalytics, setShowDealAnalytics] = useState(false);
  const [dealAnalyticsData, setDealAnalyticsData] = useState(null);
  const [loadingDealAnalytics, setLoadingDealAnalytics] = useState(false);
  const [showDealDetails, setShowDealDetails] = useState(false);
  const [selectedDealDetails, setSelectedDealDetails] = useState(null);

  const handleViewAnalytics = async (deal) => {
    setShowDealAnalytics(true);
    setLoadingDealAnalytics(true);
    setDealAnalyticsData(null);
    
    try {
      const response = await merchantApi.getAnalytics(deal.id);
      setDealAnalyticsData(response);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      showNotification('Failed to load analytics', 'error');
    } finally {
      setLoadingDealAnalytics(false);
    }
  };

  const handleEditDeal = (deal) => {
    // Allow editing for pending_approval, rejected, active, or expired deals
    if (!['pending_approval', 'rejected', 'active', 'expired'].includes(deal.status)) {
      showNotification('Can only edit deals that are pending approval, rejected, live (active), or expired', 'error');
      return;
    }
    setEditingDeal(deal);
    setShowDealForm(true);
  };

  const handleViewDealDetails = (deal) => {
    setSelectedDealDetails(deal);
    setShowDealDetails(true);
  };

  const handleDeleteDeal = async (dealId, dealTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${dealTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await merchantApi.deleteDeal(dealId);
      
      // Remove deal from local state
      setDeals(prev => prev.filter(deal => deal.id !== dealId));
      
      // Update stats
      setStats(prev => ({
        ...prev,
        totalDeals: prev.totalDeals - 1,
        activeDeals: prev.activeDeals - (deals.find(d => d.id === dealId)?.status === 'active' ? 1 : 0),
        pendingDeals: prev.pendingDeals - (deals.find(d => d.id === dealId)?.status === 'pending_approval' ? 1 : 0)
      }));
      
      showNotification('Deal deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting deal:', error);
      showNotification(error.response?.data?.message || 'Failed to delete deal', 'error');
    }
  };

  // Copy to clipboard function
  const copyToClipboard = async (text, title) => {
    try {
      await navigator.clipboard.writeText(text);
      showNotification(`${title} details copied to clipboard!`, 'success');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      showNotification('Failed to copy to clipboard', 'error');
    }
  };

  const handleDealUpdated = (updatedDeal) => {
    console.log('[DEBUG] handleDealUpdated called with:', updatedDeal);
    
    setEditingDeal(null);
    setShowDealForm(false);
    
    if (updatedDeal) {
      console.log('[DEBUG] Updating deal in local state');
      // Update deal in local state
      setDeals(prev => prev.map(deal => 
        deal.id === updatedDeal.id ? { ...deal, ...updatedDeal } : deal
      ));
    } else {
      console.log('[DEBUG] No updated deal data provided, refreshing dashboard');
    }
    
    // Refresh dashboard data to get latest stats
    fetchDashboardData();
  };

  if (loading) {
    console.log('Component is in loading state, returning early');
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="merchant-dashboard">
      {/* Status Badge - Show if profile is pending, rejected, or suspended */}
      {(userInfo?.status && userInfo.status !== 'approved') || (businessInfo?.status && businessInfo.status !== 'active') ? (
        <div className={`status-alert ${userInfo?.status || businessInfo?.status}`}>
          <div className="status-alert-content">
            <div className="status-info">
              <i className={`fas ${
                (userInfo?.status === 'pending' || businessInfo?.status === 'pending') ? 'fa-clock' :
                (userInfo?.status === 'rejected' || businessInfo?.status === 'rejected') ? 'fa-times-circle' :
                (userInfo?.status === 'suspended' || businessInfo?.status === 'suspended') ? 'fa-ban' : 'fa-info-circle'
              }`}></i>
              <div className="status-text">
                <h4>
                  {(userInfo?.status === 'pending' || businessInfo?.status === 'pending') && 'Business Pending Admin Approval'}
                  {(userInfo?.status === 'rejected' || businessInfo?.status === 'rejected') && 'Business Rejected'}
                  {(userInfo?.status === 'suspended' || businessInfo?.status === 'suspended') && 'Business Suspended'}
                </h4>
                <p>
                  {(userInfo?.status === 'pending' || businessInfo?.status === 'pending') && 'Your business is not yet approved by the admin. Please wait for approval to access all merchant features.'}
                  {(userInfo?.status === 'rejected' || businessInfo?.status === 'rejected') && 'Your business has been rejected by the admin. Please contact support for more information.'}
                  {(userInfo?.status === 'suspended' || businessInfo?.status === 'suspended') && 'Your business has been suspended by the admin. Please contact support to resolve this issue.'}
                </p>
              </div>
            </div>
            {(userInfo?.status === 'pending' || businessInfo?.status === 'pending') && (
              <div className="status-actions">
                <span className="estimated-time">⏱️ Estimated review time: 1-3 business days</span>
              </div>
            )}
            {((userInfo?.status === 'rejected' || businessInfo?.status === 'rejected') || 
              (userInfo?.status === 'suspended' || businessInfo?.status === 'suspended')) && (
              <div className="status-actions">
                <button className="btn btn-outline btn-sm">
                  <i className="fas fa-envelope"></i> Contact Support
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="dashboard-header">
        <div className="dashboard-header-content">
          {(getMerchantLogoUrl({ logo: userInfo?.profilePhoto }) || businessInfo?.businessLogo) && (
            <div className="business-logo">
              <SmartImage
                src={getMerchantLogoUrl({ logo: userInfo?.profilePhoto }) || businessInfo?.businessLogo}
                alt={businessInfo?.businessName || user?.businessName || user?.business?.name || 'Business Logo'}
                className="business-logo-img"
                fallback="/api/placeholder/60/60"
                placeholder={
                  <div className="logo-placeholder">
                    <i className="fas fa-store"></i>
                  </div>
                }
              />
            </div>
          )}
          <div className="dashboard-title-section">
            <h1>
              {(businessInfo?.businessName || user?.businessName || user?.business?.name) && (
                <span className="business-name">
                  {businessInfo?.businessName || user?.businessName || user?.business?.name}
                </span>
              )}
              <span className="dashboard-label">Merchant Dashboard</span>
            </h1>
          </div>
        </div>
      </div>

      {/* Plan Expiry Banner */}
      <PlanExpiryBanner />

      {/* Notifications Section which is inactive */}
      {notifications.length > 0 && (
        <div className="notifications-section">
          <div className="card-header">
            <h2>
              <i className="fas fa-bell"></i> Notifications
              {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </h2>
            {unreadCount > 0 && (
              <button className="btn btn-outline btn-sm" onClick={markAllNotificationsAsReadHandler}>
                <i className="fas fa-check-double"></i> Mark All Read
              </button>
            )}
          </div>
          <div className="notifications-list">
            {notifications.slice(0, 5).map((notification) => (
              <div 
                key={notification.id} 
                className={`notification-item ${!notification.read ? 'unread' : ''}`}
                onClick={() => !notification.read && markNotificationAsReadHandler(notification.id)}
              >
                <div className="notification-icon">
                  <i className={`fas ${
                    notification.type === 'deal_approved' ? 'fa-check-circle text-success' :
                    notification.type === 'deal_rejected' ? 'fa-times-circle text-danger' :
                    'fa-info-circle text-info'
                  }`}></i>
                </div>
                <div className="notification-content">
                  <h4>{notification.title}</h4>
                  <p>{notification.message}</p>
                  <small className="notification-time">
                    {new Date(notification.created_at).toLocaleDateString('en-GB', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    })} at {new Date(notification.created_at).toLocaleTimeString()}
                  </small>
                </div>
                {!notification.read && <div className="unread-indicator"></div>}
              </div>
            ))}
            {notifications.length > 5 && (
              <div className="notification-item view-all">
                <div className="notification-content">
                  <p><i className="fas fa-ellipsis-h"></i> View all notifications</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Plan Access Information - Only show if business is approved */}
      {(userInfo?.status === 'approved' || (!userInfo?.status && businessInfo?.status !== 'pending')) && (
        <div className={`plan-access-banner ${
          getUserPlanLevel(userInfo?.membershipType)
        }`}>
          <div className="plan-access-content">
            <div className="plan-info-left">
              <h3>
                <i className={`fas ${getPlanIcon(userInfo?.membershipType)}`}></i>
                {planInfo.name || getPlanDisplayName(userInfo?.membershipType)} Plan
              </h3>
              {planInfo.description && (
                <p className="plan-description">{planInfo.description}</p>
              )}
              <div className="plan-details">
                <span className="plan-price">
                  {planInfo.price ? `${planInfo.currency || 'GHS'} ${planInfo.price}/${planInfo.billingCycle || 'year'}` : 'Free'}
                </span>
                <span className="plan-limit">
                  Deal Limit: {stats.dealLimit === -1 ? 'Unlimited' : `${stats.actualDealsThisMonth || 0}/${stats.dealLimit || 0} this month`}
                </span>
              </div>
            </div>
            <div className="plan-features-preview">
              <div className="feature-items">
                <span className={`feature-item ${isAnalyticsDisabled(userInfo?.membershipType) ? 'disabled' : 'enabled'}`}>
                  <i className={`fas ${isAnalyticsDisabled(userInfo?.membershipType) ? 'fa-ban' : 'fa-chart-line'}`}></i>
                  Analytics {isAnalyticsDisabled(userInfo?.membershipType) ? '✗' : '✓'}
                </span>
                <span className={`feature-item ${isStatisticsDisabled(userInfo?.membershipType) ? 'disabled' : 'enabled'}`}>
                  <i className={`fas ${isStatisticsDisabled(userInfo?.membershipType) ? 'fa-ban' : 'fa-chart-bar'}`}></i>
                  Statistics {isStatisticsDisabled(userInfo?.membershipType) ? '✗' : '✓'}
                </span>
                <span className={`feature-item ${isFeaturesDisabled(userInfo?.membershipType) ? 'disabled' : 'enabled'}`}>
                  <i className={`fas ${isFeaturesDisabled(userInfo?.membershipType) ? 'fa-ban' : 'fa-crown'}`}></i>
                  Featured {isFeaturesDisabled(userInfo?.membershipType) ? '✗' : '✓'}
                </span>
                <span className={`feature-item ${featureAccess.dealPosting !== 'none' ? 'enabled' : 'disabled'}`}>
                  <i className={`fas ${featureAccess.dealPosting !== 'none' ? 'fa-tags' : 'fa-ban'}`}></i>
                  Deal Posting {featureAccess.dealPosting !== 'none' ? '✓' : '✗'}
                </span>
              </div>
              {isBasicPlan(userInfo?.membershipType) && (
                <button className="btn btn-upgrade" onClick={handleUpgradePlanEmail}>
                  <i className="fas fa-arrow-up"></i> Upgrade Plan
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Stats Cards - Conditional based on plan and approval status */}
      {(userInfo?.status === 'approved' || (!userInfo?.status && businessInfo?.status !== 'pending')) ? (
        featureAccess.statisticsPanel ? (
          <>
            <h3 className="stats-heading">Deals and Redemption statistics</h3>
            <div className="stats-grid">
            <div className="stat-card primary">
              <div className="stat-icon">
                <i className="fas fa-tags"></i>
              </div>
              <div className="stat-content">
                <h3>{stats.totalDeals || 0}</h3>
                <p>Total Deals</p>
                <small className="stat-subtext">All time</small>
              </div>
            </div>
            
            <div className="stat-card success">
              <div className="stat-icon">
                <i className="fas fa-play-circle"></i>
              </div>
              <div className="stat-content">
                <h3>{stats.activeDeals || 0}</h3>
                <p>Active Deals</p>
                <small className="stat-subtext">Currently running</small>
              </div>
            </div>
            
            <div className="stat-card warning">
              <div className="stat-icon">
                <i className="fas fa-clock"></i>
              </div>
              <div className="stat-content">
                <h3>{stats.pendingDeals || 0}</h3>
                <p>Pending Approval</p>
                <small className="stat-subtext">Awaiting admin review</small>
              </div>
            </div>
            
            <div className="stat-card info">
              <div className="stat-icon">
                <i className="fas fa-eye"></i>
              </div>
              <div className="stat-content">
                <h3>{stats.totalViews || 0}</h3>
                <p>Total Views</p>
                <small className="stat-subtext">Deal impressions</small>
              </div>
            </div>
            
            <div className="stat-card accent">
              <div className="stat-icon">
                <i className="fas fa-shopping-cart"></i>
              </div>
              <div className="stat-content">
                <h3>{stats.totalRedemptions || 0}</h3>
                <p>Total Redemptions</p>
                <small className="stat-subtext">All time</small>
              </div>
            </div>
            
            <div className="stat-card secondary">
              <div className="stat-icon">
                <i className="fas fa-calendar-day"></i>
              </div>
              <div className="stat-content">
                <h3>{stats.todayRedemptions || 0}</h3>
                <p>Today's Redemptions</p>
                <small className="stat-subtext">Last 24 hours</small>
              </div>
            </div>
          </div>
          </>
        ) : (
          <div className="basic-stats-message">
            <div className="upgrade-prompt">
              <h3><i className="fas fa-star"></i> Upgrade to Access Statistics</h3>
              <p>Get detailed statistics about your business performance with our Platinum plans.</p>
              <div className="basic-features">
                <div className="basic-feature">
                  <i className="fas fa-check"></i> Business listing included
                </div>
                <div className="basic-feature">
                  <i className="fas fa-times"></i> Analytics & stats (Platinum+)
                </div>
                <div className="basic-feature">
                  <i className="fas fa-times"></i> Deal posting (Silver)
                </div>
                <div className="basic-feature">
                  <i className="fas fa-times"></i> Featured placement (Platinum)
                </div>
              </div>
              <button className="btn btn-primary" onClick={handleUpgradePlanEmail}>
                <i className="fas fa-arrow-up"></i> Upgrade Your Plan
              </button>
            </div>
          </div>
        )
      ) : (
        <div className="pending-approval-message">
          <div className="pending-content">
            <i className="fas fa-hourglass-half pending-icon"></i>
            <h3>Business Approval Pending</h3>
            <p>Your business is currently under review by our admin team. Once approved, you'll have access to:</p>
            <div className="pending-features">
              <div className="pending-feature">
                <i className="fas fa-chart-bar"></i>
                Business Analytics
              </div>
              <div className="pending-feature">
                <i className="fas fa-tags"></i>
                Deal Management
              </div>
              <div className="pending-feature">
                <i className="fas fa-users"></i>
                Customer Insights
              </div>
              <div className="pending-feature">
                <i className="fas fa-crown"></i>
                Premium Features
              </div>
            </div>
          </div>
        </div>
      )}      {/* Enhanced Business Info - Always shown, fully dynamic from DB */}
      <div className="dashboard-sections">
        <div className="business-info-card">
          <div className="card-header">
            <h2><i className="fas fa-store"></i> Business Information</h2>
            <button className="btn btn-outline btn-sm" onClick={() => setShowBusinessForm(true)}>
              <i className="fas fa-edit"></i> Edit
            </button>
          </div>
          <div className="business-details">
            <div className="detail-row">
              <div className="detail-item">
                <strong><i className="fas fa-building"></i> Business Name:</strong>
                <span>{businessInfo.businessName || 'Not provided'}</span>
              </div>
              <div className="detail-item">
                <strong><i className="fas fa-tag"></i> Category:</strong>
                <span>{businessInfo.businessCategory || 'Not specified'}</span>
              </div>
            </div>
            <div className="detail-row">
              <div className="detail-item">
                <strong><i className="fas fa-map-marker-alt"></i> Address:</strong>
                <span>{businessInfo.businessAddress || 'Not provided'}</span>
              </div>
              <div className="detail-item">
                <strong><i className="fas fa-phone"></i> Phone:</strong>
                <span>{businessInfo.businessPhone || 'Not provided'}</span>
              </div>
            </div>
            <div className="detail-row">
              <div className="detail-item">
                <strong><i className="fas fa-envelope"></i> Email:</strong>
                <span>{businessInfo.businessEmail || 'Not provided'}</span>
              </div>
              <div className="detail-item">
                <strong><i className="fas fa-globe"></i> Website:</strong>
                <span>{businessInfo.website || 'Not provided'}</span>
              </div>
            </div>
            <div className="detail-row">
              <div className="detail-item">
                <strong><i className="fas fa-id-badge"></i> Business ID:</strong>
                <span>{businessInfo.businessId || 'Not assigned'}</span>
              </div>
              <div className="detail-item">
                <strong><i className="fas fa-check-circle"></i> Status:</strong>
                <span className={`status-badge ${businessInfo.status || 'pending'}`}>
                  {businessInfo.status || 'Pending'}
                </span>
              </div>
            </div>
            <div className="detail-row">
              <div className="detail-item">
                <strong><i className="fas fa-calendar"></i> Created At:</strong>
                <span>{businessInfo.businessCreatedAt ? new Date(businessInfo.businessCreatedAt).toLocaleDateString('en-GB', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
                }) : 'Not available'}</span>
              </div>
            </div>
            <div className="detail-row">
              <div className="detail-item">
                <strong><i className="fas fa-certificate"></i> License:</strong>
                <span>{businessInfo.businessLicense || 'Not provided'}</span>
              </div>
              <div className="detail-item">
                <strong><i className="fas fa-file-invoice"></i> Tax ID:</strong>
                <span>{businessInfo.taxId || 'Not provided'}</span>
              </div>
            </div>
            <div className="detail-row">
              <div className="detail-item">
                <strong><i className="fas fa-users"></i> Membership Level:</strong>
                <span>{getPlanDisplayName(userInfo?.membershipType) || 'Not set'}</span>
              </div>
              <div className="detail-item">
                <strong><i className="fas fa-calendar-check"></i> Plan Expiry:</strong>
                <span>{businessInfo.planExpiryDate ? new Date(businessInfo.planExpiryDate).toLocaleDateString('en-GB', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
                }) : 'Not set'}</span>
              </div>
            </div>
            {businessInfo.businessDescription && (
              <div className="detail-row">
                <div className="detail-item full-width">
                  <strong><i className="fas fa-align-left"></i> Description:</strong>
                  <span>{businessInfo.businessDescription}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Plan Information */}
        <div className="plan-info-card">
          <div className="card-header">
            <h2><i className="fas fa-crown"></i> Current Plan</h2>
          </div>
          <div className="plan-details">
            <div className="plan-name">
              <h3>{planInfo.name || getPlanDisplayName(userInfo.membershipType || planInfo.key || 'basic')}</h3>
              <span className="plan-key">{planInfo.key || userInfo.membershipType || 'basic'}</span>
            </div>
            <div className="plan-limits">
              <div className="limit-item">
                <strong>
                  Deals This Month:
                  {businessInfo.customDealLimit && (
                    <span className="custom-limit-badge" title="Custom limit set by admin">
                      <i className="fas fa-star"></i> Custom
                    </span>
                  )}
                </strong>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{
                      width: `${Math.min(100, stats.dealLimit === -1 ? 0 : ((stats.actualDealsThisMonth || 0) / (stats.dealLimit || 10)) * 100)}%`
                    }}
                  ></div>
                </div>
                <span className="progress-text">
                  {stats.actualDealsThisMonth || 0} / {stats.dealLimit === -1 ? 'Unlimited' : (stats.dealLimit || 10)}
                </span>
                {businessInfo.customDealLimit && (
                  <small className="limit-explanation">
                    Custom limit: {businessInfo.customDealLimit} deals/month 
                    {planInfo.dealPostingLimit && planInfo.dealPostingLimit !== businessInfo.customDealLimit && (
                      <span> (Plan default: {planInfo.dealPostingLimit})</span>
                    )}
                  </small>
                )}
              </div>
              <div className="limit-item">
                <strong>Remaining:</strong>
                <span className="remaining-count">
                  {stats.dealLimit === -1 ? 'Unlimited' : (stats.dealLimitRemaining || 0)} deals
                </span>
              </div>
            </div>
            {(currentMerchantPlan?.features || planInfo.features) && (
              <div className="plan-features">
                <strong>Plan Features:</strong>
                <ul>
                  {/* Use currentMerchantPlan features from database if available, otherwise fallback to planInfo */}
                  {(currentMerchantPlan?.features ? 
                    (Array.isArray(currentMerchantPlan.features) ? 
                      currentMerchantPlan.features : 
                      currentMerchantPlan.features.split(',').map(f => f.trim())
                    ) : 
                    planInfo.features || []
                  ).map((feature, index) => (
                    <li key={index}><i className="fas fa-check"></i> {feature}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Plan Benefits for Merchants - removed as per requirements */}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <button 
            className={`btn ${stats.canPostDeals && planAccess.canAccess('post_deals') ? 'btn-primary' : 'btn-disabled'}`}
            onClick={() => {
              console.log('Create New Deal button clicked');
              if (!planAccess.canAccess('post_deals')) {
                showNotification(planAccess.getBlockingMessage('post_deals'), 'warning');
                return;
              }
              if (stats.canPostDeals) {
                setShowDealForm(true);
                console.log('setShowDealForm(true)');
              } else {
                alert(`You've reached your monthly deal limit of ${stats.dealLimit}. ${businessInfo.customDealLimit ? 'Contact admin to increase your custom limit.' : 'Upgrade your plan for more deals.'}`);
              }
            }}
            disabled={!stats.canPostDeals || !planAccess.canAccess('post_deals')}
            title={!planAccess.canAccess('post_deals') ? planAccess.getBlockingMessage('post_deals') : (!stats.canPostDeals ? `Deal limit reached (${stats.actualDealsThisMonth}/${stats.dealLimit})` : '')}
          >
            <i className="fas fa-plus"></i> Create New Deal
            {(!stats.canPostDeals || !planAccess.canAccess('post_deals')) && (
              <span className="limit-indicator">
                <i className="fas fa-exclamation-triangle"></i>
              </span>
            )}
          </button>
          <button className="btn btn-secondary" onClick={() => setShowBusinessForm(true)}>
            <i className="fas fa-edit"></i> Edit Business Info
          </button>
          {featureAccess.viewAnalyticsButton && (
            <button className="btn btn-accent" onClick={() => setShowAnalytics(true)}>
              <i className="fas fa-chart-bar"></i> View Analytics
            </button>
          )}
          <button 
            className={`btn ${planAccess.canAccess('general') ? 'btn-info' : 'btn-disabled'}`} 
            onClick={() => {
              if (!planAccess.canAccess('general')) {
                showNotification(planAccess.getBlockingMessage('general'), 'warning');
                return;
              }
              setShowMemberVerification(true);
            }}
            disabled={!planAccess.canAccess('general')}
            title={!planAccess.canAccess('general') ? planAccess.getBlockingMessage('general') : ''}
          >
            <i className="fas fa-user-check"></i> Verify Member
            {!planAccess.canAccess('general') && (
              <span className="limit-indicator">
                <i className="fas fa-exclamation-triangle"></i>
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Merchant Plan Upgrade Recommendations */}
      {upgradeRecommendations.length > 0 && (
        <div className="upgrade-section">
          <div className="upgrade-header">
            <h2>
              <i className="fas fa-rocket"></i>
              Grow Your Business
            </h2>
            <p>Unlock more features and reach more customers with an upgraded plan</p>
          </div>
          
          <div className="upgrade-plans-grid">
            {upgradeRecommendations.map((plan) => (
              <div key={plan.id} className="upgrade-plan-card merchant-upgrade">
                <div className="plan-header">
                  <h3>{plan.name}</h3>
                  <div className="plan-price">
                    <span className="currency">{plan.currency}</span>
                    <span className="amount">{plan.price}</span>
                    <span className="period">/{plan.billingCycle}</span>
                  </div>
                </div>
                
                <div className="plan-benefits">
                  <h4>What You'll Get:</h4>
                  <ul>
                    {/* Use dynamic features from database first, then fallback to getMerchantBenefits */}
                    {(plan.features ? 
                      (Array.isArray(plan.features) ? 
                        plan.features : 
                        plan.features.split(',').map(f => f.trim())
                      ) : 
                      getMerchantBenefits(plan)
                    ).slice(0, 5).map((benefit, index) => (
                      <li key={index}>
                        <i className="fas fa-check"></i>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="plan-features-highlight">
                  <div className="feature-comparison">
                    <div className="current-vs-upgrade">
                      <span className="current-label">Current: {currentMerchantPlan?.name || 'Basic'}</span>
                      <i className="fas fa-arrow-right"></i>
                      <span className="upgrade-label">Upgrade: {plan.name}</span>
                    </div>
                  </div>
                </div>
                
                <button 
                  className="btn-upgrade-plan"
                  onClick={() => {
                    // Open email client with prewritten text for plan upgrade
                    const currentPlan = userInfo?.membershipType || 'basic';
                    const subject = encodeURIComponent('Plan Upgrade Request - Indians in Ghana Membership');
                    const body = encodeURIComponent(`Dear Admin,

I hope this email finds you well.

I would like to upgrade my current plan for my Indians in Ghana membership account.

Current Plan Details:
- Current Plan: ${currentPlan}
- Target Plan: ${plan.name}
- Account Email: ${userInfo?.email || user?.email || 'N/A'}
- Business Name: ${businessInfo?.businessName || 'N/A'}

I am interested in upgrading to the ${plan.name} plan to access additional features and benefits. Please provide me with:
1. Pricing details for the ${plan.name} plan
2. Payment process
3. Timeline for plan activation
4. Any additional information about the upgrade

Thank you for your time and assistance.

Best regards,
${userInfo?.fullName || userInfo?.name || user?.fullName || user?.name || 'Merchant'}`);
                    
                    const mailtoLink = `mailto:cards@indiansinghana.com?subject=${subject}&body=${body}`;
                    window.open(mailtoLink, '_blank');
                  }}
                >
                  <i className="fas fa-arrow-up"></i>
                  Upgrade to {plan.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Redemptions */}
      {recentRedemptions && recentRedemptions.length > 0 && (
        <div className="recent-redemptions-section">
          <div className="card-header">
            <h2><i className="fas fa-history"></i> Recent Redemptions</h2>
          </div>
          <div className="redemptions-list">
            {recentRedemptions.slice((recentRedemptionsPage - 1) * itemsPerPage, recentRedemptionsPage * itemsPerPage).map((redemption, index) => (
              <div key={index} className="redemption-item">
                <div className="redemption-info">
                  <div className="user-info">
                    <i className="fas fa-user-circle"></i>
                    {shouldHideContactInfo(userInfo?.membershipType) ? (
                      <>
                        <span className="user-name-hidden">Customer</span>
                        <button 
                          className="btn btn-outline-primary btn-sm upgrade-btn"
                          onClick={() => setShowUpgradeModal(true)}
                        >
                          <i className="fas fa-lock"></i>
                          View Details
                        </button>
                      </>
                    ) : shouldBlurContactInfo(userInfo?.membershipType) ? (
                      <>
                        <span className="user-name">{blurText(redemption.fullName)}</span>
                        <span className="membership-number">#{redemption.membershipNumber}</span>
                        <small className="text-muted">
                          <i className="fas fa-eye-slash"></i> Upgrade to Premium for full details
                        </small>
                      </>
                    ) : (
                      <>
                        <span className="user-name">{redemption.fullName}</span>
                        <span className="membership-number">#{redemption.membershipNumber}</span>
                      </>
                    )}
                  </div>
                  <div className="deal-info">
                    <span className="deal-title">{redemption.dealTitle}</span>
                    <span className="redemption-date">
                      {new Date(redemption.redeemed_at || redemption.redeemedAt).toLocaleDateString('en-GB', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className="redemption-status">
                    <span className="status-badge success">Redeemed</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <PaginationComponent 
            currentPage={recentRedemptionsPage}
            totalItems={recentRedemptions.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setRecentRedemptionsPage}
            sectionName="Recent Redemptions"
            scrollTarget=".recent-redemptions-section"
          />
        </div>
      )}

      {/* Deal Management - Conditional based on plan */}
      {featureAccess.dealPosting !== 'none' ? (
        <div className="deals-section">
          {/* Deal Limit Warning */}
          {!stats.canPostDeals && (
            <div className="warning-banner">
              <i className="fas fa-exclamation-triangle"></i>
              <div className="warning-content">
                <h4>Deal Posting Limit Reached</h4>
                <p>
                  You've reached your monthly deal limit of {stats.dealLimit} deals. 
                  {stats.isCustomLimit 
                    ? ' Contact admin to increase your custom limit.'
                    : ' Upgrade your plan for more deals.'
                  }
                  {stats.nextMonthReset && (
                    <span className="reset-info">
                      <br />Limit resets on: {new Date(stats.nextMonthReset).toLocaleDateString('en-GB', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      })}
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
          
          <div className="section-header">
            <h2>Your Deals</h2>
            <button 
              className={`btn ${stats.canPostDeals && planAccess.canAccess('post_deals') ? 'btn-primary' : 'btn-disabled'}`}
              onClick={() => {
                if (!planAccess.canAccess('post_deals')) {
                  showNotification(planAccess.getBlockingMessage('post_deals'), 'warning');
                } else if (stats.canPostDeals) {
                  setShowDealForm(true);
                } else {
                  alert(`You've reached your monthly deal limit of ${stats.dealLimit}. ${stats.isCustomLimit ? 'Contact admin to increase your custom limit.' : 'Upgrade your plan for more deals.'}`);
                }
              }}
              disabled={!stats.canPostDeals || !planAccess.canAccess('post_deals')}
              title={!planAccess.canAccess('post_deals') ? planAccess.getBlockingMessage('post_deals') : (!stats.canPostDeals ? `Deal limit reached (${stats.actualDealsThisMonth}/${stats.dealLimit})` : '')}
            >
              <i className="fas fa-plus"></i> Add New Deal
              {(!stats.canPostDeals || !planAccess.canAccess('post_deals')) && (
                <span className="limit-indicator">
                  <i className="fas fa-exclamation-triangle"></i>
                </span>
              )}
            </button>
          </div>
          
          {deals.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-tags"></i>
              <h3>No Deals Yet</h3>
              <p>Create your first deal to start attracting customers!</p>
              <button 
                className={`btn ${stats.canPostDeals && planAccess.canAccess('post_deals') ? 'btn-primary' : 'btn-disabled'}`}
                onClick={() => {
                  if (!planAccess.canAccess('post_deals')) {
                    showNotification(planAccess.getBlockingMessage('post_deals'), 'warning');
                  } else if (stats.canPostDeals) {
                    setShowDealForm(true);
                  } else {
                    alert(`You've reached your monthly deal limit of ${stats.dealLimit}. ${stats.isCustomLimit ? 'Contact admin to increase your custom limit.' : 'Upgrade your plan for more deals.'}`);
                  }
                }}
                disabled={!stats.canPostDeals || !planAccess.canAccess('post_deals')}
                title={!planAccess.canAccess('post_deals') ? planAccess.getBlockingMessage('post_deals') : (!stats.canPostDeals ? `Deal limit reached (${stats.actualDealsThisMonth}/${stats.dealLimit})` : '')}
              >
                Create Deal
                {(!stats.canPostDeals || !planAccess.canAccess('post_deals')) && (
                  <span className="limit-indicator">
                    <i className="fas fa-exclamation-triangle"></i>
                  </span>
                )}
              </button>
            </div>
          ) : (
            <>
            <div className="deals-grid">
              {deals.slice((dealsPage - 1) * itemsPerPage, dealsPage * itemsPerPage).map(deal => {
                console.log('[DEBUG] Rendering deal:', deal.id, 'status:', deal.status, 'title:', deal.title);
                
                const isExpired = new Date(deal.validUntil) < new Date();
                const displayStatus = isExpired ? 'Expired' : deal.status;
                
                return (
                  <div key={deal.id} className={`deal-card ${isExpired ? 'expired-deal' : ''}`}>
                      {deal.bannerImage && (
                      <div className="deal-banner-container">
                        {/* Limited Badge - Show when member limit is set */}
                        {(deal.member_limit || deal.memberLimit) && (
                          <div className="deal-limited-badge">
                            <i className="fas fa-users"></i>
                            Limited
                          </div>
                        )}
                        <SmartImage 
                          src={getDealBannerUrl(deal)} 
                          alt={deal.title} 
                          className="deal-table-banner"
                          fallbackClass="deal-banner-placeholder"
                        />
                      </div>
                    )}
                    <div className="deal-header">
                      <h3>{deal.title}</h3>
                      <div className="deal-header-badges">
                        <span className={`status-badge ${isExpired ? 'expired' : deal.status}`}>
                          {displayStatus}
                        </span>
                        {/* Limited Badge for deals without banners */}
                        {!deal.bannerImage && (deal.member_limit || deal.memberLimit) && (
                          <span className="limited-badge-inline">
                            <i className="fas fa-users"></i>
                            Limited
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="deal-description">{deal.description}</p>
                    
                    {/* Show rejection reason if deal is rejected */}
                    {deal.status === 'rejected' && deal.rejection_reason && (
                      <div className="rejection-reason">
                        <div className="rejection-reason-header">
                          <i className="fas fa-exclamation-triangle"></i>
                          <strong>Rejection Reason:</strong>
                        </div>
                        <p className="rejection-reason-text">{deal.rejection_reason}</p>
                      </div>
                    )}
                    
                    {/* Access Level Display - Using requiredPlanPriority */}
                    {(deal.requiredPlanPriority !== null && deal.requiredPlanPriority !== undefined) || deal.accessLevel ? (
                      <div className="deal-access-level">
                        <i className="fas fa-users"></i>
                        <span>Access: {
                          (deal.requiredPlanPriority !== null && deal.requiredPlanPriority !== undefined) 
                            ? getPlanNameByPriority(deal.requiredPlanPriority)
                            : (deal.accessLevel === 'basic' ? 'Community (Basic)' :
                              deal.accessLevel === 'intermediate' ? 'Silver (Intermediate)' :
                              deal.accessLevel === 'full' ? 'Gold (Full)' :
                              deal.accessLevel === 'all' ? 'All Members' :
                              deal.accessLevel)
                        }</span>
                      </div>
                    ) : null}
                    
                    <div className="deal-meta">
                      <div className="deal-discount">
                        <strong>{deal.discount} OFF</strong>
                      </div>
                      <div className={`deal-expiry ${isExpired ? 'expired-date' : ''}`}>
                        {isExpired ? 'Expired: ' : 'Expires: '}
                        {new Date(deal.validUntil).toLocaleDateString('en-GB', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        })}
                      </div>
                    </div>
                    <div className="deal-stats">
                      <div className="stat-item">
                        <i className="fas fa-eye"></i>
                        <span>{deal.views} views</span>
                      </div>
                      <div className="stat-item">
                        <i className="fas fa-shopping-cart"></i>
                        <span>{deal.redemptions} used</span>
                      </div>
                      {deal.status === 'active' && (
                        <div className="stat-item">
                          <i className="fas fa-chart-line"></i>
                          <span>{deal.views > 0 ? ((deal.redemptions / deal.views) * 100).toFixed(1) : 0}% conversion</span>
                        </div>
                      )}
                    </div>
                    <div className="deal-actions">
                      {featureAccess.dealAnalyticsButton && (
                        <button 
                          className="btn btn-sm btn-accent" 
                          onClick={() => handleViewAnalytics(deal)}
                          title="View Analytics"
                        >
                          <i className="fas fa-chart-bar"></i> Analytics
                        </button>
                      )}
                      <button 
                        className="btn btn-sm btn-info" 
                        onClick={() => handleViewDealDetails(deal)}
                        title="View Deal Details"
                      >
                        <i className="fas fa-eye"></i> View
                      </button>
                      <button 
                        className="btn btn-sm btn-secondary" 
                        onClick={() => handleEditDeal(deal)}
                        disabled={!['pending_approval', 'rejected', 'active', 'expired'].includes(deal.status)}
                        title={['pending_approval', 'rejected', 'active', 'expired'].includes(deal.status) ? 'Edit deal' : 'Can only edit pending, rejected, live (active), or expired deals'}
                      >
                        <i className="fas fa-edit"></i> Edit
                      </button>
                      <button 
                        className="btn btn-sm btn-danger" 
                        onClick={() => handleDeleteDeal(deal.id, deal.title)}
                        title="Delete deal"
                      >
                        <i className="fas fa-trash"></i> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <PaginationComponent 
              currentPage={dealsPage}
              totalItems={deals.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setDealsPage}
              sectionName="Your Deals"
            />
            </>
          )}
        </div>
      ) : (
        <div className="deals-section">
          <div className="section-header">
            <h2>Deal Management</h2>
          </div>
          <div className="upgrade-deals-message">
            <div className="upgrade-prompt">
              <i className="fas fa-lock"></i>
              <h3>Deal Posting Requires Plan Upgrade</h3>
              <p>Upgrade to a Premium or Featured plan to start posting exclusive deals and attract more customers.</p>
              <div className="upgrade-benefits">
                <div className="benefit-item">
                  <i className="fas fa-check text-success"></i>
                  Post exclusive deals to attract customers
                </div>
                <div className="benefit-item">
                  <i className="fas fa-check text-success"></i>
                  Track deal performance and analytics
                </div>
                <div className="benefit-item">
                  <i className="fas fa-check text-success"></i>
                  Enhanced business visibility
                </div>
              </div>
              <button className="btn btn-primary">
                <i className="fas fa-arrow-up"></i> Upgrade to Premium
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Redemption Requests Section - Show for plans that can post deals */}
      {featureAccess.dealPosting !== 'none' && (
        <div className="redemption-requests-section">
          <div className="section-header">
            <h2>
               Redemption Requests
              {redemptionRequests.length > 0 && (
                <span className="request-count">{redemptionRequests.length}</span>
              )}
            </h2>
            <div className="header-actions">
              {/* Bulk Actions */}
              {selectedRequests.length > 0 && (
                <div className="bulk-actions">
                  <span className="selected-count">{selectedRequests.length} selected</span>
                  <button 
                    className="btn btn-success btn-sm"
                    onClick={handleBulkApprove}
                    disabled={processingBulk}
                  >
                    <i className="fas fa-check"></i>
                    {processingBulk ? 'Processing...' : 'Approve Selected'}
                  </button>
                  <button 
                    className="btn btn-danger btn-sm"
                    onClick={handleBulkReject}
                    disabled={processingBulk}
                  >
                    <i className="fas fa-times"></i>
                    {processingBulk ? 'Processing...' : 'Reject Selected'}
                  </button>
                </div>
              )}
              <button 
                className="btn btn-outline btn-sm" 
                onClick={() => setShowRedemptionRequests(!showRedemptionRequests)}
              >
                <i className={`fas ${showRedemptionRequests ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                {showRedemptionRequests ? 'Hide' : 'Show'} Requests
              </button>
            </div>
          </div>
          
          {showRedemptionRequests && (
            <div className="requests-container">
              {(() => {
                return redemptionRequests.length === 0 ? (
                  <div className="no-requests">
                    <div className="empty-state">
                      <i className="fas fa-inbox"></i>
                      <h3>No pending requests</h3>
                      <p>When customers request to redeem your deals, they'll appear here for your approval.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Select All Checkbox */}
                    <div className="select-all-container">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={handleSelectAll}
                        />
                        <span className="checkmark"></span>
                        Select All
                      </label>
                    </div>
                    <div className="requests-list">
                    {redemptionRequests.slice((redemptionRequestsPage - 1) * itemsPerPage, redemptionRequestsPage * itemsPerPage).map((request) => {
                      console.log('[DEBUG] Rendering request:', request);
                      return (
                        <div key={request.id} className="request-card">
                          <div className="request-header">
                            <div className="request-checkbox">
                              <label className="checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={selectedRequests.includes(request.id)}
                                  onChange={() => handleSelectRequest(request.id)}
                                />
                                <span className="checkmark"></span>
                              </label>
                            </div>
                            <div className="deal-info">
                              <h4>{request.dealTitle}</h4>
                              <span className="discount-badge">
                                {request.discount}{request.discountType === 'percentage' ? '%' : request.discountType} OFF
                              </span>
                            </div>
                            <div className="request-time">
                              <i className="fas fa-clock"></i>
                              {new Date(request.redeemed_at).toLocaleDateString('en-GB', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit'
                              })} at {new Date(request.redeemed_at).toLocaleTimeString()}
                            </div>
                          </div>
                          <div className="customer-info">
                            <div className="customer-details">
                              {shouldHideContactInfo(userInfo?.membershipType) ? (
                                <div className="customer-private">
                                  <i className="fas fa-user-shield"></i>
                                  <strong>Customer Information</strong>
                                  <button 
                                    className="btn btn-outline-primary btn-sm upgrade-btn"
                                    onClick={() => setShowUpgradeModal(true)}
                                  >
                                    <i className="fas fa-lock"></i>
                                    View Details
                                  </button>
                                </div>
                              ) : shouldBlurContactInfo(userInfo?.membershipType) ? (
                                <>
                                  <div className="customer-name">
                                    <i className="fas fa-user"></i>
                                    <strong>{blurText(request.userName || 'Customer')}</strong>
                                    <small className="text-muted ml-2">
                                      <i className="fas fa-eye-slash"></i> Upgrade for full details
                                    </small>
                                  </div>
                                  <div className="customer-contact">
                                    <i className="fas fa-phone"></i>
                                    <span>{blurText(request.phone || 'Phone not available')}</span>
                                    <small className="text-muted ml-2">
                                      <i className="fas fa-lock"></i> Upgrade to view
                                    </small>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="customer-name">
                                    <i className="fas fa-user"></i>
                                    <strong>{request.userName || 'Customer'}</strong>
                                  </div>
                                  <div className="customer-contact">
                                    <i className="fas fa-phone"></i>
                                    <span>{request.phone || 'Phone not available'}</span>
                                  </div>
                                </>
                              )}
                              {request.membershipNumber && (
                                <div className="membership-number">
                                  <i className="fas fa-id-card"></i>
                                  <span>Membership # {request.membershipNumber}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="request-actions">
                            <button 
                              className="btn btn-success btn-sm"
                              onClick={() => handleApproveRequest(request.id)}
                              disabled={processingRequest === request.id || !planAccess.canAccess('general')}
                              title={!planAccess.canAccess('general') ? planAccess.getBlockingMessage('general') : ''}
                            >
                              <i className="fas fa-check"></i>
                              {processingRequest === request.id ? 'Approving...' : 'Approve'}
                            </button>
                            <button 
                              className="btn btn-danger btn-sm"
                              onClick={() => handleRejectRequest(request.id)}
                              disabled={processingRequest === request.id || !planAccess.canAccess('general')}
                              title={!planAccess.canAccess('general') ? planAccess.getBlockingMessage('general') : ''}
                            >
                              <i className="fas fa-times"></i>
                              {processingRequest === request.id ? 'Rejecting...' : 'Reject'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </>
                );
              })()}
              {redemptionRequests.length > 0 && (
                <PaginationComponent 
                  currentPage={redemptionRequestsPage}
                  totalItems={redemptionRequests.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setRedemptionRequestsPage}
                  sectionName="Redemption Requests"
                  scrollTarget=".requests-container"
                />
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Deal Creation Modal */}
      {showDealForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <MerchantDealForm 
              deal={editingDeal}
              onDealCreated={editingDeal ? handleDealUpdated : handleDealCreated}
              onClose={() => {
                setShowDealForm(false);
                setEditingDeal(null);
              }}
              isEditing={!!editingDeal}
            />
          </div>
        </div>
      )}

      {/* Business Info Edit Modal */}
      {showBusinessForm && (
        <div className="modal-overlay">
          <div className="modal-content business-modal">
            <div className="modal-header">
              <h2><i className="fas fa-edit"></i> Edit Business Information</h2>
              <button className="modal-close" onClick={() => setShowBusinessForm(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              
              // Process website field with validation logic (similar to UnifiedRegistration)
              let websiteValue = formData.get('website');
              if (websiteValue) {
                // Remove https:// if user enters it
                if (websiteValue.startsWith('https://')) {
                  websiteValue = websiteValue.replace('https://', '');
                }
                
                // Remove http:// if user enters it
                if (websiteValue.startsWith('http://')) {
                  websiteValue = websiteValue.replace('http://', '');
                }
                
                // Ensure it starts with www. if not empty and doesn't already start with www.
                if (websiteValue && !websiteValue.startsWith('www.')) {
                  websiteValue = 'www.' + websiteValue;
                }
              }
              
              const businessData = {
                businessName: formData.get('businessName'),
                businessCategory: formData.get('businessCategory'),
                businessAddress: formData.get('businessAddress'),
                businessPhone: formData.get('businessPhone'),
                businessEmail: formData.get('businessEmail'),
                website: websiteValue, // Use processed website value
                businessLicense: formData.get('businessLicense'),
                taxId: formData.get('taxId'),
                businessDescription: formData.get('businessDescription')
              };
              
              try {
                const response = await merchantApi.updateProfile(businessData);
                showNotification('Business information updated successfully!', 'success');
                handleBusinessUpdate(response.business || businessData);
              } catch (error) {
                console.error('Error updating business info:', error);
                showNotification(error.response?.data?.message || 'Failed to update business information', 'error');
              }
            }}>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="businessName">Business Name *</label>
                  <input
                    type="text"
                    id="businessName"
                    name="businessName"
                    defaultValue={businessInfo.businessName || ''}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="businessCategory">Category *</label>
                  <div className="select-with-icon" style={{ position: 'relative' }}>
                    <select
                      id="businessCategory"
                      name="businessCategory"
                      defaultValue={businessInfo.businessCategory || ''}
                      required
                      style={{ paddingRight: '36px' }}
                    >
                      <option value="">Select Category</option>
                      {getBusinessCategoryOptions().map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                    <i className="fas fa-chevron-down dropdown-arrow" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}></i>
                  </div>
                </div>

                <div className="form-group full-width">
                  <label htmlFor="businessAddress">Address</label>
                  <input
                    type="text"
                    id="businessAddress"
                    name="businessAddress"
                    defaultValue={businessInfo.businessAddress || ''}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="businessPhone">Phone</label>
                  <input
                    type="tel"
                    id="businessPhone"
                    name="businessPhone"
                    defaultValue={businessInfo.businessPhone || ''}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="businessEmail">Email</label>
                  <input
                    type="email"
                    id="businessEmail"
                    name="businessEmail"
                    defaultValue={businessInfo.businessEmail || ''}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="website">Website</label>
                  <input
                    type="text"
                    id="website"
                    name="website"
                    defaultValue={businessInfo.website || ''}
                    placeholder="www.yourwebsite.com"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="businessLicense">Business License</label>
                  <input
                    type="text"
                    id="businessLicense"
                    name="businessLicense"
                    defaultValue={businessInfo.businessLicense || ''}
                    placeholder="License number or registration ID"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="taxId">Tax ID</label>
                  <input
                    type="text"
                    id="taxId"
                    name="taxId"
                    defaultValue={businessInfo.taxId || ''}
                    placeholder="Tax identification number"
                  />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="businessDescription">Business Description</label>
                  <textarea
                    id="businessDescription"
                    name="businessDescription"
                    defaultValue={businessInfo.businessDescription || ''}
                    rows="3"
                    placeholder="Describe your business and services"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowBusinessForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Business Info
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {showAnalytics && (
        <div className="modal-overlay">
          <div className="modal-content analytics-modal">
            <div className="modal-header">
              <h2><i className="fas fa-chart-bar"></i> Business Analytics</h2>
              <button className="modal-close" onClick={() => setShowAnalytics(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="analytics-content">
              {/* Overview Stats - Using real data from props */}
              <div className="analytics-section">
                <h3>Overview</h3>
                <div className="analytics-grid">
                  <div className="analytics-card">
                    <div className="analytics-icon">
                      <i className="fas fa-eye"></i>
                    </div>
                    <div className="analytics-info">
                      <div className="analytics-number">{stats.totalViews || 0}</div>
                      <div className="analytics-label">Total Views</div>
                    </div>
                  </div>
                  
                  <div className="analytics-card">
                    <div className="analytics-icon">
                      <i className="fas fa-shopping-cart"></i>
                    </div>
                    <div className="analytics-info">
                      <div className="analytics-number">{stats.totalRedemptions || 0}</div>
                      <div className="analytics-label">Total Redemptions</div>
                    </div>
                  </div>
                  
                  <div className="analytics-card">
                    <div className="analytics-icon">
                      <i className="fas fa-percentage"></i>
                    </div>
                    <div className="analytics-info">
                      <div className="analytics-number">
                        {stats.totalViews > 0 ? ((stats.totalRedemptions / stats.totalViews) * 100).toFixed(2) : 0}%
                      </div>
                      <div className="analytics-label">Conversion Rate</div>
                    </div>
                  </div>
                  
                  <div className="analytics-card">
                    <div className="analytics-icon">
                      <i className="fas fa-tags"></i>
                    </div>
                    <div className="analytics-info">
                      <div className="analytics-number">{deals.length || 0}</div>
                      <div className="analytics-label">Total Deals</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deal Performance - Using real deals data */}
              {deals && deals.length > 0 ? (
                <div className="analytics-section">
                  <h3>Deal Performance</h3>
                  <div className="deals-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Deal</th>
                          <th>Views</th>
                          <th>Redemptions</th>
                          <th>Status</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deals.slice(0, 10).map(deal => (
                          <tr key={deal.id}>
                            <td>{deal.title}</td>
                            <td>{deal.views || 0}</td>
                            <td>{deal.actualRedemptions || 0}</td>
                            <td>
                              <span className={`status-badge ${deal.status}`}>
                                {deal.status}
                              </span>
                            </td>
                            <td>
                              {deal.status === 'rejected' && deal.rejection_reason ? (
                                <div className="rejection-reason-cell" title={deal.rejection_reason}>
                                  <i className="fas fa-exclamation-triangle text-danger"></i>
                                  <span className="rejection-text">
                                    {deal.rejection_reason.length > 50 
                                      ? `${deal.rejection_reason.substring(0, 50)}...` 
                                      : deal.rejection_reason}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="analytics-section">
                  <h3>Deal Performance</h3>
                  <div className="no-data">
                    <i className="fas fa-chart-line"></i>
                    <p>No deals available yet. Create your first deal to see performance analytics.</p>
                  </div>
                </div>
              )}

              {/* Monthly Stats - Using real stats data */}
              <div className="analytics-section">
                <h3>This Month</h3>
                <div className="trends-grid">
                  <div className="trend-item">
                    <i className="fas fa-plus-circle"></i>
                    <div>
                      <div className="trend-number">{stats.thisMonthDeals || 0}</div>
                      <div className="trend-label">Deals Created</div>
                    </div>
                  </div>
                  <div className="trend-item">
                    <i className="fas fa-history"></i>
                    <div>
                      <div className="trend-number">{stats.todayRedemptions || 0}</div>
                      <div className="trend-label">Today's Redemptions</div>
                    </div>
                  </div>
                  <div className="trend-item">
                    <i className="fas fa-calendar"></i>
                    <div>
                      <div className="trend-number">{stats.actualDealsThisMonth || 0}</div>
                      <div className="trend-label">Deals This Month</div>
                    </div>
                  </div>
                  <div className="trend-item">
                    <i className="fas fa-chart-line"></i>
                    <div>
                      <div className="trend-number">
                        {stats.dealLimit === -1 ? '∞' : `${stats.dealLimitRemaining || 0}`}
                      </div>
                      <div className="trend-label">Deals Remaining</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAnalytics(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deal Analytics Modal */}
      {showDealAnalytics && (
        <div className="modal-overlay">
          <div className="modal-content deal-analytics-modal">
            <div className="modal-header">
              <h2>
                <i className="fas fa-chart-line"></i> 
                Deal Analytics
                {dealAnalyticsData?.deal && ` - ${dealAnalyticsData.deal.title}`}
              </h2>
              <button className="modal-close" onClick={() => setShowDealAnalytics(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="analytics-content">
              {loadingDealAnalytics ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>Loading analytics...</p>
                </div>
              ) : dealAnalyticsData ? (
                <>
                  {/* Key Metrics */}
                  <div className="analytics-section">
                    <h3>Key Metrics</h3>
                    <div className="analytics-grid">
                      <div className="analytics-card">
                        <div className="analytics-icon">
                          <i className="fas fa-eye"></i>
                        </div>
                        <div className="analytics-info">
                          <div className="analytics-number">{dealAnalyticsData.stats.totalViews}</div>
                          <div className="analytics-label">Total Views</div>
                        </div>
                      </div>
                      
                      <div className="analytics-card">
                        <div className="analytics-icon">
                          <i className="fas fa-shopping-cart"></i>
                        </div>
                        <div className="analytics-info">
                          <div className="analytics-number">{dealAnalyticsData.stats.approvedRedemptions}</div>
                          <div className="analytics-label">Approved Redemptions</div>
                        </div>
                      </div>
                      
                      <div className="analytics-card">
                        <div className="analytics-icon">
                          <i className="fas fa-clock"></i>
                        </div>
                        <div className="analytics-info">
                          <div className="analytics-number">{dealAnalyticsData.stats.pendingRedemptions}</div>
                          <div className="analytics-label">Pending Redemptions</div>
                        </div>
                      </div>
                      
                      <div className="analytics-card">
                        <div className="analytics-icon">
                          <i className="fas fa-percentage"></i>
                        </div>
                        <div className="analytics-info">
                          <div className="analytics-number">{dealAnalyticsData.stats.conversionRate}%</div>
                          <div className="analytics-label">Conversion Rate</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Time-based Analytics */}
                  <div className="analytics-section">
                    <h3>Recent Activity</h3>
                    <div className="analytics-grid">
                      <div className="analytics-card">
                        <div className="analytics-icon">
                          <i className="fas fa-calendar-day"></i>
                        </div>
                        <div className="analytics-info">
                          <div className="analytics-number">{dealAnalyticsData.stats.todayRedemptions}</div>
                          <div className="analytics-label">Today's Redemptions</div>
                        </div>
                      </div>
                      
                      <div className="analytics-card">
                        <div className="analytics-icon">
                          <i className="fas fa-calendar-week"></i>
                        </div>
                        <div className="analytics-info">
                          <div className="analytics-number">{dealAnalyticsData.stats.weeklyRedemptions}</div>
                          <div className="analytics-label">This Week</div>
                        </div>
                      </div>
                      
                      <div className="analytics-card">
                        <div className="analytics-icon">
                          <i className="fas fa-calendar-alt"></i>
                        </div>
                        <div className="analytics-info">
                          <div className="analytics-number">{dealAnalyticsData.stats.monthlyRedemptions}</div>
                          <div className="analytics-label">This Month</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Redemption History */}
                  {dealAnalyticsData.redemptions && dealAnalyticsData.redemptions.length > 0 && (
                    <div className="analytics-section">
                      <h3>Redemption History</h3>
                      <div className="redemptions-table">
                        <table>
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Customer</th>
                              <th>Plan</th>
                              <th>Status</th>
                              <th>Contact</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dealAnalyticsData.redemptions.slice(0, 20).map(redemption => (
                              <tr key={redemption.id}>
                                <td>{new Date(redemption.redemption_date).toLocaleDateString('en-GB', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit'
                                })}</td>
                                <td>
                                  {shouldHideContactInfo(userInfo?.membershipType) ? (
                                    <span className="private-info">
                                      <i className="fas fa-lock"></i> Private
                                    </span>
                                  ) : shouldBlurContactInfo(userInfo?.membershipType) ? (
                                    <>
                                      {blurText(redemption.user_name)}
                                      <small className="text-muted">
                                        <i className="fas fa-eye-slash"></i> Upgrade for full details
                                      </small>
                                    </>
                                  ) : (
                                    redemption.user_name
                                  )}
                                </td>
                                <td>
                                  <span className={`plan-badge ${redemption.user_plan?.toLowerCase()}`}>
                                    {redemption.user_plan || 'N/A'}
                                  </span>
                                </td>
                                <td>
                                  <span className={`status-badge ${redemption.status}`}>
                                    {redemption.status}
                                  </span>
                                </td>
                                <td>
                                  {shouldHideContactInfo(userInfo?.membershipType) ? (
                                    <span className="private-contact">
                                      <i className="fas fa-lock"></i> Upgrade to view
                                    </span>
                                  ) : shouldBlurContactInfo(userInfo?.membershipType) ? (
                                    redemption.user_phone ? (
                                      <>
                                        <span className="blurred-contact">
                                          <i className="fas fa-phone"></i> {blurText(redemption.user_phone)}
                                        </span>
                                        <small className="text-muted">
                                          <i className="fas fa-eye-slash"></i> Upgrade to view
                                        </small>
                                      </>
                                    ) : (
                                      <span className="no-contact">Not available</span>
                                    )
                                  ) : (
                                    redemption.user_phone ? (
                                      <a href={`tel:${redemption.user_phone}`} className="contact-link">
                                        <i className="fas fa-phone"></i> {redemption.user_phone}
                                      </a>
                                    ) : (
                                      <span className="no-contact">Not available</span>
                                    )
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-state">
                  <i className="fas fa-chart-line"></i>
                  <h3>No analytics data available</h3>
                  <p>Analytics data could not be loaded.</p>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDealAnalytics(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Verification Modal */}
      {showMemberVerification && (
        <div className="modal-overlay">
          <div className="modal-content member-verification-modal">
            <div className="modal-header">
              <h3>
                <i className="fas fa-user-check text-info"></i>
                Member Verification
              </h3>
              <button 
                className="close-btn" 
                onClick={() => {
                  setShowMemberVerification(false);
                  setMembershipSearch('');
                  setMemberVerificationResult(null);
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="info-message">
                <p><strong>🔍 Verify Member Authentication</strong></p>
                <p>Enter a membership number to verify the member's details and status in real-time.</p>
                <p><small><strong>Format:</strong> Enter membership number in XXXX XXXX XXXX XXXX format</small></p>
              </div>
              
              <div className="form-group">
                <label htmlFor="membershipSearch">Membership Number</label>
                <div className="search-input-container">
                  <input
                    id="membershipSearch"
                    type="text"
                    className="form-control"
                    placeholder="Enter membership number (e.g., 2025 0012 3456 7895)"
                    value={membershipSearch}
                    onChange={handleMembershipInputChange}
                    autoComplete="off"
                    maxLength="19"
                  />
                  {verificationLoading && (
                    <div className="search-loading">
                      <i className="fas fa-spinner fa-spin"></i>
                    </div>
                  )}
                </div>
              </div>

              {/* Verification Result */}
              {memberVerificationResult && (
                <div className="verification-result">
                  {memberVerificationResult.error ? (
                    <div className="verification-error">
                      <i className="fas fa-exclamation-circle"></i>
                      <h4>Member Not Found</h4>
                      <p>{memberVerificationResult.error}</p>
                    </div>
                  ) : (
                    <div className="verification-success">
                      <div className="member-details">
                        <div className="member-header">
                          <i className="fas fa-user-circle"></i>
                          <h4>Member Found</h4>
                          <span className={`status-badge ${memberVerificationResult.status}`}>
                            {memberVerificationResult.status}
                          </span>
                        </div>
                        
                        <div className="member-info-grid">
                          <div className="info-item">
                            <strong><i className="fas fa-user"></i> Full Name:</strong>
                            <span>{memberVerificationResult.fullName}</span>
                          </div>
                          <div className="info-item">
                            <strong><i className="fas fa-id-card"></i> Membership Number:</strong>
                            <span>{memberVerificationResult.membershipNumber}</span>
                          </div>
                          {/* Only show plan name for gold+ users */}
                          {!isBasicOrSilverUser(userInfo?.membershipType) && (
                            <div className="info-item">
                              <strong><i className="fas fa-crown"></i> Plan:</strong>
                              <span>{memberVerificationResult.planName || memberVerificationResult.membershipType || 'N/A'}</span>
                            </div>
                          )}
                          {/* Only show plan expiry for gold+ users */}
                          {!isBasicOrSilverUser(userInfo?.membershipType) && memberVerificationResult.validationDate && (
                            <div className="info-item">
                              <strong><i className="fas fa-calendar"></i> Plan Expiry:</strong>
                              <span className={memberVerificationResult.isExpired ? 'text-danger' : memberVerificationResult.daysUntilExpiry <= 7 ? 'text-warning' : 'text-success'}>
                                {new Date(memberVerificationResult.validationDate).toLocaleDateString('en-GB')}
                                {memberVerificationResult.isExpired ? ' (Expired)' : 
                                  memberVerificationResult.daysUntilExpiry <= 7 ? ` (${memberVerificationResult.daysUntilExpiry} days left)` : 
                                  ` (${memberVerificationResult.daysUntilExpiry} days left)`}
                              </span>
                            </div>
                          )}
                          <div className="info-item">
                            <strong><i className="fas fa-info-circle"></i> Plan Status:</strong>
                            <span className={`plan-status ${memberVerificationResult.isExpired ? 'expired' : 'active'}`}>
                              {memberVerificationResult.isExpired ? 'Expired' : 'Active'}
                            </span>
                          </div>
                        </div>

                        {/* Verification timestamp */}
                        <div className="verification-timestamp">
                          <small>
                            <i className="fas fa-clock"></i>
                            Verified at: {formatDateDDMMYYYY(new Date())}
                          </small>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!membershipSearch && !memberVerificationResult && (
                <div className="verification-placeholder">
                  <i className="fas fa-search"></i>
                  <p>Enter a membership number above to verify member details</p>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowMemberVerification(false)}
              >
                Close
              </button>
              {memberVerificationResult && !memberVerificationResult.error && (
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    setMembershipSearch('');
                    setMemberVerificationResult(null);
                  }}
                >
                  <i className="fas fa-search"></i>
                  Verify Another
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {showRejectionModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>
                <i className="fas fa-exclamation-triangle text-warning"></i>
                Reject Redemption Request
              </h3>
              <button 
                className="close-btn" 
                onClick={() => {
                  setShowRejectionModal(false);
                  setRejectionRequestId(null);
                  setRejectionReason('');
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="warning-message">
                <p><strong>⚠️ Please provide a reason for rejecting this redemption request.</strong></p>
                <p>This will help the customer understand why their request was declined.</p>
              </div>
              <div className="form-group">
                <label htmlFor="rejectionReason">Rejection Reason *</label>
                <textarea
                  id="rejectionReason"
                  className="form-control"
                  rows="4"
                  placeholder="Please explain why this redemption request is being rejected..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                />
                <small className="form-text text-muted">
                  Common reasons: Customer didn't meet deal requirements, Deal no longer available, Unable to verify customer identity, etc.
                </small>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowRejectionModal(false);
                  setRejectionRequestId(null);
                  setRejectionReason('');
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={confirmRejection}
                disabled={!rejectionReason.trim() || processingRequest === rejectionRequestId}
              >
                {processingRequest === rejectionRequestId ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Rejecting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-times me-1"></i>
                    Reject Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Plan Modal */}
      {showUpgradeModal && (
        <div className="modal-overlay">
          <div className="modal-content upgrade-modal">
            <div className="modal-header">
              <h3>
                <i className="fas fa-arrow-up"></i>
                Upgrade Your Plan
              </h3>
              <button className="modal-close" onClick={() => setShowUpgradeModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="upgrade-info">
                <i className="fas fa-info-circle"></i>
                <p>Upgrade your plan to access customer details and unlock additional features for your business.</p>
              </div>
              
              {upgradeRecommendations.length > 0 ? (
                <div className="upgrade-plans-grid">
                  {upgradeRecommendations.map((plan) => (
                    <div key={plan.id} className="upgrade-plan-card modal-plan">
                      <div className="plan-header">
                        <h4>{plan.name}</h4>
                        <div className="plan-price">
                          <span className="currency">{plan.currency}</span>
                          <span className="amount">{plan.price}</span>
                          <span className="billing">/{plan.billingCycle}</span>
                        </div>
                      </div>
                      <div className="plan-features">
                        <h5>Key Features:</h5>
                        <ul>
                          {plan.features && plan.features.split(',').slice(0, 4).map((feature, index) => (
                            <li key={index}>
                              <i className="fas fa-check"></i>
                              {feature.trim()}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <button className="btn btn-primary btn-upgrade">
                        <i className="fas fa-arrow-up"></i>
                        Upgrade to {plan.name}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-upgrades">
                  <i className="fas fa-crown"></i>
                  <p>You're already on the highest available plan!</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowUpgradeModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deal Details Modal */}
      {showDealDetails && selectedDealDetails && (
        <div className="modal-overlay" onClick={() => setShowDealDetails(false)}>
          <div className="modal-content deal-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Deal Details</h3>
              <button 
                className="modal-close-btn"
                onClick={() => setShowDealDetails(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="deal-details-content">
                {/* Deal Title and Status */}
                <div className="detail-section">
                  <h4>{selectedDealDetails.title}</h4>
                  <span className={`status-badge ${new Date(selectedDealDetails.validUntil) < new Date() ? 'expired' : selectedDealDetails.status}`}>
                    {new Date(selectedDealDetails.validUntil) < new Date() ? 'Expired' : selectedDealDetails.status}
                  </span>
                </div>

                {/* Deal Banner */}
                {selectedDealDetails.bannerImage && (
                  <div className="detail-section">
                    <label>Deal Banner:</label>
                    <div className="deal-banner-preview">
                      <SmartImage 
                        src={getDealBannerUrl(selectedDealDetails)} 
                        alt={selectedDealDetails.title} 
                        className="deal-detail-banner"
                        fallbackClass="deal-banner-placeholder"
                      />
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className="detail-section">
                  <label>Description:</label>
                  <p>{selectedDealDetails.description}</p>
                </div>

                {/* Pricing Information */}
                <div className="detail-section">
                  <label>Pricing:</label>
                  <div className="pricing-details">
                    <div className="price-item">
                      <span className="price-label">Original Price:</span>
                      <span className="price-value">₵{selectedDealDetails.originalPrice}</span>
                    </div>
                    <div className="price-item">
                      <span className="price-label">Deal Price:</span>
                      <span className="price-value discounted">₵{selectedDealDetails.discountedPrice}</span>
                    </div>
                    <div className="price-item">
                      <span className="price-label">Discount:</span>
                      <span className="price-value discount">
                        {selectedDealDetails.discountType === 'percentage' 
                          ? `${selectedDealDetails.discount}% OFF` 
                          : `GHS ${selectedDealDetails.discount} OFF`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Validity Period */}
                <div className="detail-section">
                  <label>Validity Period:</label>
                  <div className="validity-details">
                    <div className="validity-item">
                      <span className="validity-label">Valid From:</span>
                      <span className="validity-value">
                        {new Date(selectedDealDetails.validFrom).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="validity-item">
                      <span className="validity-label">Valid Until:</span>
                      <span className="validity-value">
                        {new Date(selectedDealDetails.validUntil).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="detail-section">
                  <label>Additional Information:</label>
                  <div className="additional-details">
                    <div className="detail-item">
                      <span className="detail-label">Category:</span>
                      <span className="detail-value">{selectedDealDetails.category}</span>
                    </div>
                    {selectedDealDetails.termsConditions && (
                      <div className="detail-item">
                        <span className="detail-label">Terms & Conditions:</span>
                        <span className="detail-value">{selectedDealDetails.termsConditions}</span>
                      </div>
                    )}
                    {(selectedDealDetails.member_limit || selectedDealDetails.memberLimit) && (
                      <div className="detail-item">
                        <span className="detail-label">Member Limit:</span>
                        <span className="detail-value">{selectedDealDetails.member_limit || selectedDealDetails.memberLimit} users</span>
                      </div>
                    )}
                    {selectedDealDetails.couponCode && (
                      <div className="detail-item">
                        <span className="detail-label">Coupon Code:</span>
                        <span className="detail-value">{selectedDealDetails.couponCode}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Statistics */}
                <div className="detail-section">
                  <label>Performance Statistics:</label>
                  <div className="stats-details">
                    <div className="stat-item">
                      <span className="stat-label">Views:</span>
                      <span className="stat-value">{selectedDealDetails.views || 0}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Redemptions:</span>
                      <span className="stat-value">{selectedDealDetails.redemptions || 0}</span>
                    </div>
                    {selectedDealDetails.views > 0 && (
                      <div className="stat-item">
                        <span className="stat-label">Conversion Rate:</span>
                        <span className="stat-value">{((selectedDealDetails.redemptions || 0) / selectedDealDetails.views * 100).toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rejection Reason if applicable */}
                {selectedDealDetails.status === 'rejected' && selectedDealDetails.rejection_reason && (
                  <div className="detail-section rejection-reason">
                    <label>Rejection Reason:</label>
                    <div className="rejection-message">
                      <i className="fas fa-exclamation-triangle"></i>
                      <p>{selectedDealDetails.rejection_reason}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowDealDetails(false)}
              >
                Close
              </button>
              {['pending_approval', 'rejected', 'active', 'expired'].includes(selectedDealDetails.status) && (
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    setShowDealDetails(false);
                    handleEditDeal(selectedDealDetails);
                  }}
                >
                  Edit Deal
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchantDashboard;
