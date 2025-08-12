import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import './DealDetail.css';
import { useModal } from '../../../hooks/useModal';
import ModalComponent from '../../shared/Modal';

const DealDetail = () => {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const [deal, setDeal] = useState(null);
  const [business, setBusiness] = useState(null);
  const [redemptions, setRedemptions] = useState([]);
  const [redemptionStats, setRedemptionStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const { isModalOpen, modalContent, openModal, closeModal } = useModal();

  useEffect(() => {
    fetchDealData();
  }, [dealId]);

  const fetchDealData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch deal details
      const dealResponse = await api.get(`/admin/deals/${dealId}`);
      const dealData = dealResponse.data.deal;
      
      if (!dealData) {
        throw new Error('Deal not found');
      }

      setDeal(dealData);

      // Create business object from deal data
      const businessData = {
        id: dealData.business_id,
        business_name: dealData.businessName,
        category: dealData.businessCategory,
        location: dealData.location,
        contact_phone: dealData.contactPhone,
        email: dealData.email,
        website: dealData.website,
        description: dealData.businessDescription
      };
      setBusiness(businessData);

      // Fetch redemptions
      try {
        const redemptionsResponse = await api.get(`/admin/deals/${dealId}/redemptions`);
        const redemptionsData = redemptionsResponse.data.redemptions || [];
        setRedemptions(redemptionsData);
        
        // Calculate redemption statistics
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const stats = {
          total: redemptionsData.length,
          today: redemptionsData.filter(r => new Date(r.redeemedAt) >= today).length,
          thisWeek: redemptionsData.filter(r => new Date(r.redeemedAt) >= thisWeek).length,
          thisMonth: redemptionsData.filter(r => new Date(r.redeemedAt) >= thisMonth).length
        };
        
        setRedemptionStats(stats);
      } catch (redemptionError) {
        console.error('Error fetching redemptions:', redemptionError);
        setRedemptions([]);
        setRedemptionStats({});
      }

    } catch (error) {
      console.error('Error fetching deal data:', error);
      setError(error.message || 'Failed to load deal details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="deal-detail-container">
      <div className="deal-detail-header">
        <button 
          className="back-button"
          onClick={() => navigate('/admin/deals')}
        >
          ← Back to Deals
        </button>
        <h1>Deal Details</h1>
      </div>

      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading deal details...</p>
        </div>
      )}

      {error && (
        <div className="error-container">
          <h3>Error Loading Deal</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      {deal && (
        <div className="deal-content">
          {/* Deal Header */}
          <div className="deal-header">
            <div className="deal-title-section">
              <h1 className="deal-title">{deal.title}</h1>
              <p className="deal-description">{deal.description}</p>
              <div className="deal-badges">
                <span className={`status-badge ${deal.status === 'active' ? 'active' : 'inactive'}`}>
                  {deal.status.toUpperCase()}
                </span>
                <span className="category-badge">{deal.category}</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="tab-navigation">
            <button 
              className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              Deal Details
            </button>
            <button 
              className={`tab-button ${activeTab === 'business' ? 'active' : ''}`}
              onClick={() => setActiveTab('business')}
            >
              Business Info
            </button>
            <button 
              className={`tab-button ${activeTab === 'redemptions' ? 'active' : ''}`}
              onClick={() => setActiveTab('redemptions')}
            >
              Redemptions ({redemptions.length})
            </button>
            <button 
              className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              Analytics
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'details' && (
              <div className="details-tab">
                {/* Pricing Section */}
                <div className="pricing-section">
                  <h3>Pricing Information</h3>
                  <div className="pricing-grid">
                    <div className="price-card original">
                      <label>Original Price</label>
                      <span className="price-value">GHS {deal.original_price}</span>
                    </div>
                    <div className="price-card discounted">
                      <label>Deal Price</label>
                      <span className="price-value">GHS {deal.discounted_price}</span>
                    </div>
                    <div className="price-card savings">
                      <label>You Save</label>
                      <span className="price-value">{deal.percentage}% OFF</span>
                    </div>
                  </div>
                </div>

                {/* Validity Section */}
                <div className="validity-section">
                  <h3>Deal Validity</h3>
                  <div className="validity-grid">
                    <div className="validity-item">
                      <label>Valid From</label>
                      <span>{new Date(deal.valid_from).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}</span>
                    </div>
                    <div className="validity-item">
                      <label>Valid Until</label>
                      <span>{new Date(deal.valid_until).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}</span>
                    </div>
                    <div className="validity-item">
                      <label>Current Status</label>
                      <span className={(() => {
                        try {
                          const now = new Date();
                          const validUntil = new Date(deal.valid_until);
                          return now > validUntil ? 'expired' : 'active';
                        } catch {
                          return 'unknown';
                        }
                      })()}>
                        {(() => {
                          try {
                            const now = new Date();
                            const validUntil = new Date(deal.valid_until);
                            return now > validUntil ? 'EXPIRED' : 'ACTIVE';
                          } catch {
                            return 'UNKNOWN';
                          }
                        })()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Deal Metadata */}
                <div className="metadata-section">
                  <h3>Deal Information</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Deal ID</label>
                      <span>#{deal.id}</span>
                    </div>
                    <div className="detail-item">
                      <label>Category</label>
                      <span>{deal.category}</span>
                    </div>
                    <div className="detail-item">
                      <label>Status</label>
                      <span className={deal.status}>{deal.status}</span>
                    </div>
                    <div className="detail-item">
                      <label>Created Date</label>
                      <span>{new Date(deal.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="detail-item">
                      <label>Last Updated</label>
                      <span>{new Date(deal.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'business' && business && (
              <div className="business-tab">
                <h3>Business Information</h3>
                <div className="business-grid">
                  <div className="business-item">
                    <label>Business Name</label>
                    <span>{business.business_name}</span>
                  </div>
                  <div className="business-item">
                    <label>Category</label>
                    <span>{business.category}</span>
                  </div>
                  <div className="business-item">
                    <label>Location</label>
                    <span>{business.location}</span>
                  </div>
                  {business.contact_phone && (
                    <div className="business-item">
                      <label>Phone</label>
                      <span>{business.contact_phone}</span>
                    </div>
                  )}
                  {business.email && (
                    <div className="business-item">
                      <label>Email</label>
                      <span>{business.email}</span>
                    </div>
                  )}
                  {business.description && (
                    <div className="business-item full-width">
                      <label>Description</label>
                      <span>{business.description}</span>
                    </div>
                  )}
                  {business.website && (
                    <div className="business-item">
                      <label>Website</label>
                      <span>
                        <a href={business.website} target="_blank" rel="noopener noreferrer">
                          {business.website}
                        </a>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'redemptions' && (
              <div className="redemptions-tab">
                <h3>Deal Redemptions ({redemptions.length})</h3>
                {redemptions.length > 0 ? (
                  <div className="redemptions-list">
                    {redemptions.map((redemption, index) => (
                      <div key={index} className="redemption-item">
                        <div className="redemption-info">
                          <span className="user-name">
                            {redemption.userName || redemption.user_name || 'Anonymous User'}
                          </span>
                          <span className="redemption-date">
                            {new Date(redemption.redeemedAt || redemption.redeemed_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className="redemption-amount">
                          GHS {redemption.amount || deal.discounted_price}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-redemptions">
                    <p>No redemptions yet for this deal.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="analytics-tab">
                <h3>Deal Analytics</h3>
                <div className="analytics-grid">
                  <div className="analytics-card">
                    <div className="analytics-number">{redemptions.length}</div>
                    <div className="analytics-label">Total Redemptions</div>
                  </div>
                  <div className="analytics-card">
                    <div className="analytics-number">
                      GHS {(redemptions.length * parseFloat(deal.discounted_price || 0)).toFixed(2)}
                    </div>
                    <div className="analytics-label">Total Revenue</div>
                  </div>
                  <div className="analytics-card">
                    <div className="analytics-number">
                      {redemptionStats.today || 0}
                    </div>
                    <div className="analytics-label">Today's Redemptions</div>
                  </div>
                  <div className="analytics-card">
                    <div className="analytics-number">
                      {redemptionStats.thisWeek || 0}
                    </div>
                    <div className="analytics-label">This Week</div>
                  </div>
                  <div className="analytics-card">
                    <div className="analytics-number">
                      {redemptionStats.thisMonth || 0}
                    </div>
                    <div className="analytics-label">This Month</div>
                  </div>
                  <div className="analytics-card">
                    <div className="analytics-number">
                      {deal.percentage}%
                    </div>
                    <div className="analytics-label">Discount Rate</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {isModalOpen && (
        <ModalComponent
          isOpen={isModalOpen}
          onClose={closeModal}
          title={modalContent.title}
          onConfirm={modalContent.onConfirm}
          isDestructive={modalContent.isDestructive}
        >
          {modalContent.message}
        </ModalComponent>
      )}
    </div>
  );
};

export default DealDetail;
