import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/benefits.css';

const BusinessBenefits = () => {
  return (
    <div className="benefits-page">
      <div className="hero-section">
        <div className="hero-content">
          <h1>Business Benefits</h1>
          <p>Unlock exclusive advantages for your business with Indians in Ghana membership</p>
          <Link to="/unified-registration" className="cta-button">
            Register Your Business
          </Link>
        </div>
      </div>

      <div className="benefits-container">
        <div className="benefits-header">
          <h2>Why Join as a Business Partner?</h2>
          <p>Grow your business and connect with the thriving Indian community in Ghana</p>
        </div>

        <div className="benefits-grid">
          <div className="benefit-card">
            <div className="benefit-icon">
              <i className="fas fa-bullhorn"></i>
            </div>
            <h3>Enhanced Visibility</h3>
            <p>Get featured on our platform and reach thousands of potential customers in the Indian community.</p>
          </div>

          <div className="benefit-card">
            <div className="benefit-icon">
              <i className="fas fa-handshake"></i>
            </div>
            <h3>Exclusive Deals Platform</h3>
            <p>Offer special discounts and promotions exclusively to our members, driving customer loyalty.</p>
          </div>

          <div className="benefit-card">
            <div className="benefit-icon">
              <i className="fas fa-network-wired"></i>
            </div>
            <h3>Business Networking</h3>
            <p>Connect with other Indian businesses and create valuable partnerships within the community.</p>
          </div>

          <div className="benefit-card">
            <div className="benefit-icon">
              <i className="fas fa-chart-line"></i>
            </div>
            <h3>Growth Analytics</h3>
            <p>Access detailed insights about your customer engagement and deal performance.</p>
          </div>

          <div className="benefit-card">
            <div className="benefit-icon">
              <i className="fas fa-star"></i>
            </div>
            <h3>Premium Listing</h3>
            <p>Get priority placement in search results and featured business sections.</p>
          </div>

          <div className="benefit-card">
            <div className="benefit-icon">
              <i className="fas fa-users"></i>
            </div>
            <h3>Community Events</h3>
            <p>Participate in exclusive business events, seminars, and networking sessions.</p>
          </div>

          <div className="benefit-card">
            <div className="benefit-icon">
              <i className="fas fa-mobile-alt"></i>
            </div>
            <h3>Digital Marketing Support</h3>
            <p>Get assistance with digital marketing strategies tailored for the Indian community.</p>
          </div>

          <div className="benefit-card">
            <div className="benefit-icon">
              <i className="fas fa-shield-alt"></i>
            </div>
            <h3>Verified Business Badge</h3>
            <p>Build trust with customers through our verified business certification program.</p>
          </div>
        </div>

        <div className="cta-section">
          <h2>Ready to Grow Your Business?</h2>
          <p>Join thousands of Indian businesses in Ghana and unlock your growth potential</p>
          <div className="cta-buttons">
            <Link to="/unified-registration" className="cta-button primary">
              Register Your Business
            </Link>
            <Link to="/contact" className="cta-button secondary">
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessBenefits;
