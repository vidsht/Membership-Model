import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import '../styles/terms.css';

const Terms = () => {
  const [adminSettings, setAdminSettings] = useState({
    content: { terms_conditions: '' }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // Using the same logic as Home.jsx for fetching admin settings
      try {
        const settingsResponse = await api.get('/admin/settings/public');
        if (settingsResponse.data.success) {
          console.log('✅ Admin settings received:', settingsResponse.data.settings);
          setAdminSettings(settingsResponse.data.settings);
        }
      } catch (error) {
        // Use default settings if admin settings not accessible
        console.log('❌ Admin settings error:', error);
        console.log('Using default settings');
        // Keep the default empty state
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const defaultTerms = `
    <h3>1. Acceptance of Terms</h3>
    <p>By accessing and using this membership platform, you accept and agree to be bound by the terms and provision of this agreement.</p>
    
    <h3>2. Membership Benefits</h3>
    <p>Membership benefits include access to exclusive deals, community events, and business networking opportunities. Benefits are subject to change without prior notice.</p>
    
    <h3>3. Member Responsibilities</h3>
    <ul>
      <li>Provide accurate and up-to-date information</li>
      <li>Respect other community members</li>
      <li>Follow community guidelines and code of conduct</li>
      <li>Use deals and offers responsibly</li>
    </ul>
    
    <h3>4. Deal Redemption</h3>
    <p>Deals are subject to merchant terms and conditions. Members must present valid membership credentials when redeeming deals. Deals cannot be combined with other offers unless specified.</p>
    
    <h3>5. Privacy and Data Protection</h3>
    <p>We are committed to protecting your privacy. Personal information is collected and used in accordance with our Privacy Policy.</p>
    
    <h3>6. Membership Fees and Cancellation</h3>
    <p>Membership fees are non-refundable unless otherwise specified. Members may cancel their membership at any time by contacting support.</p>
    
    <h3>7. Business Partners</h3>
    <p>Business partners must comply with all applicable laws and provide accurate information about their deals and services.</p>
    
    <h3>8. Limitation of Liability</h3>
    <p>The Indians in Ghana community is not liable for any indirect, incidental, special, or consequential damages arising from the use of this service.</p>
    
    <h3>9. Modifications</h3>
    <p>These terms may be updated from time to time. Continued use of the service constitutes acceptance of any modifications.</p>
    
    <h3>10. Contact Information</h3>
    <p>For questions about these terms, please contact us through our support channels.</p>
  `;

  if (loading) {
    return (
      <div className="terms-page loading">
        <div className="container">
          <div className="loading-spinner">
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="terms-page">
      <div className="terms-hero">
        <div className="container">
          <div className="terms-hero-content">
            <h1>
              <i className="fas fa-file-contract"></i>
              Terms and Conditions
            </h1>
            <p>Please read these terms and conditions carefully before using our service</p>
            <div className="terms-meta">
              <div className="last-updated">
                <i className="fas fa-calendar-alt"></i>
                Last updated: {new Date().toLocaleDateString('en-GB', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="terms-content">
        <div className="container">
          <div className="terms-main">
            <div className="terms-text-content">
              <div 
                className="terms-html-content"
                dangerouslySetInnerHTML={{ 
                  __html: adminSettings.content?.terms_conditions || defaultTerms 
                }}
              />
            </div>

            <div className="terms-actions">
              <div className="action-buttons">
                <Link to="/" className="btn btn-secondary">
                  <i className="fas fa-home"></i>
                  Back to Home
                </Link>
                <Link to="/unified-registration" className="btn btn-primary">
                  <i className="fas fa-user-plus"></i>
                  I Agree & Join
                </Link>
              </div>
              
              <div className="help-text">
                <p>
                  <i className="fas fa-question-circle"></i>
                  Have questions about these terms? 
                  <Link to="/contact"> Contact our support team</Link>
                </p>
              </div>
            </div>
          </div>

          <div className="terms-sidebar">
            <div className="quick-nav">
              <h3>Quick Navigation</h3>
              <ul>
                <li><a href="/unified-registration">Register Now</a></li>
                <li><a href="/login">Membership Benefits</a></li>
                <li><a href="/deals">Deal Redemption</a></li>
                <li><a href="/business-directory">Business Partners</a></li>
                <li><a href="/about">About Us</a></li>
                <li><a href="/disclaimer">Disclaimer</a></li>
                <li><a href="/contact">Contact</a></li>
              </ul>
            </div>

            <div className="terms-summary">
              <h3>Key Points</h3>
              <div className="summary-points">
                <div className="summary-point">
                  <i className="fas fa-check-circle"></i>
                  <span>Membership benefits may change</span>
                </div>
                <div className="summary-point">
                  <i className="fas fa-check-circle"></i>
                  <span>Deals subject to merchant terms</span>
                </div>
                <div className="summary-point">
                  <i className="fas fa-check-circle"></i>
                  <span>Privacy protection guaranteed</span>
                </div>
                <div className="summary-point">
                  <i className="fas fa-check-circle"></i>
                  <span>Community guidelines apply</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
