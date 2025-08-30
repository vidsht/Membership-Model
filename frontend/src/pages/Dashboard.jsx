import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import MembershipCard from '../components/MembershipCard';
import MerchantCertificate from '../components/MerchantCertificate';
import PlanExpiryBanner from '../components/PlanExpiryBanner';
import '../styles/MerchantDashboard.css'; // Import for status-alert styles

const Dashboard = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
        </div>
      </div>
    );
  }

  const getMembershipBenefits = (type) => {
    switch (type) {
      case 'silver':
        return [
          'Priority event booking',
          'Monthly newsletter',
          'Enhanced member profile',
          'Digital membership card',
          'Community event updates'
        ];
      case 'gold':
        return [
          'VIP event access',
          'Direct community contact',
          'Premium member support',
          'All Silver benefits',
          'Exclusive member perks'
        ];
      default:
        return [
          'Basic membership card',
          'Community event updates',
          'Member directory access',
          'Newsletter subscription'
        ];
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
              {user.userType === 'merchant' ? 'Merchant Benefits' : 'Member Benefits'}
            </h2>
            <p>
              {user.userType === 'merchant' 
                ? 'Exclusive advantages for business partners' 
                : 'Exclusive privileges for community members'
              }
            </p>
          </div>
          
          <div className="benefits-grid">
            {user.userType === 'merchant' ? (
              <>
                <div className="benefit-card">
                  <div className="benefit-icon">
                    <i className="fas fa-store"></i>
                  </div>
                  <h3>Business Listing</h3>
                  <p>Get your business featured in our comprehensive directory, reaching thousands of community members actively seeking your services.</p>
                </div>
                
                <div className="benefit-card">
                  <div className="benefit-icon">
                    <i className="fas fa-tags"></i>
                  </div>
                  <h3>Deal Creation</h3>
                  <p>Create and manage exclusive deals for community members, boosting your customer base and increasing brand loyalty.</p>
                </div>
                
                <div className="benefit-card">
                  <div className="benefit-icon">
                    <i className="fas fa-chart-line"></i>
                  </div>
                  <h3>Analytics Dashboard</h3>
                  <p>Access detailed insights about your business performance, customer engagement, and deal redemption analytics.</p>
                </div>
                
                <div className="benefit-card">
                  <div className="benefit-icon">
                    <i className="fas fa-users"></i>
                  </div>
                  <h3>Community Network</h3>
                  <p>Connect with fellow merchants, participate in business events, and grow your network within the Indian community.</p>
                </div>
              </>
            ) : (
              <>
                <div className="benefit-card">
                  <div className="benefit-icon">
                    <i className="fas fa-percent"></i>
                  </div>
                  <h3>Exclusive Discounts</h3>
                  <p>Enjoy significant savings at over 100 partner businesses across Ghana with exclusive member-only discounts and special offers.</p>
                </div>
                
                <div className="benefit-card">
                  <div className="benefit-icon">
                    <i className="fas fa-calendar-alt"></i>
                  </div>
                  <h3>Priority Event Access</h3>
                  <p>Get VIP access and early bird pricing for cultural festivals, networking events, and community gatherings throughout the year.</p>
                </div>
                
                <div className="benefit-card">
                  <div className="benefit-icon">
                    <i className="fas fa-hands-helping"></i>
                  </div>
                  <h3>Community Support</h3>
                  <p>Access our network of support services including legal assistance, medical referrals, and cultural integration programs.</p>
                </div>
                
                <div className="benefit-card">
                  <div className="benefit-icon">
                    <i className="fas fa-id-card"></i>
                  </div>
                  <h3>Digital Identity</h3>
                  <p>A recognized form of identity within the Indian community in Ghana, with emergency support services and community verification.</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
