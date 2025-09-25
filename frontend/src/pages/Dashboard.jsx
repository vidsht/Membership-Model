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

  // Helper function to calculate remaining days
  const calculateRemainingDays = (validationDate) => {
    if (!validationDate) return null;
    
    const today = new Date();
    const expiryDate = new Date(validationDate);
    
    // Reset time to midnight for accurate day calculation
    today.setHours(0, 0, 0, 0);
    expiryDate.setHours(0, 0, 0, 0);
    
    const timeDiff = expiryDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    return daysDiff;
  };

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

  // Determine the best display name: for merchants prefer their business name from multiple possible fields
  const displayName = user?.userType === 'merchant'
    ? (user.businessName || user.business?.name || user.business?.businessName || user.business?.companyName || user.profile?.businessName || user.fullName)
    : user.fullName;

  const getMembershipBenefits = (planData, userType) => {
    console.log('Dashboard: getMembershipBenefits called with:', { planData, userType });

    // Collect dynamic fields that may contain benefit/feature points
    const candidateKeys = Object.keys(planData || {}).filter(k => /feature|benefit|points|perks/i.test(k));

    const collectFromValue = (val) => {
      if (!val && val !== 0) return [];
      if (Array.isArray(val)) return val.map(v => (typeof v === 'string' ? v.trim() : String(v))).filter(Boolean);
      if (typeof val === 'string') {
        // split by commas or newlines
        return val.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
      }
      // fallback: stringify
      return [String(val)];
    };

    // Aggregate all discovered feature/benefit-like fields to ensure nothing is missed
    let aggregated = [];
    candidateKeys.forEach(key => {
      aggregated = aggregated.concat(collectFromValue(planData[key]));
    });

    // Also check common top-level names explicitly
    if ((planData?.features && !candidateKeys.includes('features'))) {
      aggregated = aggregated.concat(collectFromValue(planData.features));
    }
    if ((planData?.benefits && !candidateKeys.includes('benefits'))) {
      aggregated = aggregated.concat(collectFromValue(planData.benefits));
    }

    // Deduplicate while preserving order
    const seen = new Set();
    const unique = aggregated.map(s => s.trim()).filter(Boolean).filter(item => {
      const lower = item.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });

    if (unique.length > 0) {
      console.log('Dashboard: Aggregated dynamic benefits/features:', unique);
      return unique;
    }

    console.log('Dashboard: Falling back to hardcoded benefits');
    // Lightweight filter used for hardcoded fallbacks: trim, remove empty, dedupe
    const filterBenefits = (benefits) => {
      if (!Array.isArray(benefits)) return [];
      const cleaned = benefits.map(b => (typeof b === 'string' ? b.trim() : String(b))).filter(Boolean);
      return cleaned.filter((v, i) => cleaned.findIndex(x => x.toLowerCase() === v.toLowerCase()) === i);
    };
    // Fallback to hardcoded benefits based on plan name/type
    const planName = planData?.name?.toLowerCase() || planData?.type?.toLowerCase() || 'basic';
    
    let hardcodedBenefits = [];
    
    if (userType === 'merchant') {
      switch (planName) {
        case 'platinum':
        case 'platinum_business':
        case 'featured':
          hardcodedBenefits = [
            'Premium business listing with featured placement',
            'Unlimited deal creation and promotion',
            'Advanced analytics and customer insights',
            'Priority customer support',
            'Monthly performance reports',
            'Featured logo placement on homepage'
          ];
          break;
        case 'gold':
        case 'gold_business':
        case 'premium':
          hardcodedBenefits = [
            'Enhanced business listing',
            'Up to 20 deals per month',
            'Basic analytics dashboard',
            'Email marketing support',
            'Monthly newsletter feature'
          ];
          break;
        case 'silver':
        case 'silver_business':
          hardcodedBenefits = [
            'Standard business listing',
            'Up to 10 deals per month',
            'Basic business profile',
            'Community directory inclusion',
            'Event notifications'
          ];
          break;
        default:
          hardcodedBenefits = [
            'Basic business listing',
            'Up to 5 deals per month',
            'Basic customer support'
          ];
      }
    } else {
      // Regular user benefits (filtered to exclude specified types)
      switch (planName) {
        case 'platinum':
        case 'lifetime':
          hardcodedBenefits = [
            'Unlimited exclusive deals',
            'VIP event booking',
            'Concierge support services',
            'Digital membership card with premium design',
            'Travel assistance and discounts',
            'Priority customer support'
          ];
          break;
        case 'gold':
          hardcodedBenefits = [
            'Premium deals (up to 50% off)',
            'Priority event booking',
            'Enhanced member support',
            'Digital membership card',
            'Monthly newsletter',
            'Networking event invitations'
          ];
          break;
        case 'silver':
          hardcodedBenefits = [
            'Standard deals (up to 30% off)',
            'Event notifications and booking',
            'Digital membership card',
            'Basic member support'
          ];
          break;
        default:
          hardcodedBenefits = [
            'Basic membership card',
            'Member directory listing',
            'Newsletter subscription'
          ];
      }
    }
    
    // Apply the same filtering to hardcoded benefits
    return filterBenefits(hardcodedBenefits);
  };

  // Helper function to get appropriate icon for a benefit
  const getBenefitIcon = (benefit, index) => {
    const benefitLower = benefit.toLowerCase();
    
    // Icon mapping based on benefit content
    if (benefitLower.includes('deal') || benefitLower.includes('offer') || benefitLower.includes('discount')) {
      return 'fas fa-bullhorn';
    } else if (benefitLower.includes('card') || benefitLower.includes('membership')) {
      return 'fas fa-id-card';
    } else if (benefitLower.includes('support') || benefitLower.includes('customer service')) {
      return 'fas fa-headset';
    } else if (benefitLower.includes('analytic') || benefitLower.includes('report') || benefitLower.includes('insight')) {
      return 'fas fa-chart-bar';
    } else if (benefitLower.includes('event') || benefitLower.includes('booking') || benefitLower.includes('community')) {
      return 'fas fa-calendar-star';
    } else if (benefitLower.includes('listing') || benefitLower.includes('directory') || benefitLower.includes('profile')) {
      return 'fas fa-store';
    } else if (benefitLower.includes('marketing') || benefitLower.includes('newsletter') || benefitLower.includes('email')) {
      return 'fas fa-envelope';
    } else if (benefitLower.includes('travel') || benefitLower.includes('assistance')) {
      return 'fas fa-plane';
    } else if (benefitLower.includes('priority') || benefitLower.includes('vip') || benefitLower.includes('premium')) {
      return 'fas fa-crown';
    } else if (benefitLower.includes('unlimited') || benefitLower.includes('exclusive')) {
      return 'fas fa-infinity';
    } else if (benefitLower.includes('reach') || benefitLower.includes('network') || benefitLower.includes('connection')) {
      return 'fas fa-users';
    } else if (benefitLower.includes('engage') || benefitLower.includes('loyalty') || benefitLower.includes('relationship')) {
      return 'fas fa-heart';
    }
    
    // Default icons based on index for variety
    const defaultIcons = [
      'fas fa-star',
      'fas fa-gift',
      'fas fa-percentage',
      'fas fa-check-circle',
      'fas fa-thumbs-up',
      'fas fa-medal'
    ];
    
    return defaultIcons[index % defaultIcons.length];
  };

  // Helper function to extract or generate title from benefit text
  const getBenefitTitle = (benefit) => {
    // If the benefit is already structured as a title, use it as-is
    if (benefit.length <= 50 && !benefit.includes('.')) {
      return benefit;
    }
    
    // Extract meaningful title from longer text
    const benefitLower = benefit.toLowerCase();
    
    if (benefitLower.includes('deal') && benefitLower.includes('unlimited')) {
      return 'Unlimited Deal Creation';
    } else if (benefitLower.includes('deal')) {
      return 'Deal & Offer Promotion';
    } else if (benefitLower.includes('listing') && benefitLower.includes('premium')) {
      return 'Premium Business Listing';
    } else if (benefitLower.includes('listing') && benefitLower.includes('featured')) {
      return 'Featured Business Listing';
    } else if (benefitLower.includes('listing')) {
      return 'Business Directory Listing';
    } else if (benefitLower.includes('analytic')) {
      return 'Business Analytics';
    } else if (benefitLower.includes('support') && benefitLower.includes('priority')) {
      return 'Priority Customer Support';
    } else if (benefitLower.includes('support')) {
      return 'Customer Support';
    } else if (benefitLower.includes('marketing')) {
      return 'Marketing Support';
    } else if (benefitLower.includes('card')) {
      return 'Digital Membership Card';
    } else if (benefitLower.includes('event')) {
      return 'Exclusive Events Access';
    } else if (benefitLower.includes('travel')) {
      return 'Travel Benefits';
    } else if (benefitLower.includes('newsletter')) {
      return 'Newsletter Features';
    } else if (benefitLower.includes('concierge')) {
      return 'Concierge Services';
    }
    
    // Fallback: use first few words as title
    const words = benefit.split(' ');
    if (words.length <= 4) {
      return benefit;
    }
    return words.slice(0, 4).join(' ') + '...';
  };

  // Helper function to extract or generate description from benefit text
  const getBenefitDescription = (benefit) => {
    // If it's already a good description (contains periods), use it
    if (benefit.includes('.') && benefit.length > 50) {
      return benefit;
    }
    
    // Generate descriptions for common benefit types
    const benefitLower = benefit.toLowerCase();
    
    if (benefitLower.includes('deal') && benefitLower.includes('unlimited')) {
      return 'Create and promote unlimited deals and offers to attract new customers and boost sales throughout the month.';
    } else if (benefitLower.includes('deal')) {
      return 'Showcase exclusive discounts and special offers to capture new customers and keep loyal ones coming back.';
    } else if (benefitLower.includes('listing') && benefitLower.includes('premium')) {
      return 'Get premium placement in our business directory with enhanced visibility and featured positioning.';
    } else if (benefitLower.includes('listing') && benefitLower.includes('featured')) {
      return 'Featured placement in our trusted business directory with priority visibility across the community.';
    } else if (benefitLower.includes('listing')) {
      return 'Get listed in our comprehensive business directory to increase your visibility in the local community.';
    } else if (benefitLower.includes('analytic')) {
      return 'Access detailed analytics and insights about your business performance and customer engagement.';
    } else if (benefitLower.includes('support') && benefitLower.includes('priority')) {
      return 'Get priority access to our dedicated support team for faster resolution of any issues or questions.';
    } else if (benefitLower.includes('support')) {
      return 'Access to our reliable customer support team to help you make the most of your membership.';
    } else if (benefitLower.includes('marketing')) {
      return 'Professional marketing support to help promote your business and reach a wider audience.';
    } else if (benefitLower.includes('card')) {
      return 'Access your digital membership card anytime, anywhere for exclusive discounts and partner benefits.';
    } else if (benefitLower.includes('event')) {
      return 'Get exclusive access to community events, networking opportunities, and special member gatherings.';
    } else if (benefitLower.includes('travel')) {
      return 'Enjoy special travel discounts and assistance services to make your journeys more affordable and convenient.';
    } else if (benefitLower.includes('newsletter')) {
      return 'Stay updated with our newsletter featuring the latest offers, community news, and member benefits.';
    } else if (benefitLower.includes('concierge')) {
      return 'Access premium concierge services for personalized assistance with your membership needs.';
    }
    
    // Default description
    return `Enjoy this exclusive benefit as part of your membership plan, designed to enhance your experience with our community.`;
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
        {user?.userType === 'merchant' && (user.business || user.businessName) ? (
          <div className="merchant-header-info">
            <div className="business-branding">
              {(user.business?.logo || user.logo) && (
                <div className="business-logo">
                  <img 
                    src={user.business?.logo || user.logo} 
                    alt={`${user.business?.businessName || user.businessName || user.fullName} logo`}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="business-details">
                <h1>{user.business?.businessName || user.businessName || user.fullName}</h1>
                <p className="business-tagline">
                  {user.business?.businessDescription || user.businessDescription || 'Manage your business and explore merchant benefits'}
                </p>
              </div>
            </div>
            <div className="welcome-message">
              <span>Welcome back!</span>
            </div>
          </div>
        ) : (
          <>
            <h1>Welcome back, {displayName}!</h1>
            <p>Manage your membership and explore community benefits</p>
          </>
        )}
      </div>

      {/* Plan Expiry Banner */}
      <PlanExpiryBanner />

      <div className="dashboard-grid">
        {/* Membership Card/Certificate Section */}
        <div className="dashboard-section">
          {user.userType === 'merchant' ? (
            <>
              <MerchantCertificate />

              {/* Merchant Benefits Section */}
              <section className="current-plan-features merchant-benefits">
                <div className="section-header">
                  <h2>
                    <i className="fas fa-store"></i>
                    Merchant Benefits
                  </h2>
                  <p>Unlock your business potential with these powerful features</p>
                </div>

                <div className="benefits-container">
                  <div className="benefits-grid">
                    {currentPlan ? (
                      getMembershipBenefits(currentPlan, 'merchant').map((benefit, index) => (
                        <div key={index} className="benefit-card">
                          <div className="benefit-icon-1">
                            <i className={getBenefitIcon(benefit, index)}></i>
                          </div>
                          <div className="benefit-content">
                            <h4>{getBenefitTitle(benefit)}</h4>
                            <p>{getBenefitDescription(benefit)}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      // Fallback benefits when no plan data is available
                      <>
                        <div className="benefit-card">
                          <div className="benefit-icon-1">
                            <i className="fas fa-bullhorn"></i>
                          </div>
                          <div className="benefit-content">
                            <h4>Promote Deals & Offers</h4>
                            <p>Showcase exclusive discounts each month to capture new customers and keep loyal ones coming back.</p>
                          </div>
                        </div>
                        <div className="benefit-card">
                          <div className="benefit-icon-1">
                            <i className="fas fa-users"></i>
                          </div>
                          <div className="benefit-content">
                            <h4>Expand Community Reach</h4>
                            <p>Get featured in our trusted business directory and gain visibility across a wider local network.</p>
                          </div>
                        </div>
                        <div className="benefit-card">
                          <div className="benefit-icon-1">
                            <i className="fas fa-heart"></i>
                          </div>
                          <div className="benefit-content">
                            <h4>Engage Your Customers</h4>
                            <p>Build stronger connections with your audience through our interactive platform that fosters loyalty.</p>
                          </div>
                        </div>
                        <div className="benefit-card">
                          <div className="benefit-icon-1">
                            <i className="fas fa-headset"></i>
                          </div>
                          <div className="benefit-content">
                            <h4>Reliable Support Team</h4>
                            <p>Count on our dedicated support specialists to assist you in maximizing your business profile anytime.</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </section>
            </>
          ) : (
            <>
              <MembershipCard />

              {/* User Benefits Section */}
              <section className="current-plan-features member-benefits">
                <div className="section-header">
                  <h2>
                    <i className="fas fa-star"></i>
                    Member Benefits
                  </h2>
                  <p>Exclusive advantages for our valued community members</p>
                </div>

                <div className="benefits-container">
                  <div className="benefits-grid">
                    {/* Static member benefits as requested (preserve styling/classes) */}
                    <>
                      <div className="benefit-card">
                        <div className="benefit-icon-1">
                          <i className="fas fa-id-card"></i>
                        </div>
                        <div className="benefit-content">
                          <h4>Digital Membership Card</h4>
                          <p>Unlock instant access to your digital card — your passport to exclusive discounts, deals, and partner rewards anytime, anywhere.</p>
                        </div>
                      </div>

                      <div className="benefit-card">
                        <div className="benefit-icon-1">
                          <i className="fas fa-percentage"></i>
                        </div>
                        <div className="benefit-content">
                          <h4>Exclusive Partner Discounts</h4>
                          <p>Enjoy special offers and savings from our network of trusted partner businesses, designed to give you more value every day.</p>
                        </div>
                      </div>

                      <div className="benefit-card">
                        <div className="benefit-icon-1">
                          <i className="fas fa-users"></i>
                        </div>
                        <div className="benefit-content">
                          <h4>Community Perks & Events</h4>
                          <p>Get insider access to community-driven promotions, seasonal deals, and special invitations to local events and activities.</p>
                        </div>
                      </div>

                      <div className="benefit-card">
                        <div className="benefit-icon-1">
                          <i className="fas fa-envelope"></i>
                        </div>
                        <div className="benefit-content">
                          <h4>Personalized Updates & Newsletter</h4>
                          <p>Stay ahead with curated updates on new offers, featured partners, and member-only promotions delivered straight to your inbox.</p>
                        </div>
                      </div>
                    </>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>

        {/* Benefits Section - Hidden for merchants */}
        {user.userType !== 'merchant' && (
          <div className="benefits-section">
            <div className="benefits-header">
              <h2>
                <i className="fas fa-gift"></i>
                Your {currentPlan?.name || 'Current'} Plan Benefits
              </h2>
              <p>Exclusive privileges for community members</p>
            </div>

            {/* Plan Details Card */}
            {currentPlan && (
              <div className="plan-details-card">
                <div className="plan-details-header">
                  <div className="plan-info">
                    <h3>
                      {(() => {
                        const remainingDays = calculateRemainingDays(user.validationDate);
                        const isExpired = remainingDays !== null && remainingDays < 0;
                        return (
                          <>
                            {isExpired && (
                              <span className="expired-badge" style={{
                                background: '#ff4444',
                                color: 'white',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                marginRight: '8px',
                                textTransform: 'uppercase'
                              }}>
                                EXPIRED
                              </span>
                            )}
                            {currentPlan.name}
                          </>
                        );
                      })()}
                    </h3>
                  </div>
                  <div className="plan-pricing">
                    <span className="price-amount">{currentPlan.currency} {currentPlan.price}</span>
                    <span className="billing-cycle">/{currentPlan.billingCycle}</span>
                  </div>
                    {currentPlan.description && (
                      <p className="plan-description">{currentPlan.description}</p>
                    )}
                </div>
                
                <div className="plan-details-stats">
                  {currentPlan.maxRedemptions && (
                    <div className="plan-stat">
                      <i className="fas fa-tags"></i>
                      <span>
                        {currentPlan.maxRedemptions === -1 
                          ? 'Infinite redemptions' 
                          : `Up to ${currentPlan.maxRedemptions} redemptions`
                        }
                      </span>
                    </div>
                  )}
                  {currentPlan.dealPostingLimit && (
                    <div className="plan-stat">
                      <i className="fas fa-bullhorn"></i>
                      <span>
                        {currentPlan.dealPostingLimit === -1 
                          ? 'Unlimited deals/month' 
                          : `Up to ${currentPlan.dealPostingLimit} deals/month`
                        }
                      </span>
                    </div>
                  )}
                  {user?.created_at && (
                    <div className="plan-stat">
                      <i className="fas fa-calendar-plus"></i>
                      <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                    </div>
                  )}
                  {user.validationDate && (
                    <div className="plan-stat">
                      <i className="fas fa-calendar-check"></i>
                      <span>
                        Valid until {new Date(user.validationDate).toLocaleDateString()}
                        {(() => {
                          const remainingDays = calculateRemainingDays(user.validationDate);
                          if (remainingDays !== null) {
                            if (remainingDays > 0) {
                              return ` (${remainingDays} day${remainingDays === 1 ? '' : 's'} left)`;
                            } else if (remainingDays === 0) {
                              return ' (Expires today)';
                            } else {
                              return ` (Expired ${Math.abs(remainingDays)} day${Math.abs(remainingDays) === 1 ? '' : 's'} ago)`;
                            }
                          }
                          return '';
                        })()}
                      </span>
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
                  <p>{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upgrade Recommendations Section (hidden for merchants) */}
        {user.userType !== 'merchant' && upgradeRecommendations.length > 0 && (
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
                  
                  <button 
                    className="btn-upgrade-plan"
                    onClick={() => {
                      // Open email client with prewritten text for plan upgrade
                      const currentPlanName = currentPlan?.name || user?.membershipType || 'basic';
                      const subject = encodeURIComponent('Plan Upgrade Request - Indians in Ghana Membership');
                      const body = encodeURIComponent(`Dear Admin,

I hope this email finds you well.

I would like to upgrade my current plan for my Indians in Ghana membership account.

Current Plan Details:
- Current Plan: ${currentPlanName}
- Target Plan: ${plan.name}
- Account Email: ${user?.email || 'N/A'}
- User Name: ${user?.fullName || user?.name || 'N/A'}

I am interested in upgrading to the ${plan.name} plan to access additional features and benefits. Please provide me with:
1. Pricing details for the ${plan.name} plan
2. Payment process
3. Timeline for plan activation
4. Any additional information about the upgrade

Thank you for your time and assistance.

Best regards,
${user?.fullName || user?.name || 'Member'}`);
                      
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
