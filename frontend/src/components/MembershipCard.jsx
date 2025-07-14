import React, { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

const MembershipCard = () => {
  const { user } = useAuth();
  const qrCodeRef = useRef();
  const barcodeRef = useRef();

  useEffect(() => {
    if (user && user.membershipNumber) {
      // Generate QR Code
      if (window.QRCode && qrCodeRef.current) {
        qrCodeRef.current.innerHTML = '';
        new window.QRCode(qrCodeRef.current, {
          text: `IIG-MEMBER-${user.membershipNumber}`,
          width: 80,
          height: 80,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: window.QRCode.CorrectLevel.H
        });
      }

      // Generate Barcode
      if (window.JsBarcode && barcodeRef.current) {
        window.JsBarcode(barcodeRef.current, user.membershipNumber, {
          format: "CODE128",
          width: 1,
          height: 30,
          displayValue: false,
          margin: 0
        });
      }
    }
  }, [user]);

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
      default: return '#4CAF50';
    }
  };

  const getMembershipTypeName = (type) => {
    switch (type) {
      case 'silver': return 'Silver Member';
      case 'gold': return 'Gold Member';
      default: return 'Community Member';
    }
  };

  return (
    <div className="membership-card-container">
      <div className="membership-card" style={{ borderTopColor: getMembershipTypeColor(user.membershipType) }}>
        <div className="card-header">
          <div className="card-title">
            <h3>Indians in Ghana</h3>
            <p className="membership-type">{getMembershipTypeName(user.membershipType)}</p>
          </div>
          <div className="card-logo">
            <i className="fas fa-id-card"></i>
          </div>
        </div>

        <div className="card-body">
          <div className="member-info">
            <div className="member-photo">
              {user.profilePicture ? (
                <img src={user.profilePicture} alt="Profile" />
              ) : (
                <div className="default-avatar">
                  <i className="fas fa-user"></i>
                </div>
              )}
            </div>
            <div className="member-details">
              <h4>{user.fullName}</h4>
              <p className="member-number">#{user.membershipNumber}</p>
              <p className="member-since">Member since {new Date(user.joinDate).getFullYear()}</p>
            </div>
          </div>

          <div className="card-codes">
            <div className="qr-section">
              <div className="qr-code" ref={qrCodeRef}></div>
              <p>QR Code</p>
            </div>
            <div className="barcode-section">
              <svg ref={barcodeRef}></svg>
              <p className="barcode-number">{user.membershipNumber}</p>
            </div>
          </div>
        </div>

        <div className="card-footer">
          <p>Valid until renewed • Show this card for member benefits</p>
        </div>
      </div>

      <div className="card-actions">
        <button className="btn btn-outline" onClick={() => window.print()}>
          <i className="fas fa-print"></i> Print Card
        </button>
        <button className="btn btn-primary" onClick={() => {
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
