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
          <h2>
            {user.userType === 'merchant' ? 'Your Business Certificate' : 'Your Membership Card'}
          </h2>
          {user.userType === 'merchant' ? <MerchantCertificate /> : <MembershipCard />}
        </div>


        {/* Quick Stats Section */}
        <div className="dashboard-section">
          <h2>
             Your Activity
          </h2>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-icon">
                <i className="fas fa-calendar"></i>
              </div>
              <div className="stat-info">
                <h4>Member Since</h4>
                <p>{new Date(user.joinDate).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-icon">
                <i className="fas fa-clock"></i>
              </div>
              <div className="stat-info">
                <h4>Last Login</h4>
                <p>{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'First time'}</p>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-icon">
                <i className="fas fa-trophy"></i>
              </div>
              <div className="stat-info">
                <h4>Membership Level</h4>
                <p className={`membership-badge ${user.membershipType}`}>
                  {user && user.membershipType
                    ? user.membershipType.charAt(0).toUpperCase() + user.membershipType.slice(1)
                    : 'N/A'}
                </p>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-icon">
                <i className="fas fa-hashtag"></i>
              </div>
              <div className="stat-info">
                <h4>Member Number</h4>
                <p>#{user.membershipNumber}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="dashboard-section">
          <h2>
             Quick Actions
          </h2>
          <div className="quick-actions">
            <a href="/settings" className="action-card">
              <i className="fas fa-cog"></i>
              <span>Update Profile</span>
            </a>
            <a href="/settings" className="action-card">
              <i className="fas fa-key"></i>
              <span>Change Password</span>
            </a>
            <a href="/contact" className="action-card">
              <i className="fas fa-envelope"></i>
              <span>Contact Support</span>
            </a>
            <a href="/about" className="action-card">
              <i className="fas fa-info-circle"></i>
              <span>Learn More</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
