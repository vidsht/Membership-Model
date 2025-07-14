import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './PartnerList.css'; // Reuse or create PartnerDetail.css for custom styles
import PlanAssignment from '../PlanManagement/PlanAssignment';
import RoleAssignment from '../RoleManagement/RoleAssignment';

const PartnerDetail = ({ partner, onClose }) => {
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const navigate = useNavigate();

  if (!partner) {
    return (
      <div className="user-detail-overlay">
        <div className="user-detail-modal">
          <div className="modal-header">
            <h3>Business Partner Details</h3>
            <button className="btn-close" onClick={onClose}>
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
    <div className="user-detail-overlay">
      <div className="user-detail-modal">
        <div className="modal-header">
          <h3>Business Partner Details</h3>
          <button className="btn-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
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
                  <span className="detail-label">Category</span>
                  <span className="detail-value">{partner.category || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Phone</span>
                  <span className="detail-value">{partner.phone || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Email</span>
                  <span className="detail-value">{partner.email || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Website</span>
                  <span className="detail-value">{partner.website ? <a href={partner.website} target="_blank" rel="noopener noreferrer">{partner.website}</a> : 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Address</span>
                  <span className="detail-value">{partner.address || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Registered On</span>
                  <span className="detail-value">{formatDate(partner.createdAt)}</span>
                </div>
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
