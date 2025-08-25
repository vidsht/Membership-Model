import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { merchantApi, getNotifications, markNotificationAsRead, markAllNotificationsAsRead, getRedemptionRequests, approveRedemptionRequest, rejectRedemptionRequest, getAllPlans } from '../services/api';
import MerchantDealForm from '../components/MerchantDealForm';
import PlanExpiryBanner from '../components/PlanExpiryBanner';
import axios from 'axios';
import { useImageUrl, SmartImage } from '../hooks/useImageUrl.jsx';
import '../styles/MerchantDashboard.css';

const MerchantDashboard = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const { getDealBannerUrl } = useImageUrl(); 
  const [deals, setDeals] = useState([]);
  const [plans, setPlans] = useState([]);
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
    fetchDashboardData();
    fetchNotifications();
    fetchPlans();
  }, []);

  // Fetch user plans for access level display
  const fetchPlans = async () => {
    try {
      const plansResponse = await getAllPlans('user', true);
      setPlans(Array.isArray(plansResponse) ? plansResponse : plansResponse.plans || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      setPlans([]);
    }
  };

  // Helper function to get plan name by priority
  const getPlanNameByPriority = (priority) => {
    if (!priority && priority !== 0) return 'All Members';
    
    const plan = plans.find(p => p.priority === priority);
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

  // Pagination helper component
  const PaginationComponent = ({ currentPage, totalItems, itemsPerPage, onPageChange, sectionName }) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    if (totalPages <= 1) return null;
    
    return (
      <div className="pagination-wrapper">
        <div className="pagination-info">
          Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items
        </div>
        <div className="pagination-controls">
          <button 
            className="btn btn-sm btn-outline"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <i className="fas fa-chevron-left"></i> Previous
          </button>
          <span className="page-indicator">
            Page {currentPage} of {totalPages}
          </span>
          <button 
            className="btn btn-sm btn-outline"
            onClick={() => onPageChange(currentPage + 1)}
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
        // Silver plans - limited features (DISABLE statistics, view analytics, deal analytics)
        access = {
          analytics: true,
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
        // Gold plans - full features (DISABLE view analytics and deal analytics)
        access = {
          analytics: true,
          advancedStats: true,
          businessDashboard: true,
          dealPosting: 'unlimited', // Maximum deal posting
          priorityListing: true,
          featuredPlacement: true,
          statisticsPanel: true, // ENABLED for gold
          viewAnalyticsButton: false, // DISABLED for gold
          dealAnalyticsButton: false // DISABLED for gold
        };
        break;
        
      case 'platinum_merchant':
      case 'platinum_business':
      case 'platinum':
        // Platinum plans - premium features (DISABLE only view analytics button)
        access = {
          analytics: true,
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
      // Use merchantApi abstraction for correct path
      const response = await merchantApi.verifyMember(membershipNumber);
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

  const handleBusinessUpdate = (updatedBusiness) => {
    setBusinessInfo(updatedBusiness);
    setShowBusinessForm(false);
    // Refresh dashboard data to get latest info
    fetchDashboardData();
  };

  // Deal management functions
  const [editingDeal, setEditingDeal] = useState(null);
  const [showDealAnalytics, setShowDealAnalytics] = useState(false);
  const [dealAnalyticsData, setDealAnalyticsData] = useState(null);
  const [loadingDealAnalytics, setLoadingDealAnalytics] = useState(false);

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
    // Check if deal can be edited
    if (!['pending_approval', 'rejected'].includes(deal.status)) {
      showNotification('Can only edit deals that are pending approval or rejected', 'error');
      return;
    }
    setEditingDeal(deal);
    setShowDealForm(true);
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

  const handleDealUpdated = (updatedDeal) => {
    setEditingDeal(null);
    setShowDealForm(false);
    
    if (updatedDeal) {
      // Update deal in local state
      setDeals(prev => prev.map(deal => 
        deal.id === updatedDeal.id ? { ...deal, ...updatedDeal } : deal
      ));
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
        <h1>Merchant Dashboard</h1>
      </div>

      {/* Plan Expiry Banner */}
      <PlanExpiryBanner />

      {/* Notifications Section */}
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
                    {new Date(notification.created_at).toLocaleDateString()} at {new Date(notification.created_at).toLocaleTimeString()}
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
                {getPlanDisplayName(userInfo?.membershipType)} Plan
              </h3>
              <p>
                {getPlanDescription(userInfo?.membershipType)}
              </p>
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
                <span className={`feature-item ${featureAccess.analytics ? 'enabled' : 'disabled'}`}>
                  <i className={`fas ${featureAccess.analytics ? 'fa-chart-line' : 'fa-ban'}`}></i>
                  Analytics {featureAccess.analytics ? '✓' : '✗'}
                </span>
                <span className={`feature-item ${featureAccess.dealPosting !== 'none' ? 'enabled' : 'disabled'}`}>
                  <i className={`fas ${featureAccess.dealPosting !== 'none' ? 'fa-tags' : 'fa-ban'}`}></i>
                  Deal Posting {featureAccess.dealPosting !== 'none' ? '✓' : '✗'}
                </span>
                <span className={`feature-item ${featureAccess.featuredPlacement ? 'enabled' : 'disabled'}`}>
                  <i className={`fas ${featureAccess.featuredPlacement ? 'fa-crown' : 'fa-ban'}`}></i>
                  Featured {featureAccess.featuredPlacement ? '✓' : '✗'}
                </span>
              </div>
              {isBasicPlan(userInfo?.membershipType) && (
                <button className="btn btn-upgrade">
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
        ) : (
          <div className="basic-stats-message">
            <div className="upgrade-prompt">
              <h3><i className="fas fa-star"></i> Upgrade to Access Statistics</h3>
              <p>Get detailed statistics about your business performance with our Gold or Platinum plans.</p>
              <div className="basic-features">
                <div className="basic-feature">
                  <i className="fas fa-check"></i> Business listing included
                </div>
                <div className="basic-feature">
                  <i className="fas fa-times"></i> Analytics & stats (Premium+)
                </div>
                <div className="basic-feature">
                  <i className="fas fa-times"></i> Deal posting (Premium+)
                </div>
                <div className="basic-feature">
                  <i className="fas fa-times"></i> Featured placement (Featured plans)
                </div>
              </div>
              <button className="btn btn-primary">
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
                <i className="fas fa-chart-bar"></i> Business Analytics
              </div>
              <div className="pending-feature">
                <i className="fas fa-tags"></i> Deal Management
              </div>
              <div className="pending-feature">
                <i className="fas fa-users"></i> Customer Insights
              </div>
              <div className="pending-feature">
                <i className="fas fa-crown"></i> Premium Features
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
                <span>{businessInfo.businessCreatedAt ? new Date(businessInfo.businessCreatedAt).toLocaleDateString() : 'Not available'}</span>
              </div>
              <div className="detail-item">
                <strong><i className="fas fa-user-shield"></i> Verified:</strong>
                <span>{businessInfo.isVerified ? 'Yes' : 'No'}</span>
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
                <span>{businessInfo.planExpiryDate ? new Date(businessInfo.planExpiryDate).toLocaleDateString() : 'Not set'}</span>
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
            <button className="btn btn-accent btn-sm">
              <i className="fas fa-arrow-up"></i> Upgrade
            </button>
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
            {planInfo.features && planInfo.features.length > 0 && (
              <div className="plan-features">
                <strong>Plan Features:</strong>
                <ul>
                  {planInfo.features.map((feature, index) => (
                    <li key={index}><i className="fas fa-check"></i> {feature}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <button 
            className={`btn ${stats.canPostDeals ? 'btn-primary' : 'btn-disabled'}`}
            onClick={() => {
              console.log('Create New Deal button clicked');
              if (stats.canPostDeals) {
                setShowDealForm(true);
                console.log('setShowDealForm(true)');
              } else {
                alert(`You've reached your monthly deal limit of ${stats.dealLimit}. ${businessInfo.customDealLimit ? 'Contact admin to increase your custom limit.' : 'Upgrade your plan for more deals.'}`);
              }
            }}
            disabled={!stats.canPostDeals}
            title={!stats.canPostDeals ? `Deal limit reached (${stats.actualDealsThisMonth}/${stats.dealLimit})` : ''}
          >
            <i className="fas fa-plus"></i> Create New Deal
            {!stats.canPostDeals && (
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
          <button className="btn btn-info" onClick={() => setShowMemberVerification(true)}>
            <i className="fas fa-user-check"></i> Verify Member
          </button>
        </div>
      </div>

      {/* Recent Redemptions */}
      {recentRedemptions && recentRedemptions.length > 0 && (
        <div className="recent-redemptions-section">
          <div className="card-header">
            <h2><i className="fas fa-history"></i> Recent Redemptions</h2>
            <button className="btn btn-outline btn-sm">
              <i className="fas fa-external-link-alt"></i> View All
            </button>
          </div>
          <div className="redemptions-list">
            {recentRedemptions.slice((recentRedemptionsPage - 1) * itemsPerPage, recentRedemptionsPage * itemsPerPage).map((redemption, index) => (
              <div key={index} className="redemption-item">
                <div className="redemption-info">
                  <div className="user-info">
                    <i className="fas fa-user-circle"></i>
                    <span className="user-name">{redemption.fullName}</span>
                    <span className="membership-number">#{redemption.membershipNumber}</span>
                  </div>
                  <div className="deal-info">
                    <span className="deal-title">{redemption.dealTitle}</span>
                    <span className="redemption-date">
                      {new Date(redemption.redeemed_at || redemption.redeemedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="redemption-status">
                  <span className="status-badge success">Redeemed</span>
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
                      <br />Limit resets on: {new Date(stats.nextMonthReset).toLocaleDateString()}
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
          
          <div className="section-header">
            <h2>Your Deals</h2>
            <button 
              className={`btn ${stats.canPostDeals ? 'btn-primary' : 'btn-disabled'}`}
              onClick={() => {
                if (stats.canPostDeals) {
                  setShowDealForm(true);
                } else {
                  alert(`You've reached your monthly deal limit of ${stats.dealLimit}. ${stats.isCustomLimit ? 'Contact admin to increase your custom limit.' : 'Upgrade your plan for more deals.'}`);
                }
              }}
              disabled={!stats.canPostDeals}
              title={!stats.canPostDeals ? `Deal limit reached (${stats.actualDealsThisMonth}/${stats.dealLimit})` : ''}
            >
              <i className="fas fa-plus"></i> Add New Deal
              {!stats.canPostDeals && (
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
                className={`btn ${stats.canPostDeals ? 'btn-primary' : 'btn-disabled'}`}
                onClick={() => {
                  if (stats.canPostDeals) {
                    setShowDealForm(true);
                  } else {
                    alert(`You've reached your monthly deal limit of ${stats.dealLimit}. ${stats.isCustomLimit ? 'Contact admin to increase your custom limit.' : 'Upgrade your plan for more deals.'}`);
                  }
                }}
                disabled={!stats.canPostDeals}
                title={!stats.canPostDeals ? `Deal limit reached (${stats.actualDealsThisMonth}/${stats.dealLimit})` : ''}
              >
                Create Deal
                {!stats.canPostDeals && (
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
                const isExpired = new Date(deal.validUntil) < new Date();
                const displayStatus = isExpired ? 'Expired' : deal.status;
                
                return (
                  <div key={deal.id} className={`deal-card ${isExpired ? 'expired-deal' : ''}`}>
                      {deal.bannerImage && (
                      <div className="deal-banner-container">
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
                      <span className={`status-badge ${isExpired ? 'expired' : deal.status}`}>
                        {displayStatus}
                      </span>
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
                        {new Date(deal.validUntil).toLocaleDateString()}
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
                        className="btn btn-sm btn-secondary" 
                        onClick={() => handleEditDeal(deal)}
                        disabled={!['pending_approval', 'rejected'].includes(deal.status)}
                        title={['pending_approval', 'rejected'].includes(deal.status) ? 'Edit deal' : 'Can only edit pending or rejected deals'}
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
              <i className="fas fa-hand-holding"></i> Redemption Requests
              {redemptionRequests.length > 0 && (
                <span className="request-count">{redemptionRequests.length}</span>
              )}
            </h2>
            <button 
              className="btn btn-outline btn-sm" 
              onClick={() => setShowRedemptionRequests(!showRedemptionRequests)}
            >
              <i className={`fas ${showRedemptionRequests ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              {showRedemptionRequests ? 'Hide' : 'Show'} Requests
            </button>
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
                  <div className="requests-list">
                    {redemptionRequests.slice((redemptionRequestsPage - 1) * itemsPerPage, redemptionRequestsPage * itemsPerPage).map((request) => {
                      console.log('[DEBUG] Rendering request:', request);
                      return (
                        <div key={request.id} className="request-card">
                          <div className="request-header">
                            <div className="deal-info">
                              <h4>{request.dealTitle}</h4>
                              <span className="discount-badge">
                                {request.discount}{request.discountType === 'percentage' ? '%' : request.discountType} OFF
                              </span>
                            </div>
                            <div className="request-time">
                              <i className="fas fa-clock"></i>
                              {new Date(request.redeemed_at).toLocaleDateString()} at {new Date(request.redeemed_at).toLocaleTimeString()}
                            </div>
                          </div>
                          <div className="customer-info">
                            <div className="customer-details">
                              <div className="customer-name">
                                <i className="fas fa-user"></i>
                                <strong>{request.userName || 'Customer'}</strong>
                              </div>
                              <div className="customer-contact">
                                <i className="fas fa-phone"></i>
                                <span>{request.phone || 'Phone not available'}</span>
                              </div>
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
                              disabled={processingRequest === request.id}
                            >
                              <i className="fas fa-check"></i>
                              {processingRequest === request.id ? 'Approving...' : 'Approve'}
                            </button>
                            <button 
                              className="btn btn-danger btn-sm"
                              onClick={() => handleRejectRequest(request.id)}
                              disabled={processingRequest === request.id}
                            >
                              <i className="fas fa-times"></i>
                              {processingRequest === request.id ? 'Rejecting...' : 'Reject'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              {redemptionRequests.length > 0 && (
                <PaginationComponent 
                  currentPage={redemptionRequestsPage}
                  totalItems={redemptionRequests.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setRedemptionRequestsPage}
                  sectionName="Redemption Requests"
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
              const businessData = {
                businessName: formData.get('businessName'),
                businessCategory: formData.get('businessCategory'),
                businessAddress: formData.get('businessAddress'),
                businessPhone: formData.get('businessPhone'),
                businessEmail: formData.get('businessEmail'),
                website: formData.get('website'),
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
                  <input
                    type="text"
                    id="businessCategory"
                    name="businessCategory"
                    defaultValue={businessInfo.businessCategory || ''}
                    required
                  />
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
                    type="url"
                    id="website"
                    name="website"
                    defaultValue={businessInfo.website || ''}
                    placeholder="https://"
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
                                <td>{new Date(redemption.redemption_date).toLocaleDateString()}</td>
                                <td>{redemption.user_name}</td>
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
                                  {redemption.user_phone && (
                                    <a href={`tel:${redemption.user_phone}`} className="contact-link">
                                      <i className="fas fa-phone"></i> {redemption.user_phone}
                                    </a>
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
              </div>
              
              <div className="form-group">
                <label htmlFor="membershipSearch">Membership Number</label>
                <div className="search-input-container">
                  <input
                    id="membershipSearch"
                    type="text"
                    className="form-control"
                    placeholder="Enter membership number (e.g., USR-000123)"
                    value={membershipSearch}
                    onChange={(e) => setMembershipSearch(e.target.value)}
                    autoComplete="off"
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
                          
                          <div className="info-item">
                            <strong><i className="fas fa-crown"></i> Membership Type:</strong>
                            <span className="membership-type">
                              {memberVerificationResult.membershipType || 'Basic'}
                            </span>
                          </div>
                          
                          <div className="info-item">
                            <strong><i className="fas fa-calendar-alt"></i> Plan Expiry:</strong>
                            <span className={memberVerificationResult.planExpiryDate ? 'expiry-date' : 'no-expiry'}>
                              {/* Plan expiry removed as per backend change */}
                            </span>
                          </div>
                          
                          <div className="info-item">
                            <strong><i className="fas fa-phone"></i> Contact:</strong>
                            <span>{memberVerificationResult.phone || 'Not provided'}</span>
                          </div>
                          
                          <div className="info-item">
                            <strong><i className="fas fa-envelope"></i> Email:</strong>
                            <span>{memberVerificationResult.email || 'Not provided'}</span>
                          </div>
                        </div>

                        {/* Plan Details if available */}
                        {memberVerificationResult.planName && (
                          <div className="plan-details">
                            <h5><i className="fas fa-star"></i> Plan Details</h5>
                            <div className="plan-info">
                              <span className="plan-name">{memberVerificationResult.planName}</span>
                              <span className="plan-priority">Priority: {memberVerificationResult.planPriority || 'N/A'}</span>
                            </div>
                          </div>
                        )}

                        {/* Verification timestamp */}
                        <div className="verification-timestamp">
                          <small>
                            <i className="fas fa-clock"></i>
                            Verified at: {new Date().toLocaleString()}
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
                onClick={() => {
                  setShowMemberVerification(false);
                  setMembershipSearch('');
                  setMemberVerificationResult(null);
                }}
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
    </div>
  );
};

export default MerchantDashboard;
