import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Custom hook to manage plan expiry checks and feature blocking
export const usePlanAccess = () => {
  const { user } = useAuth();
  const [planStatus, setPlanStatus] = useState({
      isExpired: false,
      isExpiringSoon: false,
      canAccessFeatures: true,
      canViewCard: true,
      canViewCertificate: true,
      canRedeemDeals: true,
      canPostDeals: true,
      expiryDate: null,
      daysRemaining: null,
      planName: null
    });

  useEffect(() => {
    if (!user) {
      setPlanStatus({
        isExpired: false,
        isExpiringSoon: false,
        canAccessFeatures: false,
        canViewCard: false,
        canViewCertificate: false,
        canRedeemDeals: false,
        canPostDeals: false,
        expiryDate: null,
        daysRemaining: null,
        planName: null
      });
      return;
    }

    checkPlanAccess();
  }, [user]);

  const checkPlanAccess = () => {
    if (!user) return;

    const now = new Date();
    let expiryDate = null;
    
    // ONLY use validationDate field - this is the source of truth for plan expiry
    if (user.validationDate) {
      expiryDate = new Date(user.validationDate);
    }

    const isLifetime = user.membershipType === 'lifetime' || user.membership === 'lifetime';
    const planName = user.membershipType || user.membership || 'Basic';
    
    let isExpired = false;
    let isExpiringSoon = false;
    let daysRemaining = null;

    // Calculate expiry status based on validationDate only
    if (expiryDate && !isLifetime) {
      const timeDiff = expiryDate.getTime() - now.getTime();
      daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      isExpired = daysRemaining < 0;
      isExpiringSoon = daysRemaining >= 0 && daysRemaining <= 7;
    }

    // Determine feature access based on plan status
    const canAccessFeatures = !isExpired || isLifetime;
    const canViewCard = !isExpired || isLifetime;
    const canViewCertificate = !isExpired || isLifetime;
    const canRedeemDeals = !isExpired || isLifetime;
    const canPostDeals = !isExpired || isLifetime;

    setPlanStatus({
      isExpired,
      isExpiringSoon,
      canAccessFeatures,
      canViewCard,
      canViewCertificate,
      canRedeemDeals,
      canPostDeals,
      expiryDate,
      daysRemaining,
      planName,
      isLifetime
    });
  };

    // Function to get blocking message based on feature
    const getBlockingMessage = (feature) => {
      if (!planStatus.isExpired) return null;
    
      const messages = {
        'card': `Your ${planStatus.planName} plan has expired. Please renew your plan to view your membership card.`,
        'certificate': `Your ${planStatus.planName} plan has expired. Please renew your plan to view your merchant certificate.`,
        'deals': `Your ${planStatus.planName} plan has expired. Please renew your plan to access deals.`,
        'redeem': `Your ${planStatus.planName} plan has expired. Please renew your plan to redeem deals.`,
        'post_deals': `Your ${planStatus.planName} plan has expired. Please renew your plan to post new deals.`,
        'general': `Your ${planStatus.planName} plan has expired. Please renew your plan or contact admin to restore access.`
      };

      return messages[feature] || messages['general'];
    };

    // Function to check if a specific feature is accessible
    const canAccess = (feature) => {
      if (planStatus.isLifetime) return true;
    
      switch (feature) {
        case 'card':
          return planStatus.canViewCard;
        case 'certificate':
          return planStatus.canViewCertificate;
        case 'deals':
        case 'redeem':
          return planStatus.canRedeemDeals;
        case 'post_deals':
          return planStatus.canPostDeals;
        default:
          return planStatus.canAccessFeatures;
      }
    };

    return {
      ...planStatus,
      getBlockingMessage,
      canAccess,
      refresh: checkPlanAccess
    };
  };

// Higher-order component to wrap components that need plan access checking
export const withPlanAccess = (WrappedComponent, requiredFeature = 'general') => {
  return function PlanAccessWrapper(props) {
    const planAccess = usePlanAccess();
    
    if (!planAccess.canAccess(requiredFeature)) {
      return (
        <div className="plan-access-blocked">
          <div className="blocked-content">
            <div className="blocked-icon">
              <i className="fas fa-lock"></i>
            </div>
            <h3>Access Restricted</h3>
            <p>{planAccess.getBlockingMessage(requiredFeature)}</p>
            <div className="blocked-actions">
              <button 
                className="btn-contact-admin"
                onClick={() => {
                  // Open email client with prewritten text for plan renewal
                  const subject = encodeURIComponent('Plan Renewal Request - Indians in Ghana Membership');
                  const body = encodeURIComponent(`Dear Admin,

I hope this email finds you well.

I am writing to request the renewal of my ${planStatus.planName} plan for my Indians in Ghana membership account.

Current Plan Details:
- Plan Type: ${planStatus.planName}
- Account Email: ${userInfo.email || 'N/A'}
- Access Issue: ${planAccess.getBlockingMessage(requiredFeature)}

Please let me know the renewal process and payment details so I can continue enjoying the benefits of my membership.

Thank you for your time and assistance.

Best regards,
${userInfo.fullName || userInfo.name || 'Member'}`);
                  
                  const mailtoLink = `mailto:cards@indiansinghana.com?subject=${subject}&body=${body}`;
                  window.open(mailtoLink, '_blank');
                }}
              >
                <i className="fas fa-envelope"></i>
                Contact Admin
              </button>
            </div>
          </div>
        </div>
      );
    }

    return <WrappedComponent {...props} planAccess={planAccess} />;
  };
};

export default usePlanAccess;
