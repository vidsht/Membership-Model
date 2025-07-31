import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { merchantApi } from '../services/api';
import MerchantDealForm from '../components/MerchantDealForm';
import axios from 'axios';

const MerchantDashboard = () => {
  const { user } = useAuth();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDealForm, setShowDealForm] = useState(false);
  const [stats, setStats] = useState({
    totalDeals: 0,
    activeDeals: 0,
    totalViews: 0,
    totalRedemptions: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await merchantApi.getDashboard();
      
      if (response.data) {
        setStats(response.data.stats);
        setDeals(response.data.deals);
        // Optionally, store businessId for use in deal creation, etc.
        if (response.data.business) {
          localStorage.setItem('merchantBusinessId', response.data.business.businessId);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Fall back to mock data if API fails
      setStats({
        totalDeals: 5,
        activeDeals: 3,
        totalViews: 248,
        totalRedemptions: 42
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
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-tags"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.totalDeals}</h3>
            <p>Total Deals</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-play-circle"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.activeDeals}</h3>
            <p>Active Deals</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-eye"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.totalViews}</h3>
            <p>Total Views</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-shopping-cart"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.totalRedemptions}</h3>
            <p>Redemptions</p>
          </div>
        </div>
      </div>

      {/* Business Info */}
      <div className="business-info-card">
        <h2>Business Information</h2>
        <div className="business-details">
          <div className="detail-item">
            <strong>Business Name:</strong> {user?.businessInfo?.businessName}
          </div>
          <div className="detail-item">
            <strong>Category:</strong> {user?.businessInfo?.category}
          </div>
          <div className="detail-item">
            <strong>Address:</strong> {user?.businessInfo?.address}
          </div>
          <div className="detail-item">
            <strong>Phone:</strong> {user?.businessInfo?.phone}
          </div>
          <div className="detail-item">
            <strong>Email:</strong> {user?.businessInfo?.email}
          </div>
          <div className="detail-item">
            <strong>Membership ID:</strong> {user?.membershipNumber}
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
      </div>      {/* Recent Deals */}
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
