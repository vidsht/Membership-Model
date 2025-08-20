import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useNotification } from '../../../contexts/NotificationContext';
import api, { merchantApi } from '../../../services/api';
import Modal from '../../shared/Modal';
import { useModal } from '../../../hooks/useModal';
import './DealDetail.css';
import useImageUrl from '../../../hooks/useImageUrl';

const DealDetail = () => {  
  const { getImageUrl, getMerchantLogoUrl, getDealBannerUrl } = useImageUrl();
  const { dealId } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { modalState, closeModal, showDeleteConfirm } = useModal();
  
  const navigateToDealsTab = () => {
    // Navigate to admin dashboard with deals tab active
    navigate('/admin', { state: { activeTab: 'deals' } });
  };
  
  const [deal, setDeal] = useState(null);
  const [business, setBusiness] = useState(null);
  const [redemptions, setRedemptions] = useState([]);
  const [redemptionStats, setRedemptionStats] = useState({
    total: 0,
    thisMonth: 0,
    thisWeek: 0,
    today: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Enhanced tab list with business info
  const tabList = [
    { key: 'details', label: 'Deal Details', icon: 'fas fa-info-circle' },
    { key: 'business', label: 'Business Info', icon: 'fas fa-building' },
    { key: 'redemptions', label: 'Redemptions', icon: 'fas fa-ticket-alt' },
    { key: 'analytics', label: 'Analytics', icon: 'fas fa-chart-line' },
  ];
  
  const [activeTab, setActiveTab] = useState('details');
  
  console.log('🔥 ACTIVE TAB STATE:', activeTab);
  console.log('🔥 TAB LIST:', tabList);
  
  useEffect(() => {
    fetchDealData();
  }, [dealId]);

  const fetchDealData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch deal details
      const dealResponse = await api.get(`/admin/deals/${dealId}`);
      const dealData = dealResponse.data.deal;
      setDeal(dealData);

      // Fetch business details
      // Use business info from dealData (already joined in backend)
      const businessData = {
        businessId: dealData.businessId,
        businessName: dealData.businessName,
        businessCategory: dealData.businessCategory,
        ownerName: dealData.merchantName,
        ownerEmail: dealData.merchantEmail,
        businessEmail: dealData.businessEmail,
        businessPhone: dealData.businessPhone,
        businessAddress: dealData.businessAddress,
        website: dealData.website,
        businessLicense: dealData.businessLicense,
        taxId: dealData.taxId,
        status: dealData.businessStatus,
        isVerified: dealData.isVerified,
        verificationDate: dealData.verificationDate,
        membershipLevel: dealData.membershipType, // Use membershipType from users table
        businessCreatedAt: dealData.businessCreatedAt,
        businessDescription: dealData.businessDescription
      };
      setBusiness(businessData);

      // Fetch redemptions with detailed stats
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
      }
      
    } catch (error) {
      console.error('Error fetching deal details:', error);
      showNotification('Could not load deal details', 'error');
      navigateToDealsTab();
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
    try {
      const confirmed = await showDeleteConfirm(deal?.title || 'this deal');
      
      if (confirmed) {
        await api.delete(`/admin/deals/${dealId}`);
        showNotification('Deal deleted successfully', 'success');
        navigateToDealsTab();
      }
    } catch (error) {
      console.error('Error deleting deal:', error);
      showNotification('Failed to delete deal', 'error');
    }
  };

  const markRedemptionAsUsed = async (redemptionId) => {
    try {
      await api.patch(`/admin/redemptions/${redemptionId}/status`, { status: 'used' });
      // Refresh redemptions
      await fetchDealData();
      showNotification('Redemption marked as used', 'success');
    } catch (error) {
      console.error('Error updating redemption status:', error);
      showNotification('Error updating redemption status', 'error');
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
  
  console.log('Deal state check:', { deal, dealExists: !!deal, dealId: deal?.id });
  console.log('🚨 COMPONENT RENDERING - Active Tab:', activeTab);
  console.log('🚨 COMPONENT RENDERING - Deal Data:', deal);
  
  if (!deal || !deal.id) {
    return (
      <div className="not-found">
        <i className="fas fa-exclamation-triangle"></i>
        <h2>Deal Not Found</h2>
        <p>The requested deal could not be found or may have been deleted.</p>
        <button onClick={() => navigateToDealsTab()} className="btn-primary">
          Back to Deals
        </button>
      </div>
    );
  }
  
  console.log('✅ PAST ALL EARLY RETURNS!');
  console.log('Deal data for isExpired calc:', { 
    validUntil: deal.validUntil, 
    validUntilType: typeof deal.validUntil,
    currentDate: new Date().toISOString()
  });
  
  let isExpired = false;
  try {
    isExpired = deal.validUntil ? new Date(deal.validUntil) < new Date() : false;
  } catch (error) {
    console.error('Error calculating isExpired:', error);
    isExpired = false;
  }
  
  console.log('✅ isExpired calculated:', isExpired);
  
  console.log('Rendering with state:', { 
    deal, 
    business, 
    redemptions, 
    redemptionStats, 
    isLoading, 
    activeTab 
  });
  
  return (
    <div className="admin-deal-detail">
      {/* CRITICAL: MAIN RETURN REACHED */}
      <div style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        background: 'lime',
        color: 'black',
        padding: '20px',
        zIndex: 10000,
        fontSize: '24px',
        border: '5px solid red',
        fontWeight: 'bold'
      }}>
        🟢 MAIN RETURN STATEMENT REACHED!<br/>
        Component is rendering successfully!
      </div>
      
      {/* EMERGENCY VISIBILITY TEST */}
      <div style={{
        position: 'fixed',
        top: '50px',
        right: '50px',
        background: 'red',
        color: 'white',
        padding: '20px',
        zIndex: 9999,
        fontSize: '20px',
        border: '5px solid yellow'
      }}>
        🚨 DEAL DETAIL COMPONENT IS RENDERING! 🚨<br/>
        Deal ID: {dealId}<br/>
        Deal Title: {deal?.title}
      </div>
      
      {/* RAW DATA EMERGENCY DISPLAY */}
      <div style={{
        position: 'relative',
        background: 'white',
        border: '5px solid orange',
        padding: '30px',
        margin: '20px',
        fontSize: '16px',
        lineHeight: '1.5'
      }}>
        <h2 style={{color: 'red', marginBottom: '20px'}}>🚨 EMERGENCY DATA DISPLAY</h2>
        
        <div style={{marginBottom: '15px'}}>
          <strong>Deal ID:</strong> {dealId}
        </div>
        
        <div style={{marginBottom: '15px'}}>
          <strong>Deal Title:</strong> {deal?.title || 'No title'}
        </div>
        
        <div style={{marginBottom: '15px'}}>
          <strong>Business Name:</strong> {deal?.businessName || 'No business name'}
        </div>
        
        <div style={{marginBottom: '15px'}}>
          <strong>Category:</strong> {deal?.category || 'No category'}
        </div>
        
        <div style={{marginBottom: '15px'}}>
          <strong>Description:</strong> {deal?.description || 'No description'}
        </div>
        
        <div style={{marginBottom: '15px'}}>
          <strong>Discount:</strong> {deal?.discount ? `${deal.discount}% off` : 'No discount'}
        </div>
        
        <div style={{marginBottom: '15px'}}>
          <strong>Original Price:</strong> GHS {deal?.originalPrice || 'N/A'}
        </div>
        
        <div style={{marginBottom: '15px'}}>
          <strong>Discounted Price:</strong> GHS {deal?.discountedPrice || 'N/A'}
        </div>
        
        <div style={{marginBottom: '15px'}}>
          <strong>Status:</strong> {deal?.status || 'No status'}
        </div>
        
        <div style={{marginBottom: '15px'}}>
          <strong>Valid Until:</strong> {deal?.validUntil || 'No expiry'}
        </div>
        
        <div style={{marginBottom: '15px'}}>
          <strong>Redemptions:</strong> {deal?.redemptions || 0}
        </div>
        
        <div style={{marginBottom: '15px'}}>
          <strong>Business ID:</strong> {deal?.businessId || 'No business ID'}
        </div>
        
        <div style={{marginBottom: '15px'}}>
          <strong>Business Category:</strong> {deal?.businessCategory || 'No business category'}
        </div>
      </div>
      
      {/* 🔥🔥🔥 ULTIMATE EMERGENCY CONTENT OVERRIDE - FORCE RENDER ALL DEAL CONTENT 🔥🔥🔥 */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: '5px solid #ff1493',
        padding: '40px',
        margin: '30px',
        borderRadius: '15px',
        zIndex: 999999,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
      }}>
        <h1 style={{
          color: '#ffff00',
          margin: '0 0 30px 0',
          fontSize: '32px',
          textAlign: 'center',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
        }}>
          🔥 ULTIMATE EMERGENCY CONTENT OVERRIDE 🔥
        </h1>
        
        {deal && (
          <div>
            {/* Deal Header */}
            <div style={{
              background: 'rgba(255,255,255,0.95)',
              color: '#333',
              padding: '25px',
              marginBottom: '25px',
              borderRadius: '12px',
              border: '2px solid #ffd700'
            }}>
              <h1 style={{color: '#2c3e50', margin: '0 0 15px 0', fontSize: '28px'}}>
                📋 {deal.title}
              </h1>
              <div style={{color: '#34495e', fontSize: '18px', marginBottom: '20px', lineHeight: '1.6'}}>
                {deal.description}
              </div>
              <div style={{display: 'flex', gap: '15px', flexWrap: 'wrap'}}>
                <span style={{
                  background: deal.status === 'active' ? '#27ae60' : '#e74c3c',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '25px',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}>🎯 {deal.status.toUpperCase()}</span>
                <span style={{
                  background: '#3498db',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '25px',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}>📂 {deal.category}</span>
              </div>
            </div>

            {/* Mega Pricing Section */}
            <div style={{
              background: 'rgba(255,255,255,0.95)',
              color: '#333',
              padding: '25px',
              marginBottom: '25px',
              borderRadius: '12px',
              border: '2px solid #ffd700'
            }}>
              <h2 style={{margin: '0 0 20px 0', color: '#2c3e50', fontSize: '24px'}}>
                💰 PRICING BREAKDOWN
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px',
                textAlign: 'center'
              }}>
                <div style={{
                  background: '#ecf0f1',
                  padding: '20px',
                  borderRadius: '10px',
                  border: '2px solid #bdc3c7'
                }}>
                  <div style={{fontSize: '16px', color: '#7f8c8d', marginBottom: '8px'}}>Original Price</div>
                  <div style={{
                    fontSize: '24px',
                    color: '#e74c3c',
                    textDecoration: 'line-through',
                    fontWeight: 'bold'
                  }}>
                    GHS {deal.original_price}
                  </div>
                </div>
                <div style={{
                  background: '#d5f4e6',
                  padding: '20px',
                  borderRadius: '10px',
                  border: '2px solid #27ae60'
                }}>
                  <div style={{fontSize: '16px', color: '#27ae60', marginBottom: '8px'}}>Deal Price</div>
                  <div style={{
                    fontSize: '32px',
                    color: '#27ae60',
                    fontWeight: 'bold'
                  }}>
                    GHS {deal.discounted_price}
                  </div>
                </div>
                <div style={{
                  background: '#fef5e7',
                  padding: '20px',
                  borderRadius: '10px',
                  border: '2px solid #f39c12'
                }}>
                  <div style={{fontSize: '16px', color: '#e67e22', marginBottom: '8px'}}>You Save</div>
                  <div style={{
                    fontSize: '28px',
                    color: '#e67e22',
                    fontWeight: 'bold'
                  }}>
                    {deal.percentage}% OFF
                  </div>
                </div>
              </div>
            </div>

            {/* Validity & Status Section */}
            <div style={{
              background: 'rgba(255,255,255,0.95)',
              color: '#333',
              padding: '25px',
              marginBottom: '25px',
              borderRadius: '12px',
              border: '2px solid #ffd700'
            }}>
              <h2 style={{margin: '0 0 20px 0', color: '#2c3e50', fontSize: '24px'}}>
                📅 DEAL VALIDITY & STATUS
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px'
              }}>
                <div>
                  <strong style={{color: '#2c3e50', fontSize: '16px'}}>Valid From:</strong><br/>
                  <span style={{fontSize: '18px', color: '#27ae60'}}>
                    {new Date(deal.valid_from).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div>
                  <strong style={{color: '#2c3e50', fontSize: '16px'}}>Valid Until:</strong><br/>
                  <span style={{fontSize: '18px', color: '#e74c3c'}}>
                    {new Date(deal.valid_until).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div>
                  <strong style={{color: '#2c3e50', fontSize: '16px'}}>Current Status:</strong><br/>
                  <span style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: (() => {
                      try {
                        const now = new Date();
                        const validUntil = new Date(deal.valid_until);
                        return now > validUntil ? '#e74c3c' : '#27ae60';
                      } catch {
                        return '#7f8c8d';
                      }
                    })()
                  }}>
                    {(() => {
                      try {
                        const now = new Date();
                        const validUntil = new Date(deal.valid_until);
                        return now > validUntil ? '❌ EXPIRED' : '✅ ACTIVE';
                      } catch {
                        return '⚠️ UNKNOWN';
                      }
                    })()}
                  </span>
                </div>
              </div>
            </div>

            {/* Business Information */}
            {business && (
              <div style={{
                background: 'rgba(255,255,255,0.95)',
                color: '#333',
                padding: '25px',
                marginBottom: '25px',
                borderRadius: '12px',
                border: '2px solid #ffd700'
              }}>
                <h2 style={{margin: '0 0 20px 0', color: '#2c3e50', fontSize: '24px'}}>
                  🏪 BUSINESS INFORMATION
                </h2>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '20px'
                }}>
                  <div>
                    <strong style={{color: '#2c3e50', fontSize: '16px'}}>Business Name:</strong><br/>
                    <span style={{fontSize: '20px', color: '#3498db', fontWeight: 'bold'}}>
                      {business.business_name}
                    </span>
                  </div>
                  <div>
                    <strong style={{color: '#2c3e50', fontSize: '16px'}}>Category:</strong><br/>
                    <span style={{fontSize: '18px', color: '#9b59b6'}}>
                      {business.category}
                    </span>
                  </div>
                  <div>
                    <strong style={{color: '#2c3e50', fontSize: '16px'}}>Location:</strong><br/>
                    <span style={{fontSize: '18px', color: '#e67e22'}}>
                      {business.location}
                    </span>
                  </div>
                  {business.contact_phone && (
                    <div>
                      <strong style={{color: '#2c3e50', fontSize: '16px'}}>Phone:</strong><br/>
                      <span style={{fontSize: '18px', color: '#27ae60'}}>
                        {business.contact_phone}
                      </span>
                    </div>
                  )}
                  {business.email && (
                    <div>
                      <strong style={{color: '#2c3e50', fontSize: '16px'}}>Email:</strong><br/>
                      <span style={{fontSize: '16px', color: '#3498db'}}>
                        {business.email}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Deal Analytics & Metrics */}
            <div style={{
              background: 'rgba(255,255,255,0.95)',
              color: '#333',
              padding: '25px',
              borderRadius: '12px',
              border: '2px solid #ffd700'
            }}>
              <h2 style={{margin: '0 0 20px 0', color: '#2c3e50', fontSize: '24px'}}>
                📊 DEAL ANALYTICS & METRICS
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px'
              }}>
                <div style={{
                  background: '#e8f4fd',
                  padding: '15px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  border: '1px solid #3498db'
                }}>
                  <div style={{fontSize: '14px', color: '#2c3e50', marginBottom: '5px'}}>Deal ID</div>
                  <div style={{fontSize: '24px', color: '#3498db', fontWeight: 'bold'}}>
                    #{deal.id}
                  </div>
                </div>
                <div style={{
                  background: '#f0f9ff',
                  padding: '15px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  border: '1px solid #3498db'
                }}>
                  <div style={{fontSize: '14px', color: '#2c3e50', marginBottom: '5px'}}>Created Date</div>
                  <div style={{fontSize: '16px', color: '#3498db', fontWeight: 'bold'}}>
                    {new Date(deal.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div style={{
                  background: '#fff5f5',
                  padding: '15px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  border: '1px solid #e74c3c'
                }}>
                  <div style={{fontSize: '14px', color: '#2c3e50', marginBottom: '5px'}}>Last Updated</div>
                  <div style={{fontSize: '16px', color: '#e74c3c', fontWeight: 'bold'}}>
                    {new Date(deal.updated_at).toLocaleDateString()}
                  </div>
                </div>
                <div style={{
                  background: '#f0fff4',
                  padding: '15px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  border: '1px solid #27ae60'
                }}>
                  <div style={{fontSize: '14px', color: '#2c3e50', marginBottom: '5px'}}>Total Redemptions</div>
                  <div style={{fontSize: '24px', color: '#27ae60', fontWeight: 'bold'}}>
                    {redemptions.length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!deal && (
          <div style={{
            textAlign: 'center',
            padding: '50px',
            background: 'rgba(255,255,255,0.9)',
            borderRadius: '12px',
            color: '#2c3e50'
          }}>
            <div style={{fontSize: '24px', marginBottom: '15px'}}>⏳</div>
            <div style={{fontSize: '20px', fontWeight: 'bold'}}>Loading deal information...</div>
          </div>
        )}
      </div>
      
      {/* NORMAL FLOW EMERGENCY TEST */}
      <div style={{
        background: 'lime',
        color: 'black',
        padding: '30px',
        margin: '20px 0',
        border: '5px solid red',
        fontSize: '24px',
        fontWeight: 'bold',
        textAlign: 'center'
      }}>
        🟢 EMERGENCY: NORMAL DOCUMENT FLOW TEST!<br/>
        If you see this, normal content is rendering!<br/>
        Deal ID: {dealId} | Title: {deal?.title}
      </div>
      
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
            onClick={() => navigateToDealsTab()}
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

      <div className="deal-content">
        {/* EMERGENCY TAB LIST CHECK */}
        <div style={{
          background: 'cyan',
          color: 'black',
          padding: '20px',
          border: '3px solid blue',
          margin: '10px 0',
          fontSize: '18px'
        }}>
          🔍 TAB LIST DEBUG:<br/>
          tabList exists: {!!tabList ? 'YES' : 'NO'}<br/>
          tabList length: {tabList?.length || 'undefined'}<br/>
          Condition result: {(tabList && tabList.length > 0) ? 'TRUE' : 'FALSE'}<br/>
          First tab: {tabList?.[0]?.key || 'N/A'}
        </div>
        
        {tabList && tabList.length > 0 ? (
          <div>
            {/* EMERGENCY: INSIDE CONDITIONAL TEST */}
            <div style={{
              background: 'magenta',
              color: 'white',
              padding: '20px',
              border: '3px solid purple',
              margin: '10px 0',
              fontSize: '18px'
            }}>
              🟣 INSIDE TAB CONDITIONAL! We made it past the condition!
            </div>
            
            <div className="deal-tabs" role="tablist" aria-label="Deal Detail Tabs">
            {/* EMERGENCY: TAB MAP TEST */}
            <div style={{background: 'yellow', padding: '10px', border: '2px solid orange'}}>
              🟡 About to map over tabList. Length: {tabList?.length}
            </div>
            
            {(() => {
              try {
                return tabList.map(tab => (
                  <button
                    key={tab.key}
                    className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
                    onClick={() => {
                      console.log('🔥 TAB CLICKED:', tab.key);
                      setActiveTab(tab.key);
                    }}
                    role="tab"
                    aria-selected={activeTab === tab.key}
                    aria-controls={`tab-panel-${tab.key}`}
                    id={`tab-${tab.key}`}
                    tabIndex={activeTab === tab.key ? 0 : -1}
                  >
                    <i className={tab.icon}></i> {tab.label}
                  </button>
                ));
              } catch (error) {
                console.error('🚨 TAB MAP ERROR:', error);
                return (
                  <div style={{background: 'red', color: 'white', padding: '10px'}}>
                    ❌ ERROR mapping tabs: {error.message}
                  </div>
                );
              }
            })()}
            
            {/* EMERGENCY: AFTER TAB MAP */}
            <div style={{background: 'lightgreen', padding: '10px', border: '2px solid green'}}>
              🟢 Made it past tab mapping!
            </div>
          </div>
          </div>
        ) : null}

        <div className="tab-content" style={{
          display: 'block !important',
          visibility: 'visible !important',
          opacity: '1 !important',
          position: 'relative !important',
          zIndex: '1000 !important',
          background: 'white !important',
          padding: '25px !important',
          border: '5px solid purple !important',
          margin: '20px !important',
          minHeight: '300px !important'
        }}>
          {/* EMERGENCY VISIBILITY TEST */}
          <div style={{
            position: 'relative',
            zIndex: 9999,
            background: 'orange',
            color: 'black',
            padding: '30px',
            border: '5px solid black',
            fontSize: '24px',
            fontWeight: 'bold',
            margin: '20px 0'
          }}>
            🚨 EMERGENCY: TAB CONTENT AREA! 🚨<br/>
            If you see this, the tab-content div is rendering!
          </div>
          {/* Debug Information */}
          <div style={{ 
            padding: '10px', 
            background: '#f0f0f0', 
            margin: '10px 0', 
            fontSize: '12px',
            border: '2px solid red',
            color: 'black'
          }}>
            <strong>Debug Info:</strong><br/>
            Deal Title: {deal?.title || 'No title'}<br/>
            Business Name: {business?.businessName || 'No business name'}<br/>
            Active Tab: {activeTab}<br/>
            Redemptions Count: {redemptions?.length || 0}<br/>
            Deal Status: {deal?.status || 'No status'}<br/>
            Deal Object Keys: {deal ? Object.keys(deal).slice(0, 10).join(', ') : 'No deal object'}
          </div>
          
          {/* VISIBLE TEST CONTENT */}
          <div style={{
            background: 'yellow',
            padding: '20px',
            margin: '10px 0',
            border: '3px solid red',
            fontSize: '16px',
            color: 'black'
          }}>
            <h2>TEST VISIBILITY: Deal Title = {deal?.title}</h2>
            <p>Business Name = {deal?.businessName}</p>
            <p>Category = {deal?.category}</p>
            <p>Description = {deal?.description}</p>
            <p><strong>Active Tab = {activeTab}</strong></p>
            <p><strong>Tab Conditions:</strong></p>
            <p>details === activeTab: {('details' === activeTab).toString()}</p>
            <p>business === activeTab: {('business' === activeTab).toString()}</p>
            <p>redemptions === activeTab: {('redemptions' === activeTab).toString()}</p>
            <p>analytics === activeTab: {('analytics' === activeTab).toString()}</p>
          </div>
          
          {/* EMERGENCY: ACTIVE TAB CHECK */}
          <div style={{
            background: 'pink',
            color: 'black',
            padding: '15px',
            border: '3px solid red',
            margin: '10px 0',
            fontSize: '16px'
          }}>
            🔍 ACTIVE TAB CHECK:<br/>
            activeTab value: "{activeTab}"<br/>
            typeof activeTab: {typeof activeTab}<br/>
            activeTab === 'details': {(activeTab === 'details').toString()}<br/>
            activeTab === 'business': {(activeTab === 'business').toString()}<br/>
            String comparison: {'details' === activeTab ? 'MATCH' : 'NO MATCH'}
          </div>
          
          {/* Details Tab - FORCED TO SHOW */}
          <div style={{background: 'lightgreen', padding: '10px', border: '2px solid green'}}>
            <h3>🟢 DETAILS TAB IS RENDERING (FORCED)</h3>
          </div>
          
          {/* FORCED DETAILS CONTENT - NO CONDITIONAL */}
          <div 
            className="deal-details" 
            id="tab-panel-details" 
            role="tabpanel" 
            aria-labelledby="tab-details"
            style={{
              display: 'block',
              visibility: 'visible',
              opacity: 1,
              background: 'white',
              border: '2px solid blue',
              padding: '20px',
              margin: '10px 0'
            }}
          >
            <h2 style={{color: 'red'}}>🚨 FORCED DEAL DETAILS CONTENT</h2>
            <p><strong>Deal Title:</strong> {deal?.title}</p>
            <p><strong>Business Name:</strong> {deal?.businessName}</p>
            <p><strong>Category:</strong> {deal?.category}</p>
            <p><strong>Description:</strong> {deal?.description}</p>
            <p><strong>Discount:</strong> {deal?.discount}% off</p>
            <p><strong>Original Price:</strong> GHS {deal?.originalPrice}</p>
            <p><strong>Discounted Price:</strong> GHS {deal?.discountedPrice}</p>
            <p><strong>Valid Until:</strong> {deal?.validUntil}</p>
            <p><strong>Status:</strong> {deal?.status}</p>
            <p><strong>Redemptions:</strong> {deal?.redemptions}</p>
            
            {/* BUSINESS INFO */}
            <h3 style={{color: 'blue', marginTop: '20px'}}>Business Information:</h3>
            <p><strong>Business ID:</strong> {deal?.businessId}</p>
            <p><strong>Business Category:</strong> {deal?.businessCategory}</p>
            <p><strong>Merchant Name:</strong> {deal?.merchantName || 'N/A'}</p>
            <p><strong>Merchant Email:</strong> {deal?.merchantEmail || 'N/A'}</p>
          </div>
          
          {/* Business Tab */}
          {activeTab === 'business' && (
            <div style={{background: 'lightblue', padding: '10px', border: '2px solid blue'}}>
              <h3>🔵 BUSINESS TAB IS RENDERING</h3>
            </div>
          )}
          
          {/* Redemptions Tab */}
          {activeTab === 'redemptions' && (
            <div style={{background: 'lightcoral', padding: '10px', border: '2px solid red'}}>
              <h3>🔴 REDEMPTIONS TAB IS RENDERING</h3>
            </div>
          )}
          
          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div style={{background: 'lightyellow', padding: '10px', border: '2px solid orange'}}>
              <h3>🟡 ANALYTICS TAB IS RENDERING</h3>
            </div>
          )}
          
          {/* Original Details Tab */}
          {activeTab === 'details' && (
            <div 
              className="deal-details" 
              id="tab-panel-details" 
              role="tabpanel" 
              aria-labelledby="tab-details"
              style={{
                display: 'block',
                visibility: 'visible',
                opacity: 1,
                background: 'white',
                border: '2px solid blue',
                padding: '20px',
                margin: '10px 0'
              }}
            >
              <div className="detail-grid">
                <div className="detail-section">
                  <div className="deal-image">
                    {deal.imageUrl ? (
                      <img src={getDealBannerUrl(deal) || getImageUrl(deal.imageUrl, 'deal') || '/uploads/default-banner.png'} alt={deal.title} />
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
                      <span className="info-value">
                        {deal.businessName}
                        {deal.status && (
                          <span className={`business-status ${deal.status}`}>
                            ({deal.status})
                          </span>
                        )}
                      </span>
                    </div>
                    
                    <div className="info-row">
                      <span className="info-label">Business Owner</span>
                      <span className="info-value">{deal.businessOwner || 'N/A'}</span>
                    </div>
                    
                    <div className="info-row">
                      <span className="info-label">Category</span>
                      <span className="info-value">
                        {deal.category}
                        {deal.businessCategory && deal.businessCategory !== deal.category && (
                          <span className="business-category"> (Business: {deal.businessCategory})</span>
                        )}
                      </span>
                    </div>
                    
                    <div className="info-row">
                      <span className="info-label">Discount</span>
                      <span className="info-value">
                        {deal.discountType === 'percentage' && `${deal.discount}% off`}
                        {deal.discountType === 'fixed' && `GHS ${deal.discount} off`}
                        {deal.discountType === 'buyOneGetOne' && 'Buy One Get One Free'}
                        {deal.discountType === 'freeItem' && 'Free Item'}
                        {deal.originalPrice && (
                          <div className="price-breakdown">
                            <span className="original-price">Original: GHS {deal.originalPrice}</span>
                            {deal.discountedPrice && (
                              <span className="discounted-price">Discounted: GHS {deal.discountedPrice}</span>
                            )}
                          </div>
                        )}
                      </span>
                    </div>
                    
                    <div className="info-row">
                      <span className="info-label">Valid Period</span>
                      <span className="info-value">
                        {deal.validFrom && deal.validUntil ? (
                          `${new Date(deal.validFrom).toLocaleDateString()} to ${new Date(deal.validUntil).toLocaleDateString()}`
                        ) : deal.validUntil ? (
                          `Until ${new Date(deal.validUntil).toLocaleDateString()}`
                        ) : (
                          'No expiry date set'
                        )}
                      </span>
                    </div>
                    
                    <div className="info-row">
                      <span className="info-label">Membership Access</span>
                      <span className="info-value access-level">
                        {deal.accessLevel === 'basic' && 'Community (Basic)'}
                        {deal.accessLevel === 'intermediate' && 'Silver (Intermediate)'}
                        {deal.accessLevel === 'full' && 'Gold (Full)'}
                        {deal.accessLevel === 'all' && 'All Members'}
                        {deal.minPlanPriority && (
                          <span className="plan-priority"> (Min Priority: {deal.minPlanPriority})</span>
                        )}
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
              {/* Redemption Statistics */}
              <div className="redemption-stats">
                <h4><i className="fas fa-chart-line"></i> Redemption Statistics</h4>
                <div className="stats-cards">
                  <div className="stat-card total">
                    <div className="stat-icon">
                      <i className="fas fa-ticket-alt"></i>
                    </div>
                    <div className="stat-content">
                      <span className="stat-number">{redemptionStats.total}</span>
                      <span className="stat-label">Total Redemptions</span>
                    </div>
                  </div>
                  <div className="stat-card today">
                    <div className="stat-icon">
                      <i className="fas fa-calendar-day"></i>
                    </div>
                    <div className="stat-content">
                      <span className="stat-number">{redemptionStats.today}</span>
                      <span className="stat-label">Today</span>
                    </div>
                  </div>
                  <div className="stat-card week">
                    <div className="stat-icon">
                      <i className="fas fa-calendar-week"></i>
                    </div>
                    <div className="stat-content">
                      <span className="stat-number">{redemptionStats.thisWeek}</span>
                      <span className="stat-label">This Week</span>
                    </div>
                  </div>
                  <div className="stat-card month">
                    <div className="stat-icon">
                      <i className="fas fa-calendar-alt"></i>
                    </div>
                    <div className="stat-content">
                      <span className="stat-number">{redemptionStats.thisMonth}</span>
                      <span className="stat-label">This Month</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Redemption Details */}
              {redemptions.length > 0 ? (
                <div className="redemptions-section">
                  <h4><i className="fas fa-list"></i> Redemption Details</h4>
                  <div className="redemptions-table-container">
                    <table className="redemptions-table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Redeemed On</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {redemptions.map(redemption => (
                          <tr key={redemption._id || redemption.id}>
                            <td>
                              <div className="user-info">
                                <div className="user-avatar">
                                  {redemption.userProfilePicture ? (
                                    <img src={getImageUrl(redemption.userProfilePicture, 'profile') || '/uploads/default-avatar.jpg'} alt={redemption.userName} />
                                  ) : (
                                    <i className="fas fa-user"></i>
                                  )}
                                </div>
                                <div className="user-details">
                                  <span className="user-name">{redemption.userName}</span>
                                  <span className="user-email">{redemption.userEmail}</span>
                                  {redemption.userPhone && (
                                    <span className="user-phone">{redemption.userPhone}</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="redemption-date">
                                <span className="date">{new Date(redemption.redeemedAt).toLocaleDateString()}</span>
                                <span className="time">{new Date(redemption.redeemedAt).toLocaleTimeString()}</span>
                              </div>
                            </td>
                            <td>
                              <span className={`status-badge ${redemption.status || 'redeemed'}`}>
                                {(redemption.status || 'redeemed').charAt(0).toUpperCase() + (redemption.status || 'redeemed').slice(1)}
                              </span>
                            </td>
                            <td>
                              <div className="redemption-actions">
                                <button 
                                  className="btn-sm btn-info"
                                  title="View User Details"
                                  onClick={() => navigate(`/admin/users/${redemption.userId}`)}
                                >
                                  <i className="fas fa-eye"></i>
                                </button>
                                {redemption.status === 'pending' && (
                                  <button 
                                    className="btn-sm btn-success"
                                    title="Mark as Used"
                                    onClick={() => markRedemptionAsUsed(redemption._id || redemption.id)}
                                  >
                                    <i className="fas fa-check"></i>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="no-redemptions">
                  <i className="fas fa-ticket-alt"></i>
                  <h3>No Redemptions Yet</h3>
                  <p>This deal hasn't been redeemed by any users yet.</p>
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

          {/* Business Info Tab */}
          {activeTab === 'business' && (
            <div className="deal-business" id="tab-panel-business" role="tabpanel" aria-labelledby="tab-business">
              {business ? (
                <div className="business-info-container">
                  <div className="business-header">
                    <div className="business-image">
                      {business.logo ? (
                        <img src={getMerchantLogoUrl(business) || '/logo-placeholder.jpg'} alt={business.businessName} />
                      ) : (
                        <div className="no-logo">
                          <i className="fas fa-building"></i>
                        </div>
                      )}
                    </div>                    <div className="business-title">
                      <h3>{business.businessName}</h3>
                      <p className="business-category">{business.businessCategory || business.category}</p>
                      <div className="business-status">
                        <span className={`status-badge ${business.status || 'active'}`}>
                          {(business.status || 'active').charAt(0).toUpperCase() + (business.status || 'active').slice(1)}
                        </span>
                        {business.isVerified && (
                          <span className="verified-badge">
                            <i className="fas fa-check-circle"></i> Verified
                          </span>
                        )}
                      </div>
                      <div className="business-id">
                        <small>Business ID: {business.businessId}</small>
                      </div>
                    </div>
                  </div>

                  <div className="business-details-grid">
                    <div className="business-section">
                      <h4><i className="fas fa-info-circle"></i> Business Information</h4>                      <div className="info-grid">
                        <div className="info-item">
                          <label>Owner:</label>
                          <span>{business.ownerName || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <label>Owner Email:</label>
                          <span>{business.ownerEmail || business.email || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <label>Business Email:</label>
                          <span>{business.businessEmail || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <label>Owner Phone:</label>
                          <span>{business.ownerPhone || business.phone || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <label>Business Phone:</label>
                          <span>{business.businessPhone || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <label>Website:</label>
                          <span>
                            {business.website ? (
                              <a href={business.website} target="_blank" rel="noopener noreferrer">
                                {business.website}
                              </a>
                            ) : 'N/A'}
                          </span>
                        </div>
                        <div className="info-item">
                          <label>Business License:</label>
                          <span>{business.businessLicense || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <label>Tax ID:</label>
                          <span>{business.taxId || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <label>Membership Level:</label>
                          <span className={`membership-level ${business.membershipLevel}`}>
                            {(business.membershipLevel || 'basic').toUpperCase()}
                          </span>
                        </div>
                        {business.verificationDate && (
                          <div className="info-item">
                            <label>Verified On:</label>
                            <span>{new Date(business.verificationDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        <div className="info-item">
                          <label>Joined:</label>
                          <span>{new Date(business.businessCreatedAt || business.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>                    <div className="business-section">
                      <h4><i className="fas fa-map-marker-alt"></i> Location</h4>
                      <div className="location-info">
                        <div className="business-address">
                          <strong>Business Address:</strong>
                          <p>{business.businessAddress || 'Address not provided'}</p>
                        </div>
                        {business.ownerAddress && business.ownerAddress !== business.businessAddress && (
                          <div className="owner-address">
                            <strong>Owner Address:</strong>
                            <p>{business.ownerAddress}</p>
                          </div>
                        )}
                        {(business.ownerCity || business.city) && (
                          <div className="location-details">
                            <p>
                              {business.ownerCity || business.city}
                              {(business.ownerState || business.state) && `, ${business.ownerState || business.state}`}
                              {(business.ownerCountry || business.country) && `, ${business.ownerCountry || business.country}`}
                            </p>
                          </div>
                        )}
                        {business.coordinates && (
                          <div className="coordinates">
                            <small>Coordinates: {business.coordinates.lat}, {business.coordinates.lng}</small>
                          </div>
                        )}
                      </div>
                    </div>

                    {business.businessDescription && (
                      <div className="business-section">
                        <h4><i className="fas fa-file-alt"></i> Business Description</h4>
                        <div className="business-description">
                          <p>{business.businessDescription}</p>
                        </div>
                      </div>
                    )}

                    <div className="business-section">
                      <h4><i className="fas fa-chart-bar"></i> Business Statistics</h4>
                      <div className="stats-grid">
                        <div className="stat-item">
                          <span className="stat-value">{business.totalDeals || 0}</span>
                          <span className="stat-label">Total Deals</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-value">{business.activeDeals || 0}</span>
                          <span className="stat-label">Active Deals</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-value">{business.totalRedemptions || 0}</span>
                          <span className="stat-label">Total Redemptions</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-value">{business.rating || 'N/A'}</span>
                          <span className="stat-label">Rating</span>
                        </div>
                      </div>
                    </div>

                    {business.description && (
                      <div className="business-section">
                        <h4><i className="fas fa-file-alt"></i> Description</h4>
                        <div className="business-description">
                          <p>{business.description}</p>
                        </div>
                      </div>
                    )}

                    <div className="business-section">
                      <h4><i className="fas fa-clock"></i> Business Hours</h4>
                      <div className="business-hours">
                        {business.hours ? (
                          Object.entries(business.hours).map(([day, hours]) => (
                            <div key={day} className="hours-item">
                              <span className="day">{day.charAt(0).toUpperCase() + day.slice(1)}:</span>
                              <span className="hours">{hours}</span>
                            </div>
                          ))
                        ) : (
                          <p>Business hours not specified</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="no-business-info">
                  <i className="fas fa-building"></i>
                  <p>Business information not available</p>
                </div>
              )}
            </div>
          )}        </div>
      </div>
      
      {/* Modal for confirmations and alerts */}
      {modalState.isOpen && (
        <Modal
          isOpen={modalState.isOpen}
          title={modalState.title}
          message={modalState.message}
          type={modalState.type}
          confirmText={modalState.confirmText}
          cancelText={modalState.cancelText}
          showCancel={modalState.showCancel}
          onConfirm={modalState.onConfirm || closeModal}
          onCancel={modalState.onCancel || closeModal}
        />
      )}
    </div>
  );
};

export default DealDetail;
