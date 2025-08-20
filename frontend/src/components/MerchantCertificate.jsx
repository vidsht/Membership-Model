import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { withPlanAccess } from '../hooks/usePlanAccess.jsx';
import api, { authApi } from '../services/api';
import '../styles/merchant-certificate.css';
import '../styles/plan-access-blocked.css';

const MerchantCertificate = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const certificateRef = useRef();
  const qrCodeRef = useRef();
  const [businessInfo, setBusinessInfo] = useState(null);
  const [cardSettings, setCardSettings] = useState({
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

    // Fetch business information with fallbacks
    const fetchBusinessInfoWithFallback = async () => {
      // 1) Try guarded endpoint first (requires merchant session and approved)
      try {
        const resp = await api.get('/merchant/business-info');
        if (resp.data && resp.data.success && resp.data.businessInfo) {
          setBusinessInfo(resp.data.businessInfo);
          return;
        }
      } catch (err) {
        const status = err?.response?.status;
        // Don't spam console for expected 401/404 - handle below with friendly messages
        if (status && status !== 401 && status !== 404 && status !== 403) {
          console.error('Unexpected error fetching /merchant/business-info:', err);
        }
      }

      // 2) Try merchant dashboard which includes business under data.business
      try {
        const dash = await api.get('/merchant/dashboard');
        if (dash.data && dash.data.success && dash.data.data && dash.data.data.business) {
          setBusinessInfo(dash.data.data.business);
          return;
        }
      } catch (err) {
        // ignore - may be due to not-approved or missing session
      }

      // 3) Try refreshing /auth/me and use embedded business if present
      try {
        const me = await authApi.me();
        if (me && me.user && me.user.business) {
          setBusinessInfo(me.user.business);
          return;
        }
      } catch (err) {
        // ignore
      }

      // 4) Public businesses list fallback: try to match by email, fullName or businessId
      try {
        const list = await api.get('/businesses');
        if (list && Array.isArray(list.data)) {
          const candidates = list.data;
          // Try match by email or owner name or businessId
          const match = candidates.find(b => {
            if (!b) return false;
            if (user?.email && b.email && b.email.toLowerCase() === user.email.toLowerCase()) return true;
            if (user?.fullName && b.ownerName && b.ownerName.toLowerCase().includes(user.fullName.toLowerCase())) return true;
            if (user?.businessId && b.id && b.id === user.businessId) return true;
            if (user?.businessId && b.businessId && b.businessId === user.businessId) return true;
            return false;
          });

          if (match) {
            // Map public business fields to certificate shape
            const mapped = {
              businessId: match.id || match.businessId,
              businessName: match.name || match.businessName,
              businessDescription: match.description || match.businessDescription,
              businessCategory: match.sector || match.businessCategory,
              businessAddress: match.address || match.businessAddress,
              businessPhone: match.phone || match.businessPhone,
              businessEmail: match.email || match.businessEmail,
              website: match.website || match.website
            };
            setBusinessInfo(mapped);
            return;
          }
        }
      } catch (err) {
        // final fallback ignored
      }

      // If all attempts fail, inform the user in a friendly way
      showNotification('Unable to load merchant business details. Ensure you are logged in as the merchant owner and that your business profile is complete.', 'error');
    };

    const init = async () => {
      let current = user;
      if (!current) {
        try {
          const me = await authApi.me();
          if (me && me.user) current = me.user;
          if (me && me.user && me.user.business) {
            setBusinessInfo(me.user.business);
            return;
          }
        } catch (err) {
          // ignore
        }
      } else {
        // If AuthContext user has business already attached (mirrors MembershipCard approach), use it
        if (current.business) {
          setBusinessInfo(current.business);
          return;
        }
      }

      // If still no businessInfo and user is merchant, run the fallback chain
      if (current && current.userType === 'merchant') {
        await fetchBusinessInfoWithFallback();
      }
    };

    fetchCardSettings();
    init();
  }, [user]);

  // Generate QR code for verification
  useEffect(() => {
    if (businessInfo && qrCodeRef.current) {
      const generateVerificationQR = async () => {
        try {
          const QRCode = await import('qrcode');
          const verificationUrl = `${window.location.origin}/verify/business/${businessInfo.businessId}`;
          await QRCode.default.toCanvas(qrCodeRef.current, verificationUrl, {
            width: 60,
            margin: 1,
            color: {
              dark: '#2c5aa0',
              light: '#ffffff'
            }
          });
        } catch (error) {
          console.error('Error generating verification QR code:', error);
        }
      };
      
      generateVerificationQR();
    }
  }, [businessInfo]);

  const downloadCertificate = async () => {
    if (!cardSettings.allow_download) {
      showNotification('Certificate download is not enabled', 'error');
      return;
    }

    try {
      // Import html2canvas dynamically
      const html2canvas = await import('html2canvas');
      const canvas = await html2canvas.default(certificateRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        width: 700,   // Portrait A4 width
        height: 990   // Portrait A4 height
      });

      // Create download link
      const link = document.createElement('a');
      link.download = `merchant-certificate-${businessInfo?.businessId || user.membershipNumber}.png`;
      link.href = canvas.toDataURL();
      link.click();

      showNotification('Certificate downloaded successfully!', 'success');
    } catch (error) {
      console.error('Error downloading certificate:', error);
      showNotification('Failed to download certificate. Please try again.', 'error');
    }
  };

  const shareCertificate = async () => {
    if (!cardSettings.allow_share) {
      showNotification('Certificate sharing is not enabled', 'error');
      return;
    }

    try {
      // Try to share with image if possible
      if (navigator.share) {
        const html2canvas = await import('html2canvas');
        const canvas = await html2canvas.default(certificateRef.current, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          allowTaint: true,
          width: 700,
          height: 990
        });

        canvas.toBlob(async (blob) => {
          if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], 'merchant-certificate.png', { type: 'image/png' })] })) {
            const file = new File([blob], 'merchant-certificate.png', { type: 'image/png' });
            await navigator.share({
              title: 'Indians in Ghana Merchant Certificate',
              text: `I'm a certified merchant with Indians in Ghana! 🇮🇳🇬🇭\nBusiness ID: ${businessInfo?.businessId}\n\nConnect with our community: ${window.location.origin}`,
              files: [file]
            });
          } else {
            // Fallback to text sharing
            await navigator.share({
              title: 'Indians in Ghana Merchant Certificate',
              text: `I'm a certified merchant with Indians in Ghana! 🇮🇳🇬🇭\nBusiness ID: ${businessInfo?.businessId}\n\nConnect with our community: ${window.location.origin}`,
            });
          }
          showNotification('Certificate shared successfully!', 'success');
        }, 'image/png');
      } else {
        // Fallback for browsers that don't support Web Share API
        const shareText = `I'm a certified merchant with Indians in Ghana! 🇮🇳🇬🇭\nBusiness ID: ${businessInfo?.businessId}\n\nConnect with our community: ${window.location.origin}`;
        
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
      console.error('Error sharing certificate:', error);
      showNotification('Unable to share. Please try again.', 'error');
    }
  };

  const shareToWhatsApp = async () => {
    if (!cardSettings.allow_share) {
      showNotification('Certificate sharing is not enabled', 'error');
      return;
    }

    try {
      const html2canvas = await import('html2canvas');
      const canvas = await html2canvas.default(certificateRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        width: 700,
        height: 990
      });

      // Convert to blob
      canvas.toBlob((blob) => {
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], 'merchant-certificate.png', { type: 'image/png' })] })) {
          const file = new File([blob], 'merchant-certificate.png', { type: 'image/png' });
          navigator.share({
            title: 'Indians in Ghana Merchant Certificate',
            text: `I'm a certified merchant with Indians in Ghana! 🇮🇳🇬🇭\nBusiness ID: ${businessInfo?.businessId}`,
            files: [file]
          });
        } else {
          // Fallback to WhatsApp web link
          const message = encodeURIComponent(`I'm a certified merchant with Indians in Ghana! 🇮🇳🇬🇭\nBusiness ID: ${businessInfo?.businessId}\n\nConnect with our community: ${window.location.origin}`);
          window.open(`https://wa.me/?text=${message}`, '_blank');
        }
      }, 'image/png');

      showNotification('Sharing certificate...', 'info');
    } catch (error) {
      console.error('Error sharing certificate:', error);
      // Fallback to text sharing
      const message = encodeURIComponent(`I'm a certified merchant with Indians in Ghana! 🇮🇳🇬🇭\nBusiness ID: ${businessInfo?.businessId}\n\nConnect with our community: ${window.location.origin}`);
      window.open(`https://wa.me/?text=${message}`, '_blank');
    }
  };

  if (!user || !businessInfo) {
    return (
      <div className="certificate-container">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading merchant certificate...</p>
        </div>
      </div>
    );
  }

  // Hide certificate for pending merchants
  if (user.status === 'pending' || businessInfo.status === 'pending') {
    return (
      <div className="certificate-container">
        <div className="status-message">
          <i className="fas fa-clock"></i>
          <h3>Business Certificate Not Available</h3>
          <p>Your business certificate will be available once your business is approved by an administrator.</p>
        </div>
      </div>
    );
  }

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
  };

  // Calculate expiry date - only use validationDate as source of truth
  const getCertificateExpiryDate = () => {
    // ONLY use validationDate (primary and only expiry date source)
    if (user.validationDate) {
      return formatDate(user.validationDate);
    }
    
    // If no validationDate, show N/A (this indicates an issue that should be resolved)
    return 'N/A';
  };

  return (
    <div className="certificate-container">
      <div 
        ref={certificateRef}
        className="merchant-certificate-a4"
      >
        
        {/* Certificate Header */}
        <div className="certificate-header">
          <div className="certificate-logo">
            <div className="logo-circle">
              <img src="/logo.jpeg" alt="Logo" />
            </div>
          </div>
          <div className="certificate-title-section">
            <h1 className="certificate-main-title">INDIANS IN GHANA</h1>
            <p className="certificate-subtitle">Bringing Community Together</p>
            <div className="certificate-decoration">
              <div className="decoration-line"></div>
              <div className="decoration-ornament">❋</div>
              <div className="decoration-line"></div>
            </div>
          </div>
        </div>

        {/* Certificate Body */}
        <div className="certificate-body">
          <div className="certificate-content">
            <h2>CERTIFICATE</h2>
            
            <div className="certificate-text">
              <p className="certificate-intro">This Certificate Is Proudly Presented To</p>
              
              <h3 className="business-name">{businessInfo.businessName}</h3>
              
              <p className="certificate-statement">
                In recognition of your valued role as an Official Discount Partner with our membership platform, 
                we extend our sincere appreciation for your commitment to extending exclusive benefits to our community. 
                Your generosity and support are essential to the lasting success of our platform.
              </p>
            </div>

            {/* Date Information */}
            <div className="certificate-dates">
              <p>Date Of Issue : {formatDate(user.statusUpdatedAt || user.created_at)}</p>
              <p>Date Of Expiry : {getCertificateExpiryDate()}</p>

              {/* Signature Section */}
                <div className="signature-section-new">
                    <div className="signature-line-new">
                        <img className='signature-image' src="/signature.jpeg" alt="Signature" />
                    </div>
                    <div className="signature-name">Sachin Hursale</div>
                    <div className="signature-org">Indians in Ghana</div>
                </div>
            </div>

        {/* Signature Section
        <div className="signature-section-new">
          <div className="signature-line-new">
            <img className='signature-image' src="/public/signature.jpeg" alt="Signature" />
          </div>
          <div className="signature-name">Sachin Hursale</div>
          <div className="signature-org">Indians in Ghana</div>
        </div> */}

        {/* Certificate Footer with QR and Verification */}
        <div className="certificate-verification-footer">
          <div className="verification-left">
            <div className="qr-section">
              <canvas ref={qrCodeRef} width={80} height={80}></canvas>
              <p className="qr-text">Scan to Verify</p>
            </div>
          </div>
          
          <div className="verification-center">
            <div className="certificate-number">
              <p>Certificate No: {businessInfo.businessId}</p>
            </div>
          </div>
          
          <div className="verification-right">
            <div className="verification-stamp">
              <div className="stamp-content">
                <div>VERIFIED</div>
                <div>✓</div>
              </div>
            </div>
          </div>
        </div>
      </div>
          </div>
        </div>

      {/* Certificate Actions */}
      <div className="certificate-actions">
        {cardSettings.allow_download && (
          <button className="btn btn-primary" onClick={downloadCertificate}>
            <i className="fas fa-download"></i> Download Certificate
          </button>
        )}
        {cardSettings.allow_share && (
          <button className="btn btn-success" onClick={shareToWhatsApp}>
            <i className="fab fa-whatsapp"></i> Share on WhatsApp
          </button>
        )}
        <button className="btn btn-secondary" onClick={shareCertificate}>
          <i className="fas fa-share"></i> Share
        </button>
      </div>
    </div>
  );
};

export default withPlanAccess(MerchantCertificate, 'certificate');
