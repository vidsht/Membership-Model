import React, { useState, useEffect } from 'react';


import { useParams, Link, useNavigate } from 'react-router-dom';
import { useNotification } from '../../../contexts/NotificationContext';
import api from '../../../services/api';
import './DealDetail.css';

const DealDetail = () => {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  
  const [deal, setDeal] = useState(null);
  const [redemptions, setRedemptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');

  // Ensure the Redemptions tab is visible and accessible via keyboard
  const tabList = [
    { key: 'details', label: 'Details', icon: 'fas fa-info-circle' },
    { key: 'redemptions', label: 'Redemptions', icon: 'fas fa-ticket-alt' },
    { key: 'analytics', label: 'Analytics', icon: 'fas fa-chart-line' },
  ];
  
  useEffect(() => {
    fetchDealData();
  }, [dealId]);
    const fetchDealData = async () => {
    try {
      setIsLoading(true);
      const dealResponse = await api.get(`/admin/deals/${dealId}`);
      setDeal(dealResponse.data.deal);

      // Always fetch redemptions for the deal
      const redemptionsResponse = await api.get(`/admin/deals/${dealId}/redemptions`);
      setRedemptions(redemptionsResponse.data.redemptions || []);
    } catch (error) {
      console.error('Error fetching deal details:', error);
      showNotification('Could not load deal details', 'error');
      navigate('/admin/deals');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleStatusChange = async (newStatus) => {
    try {
      await api.patch(`/admin/deals/${dealId}/status`, { status: newStatus });
      setDeal({ ...deal, status: newStatus });
      showNotification(`Deal ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`, 'success');
    } catch (error) {
      console.error('Error updating deal status:', error);
      showNotification('Failed to update deal status', 'error');
    }
  };
  
  const handleDeleteDeal = async () => {
    if (window.confirm('Are you sure you want to delete this deal? This action cannot be undone.')) {
      try {
        await api.delete(`/admin/deals/${dealId}`);
        showNotification('Deal deleted successfully', 'success');
        navigate('/admin/deals');
      } catch (error) {
        console.error('Error deleting deal:', error);
        showNotification('Failed to delete deal', 'error');
      }
    }
  };
  
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading deal details...</p>
      </div>
    );
  }
  
  if (!deal) {
    return (
      <div className="not-found">
        <i className="fas fa-exclamation-triangle"></i>
        <h2>Deal Not Found</h2>
        <p>The requested deal could not be found or may have been deleted.</p>
        <Link to="/admin/deals" className="btn-primary">
          Back to Deals
        </Link>
      </div>
    );
  }
  
  const isExpired = new Date(deal.validUntil) < new Date();
  
  return (
    <div className="admin-deal-detail">
      <div className="page-header">
        <div className="page-title">
          <h1>{deal.title}</h1>
          <span className={`status-badge ${deal.status}`}>
            {isExpired && deal.status === 'active' ? 'Expired' : deal.status}
          </span>
        </div>
        <div className="page-actions">
          <button 
            className="btn-secondary" 
            onClick={() => navigate('/admin/deals')}
          >
            <i className="fas fa-arrow-left"></i> Back to Deals
          </button>
          <button 
            className="btn-primary" 
            onClick={() => navigate(`/admin/deals/${dealId}/edit`)}
          >
            <i className="fas fa-edit"></i> Edit Deal
          </button>
        </div>
      </div>

      {/* DEBUG: Confirm DealDetail is rendering */}
      <div style={{background:'#ffeedd',color:'#a00',padding:'6px',marginBottom:'8px',border:'2px solid #a00',borderRadius:'6px',fontWeight:'bold'}}>DealDetail component loaded</div>

      <div className="deal-content">
        {tabList && tabList.length > 0 ? (
          <div className="deal-tabs" role="tablist" aria-label="Deal Detail Tabs">
            {tabList.map(tab => (
              <button
                key={tab.key}
                className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
                role="tab"
                aria-selected={activeTab === tab.key}
                aria-controls={`tab-panel-${tab.key}`}
                id={`tab-${tab.key}`}
                tabIndex={activeTab === tab.key ? 0 : -1}
              >
                <i className={tab.icon}></i> {tab.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="tab-content">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="deal-details" id="tab-panel-details" role="tabpanel" aria-labelledby="tab-details">
              <div className="detail-grid">
                <div className="detail-section">
                  <div className="deal-image">
                    {deal.imageUrl ? (
                      <img src={deal.imageUrl} alt={deal.title} />
                    ) : (
                      <div className="no-image">
                        <i className="fas fa-tag"></i>
                        <span>No image available</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="deal-info-card">
                    <h3>Deal Information</h3>
                    
                    <div className="info-row">
                      <span className="info-label">Business</span>
                      <span className="info-value">{deal.businessName}</span>
                    </div>
                    
                    <div className="info-row">
                      <span className="info-label">Category</span>
                      <span className="info-value">{deal.category}</span>
                    </div>
                    
                    <div className="info-row">
                      <span className="info-label">Discount</span>
                      <span className="info-value">
                        {deal.discountType === 'percentage' && `${deal.discount}% off`}
                        {deal.discountType === 'fixed' && `GHS ${deal.discount} off`}
                        {deal.discountType === 'buyOneGetOne' && 'Buy One Get One Free'}
                        {deal.discountType === 'freeItem' && 'Free Item'}
                      </span>
                    </div>
                    
                    <div className="info-row">
                      <span className="info-label">Valid Period</span>
                      <span className="info-value">
                        {new Date(deal.validFrom).toLocaleDateString()} to {new Date(deal.validUntil).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="info-row">
                      <span className="info-label">Membership Access</span>
                      <span className="info-value access-level">
                        {deal.accessLevel === 'basic' && 'Community (Basic)'}
                        {deal.accessLevel === 'intermediate' && 'Silver (Intermediate)'}
                        {deal.accessLevel === 'full' && 'Gold (Full)'}
                      </span>
                    </div>
                    
                    {deal.couponCode && (
                      <div className="info-row">
                        <span className="info-label">Coupon Code</span>
                        <span className="info-value coupon-code">{deal.couponCode}</span>
                      </div>
                    )}
                    
                    {deal.maxRedemptions > 0 && (
                      <div className="info-row">
                        <span className="info-label">Max Redemptions</span>
                        <span className="info-value">
                          {deal.redemptionCount || 0} / {deal.maxRedemptions}
                        </span>
                      </div>
                    )}
                    
                    <div className="info-row">
                      <span className="info-label">Created On</span>
                      <span className="info-value">
                        {new Date(deal.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="detail-section">
                  <div className="detail-card">
                    <h3>Description</h3>
                    <p>{deal.description}</p>
                  </div>
                  
                  {deal.termsConditions && (
                    <div className="detail-card">
                      <h3>Terms & Conditions</h3>
                      <p>{deal.termsConditions}</p>
                    </div>
                  )}
                  
                  <div className="detail-card actions-card">
                    <h3>Deal Actions</h3>
                    
                    <div className="action-buttons">
                      {deal.status === 'active' ? (
                        <button 
                          className="btn-action warning"
                          onClick={() => handleStatusChange('inactive')}
                        >
                          <i className="fas fa-pause-circle"></i>
                          Deactivate Deal
                        </button>
                      ) : (
                        <button 
                          className="btn-action success"
                          onClick={() => handleStatusChange('active')}
                          disabled={isExpired}
                        >
                          <i className="fas fa-play-circle"></i>
                          Activate Deal
                        </button>
                      )}
                      
                      <button 
                        className="btn-action danger"
                        onClick={handleDeleteDeal}
                      >
                        <i className="fas fa-trash-alt"></i>
                        Delete Deal
                      </button>
                    </div>
                    
                    {isExpired && deal.status === 'inactive' && (
                      <div className="expired-note">
                        <i className="fas fa-exclamation-circle"></i>
                        <span>This deal has expired and cannot be reactivated</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Redemptions Tab */}
          {activeTab === 'redemptions' && (
            <div className="deal-redemptions" id="tab-panel-redemptions" role="tabpanel" aria-labelledby="tab-redemptions">
              {redemptions.length > 0 ? (
                <div className="redemptions-table-container">
                  <table className="redemptions-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Redeemed On</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {redemptions.map(redemption => (
                        <tr key={redemption._id}>
                          <td>
                            <div className="user-info">
                              <div className="user-avatar">
                                <i className="fas fa-user"></i>
                              </div>
                              <div className="user-details">
                                <span className="user-name">{redemption.userName}</span>
                                <span className="user-email">{redemption.userEmail}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            {new Date(redemption.redeemedAt).toLocaleString()}
                          </td>
                          <td>
                            <span className={`status-badge ${redemption.status}`}>
                              {redemption.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <i className="fas fa-ticket-alt fa-3x"></i>
                  <h2>No Redemptions Yet</h2>
                  <p>
                    This deal hasn't been redeemed by any members.
                    {deal.status !== 'active' && " Consider activating the deal to make it available."}
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="deal-analytics" id="tab-panel-analytics" role="tabpanel" aria-labelledby="tab-analytics">
              <div className="analytics-cards">
                <div className="analytics-card">
                  <div className="analytics-icon">
                    <i className="fas fa-eye"></i>
                  </div>
                  <div className="analytics-details">
                    <h4>Views</h4>
                    <p className="analytics-value">{deal.viewCount || 0}</p>
                  </div>
                </div>
                
                <div className="analytics-card">
                  <div className="analytics-icon">
                    <i className="fas fa-ticket-alt"></i>
                  </div>
                  <div className="analytics-details">
                    <h4>Redemptions</h4>
                    <p className="analytics-value">{deal.redemptionCount || 0}</p>
                  </div>
                </div>
                
                <div className="analytics-card">
                  <div className="analytics-icon">
                    <i className="fas fa-chart-line"></i>
                  </div>
                  <div className="analytics-details">
                    <h4>Conversion Rate</h4>
                    <p className="analytics-value">
                      {deal.viewCount ? Math.round((deal.redemptionCount || 0) / deal.viewCount * 100) : 0}%
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="analytics-placeholder">
                <div className="placeholder-header">
                  <h3>Deal Performance</h3>
                  <div className="placeholder-actions">
                    <button className="btn-link">Last 7 Days</button>
                    <button className="btn-link active">Last 30 Days</button>
                    <button className="btn-link">All Time</button>
                  </div>
                </div>
                
                <div className="chart-placeholder">
                  <div className="chart-message">
                    <i className="fas fa-chart-bar fa-3x"></i>
                    <p>Analytics data visualization coming soon!</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DealDetail;
