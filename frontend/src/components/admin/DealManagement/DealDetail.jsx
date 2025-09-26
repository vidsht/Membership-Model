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
  
  // Pagination state for redemptions
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchDealData();
  }, [dealId]);

  // Reset pagination when redemptions data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [redemptions.length]);

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
        
        // Calculate unique users (approved redemptions only)
        const approvedRedemptions = redemptionsData.filter(r => r.status === 'approved');
        const pendingRedemptions = redemptionsData.filter(r => r.status === 'pending');
        const uniqueUsers = new Set(approvedRedemptions.map(r => r.userId || r.user_id)).size;
        
        const stats = {
          total: redemptionsData.length,
          uniqueUsers: uniqueUsers,
          pending: pendingRedemptions.length,
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

  // Pagination helper functions
  const getPaginatedRedemptions = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return redemptions.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    return Math.ceil(redemptions.length / itemsPerPage);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  // Pagination component
  const PaginationComponent = () => {
    const totalPages = getTotalPages();
    
    if (totalPages <= 1) return null;
    
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px',
        borderTop: '1px solid #dee2e6',
        background: '#f8f9fa'
      }}>
        <div style={{color: '#6c757d', fontSize: '14px'}}>
          Showing {Math.min((currentPage - 1) * itemsPerPage + 1, redemptions.length)} to {Math.min(currentPage * itemsPerPage, redemptions.length)} of {redemptions.length} redemptions
        </div>
        <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
          <button 
            style={{
              padding: '8px 12px',
              border: '1px solid #dee2e6',
              background: currentPage === 1 ? '#f8f9fa' : '#fff',
              color: currentPage === 1 ? '#6c757d' : '#495057',
              borderRadius: '6px',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <i className="fas fa-chevron-left"></i> Previous
          </button>
          
          <div style={{display: 'flex', gap: '5px'}}>
            {[...Array(totalPages)].map((_, index) => {
              const pageNum = index + 1;
              const isCurrentPage = pageNum === currentPage;
              
              // Show first page, last page, current page, and pages around current
              if (
                pageNum === 1 || 
                pageNum === totalPages || 
                (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
              ) {
                return (
                  <button
                    key={pageNum}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #dee2e6',
                      background: isCurrentPage ? '#007bff' : '#fff',
                      color: isCurrentPage ? '#fff' : '#495057',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: isCurrentPage ? 'bold' : 'normal'
                    }}
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              }
              
              // Show ellipsis for gaps
              if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                return (
                  <span key={pageNum} style={{padding: '8px 4px', color: '#6c757d'}}>
                    ...
                  </span>
                );
              }
              
              return null;
            })}
          </div>
          
          <button 
            style={{
              padding: '8px 12px',
              border: '1px solid #dee2e6',
              background: currentPage === totalPages ? '#f8f9fa' : '#fff',
              color: currentPage === totalPages ? '#6c757d' : '#495057',
              borderRadius: '6px',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="deal-detail-container">
      <div className="deal-detail-header">
        <button 
          className="back-button"
          onClick={() => navigate('/admin')}
        >
          ← Back to Deals
        </button>
      </div>

      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
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
          </div>

          {/* Tab Content - WORKING VERSION */}
          <div style={{background: 'white', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', margin: '20px 0'}}>
            
            {activeTab === 'details' && (
              <div>
                <h3 style={{color: '#333', marginBottom: '20px'}}>Deal Details</h3>
                
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
                        {deal.discountType === 'percentage' 
                          ? `${deal.discount || deal.percentage || 0}% OFF` 
                          : `GHS ${deal.discount || 0} OFF`} ({deal.discountType || 'percentage'})
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
                    {deal.member_limit && (
                      <div style={{background: '#f8f9fa', padding: '15px', borderRadius: '6px', border: '1px solid #dee2e6'}}>
                        <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#666'}}>Member Limit</label>
                        <span style={{color: '#333'}}>{deal.member_limit} users max</span>
                      </div>
                    )}
                    {deal.applicableLocations && (
                      <div style={{background: '#f8f9fa', padding: '15px', borderRadius: '6px', border: '1px solid #dee2e6'}}>
                        <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#666'}}>Applicable Locations</label>
                        <span style={{color: '#333'}}>{deal.applicableLocations}</span>
                      </div>
                    )}
                    <div style={{background: '#f8f9fa', padding: '15px', borderRadius: '6px', border: '1px solid #dee2e6'}}>
                      <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#666'}}>Created Date</label>
                      <span style={{color: '#333'}}>{deal.created_at ? new Date(deal.created_at).toLocaleDateString('en-GB', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      }) : (deal.createdAt ? new Date(deal.createdAt).toLocaleDateString('en-GB', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      }) : 'N/A')}</span>
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
                  <div style={{background: '#f3e5f5', padding: '15px', borderRadius: '6px', border: '1px solid #ce93d8', textAlign: 'center'}}>
                    <div style={{fontSize: '24px', fontWeight: 'bold', color: '#7b1fa2', marginBottom: '5px'}}>{redemptionStats.uniqueUsers || 0}</div>
                    <div style={{color: '#424242', fontSize: '14px'}}>Unique Users</div>
                  </div>
                  <div style={{background: '#fff8e1', padding: '15px', borderRadius: '6px', border: '1px solid #ffcc02', textAlign: 'center'}}>
                    <div style={{fontSize: '24px', fontWeight: 'bold', color: '#ff8f00', marginBottom: '5px'}}>{redemptionStats.pending || 0}</div>
                    <div style={{color: '#424242', fontSize: '14px'}}>Pending</div>
                  </div>
                  {deal.member_limit && (
                    <div style={{background: deal.member_limit <= (redemptionStats.uniqueUsers || 0) ? '#ffebee' : '#e8f5e8', padding: '15px', borderRadius: '6px', border: `1px solid ${deal.member_limit <= (redemptionStats.uniqueUsers || 0) ? '#ef5350' : '#81c784'}`, textAlign: 'center'}}>
                      <div style={{fontSize: '24px', fontWeight: 'bold', color: deal.member_limit <= (redemptionStats.uniqueUsers || 0) ? '#d32f2f' : '#388e3c', marginBottom: '5px'}}>
                        {(redemptionStats.uniqueUsers || 0)}/{deal.member_limit}
                      </div>
                      <div style={{color: '#424242', fontSize: '14px'}}>Member Limit</div>
                      {deal.member_limit <= (redemptionStats.uniqueUsers || 0) && (
                        <div style={{color: '#d32f2f', fontSize: '12px', marginTop: '5px', fontWeight: 'bold'}}>LIMIT REACHED</div>
                      )}
                    </div>
                  )}
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
                      <h3 style={{color: '#495057', margin: '0', fontSize: '18px'}}>Users Who Redeemed This Deal ({redemptions.length} total)</h3>
                    </div>
                    <div>
                      {getPaginatedRedemptions().map((redemption, index) => (
                        <div key={`${redemption.id || redemption.userId || redemption.user_id}-${index}`} style={{
                          padding: '15px',
                          borderBottom: index < getPaginatedRedemptions().length - 1 ? '1px solid #f1f3f4' : 'none',
                          display: 'grid',
                          gridTemplateColumns: '40px 1fr 1fr 1fr 1fr',
                          gap: '15px',
                          alignItems: 'center',
                          hover: {background: '#f8f9fa'}
                        }}>
                          <div style={{
                            background: '#007bff',
                            color: 'white',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}>
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </div>
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
                            <div style={{color: '#6c757d', fontSize: '12px', marginBottom: '2px'}}>Status</div>
                            <div style={{
                              display: 'inline-block',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              textTransform: 'uppercase',
                              backgroundColor: (() => {
                                const status = redemption.status;
                                switch(status) {
                                  case 'approved': return '#e8f5e8';
                                  case 'rejected': return '#ffebee';
                                  case 'pending': return '#fff3e0';
                                  default: return '#f5f5f5';
                                }
                              })(),
                              color: (() => {
                                const status = redemption.status;
                                switch(status) {
                                  case 'approved': return '#2e7d32';
                                  case 'rejected': return '#c62828';
                                  case 'pending': return '#f57c00';
                                  default: return '#757575';
                                }
                              })()
                            }}>
                              {redemption.status === 'approved' ? '✓ Approved' : 
                               redemption.status === 'rejected' ? '✗ Rejected' : 
                               redemption.status === 'pending' ? '⏳ Pending' : 
                               redemption.status || 'Unknown'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Pagination Component */}
                    <PaginationComponent />
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

            {/* Analytics tab removed */}
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
