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
        // Generate QR Code using lazy-loaded libraries
        if (qrCodeRef.current && cardSettings.show_qr_code) {
          let qrGenerated = false;
          
          // Method 1: Use the installed 'qrcode' package via dynamic import (preferred)
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
          
          // Method 2: Try window.QRCode (qrcode library) - lazy loaded
          if (!qrGenerated && window.loadQRCode) {
            try {
              await window.loadQRCode();
              if (window.QRCode) {
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
              }
            } catch (error) {
              console.error('QRCode library error:', error);
            }
          }
          
          // Method 3: Try qrcode-generator (legacy global) - lazy loaded
          if (!qrGenerated && window.qrCode) {
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

        // Generate Barcode using lazy-loaded JSBarcode
        if (barcodeRef.current && cardSettings.show_barcode) {
          let barcodeGenerated = false;
          
          // Try JSBarcode - lazy loaded
          if (!barcodeGenerated && window.loadJSBarcode) {
            try {
              await window.loadJSBarcode();
              if (window.JsBarcode) {
                window.JsBarcode(barcodeRef.current, user.membershipNumber.toString(), {
                  format: "CODE128",
                  width: 1,
                  height: 25,
                  displayValue: false,
                  margin: 0
                });
                barcodeGenerated = true;
              }
            } catch (error) {
              console.error('JsBarcode error:', error);
            }
          }
          
          // Fallback: show membership number as text
          if (!barcodeGenerated) {
            barcodeRef.current.innerHTML = `<text x="50%" y="50%" text-anchor="middle" font-size="8" fill="black">${user.membershipNumber}</text>`;
          }
        }
      }, 100);
    }
  }, [user, cardSettings]);

  const downloadCard = async () => {
    if (!cardSettings.allow_download) {
      showNotification('Card download is not enabled', 'error');
      return;
    }

    if (!cardRef.current) {
      showNotification('Card is not ready for download. Please wait.', 'error');
      return;
    }

    try {
      // Use modern browser screenshot API if available
      if (window.getComputedStyle && window.document.fonts) {
        await document.fonts.ready; // Wait for fonts to load
        
        // Add capture-mode class to optimize for capture
        cardRef.current.classList.add('capture-mode', 'download-mode');
        
        // Wait a moment for styles to apply
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Try to use dom-to-image library (more reliable than html2canvas)
        try {
          const domtoimage = await import('dom-to-image-more');
          const dataUrl = await domtoimage.toPng(cardRef.current, {
            quality: 1.0,
            bgcolor: '#ffffff',
            width: cardRef.current.offsetWidth,
            height: cardRef.current.offsetHeight,
            style: {
              transform: 'scale(1)',
              transformOrigin: 'top left',
              width: cardRef.current.offsetWidth + 'px',
              height: cardRef.current.offsetHeight + 'px'
            },
            filter: (node) => {
              // Filter out problematic elements
              if (node.classList) {
                return !node.classList.contains('card-actions') && 
                       !node.classList.contains('card-overlay');
              }
              return true;
            }
          });
          
          // Remove the classes after capture
          cardRef.current.classList.remove('capture-mode', 'download-mode');
          
          // Create download link
          const link = document.createElement('a');
          link.download = `membership-card-${user.membershipNumber || 'download'}.png`;
          link.href = dataUrl;
          link.click();
          
          showNotification('Card downloaded successfully!', 'success');
          return;
        } catch (domToImageError) {
          console.log('dom-to-image failed, falling back to html2canvas:', domToImageError);
        }
        
        // Fallback to html2canvas with better options
        const html2canvas = await import('html2canvas');
        const canvas = await html2canvas.default(cardRef.current, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          allowTaint: true,
          scrollX: 0,
          scrollY: 0,
          windowWidth: cardRef.current.scrollWidth,
          windowHeight: cardRef.current.scrollHeight,
          ignoreElements: (element) => {
            return element.classList && (
              element.classList.contains('card-actions') || 
              element.classList.contains('card-overlay')
            );
          }
        });

        // Remove the classes after capture
        cardRef.current.classList.remove('capture-mode', 'download-mode');

        // Create download link
        const link = document.createElement('a');
        link.download = `membership-card-${user.membershipNumber || 'download'}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();

        showNotification('Card downloaded successfully!', 'success');
      }
    } catch (error) {
      console.error('Error downloading card:', error);
      // Make sure to remove classes even if error occurs
      cardRef.current?.classList.remove('capture-mode', 'download-mode');
      showNotification('Failed to download card. Please try again.', 'error');
    }
  };

  const shareToWhatsApp = async () => {
    if (!cardSettings.allow_share) {
      showNotification('Card sharing is not enabled', 'error');
      return;
    }

    if (!cardRef.current) {
      showNotification('Card is not ready for sharing. Please wait.', 'error');
      return;
    }

    try {
      // Ensure fonts are loaded
      await document.fonts.ready;
      
      // Add capture-mode class to optimize for capture
      cardRef.current.classList.add('capture-mode', 'download-mode');
      
      // Wait for styles to apply
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Try dom-to-image first for better quality
      try {
        const domtoimage = await import('dom-to-image-more');
        const blob = await domtoimage.toBlob(cardRef.current, {
          quality: 1.0,
          bgcolor: '#ffffff',
          width: cardRef.current.offsetWidth,
          height: cardRef.current.offsetHeight,
          filter: (node) => {
            if (node.classList) {
              return !node.classList.contains('card-actions') && 
                     !node.classList.contains('card-overlay');
            }
            return true;
          }
        });
        
        // Remove the classes after capture
        cardRef.current.classList.remove('capture-mode', 'download-mode');
        
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], 'membership-card.png', { type: 'image/png' })] })) {
          const file = new File([blob], 'membership-card.png', { type: 'image/png' });
          await navigator.share({
            title: 'My Indians in Ghana Membership Card',
            text: `I'm a proud member of Indians in Ghana! 🇮🇳🇬🇭\nMember #${user.membershipNumber}`,
            files: [file]
          });
          showNotification('Card shared successfully!', 'success');
          return;
        }
      } catch (domToImageError) {
        console.log('dom-to-image failed for WhatsApp share, using fallback');
      }
      
      // Remove classes if still present
      cardRef.current.classList.remove('capture-mode', 'download-mode');
      
      // Fallback to WhatsApp web link with text
      const message = encodeURIComponent(`I'm a proud member of Indians in Ghana! 🇮🇳🇬🇭\nMember #${user.membershipNumber}\n\nJoin our community: ${window.location.origin}`);
      window.open(`https://wa.me/?text=${message}`, '_blank');
      showNotification('Sharing to WhatsApp...', 'info');
      
    } catch (error) {
      console.error('Error sharing card:', error);
      // Make sure to remove classes even if error occurs
      cardRef.current?.classList.remove('capture-mode', 'download-mode');
      // Fallback to text sharing
      const message = encodeURIComponent(`I'm a proud member of Indians in Ghana! 🇮🇳🇬🇭\nMember #${user.membershipNumber}\n\nJoin our community: ${window.location.origin}`);
      window.open(`https://wa.me/?text=${message}`, '_blank');
      showNotification('Sharing to WhatsApp...', 'info');
    }
  };

  const shareCard = async () => {
    if (!cardSettings.allow_share) {
      showNotification('Card sharing is not enabled', 'error');
      return;
    }

    if (!cardRef.current) {
      showNotification('Card is not ready for sharing. Please wait.', 'error');
      return;
    }

    const shareText = `I'm a proud member of Indians in Ghana! 🇮🇳🇬🇭\nMember #${user.membershipNumber}\n\nJoin our community: ${window.location.origin}`;
    const shareUrl = `${window.location.origin}/membership`;

    try {
      // Check if Web Share API is available (primarily on mobile devices)  
      if (navigator.share) {
        try {
          // Ensure fonts are loaded for better rendering
          await document.fonts.ready;
          
          // First try to share with image if supported
          cardRef.current.classList.add('capture-mode', 'download-mode');
          
          // Wait for styles to apply
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Try dom-to-image first for better quality
          try {
            const domtoimage = await import('dom-to-image-more');
            const blob = await domtoimage.toBlob(cardRef.current, {
              quality: 1.0,
              bgcolor: '#ffffff',
              width: cardRef.current.offsetWidth,
              height: cardRef.current.offsetHeight,
              filter: (node) => {
                if (node.classList) {
                  return !node.classList.contains('card-actions') && 
                         !node.classList.contains('card-overlay');
                }
                return true;
              }
            });
            
            // Remove the classes after capture
            cardRef.current.classList.remove('capture-mode', 'download-mode');
            
            if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], 'membership-card.png', { type: 'image/png' })] })) {
              const file = new File([blob], 'membership-card.png', { type: 'image/png' });
              await navigator.share({
                title: 'My Indians in Ghana Membership Card',
                text: shareText,
                files: [file]
              });
              showNotification('Card shared successfully!', 'success');
              return;
            }
          } catch (domToImageError) {
            console.log('dom-to-image failed for share, using fallback');
          }
          
          // Remove classes if still present
          cardRef.current.classList.remove('capture-mode', 'download-mode');
          
          // Fallback to text+url sharing
          await navigator.share({
            title: 'My Indians in Ghana Membership Card',
            text: shareText,
            url: shareUrl
          });
          showNotification('Card shared successfully!', 'success');
          return;
          
        } catch (shareError) {
          console.log('Error sharing via Web Share API:', shareError);
          // Continue to fallback
        }
      }
      
      // Fallback for desktop or when Web Share API fails: copy full formatted text with URL
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
    } catch (error) {
      console.error('Error sharing card:', error);
      // Make sure to remove classes even if error occurs
      cardRef.current?.classList.remove('capture-mode', 'download-mode');
      // Final fallback to text sharing
      const fallbackShareText = `I'm a proud member of Indians in Ghana! 🇮🇳🇬🇭\nMember #${user.membershipNumber}\n\nJoin our community: ${window.location.origin}`;
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(fallbackShareText);
          showNotification('Share text copied to clipboard!', 'success');
        } catch (clipErr) {
          showNotification('Failed to share card', 'error');
        }
      } else {
        showNotification('Sharing not supported on this device', 'error');
      }
    }
  };

  if (!user) {
    return (
      <div className="membership-card-container">
        <div className="loading-spinner">
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
        style={{backgroundColor: '#ffffff'}}
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
              <span className="info-label-card">Name : </span>
              <span className="info-value-card name-value">{user.fullName}</span>
            </div>

            <div className="info-field">
              <span className="info-label-card">Mobile Number : </span>
              <span className="info-value-card mobile-value">{user.phone || 'Not provided'}</span>
            </div>

            <div className="info-field">
              <span className="info-label-card">Date of Issue : </span>
              <span className="info-value-card">{formatDate(user.statusUpdatedAt || user.created_at)}</span>
            </div>

            <div className="info-field">
              <span className="info-label-card">Date of Expiry : </span>
              <span className="info-value-card">{getExpiryDate()}</span>
            </div>

            <div className="info-field">
              <span className="info-label-card">Blood Group : </span>
              <span className="info-value-card blood-group-value">{user.bloodGroup || 'N/A'}</span>
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
