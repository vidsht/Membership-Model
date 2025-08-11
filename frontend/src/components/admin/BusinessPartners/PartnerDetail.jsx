import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import adminApi from '../../../services/adminApi';
import { useNotification } from '../../../contexts/NotificationContext';
import './PartnerList.css'; // Reuse or create PartnerDetail.css for custom styles
import PlanAssignment from '../PlanManagement/PlanAssignment';
// import RoleAssignment from '../RoleManagement/RoleAssignment';

const PartnerDetail = ({ partner: propPartner, onClose }) => {
  const [partner, setPartner] = useState(propPartner);
  const [loading, setLoading] = useState(!propPartner);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const navigate = useNavigate();
  const { partnerId } = useParams();
  const { showNotification } = useNotification();

  // If used as a route component, fetch partner data
  useEffect(() => {
    if (!propPartner && partnerId) {
      fetchPartnerDetails();
    }
  }, [partnerId, propPartner]);

  const fetchPartnerDetails = async () => {
    setLoading(true);
    try {
      console.log('🔍 PartnerDetail: Fetching partner details for ID:', partnerId);
      
      const response = await adminApi.getPartner(partnerId);
      console.log('📄 PartnerDetail: AdminAPI response:', response);
      
      if (response && response.success && response.merchant) {
        console.log('✅ PartnerDetail: Partner data found:', response.merchant);
        setPartner(response.merchant);
      } else {
        console.log('❌ PartnerDetail: No partner data in response or success=false');
        showNotification('Partner not found', 'error');
        setPartner(null);
        setTimeout(() => navigate('/admin', { state: { activeTab: 'merchants' } }), 1500);
      }
    } catch (error) {
      console.error('❌ PartnerDetail: Error fetching partner details:', error);
      showNotification('Error loading partner details', 'error');
      setPartner(null);
      setTimeout(() => navigate('/admin', { state: { activeTab: 'merchants' } }), 1500);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      // Navigate back to admin dashboard with merchants tab active
      navigate('/admin', { state: { activeTab: 'merchants' } });
    }
  };

  const handleEdit = () => {
    if (partner) {
      navigate(`/admin/partners/${partner.id}/edit`);
    }
  };

  if (loading) {
    return (
      <div className={onClose ? "user-detail-overlay" : "admin-page"}>
        <div className={onClose ? "user-detail-modal" : "admin-content"}>
          <div className="modal-header">
            <h3>Business Partner Details</h3>
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
      <div className={onClose ? "user-detail-overlay" : "admin-page"}>
        <div className={onClose ? "user-detail-modal" : "admin-content"}>
          <div className="modal-header">
            <h3>Business Partner Details</h3>
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className={onClose ? "user-detail-overlay" : "admin-page"}>
      <div className={onClose ? "user-detail-modal" : "admin-content"}>
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
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default PartnerDetail;
