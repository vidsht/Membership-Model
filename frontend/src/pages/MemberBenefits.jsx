import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/benefits.css';

const MemberBenefits = () => {
  return (
    <div className="benefits-page">
      <div className="hero-section">
        <div className="hero-content">
          <h1>Member Benefits</h1>
          <p>Discover exclusive benefits and opportunities as a member of Indians in Ghana</p>
          <Link to="/unified-registration" className="cta-button">
            Become a Member
          </Link>
        </div>
      </div>

      <div className="benefits-container">
        <div className="benefits-header">
          <h2>Why Become a Member?</h2>
          <p>Connect, save, and thrive with the Indian community in Ghana</p>
        </div>

        <div className="benefits-grid">
          <div className="benefit-card">
            <div className="benefit-icon">
              <i className="fas fa-percentage"></i>
            </div>
            <h3>Exclusive Discounts</h3>
            <p>Access special deals and discounts from verified Indian businesses across Ghana.</p>
          </div>

          <div className="benefit-card">
            <div className="benefit-icon">
              <i className="fas fa-calendar-alt"></i>
            </div>
            <h3>Community Events</h3>
            <p>Get priority access to cultural events, festivals, and community gatherings.</p>
          </div>

          <div className="benefit-card">
            <div className="benefit-icon">
              <i className="fas fa-users"></i>
            </div>
            <h3>Networking Opportunities</h3>
            <p>Connect with fellow Indians living in Ghana and expand your social and professional network.</p>
          </div>

          <div className="benefit-card">
            <div className="benefit-icon">
              <i className="fas fa-info-circle"></i>
            </div>
            <h3>Community Updates</h3>
            <p>Stay informed about important news, updates, and announcements from the Indian community.</p>
          </div>

          <div className="benefit-card">
            <div className="benefit-icon">
              <i className="fas fa-hands-helping"></i>
            </div>
            <h3>Support Services</h3>
            <p>Access assistance with documentation, legal advice, and settling-in support for new arrivals.</p>
          </div>

          <div className="benefit-card">
            <div className="benefit-icon">
              <i className="fas fa-utensils"></i>
            </div>
            <h3>Cultural Activities</h3>
            <p>Participate in cooking classes, language sessions, and traditional Indian cultural programs.</p>
          </div>

          <div className="benefit-card">
            <div className="benefit-icon">
              <i className="fas fa-graduation-cap"></i>
            </div>
            <h3>Educational Resources</h3>
            <p>Access educational workshops, career guidance, and skill development programs.</p>
          </div>

          <div className="benefit-card">
            <div className="benefit-icon">
              <i className="fas fa-heart"></i>
            </div>
            <h3>Healthcare Network</h3>
            <p>Connect with Indian doctors and healthcare professionals in Ghana for medical support.</p>
          </div>
        </div>

        <div className="cta-section">
          <h2>Ready to Join Our Community?</h2>
          <p>Become part of a thriving Indian community in Ghana and unlock exclusive benefits</p>
          <div className="cta-buttons">
            <Link to="/unified-registration" className="cta-button primary">
              Become a Member
            </Link>
            <Link to="/about" className="cta-button secondary">
              Learn More
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberBenefits;
