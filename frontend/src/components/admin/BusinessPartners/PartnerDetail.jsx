import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import adminApi from '../../../services/adminApi';
import { useNotification } from '../../../contexts/NotificationContext';
import './PartnerList.css'; 
import PlanAssignment from '../PlanManagement/PlanAssignment';
import RoleAssignment from '../RoleManagement/RoleAssignment';

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return 'Invalid Date';
  }
};

const PartnerDetail = () => {
  const { id: partnerId } = useParams();
  const [partner, setPartner] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  useEffect(() => {
    const fetchPartner = async () => {
      try {
        // Fetch partner details dynamically based on partnerId
        const res = await adminApi.getPartner(partnerId);
        console.log('PartnerDetail: Full API response:', res);
        // Check if response has merchant property directly (not nested in data)
        if (res && res.merchant) {
          console.log('PartnerDetail: Setting partner data:', res.merchant);
          setPartner(res.merchant);
        } else if (res && res.success && res.merchant) {
          console.log('PartnerDetail: Setting partner data from success response:', res.merchant);
          setPartner(res.merchant);
        } else {
          console.error('PartnerDetail: Invalid response structure:', res);
          setError('Unable to load partner details.');
        }
      } catch (e) {
        console.error('Error fetching partner:', e);
        setError('Unable to load partner details.');
      }
    };

    if (partnerId) {
      fetchPartner();
    }
  }, [partnerId]);  const handleClose = () => {
    navigate('/admin', { state: { activeTab: 'merchants' } });
  };

  const handleEdit = () => {
    if (partner) {
      navigate(`/admin/partners/${partner.id}/edit`);
    }
  };

    if (error) return <div>{error}</div>;
    if (!partner) return <div>Loading partner details...</div>;

  return (
    <div className="partner-detail">
      <div className="modal-header">
        <h3>Business Partner Details</h3>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleEdit}>
            <i className="fas fa-edit"></i> Edit Partner
          </button>
          <button className="btn-close" onClick={handleClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
      </div>
      <div className="modal-body">
        <div className="user-profile-header">
          <div className="user-profile-image">
            {partner?.logo ? (
              <img src={partner.logo} alt={partner.businessName || 'Business'} />
            ) : (
              <div className="user-initials">
                {partner?.businessName ? partner.businessName.split(' ').map(n => n[0]).join('') : 'B'}
              </div>
            )}
          </div>
          <div className="user-profile-info">
            <h2>{partner?.businessName || 'Unknown Business'}</h2>
            <p className="user-email">{partner?.email || 'No email'}</p>
            <div className="user-status">
              <span className="membership-badge business">Business Partner</span>
              <span className="status-badge approved">{partner.status ? partner.status.charAt(0).toUpperCase() + partner.status.slice(1) : 'Approved'}</span>
              <span className="member-id">ID: {partner?._id || 'N/A'}</span>
            </div>
          </div>
        </div>
        <div className="user-details-sections">
          <div className="details-section">
            <h4>Business Information</h4>
            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">Business Name</span>
                <span className="detail-value">{partner.businessName || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Owner Name</span>
                <span className="detail-value">{partner.fullName || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Category</span>
                <span className="detail-value">{partner.businessCategory || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Business Phone</span>
                <span className="detail-value">{partner.businessPhone || partner.phone || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Business Email</span>
                <span className="detail-value">{partner.businessEmail || partner.email || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Owner Phone</span>
                <span className="detail-value">{partner.phone || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Owner Email</span>
                <span className="detail-value">{partner.email || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Website</span>
                <span className="detail-value">{partner.website ? <a href={partner.website} target="_blank" rel="noopener noreferrer">{partner.website}</a> : 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Business Address</span>
                <span className="detail-value">{partner.businessAddress || partner.address || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">TAX ID</span>
                <span className="detail-value">{partner.taxId || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Business License</span>
                <span className="detail-value">{partner.businessLicense || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Business Plan</span>
                <span className="detail-value">
                  {partner.planName ? (
                    <span className="plan-info">
                      {partner.planName} - {partner.currency} {partner.planPrice}/{partner.billingCycle}
                    </span>
                  ) : (
                    partner.membershipType || 'No Plan'
                  )}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Deal Limit (Plan)</span>
                <span className="detail-value">
                  {partner.planMaxDeals ? `${partner.planMaxDeals} deals/month` : 'N/A'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Custom Deal Limit</span>
                <span className="detail-value">
                  {partner.customDealLimit ? `${partner.customDealLimit} deals/month` : 'Not Set'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Effective Deal Limit</span>
                <span className="detail-value">
                  <strong>
                    {partner.customDealLimit || partner.planMaxDeals || 'Unlimited'} deals/month
                  </strong>
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Registered On</span>
                <span className="detail-value">{formatDate(partner.createdAt)}</span>
              </div>
              {partner.businessDescription && (
                <div className="detail-item full-width">
                  <span className="detail-label">Business Description</span>
                  <span className="detail-value">{partner.businessDescription}</span>
                </div>
              )}
            </div>
          </div>
          {partner.deals && partner.deals.length > 0 && (
            <div className="details-section">
              <h4>Deals</h4>
              <ul>
                {partner.deals.map((deal) => (
                  <li key={deal._id}>{deal.title} ({deal.status})</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn-secondary" onClick={handleClose}>Close</button>
      </div>
    </div>
  );
};

export default PartnerDetail;
