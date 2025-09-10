import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PrivatePage } from '../components/SEOHead';
import MembershipCard from '../components/MembershipCard';
import MerchantCertificate from '../components/MerchantCertificate';
import PlanExpiryBanner from '../components/PlanExpiryBanner';
import { getAllPlans } from '../services/api';
import '../styles/MerchantDashboard.css'; // Import for status-alert styles

const Dashboard = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [upgradeRecommendations, setUpgradeRecommendations] = useState([]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await getAllPlans('user');
        console.log('Dashboard: Raw API response:', response);
        
        // Handle both direct array and {success: true, plans: []} response formats
        const plansData = Array.isArray(response) ? response : (response.plans || []);
        console.log('Dashboard: Processed plans data:', plansData);
        setPlans(plansData);
        
        // Find current user's plan
        const userPlanType = user?.membershipType || user?.membership || 'basic';
        console.log('Dashboard: User plan type:', userPlanType);
        
        // Primary matching should be by plan key, which matches membershipType
        const foundPlan = plansData.find(plan => 
          plan.key?.toLowerCase() === userPlanType.toLowerCase()
        ) || plansData.find(plan => 
          plan.name?.toLowerCase() === userPlanType.toLowerCase()
        ) || plansData.find(plan => 
          plan.type === userPlanType
        );
        console.log('Dashboard: Found current plan:', foundPlan);
        setCurrentPlan(foundPlan);

        // Get upgrade recommendations (plans with higher priority)
        const currentPriority = foundPlan?.priority || 0;
        const recommendations = plansData
          .filter(plan => plan.priority > currentPriority && plan.isActive)
          .sort((a, b) => a.priority - b.priority)
          .slice(0, 3); // Show max 3 upgrade options
        console.log('Dashboard: Upgrade recommendations:', recommendations);
        setUpgradeRecommendations(recommendations);
      } catch (error) {
        console.error('Error fetching plans:', error);
      }
    };

    if (user) {
      fetchPlans();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
        </div>
      </div>
    );
  }

  const getMembershipBenefits = (planData, userType) => {
    console.log('Dashboard: getMembershipBenefits called with:', { planData, userType });
    
    // First priority: Use features from API if available
    if (planData?.features && Array.isArray(planData.features) && planData.features.length > 0) {
      console.log('Dashboard: Using API features array:', planData.features);
      return planData.features.filter(feature => feature && feature.trim());
    }

    // Second priority: Use benefits array if available
    if (planData?.benefits && Array.isArray(planData.benefits)) {
      console.log('Dashboard: Using benefits array:', planData.benefits);
      return planData.benefits;
    }

    // Third priority: Parse features as string if it's a comma-separated string
    if (planData?.features && typeof planData.features === 'string') {
      const featuresArray = planData.features.split(',').map(f => f.trim()).filter(f => f);
      if (featuresArray.length > 0) {
        console.log('Dashboard: Using parsed features string:', featuresArray);
        return featuresArray;
      }
    }

    console.log('Dashboard: Falling back to hardcoded benefits');
    // Fallback to hardcoded benefits based on plan name/type
    const planName = planData?.name?.toLowerCase() || planData?.type?.toLowerCase() || 'basic';
    
    if (userType === 'merchant') {
      switch (planName) {
        case 'platinum':
        case 'platinum_business':
        case 'featured':
          return [
            'Premium business listing with featured placement',
            'Unlimited deal creation and promotion',
            'Advanced analytics and customer insights',
            'Priority customer support',
            'Community networking events access',
            'Monthly performance reports',
            'Featured logo placement on homepage'
          ];
        case 'gold':
        case 'gold_business':
        case 'premium':
          return [
            'Enhanced business listing',
            'Up to 20 deals per month',
            'Basic analytics dashboard',
            'Community networking access',
            'Email marketing support',
            'Monthly newsletter feature'
          ];
        case 'silver':
        case 'silver_business':
          return [
            'Standard business listing',
            'Up to 10 deals per month',
            'Basic business profile',
            'Community directory inclusion',
            'Event notifications'
          ];
        default:
          return [
            'Basic business listing',
            'Up to 5 deals per month',
            'Community directory access',
            'Basic customer support'
          ];
      }
    } else {
      // Regular user benefits
      switch (planName) {
        case 'platinum':
        case 'lifetime':
          return [
            'Unlimited exclusive deals access',
            'VIP event access and priority booking',
            'Concierge support services',
            'Digital membership card with premium design',
            'Community networking events',
            'Travel assistance and discounts',
            'Priority customer support'
          ];
        case 'gold':
          return [
            'Access to premium deals (up to 50% off)',
            'Priority event booking',
            'Enhanced member support',
            'Digital membership card',
            'Monthly community newsletter',
            'Networking event invitations'
          ];
        case 'silver':
          return [
            'Access to standard deals (up to 30% off)',
            'Event notifications and booking',
            'Digital membership card',
            'Community directory access',
            'Basic member support'
          ];
        default:
          return [
            'Basic membership card',
            'Community event updates',
            'Member directory access',
            'Newsletter subscription'
          ];
      }
    }
  };

  const getNextMembershipType = (current) => {
    switch (current) {
      case 'community': return 'silver';
      case 'silver': return 'gold';
      default: return null;
    }
  };

  return (
    <div className="dashboard-container">
      {/* Status Alert - Show if user status is pending, rejected, or suspended */}
      {user?.status && user.status !== 'approved' && (
        <div className={`status-alert ${user.status}`}>
          <div className="status-alert-content">
            <div className="status-info">
              <i className={`fas ${
                user.status === 'pending' ? 'fa-clock' :
                user.status === 'rejected' ? 'fa-times-circle' :
                user.status === 'suspended' ? 'fa-ban' : 'fa-info-circle'
              }`}></i>
              <div className="status-text">
                <h4>
                  {user.status === 'pending' && 'Account Pending Approval'}
                  {user.status === 'rejected' && 'Account Rejected'}
                  {user.status === 'suspended' && 'Account Suspended'}
                </h4>
                <p>
                  {user.status === 'pending' && 'Your account is pending approval. Some features may be limited until approved by an administrator.'}
                  {user.status === 'rejected' && 'Your account has been rejected. Please contact support for more information.'}
                  {user.status === 'suspended' && 'Your account has been suspended. Please contact support to resolve this issue.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="dashboard-header">
        <h1>Welcome back, {user.fullName}!</h1>
        <p>Manage your membership and explore community benefits</p>
      </div>

      {/* Plan Expiry Banner */}
      <PlanExpiryBanner />

      <div className="dashboard-grid">
        {/* Membership Card/Certificate Section */}
        <div className="dashboard-section">
          {user.userType === 'merchant' ? <MerchantCertificate /> : <MembershipCard />}
        </div>

        {/* Benefits Section */}
        <div className="benefits-section">
          <div className="benefits-header">
            <h2>
              <i className={`fas ${user.userType === 'merchant' ? 'fa-handshake' : 'fa-gift'}`}></i>
              Your {currentPlan?.name || 'Current'} Plan Benefits
            </h2>
            <p>
              {user.userType === 'merchant' 
                ? 'Exclusive advantages for business partners' 
                : 'Exclusive privileges for community members'
              }
            </p>
          </div>

          {/* Plan Details Card */}
          {currentPlan && (
            <div className="plan-details-card">
              <div className="plan-details-header">
                <div className="plan-info">
                  <h3>{currentPlan.name}</h3>
                  <p className="plan-description">{currentPlan.description || 'Premium membership plan'}</p>
                </div>
                <div className="plan-pricing">
                  <span className="price-amount">{currentPlan.currency} {currentPlan.price}</span>
                  <span className="billing-cycle">/{currentPlan.billingCycle}</span>
                </div>
              </div>
              
              <div className="plan-details-stats">
                {currentPlan.maxRedemptions && (
                  <div className="plan-stat">
                    <i className="fas fa-tags"></i>
                    <span>Up to {currentPlan.maxRedemptions} redemptions</span>
                  </div>
                )}
                {currentPlan.dealPostingLimit && (
                  <div className="plan-stat">
                    <i className="fas fa-bullhorn"></i>
                    <span>Up to {currentPlan.dealPostingLimit} deals/month</span>
                  </div>
                )}
                {currentPlan.priority && (
                  <div className="plan-stat">
                    <i className="fas fa-star"></i>
                    <span>Priority Level {currentPlan.priority}</span>
                  </div>
                )}
                {user.validationDate && (
                  <div className="plan-stat">
                    <i className="fas fa-calendar-check"></i>
                    <span>Valid until {new Date(user.validationDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="benefits-grid">
            {getMembershipBenefits(currentPlan, user.userType).map((benefit, index) => (
              <div key={index} className="benefit-card">
                <div className="benefit-icon">
                  <i className={`fas ${
                    benefit.includes('VIP') || benefit.includes('Priority') ? 'fa-crown' :
                    benefit.includes('deal') || benefit.includes('Deal') ? 'fa-tags' :
                    benefit.includes('event') || benefit.includes('Event') ? 'fa-calendar-alt' :
                    benefit.includes('support') || benefit.includes('Support') ? 'fa-headset' :
                    benefit.includes('analytics') || benefit.includes('Analytics') ? 'fa-chart-line' :
                    benefit.includes('card') || benefit.includes('Card') ? 'fa-id-card' :
                    benefit.includes('listing') || benefit.includes('Listing') ? 'fa-store' :
                    'fa-check-circle'
                  }`}></i>
                </div>
                <h3>{benefit.split(' ').slice(0, 3).join(' ')}</h3>
                <p>{benefit}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Upgrade Recommendations Section */}
        {upgradeRecommendations.length > 0 && (
          <div className="upgrade-section">
            <div className="upgrade-header">
              <h2>
                <i className="fas fa-arrow-up"></i>
                Upgrade Your Plan
              </h2>
              <p>Unlock more benefits and exclusive features with a higher plan</p>
            </div>
            
            <div className="upgrade-plans-grid">
              {upgradeRecommendations.map((plan) => (
                <div key={plan.id} className="upgrade-plan-card">
                  <div className="plan-header">
                    <h3>{plan.name}</h3>
                    <div className="plan-price">
                      <span className="currency">{plan.currency}</span>
                      <span className="amount">{plan.price}</span>
                      <span className="period">/{plan.billingCycle}</span>
                    </div>
                  </div>
                  
                  <div className="plan-benefits">
                    <h4>Additional Benefits:</h4>
                    <ul>
                      {getMembershipBenefits(plan, user.userType).slice(0, 4).map((benefit, index) => (
                        <li key={index}>
                          <i className="fas fa-check"></i>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <button className="btn-upgrade-plan">
                    <i className="fas fa-arrow-up"></i>
                    Upgrade to {plan.name}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SEO Meta Tags for Dashboard */}
      <PrivatePage 
        title="Dashboard - Indians in Ghana Membership"
        description="Access your membership dashboard, view exclusive deals, and manage your Indian community membership in Ghana."
      />
    </div>
  );
};

export default Dashboard;
