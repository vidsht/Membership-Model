import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import api from '../services/api';
import '../styles/membership-card.css';

const MembershipCard = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const qrCodeRef = useRef();
  const barcodeRef = useRef();
  const cardRef = useRef();
  const [cardLayout, setCardLayout] = useState('modern');
  const [cardSettings, setCardSettings] = useState({
    show_qr_code: true,
    show_barcode: true,
    allow_download: true,
    allow_share: true,
    default_layout: 'modern'
  });

  useEffect(() => {
    // Fetch card settings from admin
    const fetchCardSettings = async () => {
      try {
        const response = await api.get('/admin/settings/public');
        if (response.data.success && response.data.settings.cardSettings) {
          setCardSettings(response.data.settings.cardSettings);
          setCardLayout(response.data.settings.cardSettings.default_layout || 'modern');
        }
      } catch (error) {
        console.log('Using default card settings');
      }
    };

    fetchCardSettings();
  }, []);

  useEffect(() => {
    if (user && user.membershipNumber) {
      // Generate QR Code
      if (window.QRCode && qrCodeRef.current && cardSettings.show_qr_code) {
        qrCodeRef.current.innerHTML = '';
        new window.QRCode(qrCodeRef.current, {
          text: `IIG-MEMBER-${user.membershipNumber}`,
          width: cardLayout === 'passport' ? 60 : 80,
          height: cardLayout === 'passport' ? 60 : 80,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: window.QRCode.CorrectLevel.H
        });
      }

      // Generate Barcode
      if (window.JsBarcode && barcodeRef.current && cardSettings.show_barcode) {
        window.JsBarcode(barcodeRef.current, user.membershipNumber, {
          format: "CODE128",
          width: cardLayout === 'passport' ? 1 : 1.5,
          height: cardLayout === 'passport' ? 25 : 30,
          displayValue: false,
          margin: 0
        });
      }
    }
  }, [user, cardLayout, cardSettings]);

  const downloadCard = async () => {
    if (!cardSettings.allow_download) {
      showNotification('Card download is not enabled', 'error');
      return;
    }

    try {
      // Import html2canvas dynamically
      const html2canvas = await import('html2canvas');
      const canvas = await html2canvas.default(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: true
      });

      // Create download link
      const link = document.createElement('a');
      link.download = `membership-card-${user.membershipNumber}.png`;
      link.href = canvas.toDataURL();
      link.click();

      showNotification('Card downloaded successfully!', 'success');
    } catch (error) {
      console.error('Error downloading card:', error);
      showNotification('Failed to download card. Please try again.', 'error');
    }
  };

  const shareToWhatsApp = async () => {
    if (!cardSettings.allow_share) {
      showNotification('Card sharing is not enabled', 'error');
      return;
    }

    try {
      const html2canvas = await import('html2canvas');
      const canvas = await html2canvas.default(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
        allowTaint: true
      });

      // Convert to blob
      canvas.toBlob((blob) => {
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], 'membership-card.png', { type: 'image/png' })] })) {
          const file = new File([blob], 'membership-card.png', { type: 'image/png' });
          navigator.share({
            title: 'My Indians in Ghana Membership Card',
            text: `I'm a proud member of Indians in Ghana! Member #${user.membershipNumber}`,
            files: [file]
          });
        } else {
          // Fallback to WhatsApp web link
          const message = encodeURIComponent(`I'm a proud member of Indians in Ghana! 🇮🇳🇬🇭\nMember #${user.membershipNumber}\n\nJoin our community: ${window.location.origin}`);
          window.open(`https://wa.me/?text=${message}`, '_blank');
        }
      }, 'image/png');

      showNotification('Sharing card...', 'info');
    } catch (error) {
      console.error('Error sharing card:', error);
      // Fallback to text sharing
      const message = encodeURIComponent(`I'm a proud member of Indians in Ghana! 🇮🇳🇬🇭\nMember #${user.membershipNumber}\n\nJoin our community: ${window.location.origin}`);
      window.open(`https://wa.me/?text=${message}`, '_blank');
    }
  };

  if (!user) {
    return (
      <div className="membership-card-container">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading membership card...</p>
        </div>
      </div>
    );
  }

  const getMembershipTypeColor = (type) => {
    switch (type) {
      case 'silver': return '#C0C0C0';
      case 'gold': return '#FFD700';
      case 'premium': return '#FFD700';
      case 'basic': return '#A0A0A0';
      default: return '#4CAF50';
    }
  };

  const getMembershipTypeName = (type) => {
    switch (type) {
      case 'silver': return 'Silver Member';
      case 'gold': return 'Gold Member';
      case 'premium': return 'Premium Member';
      case 'basic': return 'Basic Member';
      default: return 'Community Member';
    }
  };

  const cardLayouts = ['modern', 'classic', 'passport'];

  return (
    <div className="membership-card-container">
      <div className="card-controls">
        <div className="layout-selector">
          <label htmlFor="layout-select">Card Layout:</label>
          <select
            id="layout-select"
            value={cardLayout}
            onChange={(e) => setCardLayout(e.target.value)}
            className="layout-select"
          >
            {cardLayouts.map(layout => (
              <option key={layout} value={layout}>
                {layout.charAt(0).toUpperCase() + layout.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div 
        ref={cardRef}
        className={`membership-card layout-${cardLayout} plan-${user.membershipType || 'community'}`}
        style={{ borderTopColor: getMembershipTypeColor(user.membershipType) }}
      >
        <div className="card-header">
          <div className="card-title">
            <div className="card-logo-placeholder">
              <i className="fas fa-users"></i>
            </div>
            <div className="card-text">
              <h3>Indians in Ghana</h3>
              <p className="membership-type">{getMembershipTypeName(user.membershipType)}</p>
            </div>
          </div>
          {cardLayout === 'passport' && (
            <div className="passport-photo">
              {user.profilePicture ? (
                <img src={user.profilePicture} alt="Profile" />
              ) : (
                <div className="default-avatar">
                  <i className="fas fa-user"></i>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card-body">
          <div className="member-info">
            {cardLayout !== 'passport' && (
              <div className="member-photo">
                {user.profilePicture ? (
                  <img src={user.profilePicture} alt="Profile" />
                ) : (
                  <div className="default-avatar">
                    <i className="fas fa-user"></i>
                  </div>
                )}
              </div>
            )}
            <div className="member-details">
              <h4 className="user-name">{user.fullName}</h4>
              <p className="user-id">#{user.membershipNumber}</p>
              <p className="member-since">Member since {new Date(user.created_at).getFullYear()}</p>
              {cardLayout === 'passport' && (
                <div className="passport-details">
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Phone:</strong> {user.phone || 'Not provided'}</p>
                </div>
              )}
            </div>
          </div>

          <div className="card-codes">
            {cardSettings.show_qr_code && (
              <div className="qr-section">
                <div className="qrcode-container">
                  <div ref={qrCodeRef}></div>
                </div>
                <p>QR Code</p>
              </div>
            )}
            {cardSettings.show_barcode && (
              <div className="barcode-section">
                <div className="barcode-container">
                  <svg ref={barcodeRef}></svg>
                </div>
                <p className="barcode-number">{user.membershipNumber}</p>
              </div>
            )}
          </div>
        </div>

        <div className="card-footer">
          <div className="card-footer-info">
            <span>Valid until renewed</span>
            <span>•</span>
            <span>Show for member benefits</span>
          </div>
        </div>
      </div>

      <div className="card-actions">
        <button className="btn btn-outline" onClick={() => window.print()}>
          <i className="fas fa-print"></i> Print Card
        </button>
        {cardSettings.allow_download && (
          <button className="btn btn-primary" onClick={downloadCard}>
            <i className="fas fa-download"></i> Download Card
          </button>
        )}
        {cardSettings.allow_share && (
          <button className="btn btn-success" onClick={shareToWhatsApp}>
            <i className="fab fa-whatsapp"></i> Share on WhatsApp
          </button>
        )}
        <button className="btn btn-secondary" onClick={() => {
          if (navigator.share) {
            navigator.share({
              title: 'My Indians in Ghana Membership Card',
              text: `I'm a member of Indians in Ghana! Member #${user.membershipNumber}`,
              url: window.location.href
            });
          }
        }}>
          <i className="fas fa-share"></i> Share
        </button>
      </div>
    </div>
  );
};

export default MembershipCard;
