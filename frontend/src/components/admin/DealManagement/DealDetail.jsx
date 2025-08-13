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
      {/* DEBUG: Component state */}
      <div style={{position: 'fixed', top: '10px', right: '10px', background: 'red', color: 'white', padding: '5px', zIndex: 9999, fontSize: '12px'}}>
        COMPONENT STATE: Loading={loading ? 'YES' : 'NO'} | Error={error ? 'YES' : 'NO'} | Deal={deal ? 'YES' : 'NO'} | ActiveTab={activeTab}
      </div>
      
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

          {/* Tab Content */}
          <div className="tab-content" style={{minHeight: '400px', border: '3px solid red', background: 'lightyellow'}}>
            <div style={{padding: '20px', fontSize: '18px', fontWeight: 'bold'}}>
              TAB CONTENT CONTAINER IS RENDERING! Current tab: {activeTab}
            </div>
            
            {activeTab === 'details' && (
              <div style={{backgroundColor: 'lightgreen', padding: '20px', margin: '10px'}}>
                <h2>DETAILS TAB CONTENT</h2>
                <p>Title: {deal.title}</p>
                <p>Description: {deal.description}</p>
                <p>Category: {deal.category}</p>
                <p>Status: {deal.status}</p>
              </div>
            )}

            {activeTab === 'business' && (
              <div style={{backgroundColor: 'lightblue', padding: '20px', margin: '10px'}}>
                <h2>BUSINESS TAB CONTENT</h2>
                <p>Business Name: {deal.businessName}</p>
                <p>Business Category: {deal.businessCategory}</p>
                <p>Business ID: {deal.businessId}</p>
              </div>
            )}

            {activeTab === 'redemptions' && (
              <div style={{backgroundColor: 'lightcoral', padding: '20px', margin: '10px'}}>
                <h2>REDEMPTIONS TAB CONTENT</h2>
                <p>Total Redemptions: {deal.redemptions || 0}</p>
                <p>Redemptions Array Length: {redemptions.length}</p>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div style={{backgroundColor: 'lightyellow', padding: '20px', margin: '10px'}}>
                <h2>ANALYTICS TAB CONTENT</h2>
                <p>Views: {deal.views}</p>
                <p>Discount: {deal.discount}%</p>
                <p>Discount Type: {deal.discountType}</p>
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
