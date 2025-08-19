import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import '../styles/plan-expiry-banner.css';

const PlanExpiryBanner = ({ showOnlyIfExpired = false }) => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [planStatus, setPlanStatus] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check plan status when user changes
  useEffect(() => {
    if (!user) {
      setPlanStatus(null);
      setIsVisible(false);
      return;
    }

    checkPlanStatus();
  }, [user]);

  const checkPlanStatus = () => {
    if (!user) return;

    const now = new Date();
    let expiryDate = null;
    let status = 'active';

    // ONLY use validationDate field - this is the source of truth for plan expiry
    if (user.validationDate) {
      expiryDate = new Date(user.validationDate);
    }

    if (expiryDate) {
      const timeDiff = expiryDate.getTime() - now.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

      if (daysDiff < 0) {
        status = 'expired';
      } else if (daysDiff <= 3) {
        status = 'expiring_soon';
      } else if (daysDiff <= 7) {
        status = 'expiring_warning';
      }
    }

    const planInfo = {
      status,
      expiryDate,
      daysRemaining: expiryDate ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 3600 * 24)) : null,
      userType: user.userType,
      planName: user.membershipType || user.membership || 'Basic',
      isLifetime: user.membershipType === 'lifetime' || user.membership === 'lifetime'
    };

    setPlanStatus(planInfo);

    // Show banner if conditions are met
    if (showOnlyIfExpired) {
      setIsVisible(status === 'expired' && !isDismissed);
    } else {
      setIsVisible((status === 'expired' || status === 'expiring_soon' || status === 'expiring_warning') && !isDismissed);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
    
    // Store dismissal in sessionStorage to persist during session
    if (planStatus?.status) {
      sessionStorage.setItem(`banner_dismissed_${planStatus.status}`, 'true');
    }
  };

  const handleContactAdmin = () => {
    showNotification('Please contact admin at admin@indiansinghana.com to renew your plan.', 'info');
  };

  const handleUpgradePlan = () => {
    // You can implement navigation to plan upgrade page here
    showNotification('Plan upgrade functionality coming soon. Please contact admin for now.', 'info');
  };

  // Check if banner was dismissed in this session
  useEffect(() => {
    if (planStatus?.status) {
      const wasDismissed = sessionStorage.getItem(`banner_dismissed_${planStatus.status}`) === 'true';
      setIsDismissed(wasDismissed);
    }
  }, [planStatus?.status]);

  if (!isVisible || !planStatus || planStatus.isLifetime) {
    return null;
  }

  const getBannerConfig = () => {
    switch (planStatus.status) {
      case 'expired':
        return {
          className: 'plan-banner-expired',
          icon: 'fas fa-exclamation-triangle',
          title: 'Plan Expired',
          message: `Your ${planStatus.planName} plan has expired. Your access to features is now limited.`,
          actionText: 'Renew Plan',
          urgency: 'high'
        };
      case 'expiring_soon':
        return {
          className: 'plan-banner-expiring-soon',
          icon: 'fas fa-clock',
          title: 'Plan Expiring Soon',
          message: `Your ${planStatus.planName} plan expires in ${planStatus.daysRemaining} day${planStatus.daysRemaining !== 1 ? 's' : ''}.`,
          actionText: 'Renew Now',
          urgency: 'medium'
        };
      case 'expiring_warning':
        return {
          className: 'plan-banner-expiring-warning',
          icon: 'fas fa-info-circle',
          title: 'Plan Expiring',
          message: `Your ${planStatus.planName} plan expires in ${planStatus.daysRemaining} days.`,
          actionText: 'Renew Plan',
          urgency: 'low'
        };
      default:
        return null;
    }
  };

  const bannerConfig = getBannerConfig();
  if (!bannerConfig) return null;

  return (
    <div className={`plan-expiry-banner ${bannerConfig.className} urgency-${bannerConfig.urgency}`}>
      <div className="banner-content">
        <div className="banner-icon">
          <i className={bannerConfig.icon}></i>
        </div>
        <div className="banner-text">
          <h4 className="banner-title">{bannerConfig.title}</h4>
          <p className="banner-message">{bannerConfig.message}</p>
          {planStatus.expiryDate && (
            <p className="banner-expiry-date">
              Expiry Date: {planStatus.expiryDate.toLocaleDateString('en-GB', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          )}
        </div>
        <div className="banner-actions">
          <button className="btn-renew" onClick={handleContactAdmin}>
            <i className="fas fa-envelope"></i>
            Contact Admin
          </button>
          {planStatus.status !== 'expired' && (
            <button className="btn-dismiss" onClick={handleDismiss}>
              <i className="fas fa-times"></i>
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanExpiryBanner;
