import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { withPlanAccess } from '../hooks/usePlanAccess.jsx';
import { useImageUrl, SmartImage, DefaultAvatar } from '../hooks/useImageUrl.jsx';
import api from '../services/api';
import '../styles/membership-card.css';
import '../styles/plan-access-blocked.css';

const MembershipCard = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const { getProfileImageUrl } = useImageUrl();
  const qrCodeRef = useRef();
  const barcodeRef = useRef();
  const cardRef = useRef();
  const [cardSettings, setCardSettings] = useState({
    show_qr_code: true,
    show_barcode: true,
    allow_download: true,
    allow_share: true
  });

  useEffect(() => {
    // Fetch card settings from admin
    const fetchCardSettings = async () => {
      try {
        const response = await api.get('/admin/settings/public');
        if (response.data.success && response.data.settings.cardSettings) {
          setCardSettings(response.data.settings.cardSettings);
        }
      } catch (error) {
        console.log('Using default card settings');
      }
    };

    fetchCardSettings();
  }, []);

  useEffect(() => {
    if (user && user.membershipNumber) {
      // Small delay to ensure DOM elements are ready
      setTimeout(async () => {
        // Generate QR Code with multiple fallback approaches
        if (qrCodeRef.current && cardSettings.show_qr_code) {
          let qrGenerated = false;
          
          // Method 1: Try window.QRCode (qrcode library)
          if (!qrGenerated && typeof window !== 'undefined' && window.QRCode) {
            try {
              qrCodeRef.current.innerHTML = '';
              new window.QRCode(qrCodeRef.current, {
                text: user.membershipNumber.toString(),
                width: 100,
                height: 100,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: window.QRCode.CorrectLevel.H
              });
              qrGenerated = true;
            } catch (error) {
              console.error('QRCode library error:', error);
            }
          }
          
          // Method 2: Use the installed 'qrcode' package via dynamic import (preferred)
          if (!qrGenerated) {
            try {
              const QR = await import('qrcode');
              const canvas = document.createElement('canvas');
              await QR.toCanvas(canvas, user.membershipNumber.toString(), {
                width: 100,
                margin: 1,
                color: { dark: '#000000', light: '#ffffff' }
              });
              qrCodeRef.current.innerHTML = '';
              qrCodeRef.current.appendChild(canvas);
              qrGenerated = true;
            } catch (error) {
              console.error('qrcode (npm) toCanvas error:', error);
            }
          }
          
          // Method 3: Try qrcode-generator (legacy global)
          if (!qrGenerated && typeof window !== 'undefined' && window.qrCode) {
            try {
              const qr = window.qrCode(4, 'M');
              qr.addData(user.membershipNumber.toString());
              qr.make();
              
              // Create custom canvas instead of using createImgTag
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              const moduleCount = qr.getModuleCount();
              const cellSize = 100 / moduleCount;
              
              canvas.width = 100;
              canvas.height = 100;
              
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, 100, 100);
              ctx.fillStyle = '#000000';
              
              for (let row = 0; row < moduleCount; row++) {
                for (let col = 0; col < moduleCount; col++) {
                  if (qr.isDark(row, col)) {
                    ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
                  }
                }
              }
              
              qrCodeRef.current.innerHTML = '';
              qrCodeRef.current.appendChild(canvas);
              qrGenerated = true;
            } catch (error) {
              console.error('qrcode-generator error:', error);
            }
          }
          
          // Method 4: Use QR code API service as fallback
          if (!qrGenerated) {
            try {
              const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(user.membershipNumber.toString())}`;
              qrCodeRef.current.innerHTML = `<img src="${qrUrl}" alt="QR Code" style="width: 100px; height: 100px; background: white;" />`;
              qrGenerated = true;
            } catch (error) {
              console.error('QR API service error:', error);
            }
          }
          
          // Final fallback: Show membership number as text
          if (!qrGenerated) {
            console.log('All QR methods failed, showing text fallback');
            qrCodeRef.current.innerHTML = `<div style="background: white; color: black; padding: 10px; font-size: 10px; text-align: center; border-radius: 4px; width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; word-break: break-all;">${user.membershipNumber}</div>`;
          }
        }

        // Generate Barcode using the clean membership number
        if (typeof window !== 'undefined' && window.JsBarcode && barcodeRef.current && cardSettings.show_barcode) {
          try {
            window.JsBarcode(barcodeRef.current, user.membershipNumber.toString(), {
              format: "CODE128",
              width: 1,
              height: 25,
              displayValue: false,
              margin: 0
            });
          } catch (error) {
            console.error('Barcode generation error:', error);
            // Fallback: show membership number as text
            barcodeRef.current.innerHTML = `<text x="50%" y="50%" text-anchor="middle" font-size="8" fill="black">${user.membershipNumber}</text>`;
          }
        } else {
          console.log('Barcode library not available or settings disabled');
        }
      }, 100);
    }
  }, [user, cardSettings]);

  const downloadCard = async () => {
    if (!cardSettings.allow_download) {
      showNotification('Card download is not enabled', 'error');
      return;
    }

    try {
      // Import html2canvas dynamically
      const html2canvas = await import('html2canvas');
      const canvas = await html2canvas.default(cardRef.current, {
        scale: 3,
        backgroundColor: null,
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: true,
        width: 500, // Standard ID card width in pixels (85.6mm * 10)
        height: 300  // Standard ID card height in pixels (53.98mm * 10)
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
        scale: 3,
        backgroundColor: null,
        useCORS: true,
        allowTaint: true,
        width: 854,
        height: 540
      });

      // Convert to blob
      canvas.toBlob((blob) => {
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], 'membership-card.png', { type: 'image/png' })] })) {
          const file = new File([blob], 'membership-card.png', { type: 'image/png' });
          navigator.share({
            title: 'My Indians in Ghana Membership Card',
            text: `I'm a proud member of Indians in Ghana! 🇮🇳🇬🇭\nMember #${user.membershipNumber}`,
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

  const shareCard = async () => {
    if (!cardSettings.allow_share) {
      showNotification('Card sharing is not enabled', 'error');
      return;
    }

    try {
      // Try to share with image if possible
      if (navigator.share) {
        const html2canvas = await import('html2canvas');
        const canvas = await html2canvas.default(cardRef.current, {
          scale: 2,
          backgroundColor: null,
          useCORS: true,
          allowTaint: true,
          width: 854,
          height: 540
        });

        canvas.toBlob(async (blob) => {
          if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], 'membership-card.png', { type: 'image/png' })] })) {
            const file = new File([blob], 'membership-card.png', { type: 'image/png' });
            await navigator.share({
              title: 'My Indians in Ghana Membership Card',
              text: `I'm a proud member of Indians in Ghana! 🇮🇳🇬🇭\nMember #${user.membershipNumber}`,
              files: [file]
            });
          } else {
            // Fallback to text sharing
            await navigator.share({
              title: 'My Indians in Ghana Membership Card',
              text: `I'm a proud member of Indians in Ghana! 🇮🇳🇬🇭\nMember #${user.membershipNumber}\n\nJoin our community: ${window.location.origin}`,
            });
          }
          showNotification('Card shared successfully!', 'success');
        }, 'image/png');
      } else {
        // Fallback for browsers that don't support Web Share API
        const shareText = `I'm a proud member of Indians in Ghana! 🇮🇳🇬🇭\nMember #${user.membershipNumber}\n\nJoin our community: ${window.location.origin}`;
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(shareText);
          showNotification('Share text copied to clipboard!', 'success');
        } else {
          // Even older browser fallback
          const textArea = document.createElement('textarea');
          textArea.value = shareText;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          showNotification('Share text copied to clipboard!', 'success');
        }
      }
    } catch (error) {
      console.error('Error sharing card:', error);
      // Ultimate fallback
      const shareText = `I'm a proud member of Indians in Ghana! 🇮🇳🇬🇭\nMember #${user.membershipNumber}\n\nJoin our community: ${window.location.origin}`;
      
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(shareText);
          showNotification('Share text copied to clipboard!', 'success');
        }
      } catch (clipboardError) {
        showNotification('Unable to share. Please try again.', 'error');
      }
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

  // Hide membership card for pending users
  if (user.status === 'pending') {
    return (
      <div className="membership-card-container">
        <div className="status-message">
          <i className="fas fa-clock"></i>
          <h3>Membership Card Not Available</h3>
          <p>Your membership card will be available once your account is approved by an administrator.</p>
        </div>
      </div>
    );
  }


  // Helper function to format membership number for display (with spaces)
  const formatMembershipNumber = (membershipNumber) => {
    if (!membershipNumber) return '';
    
    // If it's the new 16-digit format, add spaces every 4 digits
    if (membershipNumber.length === 16 && /^\d{16}$/.test(membershipNumber)) {
      return `${membershipNumber.slice(0, 4)} ${membershipNumber.slice(4, 8)} ${membershipNumber.slice(8, 12)} ${membershipNumber.slice(12, 16)}`;
    }
    
    // Return old format as is
    return membershipNumber;
  };

  // Helper function to get membership type display name
  const getMembershipTypeName = (user) => {
    // Priority order: planName > membershipType > userType > default
    if (user.planName) {
      return user.planName;
    }
    
    if (user.membershipType) {
      const typeMap = {
        'community': 'Community',
        'silver': 'Silver',
        'gold': 'Gold',
        'premium': 'Premium',
        'basic_business': 'Basic Business',
        'premium_business': 'Premium Business',
        'user_silver': 'Silver',
        'user_gold': 'Gold'
      };
      return typeMap[user.membershipType] || user.membershipType.charAt(0).toUpperCase() + user.membershipType.slice(1);
    }
    
    if (user.userType) {
      return user.userType.charAt(0).toUpperCase() + user.userType.slice(1);
    }
    
    return 'Community';
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
  };

  // Calculate expiry date based on user's validationDate - the only source of truth
  const getExpiryDate = () => {
    // ONLY use validationDate (primary and only expiry date source)
    if (user.validationDate) {
      return formatDate(user.validationDate);
    }
    
    // If no validationDate, show N/A (this indicates an issue that should be resolved)
    return 'N/A';
  };

  return (
    <div className="membership-card-container">
      <div 
        ref={cardRef}
        className="membership-card-new"
      >
        {/* Header Section */}
        <div className="card-header-new">
          <div className="card-logo">
            <div className="logo-circle">
              <img src="/logo.jpeg" alt="Logo" />
            </div>
          </div>
          <div className="card-title-section">
            <h1 className="main-title">INDIANS IN GHANA</h1>
            <p className="subtitle">ONE COMMUNITY, ONE PLATFORM, ONE CARD</p>
          </div>
          <div className="membership-badge">
            {getMembershipTypeName(user)}
          </div>
        </div>

        {/* Membership Card Title */}
        <div className="card-title-banner">
          <h2 className="membership-card-title">MEMBERSHIP CARD</h2>
        </div>

        {/* Main Content Grid */}
        <div className="card-content-grid">
          {/* Left Column - Photo, QR, Barcode */}
          <div className="left-column">
            <div className="photo-qr-container"> 
              {/* Profile Photo */}
              <div className="profile-photo">
                {getProfileImageUrl(user) ? (
                  <SmartImage 
                    src={getProfileImageUrl(user)} 
                    alt="Profile" 
                    className="profile-image"
                    fallback={
                      <DefaultAvatar 
                        name={user.fullName} 
                        size={100} 
                        className="default-avatar-img"
                      />
                    }
                  />
                ) : (
                  <DefaultAvatar 
                    name={user.fullName} 
                    size={100} 
                    className="default-avatar-img"
                  />
                )}
              </div>

            {/* QR Code */}
            {cardSettings.show_qr_code && (
              <div className="qr-code-section">
                <div ref={qrCodeRef} className="qr-code"></div>
              </div>
            )}
            </div>

            {/* Barcode */}
            {cardSettings.show_barcode && (
              <div className="barcode-section">
                <svg ref={barcodeRef} className="barcode"></svg>
              </div>
            )}

            {/* Membership Number */}
            <div className="membership-number">
              {formatMembershipNumber(user.membershipNumber)}
            </div>
          </div>

          {/* Right Column - Personal Information */}
          <div className="right-column">
            <div className="info-field">
              <span className="info-label">Name :</span>
              <span className="info-value name-value">{user.fullName}</span>
            </div>

            <div className="info-field">
              <span className="info-label">Mobile Number :</span>
              <span className="info-value mobile-value">{user.phone || 'Not provided'}</span>
            </div>

            <div className="info-field">
              <span className="info-label">Date of Issue :</span>
              <span className="info-value">{formatDate(user.statusUpdatedAt || user.created_at)}</span>
            </div>

            <div className="info-field">
              <span className="info-label">Date of Expiry :</span>
              <span className="info-value">{getExpiryDate()}</span>
            </div>

            <div className="info-field">
              <span className="info-label">Blood Group :</span>
              <span className="info-value blood-group-value">{user.bloodGroup || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Card Actions */}
      <div className="card-actions">
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
        <button className="btn btn-secondary" onClick={shareCard}>
          <i className="fas fa-share"></i> Share
        </button>
      </div>
    </div>
  );
};

export default withPlanAccess(MembershipCard, 'card');
