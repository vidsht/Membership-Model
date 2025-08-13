import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
// import './DealDetail.css'; // TEMPORARILY DISABLED FOR DEBUGGING
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
      console.log('Fetching deal data for ID:', dealId);
      const dealResponse = await api.get(`/admin/deals/${dealId}`);
      console.log('Raw API Response:', dealResponse);
      console.log('Response Data:', dealResponse.data);
      
      const dealData = dealResponse.data.deal;
      console.log('Extracted Deal Data:', dealData);
      
      if (!dealData) {
        throw new Error('Deal not found');
      }

      setDeal(dealData);
      console.log('Deal set to state:', dealData);

      // Create business object from deal data (with field name fallbacks)
      const businessData = {
        id: dealData.businessId || dealData.business_id,
        business_name: dealData.businessName || dealData.business_name,
        category: dealData.businessCategory || dealData.category,
        location: dealData.location || dealData.businessAddress || 'Location not specified',
        contact_phone: dealData.contactPhone || dealData.businessPhone || dealData.phone,
        email: dealData.email || dealData.businessEmail || dealData.merchantEmail,
        website: dealData.website || dealData.businessWebsite,
        description: dealData.businessDescription || dealData.description,
        owner_name: dealData.ownerName || dealData.merchantName,
        owner_email: dealData.ownerEmail || dealData.merchantEmail
      };
      console.log('Business data created:', businessData);
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
              <h1 className="deal-title">{deal.title || 'No Title'}</h1>
              <p className="deal-description">{deal.description || 'No Description'}</p>
              <div className="deal-badges">
                <span className={`status-badge ${deal.status === 'active' ? 'active' : 'inactive'}`}>
                  {(deal.status || 'N/A').toUpperCase()}
                </span>
                <span className="category-badge">{deal.category || deal.businessCategory || 'N/A'}</span>
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
              Redemptions ({(deal.redemptionCount || deal.redemptions || redemptions.length || 0)})
            </button>
            <button 
              className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              Analytics
            </button>
          </div>

          {/* Tab Content - WORKING VERSION */}
          <div style={{background: 'white', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', margin: '20px 0'}}>
            
            {activeTab === 'details' && (
              <div>
                <h2 style={{color: '#333', marginBottom: '20px'}}>Deal Details</h2>
                
                {/* Pricing Section */}
                <div style={{marginBottom: '30px'}}>
                  <h3 style={{color: '#555', marginBottom: '15px'}}>Pricing Information</h3>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px'}}>
                    <div style={{background: '#f8f9fa', padding: '15px', borderRadius: '6px', border: '1px solid #dee2e6'}}>
                      <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#666'}}>Original Price</label>
                      <span style={{fontSize: '18px', color: '#333'}}>
                        {deal.original_price || deal.originalPrice ? 
                          `GHS ${deal.original_price || deal.originalPrice}` : 
                          'Not specified'
                        }
                      </span>
                    </div>
                    <div style={{background: '#f8f9fa', padding: '15px', borderRadius: '6px', border: '1px solid #dee2e6'}}>
                      <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#666'}}>Deal Price</label>
                      <span style={{fontSize: '18px', color: '#28a745'}}>
                        {deal.discounted_price || deal.discountedPrice ? 
                          `GHS ${deal.discounted_price || deal.discountedPrice}` : 
                          'Not specified'
                        }
                      </span>
                    </div>
                    <div style={{background: '#f8f9fa', padding: '15px', borderRadius: '6px', border: '1px solid #dee2e6'}}>
                      <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#666'}}>Discount</label>
                      <span style={{fontSize: '18px', color: '#dc3545'}}>
                        {deal.discount || deal.percentage || 0}% OFF ({deal.discountType || 'percentage'})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Validity Section */}
                <div style={{marginBottom: '30px'}}>
                  <h3 style={{color: '#555', marginBottom: '15px'}}>Deal Validity</h3>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px'}}>
                    <div style={{background: '#f8f9fa', padding: '15px', borderRadius: '6px', border: '1px solid #dee2e6'}}>
                      <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#666'}}>Valid From</label>
                      <span style={{color: '#333'}}>
                        {deal.valid_from || deal.validFrom || deal.startDate ? 
                          new Date(deal.valid_from || deal.validFrom || deal.startDate).toLocaleDateString('en-US', {
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                          }) : 'Not specified'
                        }
                      </span>
                    </div>
                    <div style={{background: '#f8f9fa', padding: '15px', borderRadius: '6px', border: '1px solid #dee2e6'}}>
                      <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#666'}}>Valid Until</label>
                      <span style={{color: '#333'}}>
                        {deal.validUntil || deal.valid_until || deal.expiration_date || deal.endDate ? 
                          new Date(deal.validUntil || deal.valid_until || deal.expiration_date || deal.endDate).toLocaleDateString('en-US', {
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                          }) : 'Not specified'
                        }
                      </span>
                    </div>
                    <div style={{background: '#f8f9fa', padding: '15px', borderRadius: '6px', border: '1px solid #dee2e6'}}>
                      <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#666'}}>Current Status</label>
                      <span style={{
                        color: (() => {
                          try {
                            const now = new Date();
                            const validUntil = new Date(deal.validUntil || deal.valid_until || deal.expiration_date || deal.endDate);
                            return now > validUntil ? '#dc3545' : '#28a745';
                          } catch { return '#6c757d'; }
                        })(),
                        fontWeight: 'bold'
                      }}>
                        {(() => {
                          try {
                            const now = new Date();
                            const validUntil = new Date(deal.validUntil || deal.valid_until || deal.expiration_date || deal.endDate);
                            return now > validUntil ? 'EXPIRED' : 'ACTIVE';
                          } catch { return 'ACTIVE'; }
                        })()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Deal Metadata */}
                <div>
                  <h3 style={{color: '#555', marginBottom: '15px'}}>Deal Information</h3>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px'}}>
                    <div style={{background: '#f8f9fa', padding: '15px', borderRadius: '6px', border: '1px solid #dee2e6'}}>
                      <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#666'}}>Deal ID</label>
                      <span style={{color: '#333'}}>#{deal.id || deal.dealId || 'N/A'}</span>
                    </div>
                    <div style={{background: '#f8f9fa', padding: '15px', borderRadius: '6px', border: '1px solid #dee2e6'}}>
                      <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#666'}}>Category</label>
                      <span style={{color: '#333'}}>{deal.category || deal.businessCategory || 'N/A'}</span>
                    </div>
                    <div style={{background: '#f8f9fa', padding: '15px', borderRadius: '6px', border: '1px solid #dee2e6'}}>
                      <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#666'}}>Status</label>
                      <span style={{color: '#333'}}>{deal.status || 'N/A'}</span>
                    </div>
                    <div style={{background: '#f8f9fa', padding: '15px', borderRadius: '6px', border: '1px solid #dee2e6'}}>
                      <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#666'}}>Created Date</label>
                      <span style={{color: '#333'}}>{deal.created_at ? new Date(deal.created_at).toLocaleDateString() : (deal.createdAt ? new Date(deal.createdAt).toLocaleDateString() : 'N/A')}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'business' && (
              <div>
                <h2 style={{color: '#333', marginBottom: '20px'}}>Business Information</h2>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px'}}>
                  <div style={{background: '#f8f9fa', padding: '15px', borderRadius: '6px', border: '1px solid #dee2e6'}}>
                    <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#666'}}>Business Name</label>
                    <span style={{color: '#333'}}>{deal.businessName || 'N/A'}</span>
                  </div>
                  <div style={{background: '#f8f9fa', padding: '15px', borderRadius: '6px', border: '1px solid #dee2e6'}}>
                    <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#666'}}>Business Category</label>
                    <span style={{color: '#333'}}>{deal.businessCategory || 'N/A'}</span>
                  </div>
                  <div style={{background: '#f8f9fa', padding: '15px', borderRadius: '6px', border: '1px solid #dee2e6'}}>
                    <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#666'}}>Deal Category</label>
                    <span style={{color: '#333'}}>{deal.category || 'N/A'}</span>
                  </div>
                  <div style={{background: '#f8f9fa', padding: '15px', borderRadius: '6px', border: '1px solid #dee2e6'}}>
                    <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#666'}}>Business ID</label>
                    <span style={{color: '#333'}}>{deal.businessId || 'N/A'}</span>
                  </div>
                  <div style={{background: '#f8f9fa', padding: '15px', borderRadius: '6px', border: '1px solid #dee2e6'}}>
                    <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#666'}}>Access Level</label>
                    <span style={{color: '#333'}}>{deal.accessLevel || 'N/A'}</span>
                  </div>
                  <div style={{background: '#f8f9fa', padding: '15px', borderRadius: '6px', border: '1px solid #dee2e6'}}>
                    <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#666'}}>Owner Name</label>
                    <span style={{color: '#333'}}>{deal.merchantName || 'N/A'}</span>
                  </div>
                  <div style={{background: '#f8f9fa', padding: '15px', borderRadius: '6px', border: '1px solid #dee2e6'}}>
                    <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#666'}}>Owner Email</label>
                    <span style={{color: '#333'}}>{deal.merchantEmail || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'redemptions' && (
              <div>
                <h2 style={{color: '#333', marginBottom: '20px'}}>Deal Redemptions ({redemptions.length || deal.redemptionCount || deal.redemptions || 0})</h2>
                
                {/* Redemption Statistics */}
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '30px'}}>
                  <div style={{background: '#e3f2fd', padding: '15px', borderRadius: '6px', border: '1px solid #90caf9', textAlign: 'center'}}>
                    <div style={{fontSize: '24px', fontWeight: 'bold', color: '#1976d2', marginBottom: '5px'}}>{redemptionStats.total || 0}</div>
                    <div style={{color: '#424242', fontSize: '14px'}}>Total Redemptions</div>
                  </div>
                  <div style={{background: '#e8f5e8', padding: '15px', borderRadius: '6px', border: '1px solid #81c784', textAlign: 'center'}}>
                    <div style={{fontSize: '24px', fontWeight: 'bold', color: '#388e3c', marginBottom: '5px'}}>{redemptionStats.today || 0}</div>
                    <div style={{color: '#424242', fontSize: '14px'}}>Today</div>
                  </div>
                  <div style={{background: '#fff3e0', padding: '15px', borderRadius: '6px', border: '1px solid #ffb74d', textAlign: 'center'}}>
                    <div style={{fontSize: '24px', fontWeight: 'bold', color: '#f57c00', marginBottom: '5px'}}>{redemptionStats.thisWeek || 0}</div>
                    <div style={{color: '#424242', fontSize: '14px'}}>This Week</div>
                  </div>
                  <div style={{background: '#fce4ec', padding: '15px', borderRadius: '6px', border: '1px solid #f48fb1', textAlign: 'center'}}>
                    <div style={{fontSize: '24px', fontWeight: 'bold', color: '#c2185b', marginBottom: '5px'}}>{redemptionStats.thisMonth || 0}</div>
                    <div style={{color: '#424242', fontSize: '14px'}}>This Month</div>
                  </div>
                </div>

                {/* User Details Who Redeemed */}
                {redemptions.length > 0 ? (
                  <div style={{background: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', overflow: 'hidden'}}>
                    <div style={{background: '#f8f9fa', padding: '15px', borderBottom: '1px solid #dee2e6'}}>
                      <h3 style={{color: '#495057', margin: '0', fontSize: '18px'}}>Users Who Redeemed This Deal</h3>
                    </div>
                    <div style={{maxHeight: '400px', overflowY: 'auto'}}>
                      {redemptions.map((redemption, index) => (
                        <div key={index} style={{
                          padding: '15px',
                          borderBottom: index < redemptions.length - 1 ? '1px solid #f1f3f4' : 'none',
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr 1fr',
                          gap: '15px',
                          alignItems: 'center',
                          hover: {background: '#f8f9fa'}
                        }}>
                          <div>
                            <div style={{fontWeight: 'bold', color: '#333', marginBottom: '4px'}}>
                              {redemption.userName || redemption.user_name || redemption.name || `User ${redemption.userId || redemption.user_id}`}
                            </div>
                            <div style={{color: '#6c757d', fontSize: '14px'}}>
                              {redemption.userEmail || redemption.user_email || redemption.email || 'Email not available'}
                            </div>
                          </div>
                          <div>
                            <div style={{color: '#6c757d', fontSize: '12px', marginBottom: '2px'}}>Phone</div>
                            <div style={{color: '#333'}}>
                              {redemption.userPhone || redemption.user_phone || redemption.phone || 'Not provided'}
                            </div>
                          </div>
                          <div>
                            <div style={{color: '#6c757d', fontSize: '12px', marginBottom: '2px'}}>Redeemed On</div>
                            <div style={{color: '#333', fontWeight: '500'}}>
                              {redemption.redeemedAt || redemption.redeemed_at || redemption.redemptionDate ? 
                                new Date(redemption.redeemedAt || redemption.redeemed_at || redemption.redemptionDate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : 'Date not available'
                              }
                            </div>
                          </div>
                          <div>
                            <div style={{color: '#6c757d', fontSize: '12px', marginBottom: '2px'}}>Amount Saved</div>
                            <div style={{color: '#28a745', fontWeight: 'bold', fontSize: '16px'}}>
                              ₵{redemption.amountSaved || redemption.amount_saved || 
                                 (deal.originalPrice && deal.discountedPrice ? 
                                   (deal.originalPrice - deal.discountedPrice).toFixed(2) : 
                                   redemption.savings || '0')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{background: '#f8f9fa', padding: '40px', borderRadius: '6px', border: '1px solid #dee2e6', textAlign: 'center'}}>
                    <div style={{fontSize: '48px', marginBottom: '15px'}}>📋</div>
                    <h3 style={{color: '#6c757d', marginBottom: '10px'}}>No Redemptions Yet</h3>
                    <p style={{color: '#6c757d', fontSize: '16px', margin: '0'}}>
                      This deal hasn't been redeemed by any users yet. Once users start redeeming, you'll see their details here.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'analytics' && (
              <div>
                <h2 style={{color: '#333', marginBottom: '20px'}}>Deal Analytics & Performance</h2>
                
                {/* Key Performance Indicators */}
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px'}}>
                  <div style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '25px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'}}>
                    <div style={{fontSize: '32px', fontWeight: 'bold', marginBottom: '8px'}}>{deal.viewCount || deal.view_count || deal.views || 0}</div>
                    <div style={{fontSize: '14px', opacity: '0.9'}}>Total Views</div>
                  </div>
                  <div style={{background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white', padding: '25px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 15px rgba(240, 147, 251, 0.3)'}}>
                    <div style={{fontSize: '32px', fontWeight: 'bold', marginBottom: '8px'}}>{redemptions.length || deal.redemptionCount || deal.redemptions || 0}</div>
                    <div style={{fontSize: '14px', opacity: '0.9'}}>Total Redemptions</div>
                  </div>
                  <div style={{background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white', padding: '25px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 15px rgba(79, 172, 254, 0.3)'}}>
                    <div style={{fontSize: '32px', fontWeight: 'bold', marginBottom: '8px'}}>
                      {(deal.viewCount && redemptions.length) ? 
                        ((redemptions.length / deal.viewCount) * 100).toFixed(1) : '0'}%
                    </div>
                    <div style={{fontSize: '14px', opacity: '0.9'}}>Conversion Rate</div>
                  </div>
                  <div style={{background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white', padding: '25px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 15px rgba(250, 112, 154, 0.3)'}}>
                    <div style={{fontSize: '32px', fontWeight: 'bold', marginBottom: '8px'}}>
                      ₵{deal.totalRevenue || deal.total_revenue || (redemptions.length * (deal.discountedPrice || deal.discounted_price || 0)) || 0}
                    </div>
                    <div style={{fontSize: '14px', opacity: '0.9'}}>Revenue Generated</div>
                  </div>
                </div>

                {/* Performance Chart */}
                <div style={{background: '#fff', padding: '25px', borderRadius: '12px', border: '1px solid #e1e5e9', marginBottom: '30px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)'}}>
                  <h3 style={{color: '#495057', marginBottom: '20px', fontSize: '18px'}}>📊 Performance Trends</h3>
                  <div style={{
                    height: '320px',
                    background: 'linear-gradient(45deg, #f8f9fa 25%, transparent 25%, transparent 75%, #f8f9fa 75%), linear-gradient(45deg, #f8f9fa 25%, transparent 25%, transparent 75%, #f8f9fa 75%)',
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 10px 10px',
                    border: '2px dashed #dee2e6',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    {/* Mock Chart Visualization */}
                    <div style={{position: 'absolute', bottom: '20px', left: '20px', right: '20px', height: '200px', display: 'flex', alignItems: 'end', justifyContent: 'space-around'}}>
                      {[...Array(7)].map((_, i) => {
                        const height = Math.random() * 150 + 30;
                        const color = i === 6 ? '#667eea' : '#e9ecef';
                        return (
                          <div key={i} style={{
                            width: '30px',
                            height: `${height}px`,
                            background: color,
                            borderRadius: '4px 4px 0 0',
                            marginRight: '5px'
                          }} />
                        );
                      })}
                    </div>
                    <div style={{textAlign: 'center', color: '#6c757d', zIndex: 1, background: 'rgba(255,255,255,0.9)', padding: '15px', borderRadius: '8px'}}>
                      <div style={{fontSize: '20px', marginBottom: '10px'}}>📈</div>
                      <h4 style={{margin: '0 0 8px 0', color: '#495057'}}>Interactive Chart Coming Soon</h4>
                      <p style={{margin: '0', fontSize: '14px'}}>Daily views, redemptions, and revenue tracking</p>
                    </div>
                  </div>
                </div>

                {/* Engagement Metrics */}
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px'}}>
                  <div style={{background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e1e5e9', boxShadow: '0 2px 10px rgba(0,0,0,0.05)'}}>
                    <h4 style={{color: '#495057', marginBottom: '15px', fontSize: '16px'}}>🎯 User Engagement</h4>
                    <div style={{marginBottom: '15px'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                        <span style={{color: '#6c757d', fontSize: '14px'}}>View-to-Redemption Rate</span>
                        <span style={{fontWeight: 'bold', color: '#28a745'}}>
                          {(deal.viewCount && redemptions.length) ? 
                            ((redemptions.length / deal.viewCount) * 100).toFixed(1) : '0'}%
                        </span>
                      </div>
                      <div style={{background: '#e9ecef', height: '8px', borderRadius: '4px', overflow: 'hidden'}}>
                        <div style={{
                          background: 'linear-gradient(90deg, #28a745, #20c997)',
                          height: '100%',
                          width: `${(deal.viewCount && redemptions.length) ? 
                            Math.min(((redemptions.length / deal.viewCount) * 100), 100) : 0}%`,
                          borderRadius: '4px'
                        }} />
                      </div>
                    </div>
                    <div style={{marginBottom: '15px'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                        <span style={{color: '#6c757d', fontSize: '14px'}}>Deal Popularity</span>
                        <span style={{fontWeight: 'bold', color: '#007bff'}}>
                          {deal.viewCount > 100 ? 'High' : deal.viewCount > 50 ? 'Medium' : 'Low'}
                        </span>
                      </div>
                      <div style={{background: '#e9ecef', height: '8px', borderRadius: '4px', overflow: 'hidden'}}>
                        <div style={{
                          background: 'linear-gradient(90deg, #007bff, #6610f2)',
                          height: '100%',
                          width: `${Math.min((deal.viewCount || 0) / 2, 100)}%`,
                          borderRadius: '4px'
                        }} />
                      </div>
                    </div>
                  </div>

                  <div style={{background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e1e5e9', boxShadow: '0 2px 10px rgba(0,0,0,0.05)'}}>
                    <h4 style={{color: '#495057', marginBottom: '15px', fontSize: '16px'}}>💰 Revenue Analysis</h4>
                    <div style={{marginBottom: '12px'}}>
                      <div style={{color: '#6c757d', fontSize: '14px', marginBottom: '4px'}}>Revenue per Redemption</div>
                      <div style={{fontSize: '20px', fontWeight: 'bold', color: '#28a745'}}>
                        ₵{redemptions.length > 0 ? 
                          ((deal.totalRevenue || (redemptions.length * (deal.discountedPrice || 0))) / redemptions.length).toFixed(2) : 
                          (deal.discountedPrice || deal.discounted_price || 0)}
                      </div>
                    </div>
                    <div style={{marginBottom: '12px'}}>
                      <div style={{color: '#6c757d', fontSize: '14px', marginBottom: '4px'}}>Potential Lost Revenue</div>
                      <div style={{fontSize: '20px', fontWeight: 'bold', color: '#dc3545'}}>
                        ₵{redemptions.length > 0 ? 
                          (redemptions.length * ((deal.originalPrice || deal.original_price || 0) - (deal.discountedPrice || deal.discounted_price || 0))).toFixed(2) : 
                          '0'}
                      </div>
                    </div>
                    <div>
                      <div style={{color: '#6c757d', fontSize: '14px', marginBottom: '4px'}}>Deal Efficiency</div>
                      <div style={{fontSize: '16px', fontWeight: 'bold', color: '#ffc107'}}>
                        {redemptions.length > 0 ? 'Active' : deal.viewCount > 0 ? 'Needs Boost' : 'Low Interest'}
                      </div>
                    </div>
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
