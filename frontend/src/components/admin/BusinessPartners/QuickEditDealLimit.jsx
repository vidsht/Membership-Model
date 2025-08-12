import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import adminApi from '../../../services/adminApi';
import { useNotification } from '../../../contexts/NotificationContext';
import './PartnerList.css'; // Reuse existing styles
import './QuickEditDealLimit.css'; // Quick edit specific styles

const QuickEditDealLimit = () => {
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customDealLimit, setCustomDealLimit] = useState('');
  const navigate = useNavigate();
  const { id: partnerId } = useParams();
  const { showNotification } = useNotification();

  useEffect(() => {
    if (partnerId) {
      fetchPartnerDetails();
    }
  }, [partnerId]);

  const fetchPartnerDetails = async () => {
    setLoading(true);
    try {
      console.log('🔍 QuickEdit: Fetching partner for quick edit deal limit, ID:', partnerId);
      const res = await adminApi.getPartner(partnerId);
      console.log('📄 QuickEdit: Full API response:', res);
      // Accept both {merchant: {...}} and {success: true, merchant: {...}}
      if (res && res.merchant) {
        setPartner(res.merchant);
        setCustomDealLimit(res.merchant.customDealLimit || '');
      } else {
        console.error('QuickEdit: Invalid response structure:', res);
        showNotification('Partner not found', 'error');
        setPartner(null);
        setTimeout(() => handleClose(), 1500);
      }
    } catch (error) {
      console.error('❌ QuickEdit: Error fetching partner details:', error);
      showNotification('Error loading partner details', 'error');
      setPartner(null);
      setTimeout(() => handleClose(), 1500);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    navigate('/admin', { state: { activeTab: 'merchants' } });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      console.log('💾 QuickEdit: Saving custom deal limit:', customDealLimit, 'for partner:', partnerId);
      
      const payload = {
        customDealLimit: customDealLimit ? parseInt(customDealLimit) : null
      };
      
      const response = await adminApi.updatePartner(partnerId, payload);
      console.log('✅ QuickEdit: Deal limit update response:', response);
      
      if (response.success) {
        showNotification('Custom deal limit updated successfully', 'success');
        handleClose();
      } else {
        throw new Error(response.message || 'Failed to update deal limit');
      }
    } catch (error) {
      console.error('❌ QuickEdit: Error updating deal limit:', error);
      if (error.response && error.response.data && error.response.data.message) {
        showNotification(error.response.data.message, 'error');
      } else {
        showNotification('Failed to update custom deal limit. Please try again.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-content">
          <div className="modal-header">
            <h3>Quick Edit Deal Limit</h3>
            <button className="btn-close" onClick={handleClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="modal-body">
            <div className="loading-state">
              <i className="fas fa-spinner fa-spin"></i>
              <p>Loading partner details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="admin-page">
        <div className="admin-content">
          <div className="modal-header">
            <h3>Quick Edit Deal Limit</h3>
            <button className="btn-close" onClick={handleClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="modal-body">
            <div className="error-state">
              <i className="fas fa-exclamation-triangle"></i>
              <p>Partner not found</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-content">
        <div className="modal-header">
          <h3>Quick Edit Deal Limit</h3>
          <button className="btn-close" onClick={handleClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          <div className="quick-edit-content">
            {/* Partner Info Summary */}
            <div className="partner-summary">
              <div className="partner-info">
                <h4>{partner.businessName || 'Unknown Business'}</h4>
                <p className="partner-owner">Owner: {partner.fullName || 'N/A'}</p>
                <p className="partner-email">{partner.email || 'No email'}</p>
                <span className={`status-badge ${partner.status}`}>
                  {partner.status ? partner.status.charAt(0).toUpperCase() + partner.status.slice(1) : 'N/A'}
                </span>
              </div>
            </div>

            <div className="divider"></div>

            {/* Deal Limit Form */}
            <div className="deal-limit-form">
              <h5>Custom Deal Limit</h5>
              <p className="form-description">
                Set a custom monthly deal limit for this business partner. Leave empty to use their plan's default limit.
              </p>
              
              <div className="current-info">
                <div className="info-row">
                  <span className="info-label">Current Plan:</span>
                  <span className="info-value">
                    {partner.planName || partner.membershipType || 'No Plan'}
                  </span>
                </div>
                
                <div className="info-row">
                  <span className="info-label">Plan Default Limit:</span>
                  <span className="info-value">
                    {partner.planMaxDeals ? `${partner.planMaxDeals}/month` : 'Unlimited'}
                  </span>
                </div>
                
                <div className="info-row">
                  <span className="info-label">Current Custom Limit:</span>
                  <span className="info-value">
                    {partner.customDealLimit ? (
                      <span className="custom-limit">
                        <i className="fas fa-star"></i> {partner.customDealLimit}/month
                      </span>
                    ) : (
                      <span className="plan-limit">Using plan default</span>
                    )}
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="customDealLimit">Custom Deal Limit (per month)</label>
                <input
                  type="number"
                  id="customDealLimit"
                  min="0"
                  max="100"
                  value={customDealLimit}
                  onChange={(e) => setCustomDealLimit(e.target.value)}
                  placeholder="Leave empty for plan default"
                  className="form-control"
                />
                <small className="form-hint">
                  Enter a number between 0-100, or leave empty to use plan default
                </small>
              </div>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            className="btn btn-primary" 
            onClick={handleSave} 
            disabled={saving}
          >
            {saving ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Saving...
              </>
            ) : (
              <>
                <i className="fas fa-save"></i> Save Changes
              </>
            )}
          </button>
          <button className="btn btn-secondary" onClick={handleClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickEditDealLimit;
