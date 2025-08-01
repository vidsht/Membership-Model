import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { merchantApi } from '../services/api';
import MerchantDealForm from '../components/MerchantDealForm';
import axios from 'axios';
import '../styles/MerchantDashboard.css';

const MerchantDashboard = () => {
  const { user } = useAuth();  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDealForm, setShowDealForm] = useState(false);
  const [businessInfo, setBusinessInfo] = useState({});
  const [planInfo, setPlanInfo] = useState({});
  const [recentRedemptions, setRecentRedemptions] = useState([]);
  const [stats, setStats] = useState({
    totalDeals: 0,
    activeDeals: 0,
    pendingDeals: 0,
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
  }, []);  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await merchantApi.getDashboard();
      
      if (response.data) {
        setStats(response.data.stats || {});
        setDeals(response.data.deals || []);
        setBusinessInfo(response.data.business || {});
        setPlanInfo(response.data.plan || {});
        setRecentRedemptions(response.data.recentRedemptions || []);
        
        // Store businessId for use in deal creation
        if (response.data.business?.businessId) {
          localStorage.setItem('merchantBusinessId', response.data.business.businessId);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Keep the existing mock data as fallback
      setStats({
        totalDeals: 5,
        activeDeals: 3,
        pendingDeals: 1,
        expiredDeals: 1,
        totalViews: 248,
        totalRedemptions: 42,
        todayRedemptions: 3,
        thisMonthDeals: 2,
        dealsUsedThisMonth: 2,
        dealLimitRemaining: 8
      });
      
      setDeals([
        {
          id: 1,
          title: "20% Off Traditional Indian Cuisine",
          description: "Get 20% off on all traditional Indian dishes",
          discount: "20%",
          validUntil: "2024-03-31",
          status: "active",
          views: 156,
          redemptions: 23
        },
        {
          id: 2,
          title: "Buy 2 Get 1 Free on Samosas",
          description: "Purchase any 2 samosas and get the 3rd one free",
          discount: "33%",
          validUntil: "2024-02-28",
          status: "active",
          views: 92,
          redemptions: 19        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleDealCreated = async () => {
    setShowDealForm(false);
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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your merchant dashboard...</p>
      </div>
    );
  }

  return (
    <div className="merchant-dashboard">
      <div className="dashboard-header">
        <h1>Merchant Dashboard</h1>
        <p>Welcome back, {user?.businessInfo?.businessName || user?.firstName}!</p>
      </div>      {/* Enhanced Stats Cards */}
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
      </div>      {/* Enhanced Business Info */}
      <div className="dashboard-sections">
        <div className="business-info-card">
          <div className="card-header">
            <h2><i className="fas fa-store"></i> Business Information</h2>
            <button className="btn btn-outline btn-sm">
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
              <h3>{planInfo.name || businessInfo.currentPlan || 'Basic Plan'}</h3>
              <span className="plan-key">{planInfo.key || businessInfo.currentPlan || 'basic_business'}</span>
            </div>
            <div className="plan-limits">
              <div className="limit-item">
                <strong>Deals This Month:</strong>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{
                      width: `${Math.min(100, ((stats.dealsUsedThisMonth || 0) / (planInfo.maxDealsPerMonth || 10)) * 100)}%`
                    }}
                  ></div>
                </div>
                <span className="progress-text">
                  {stats.dealsUsedThisMonth || 0} / {planInfo.maxDealsPerMonth || 10}
                </span>
              </div>
              <div className="limit-item">
                <strong>Remaining:</strong>
                <span className="remaining-count">{stats.dealLimitRemaining || 0} deals</span>
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
          <button className="btn btn-primary">
            <i className="fas fa-plus"></i> Create New Deal
          </button>
          <button className="btn btn-secondary">
            <i className="fas fa-edit"></i> Edit Business Info
          </button>
          <button className="btn btn-accent">
            <i className="fas fa-chart-bar"></i> View Analytics
          </button>
        </div>
      </div>      {/* Recent Redemptions */}
      {recentRedemptions && recentRedemptions.length > 0 && (
        <div className="recent-redemptions-section">
          <div className="card-header">
            <h2><i className="fas fa-history"></i> Recent Redemptions</h2>
            <button className="btn btn-outline btn-sm">
              <i className="fas fa-external-link-alt"></i> View All
            </button>
          </div>
          <div className="redemptions-list">
            {recentRedemptions.slice(0, 5).map((redemption, index) => (
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
        </div>
      )}

      {/* Recent Deals */}
      <div className="deals-section">
        <div className="section-header">
          <h2>Your Deals</h2>
          <button className="btn btn-primary" onClick={() => setShowDealForm(true)}>
            <i className="fas fa-plus"></i> Add New Deal
          </button>
        </div>
        
        {deals.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-tags"></i>
            <h3>No Deals Yet</h3>
            <p>Create your first deal to start attracting customers!</p>
            <button className="btn btn-primary" onClick={() => setShowDealForm(true)}>Create Deal</button>
          </div>
        ) : (
          <div className="deals-grid">
            {deals.map(deal => (
              <div key={deal.id} className="deal-card">
                <div className="deal-header">
                  <h3>{deal.title}</h3>
                  <span className={`status-badge ${deal.status}`}>
                    {deal.status}
                  </span>
                </div>
                <p className="deal-description">{deal.description}</p>
                <div className="deal-meta">
                  <div className="deal-discount">
                    <strong>{deal.discount} OFF</strong>
                  </div>
                  <div className="deal-expiry">
                    Expires: {new Date(deal.validUntil).toLocaleDateString()}
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
                </div>
                <div className="deal-actions">
                  <button className="btn btn-sm btn-secondary">
                    <i className="fas fa-edit"></i> Edit
                  </button>
                  <button className="btn btn-sm btn-danger">
                    <i className="fas fa-trash"></i> Delete
                  </button>                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Deal Creation Modal */}
      {showDealForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <MerchantDealForm 
              onDealCreated={handleDealCreated}
              onClose={() => setShowDealForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

function DealWithRedemptions({ deal }) {
  const [redemptions, setRedemptions] = React.useState([]);
  React.useEffect(() => {
    fetchRedemptions(deal.id).then(setRedemptions);
  }, [deal.id]);

  return (
    <div className="deal-card">
      <div className="deal-header">
        <h3>{deal.title}</h3>
        <span className={`status-badge ${deal.status}`}>{deal.status}</span>
      </div>
      <p className="deal-description">{deal.description}</p>
      <div className="deal-meta">
        <div className="deal-discount">
          <strong>{deal.discount} OFF</strong>
        </div>
        <div className="deal-expiry">
          Expires: {deal.expiration_date ? new Date(deal.expiration_date).toLocaleDateString() : ''}
        </div>
      </div>
      <div className="deal-business-id">
        <span className="business-id-label">Business ID:</span> <span className="business-id-value">{deal.businessId}</span>
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
      </div>
      <div className="deal-actions">
        <button className="btn btn-sm btn-secondary">
          <i className="fas fa-edit"></i> Edit
        </button>
        <button className="btn btn-sm btn-danger">
          <i className="fas fa-trash"></i> Delete
        </button>
      </div>
      {/* Redemptions List */}
      <div className="deal-redemptions">
        <h4>Redeemed By:</h4>
        {redemptions.length === 0 ? (
          <span className="no-redemptions">No users have redeemed this deal yet.</span>
        ) : (
          <ul className="redemptions-list">
            {redemptions.map(user => (
              <li key={user.id}>
                <span>{user.name} ({user.email})</span> <span className="redeemed-date">{new Date(user.redeemedAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default MerchantDashboard;
