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
          <Link to="/merchant/register" className="cta-button">
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

        <div className="membership-tiers">
          <h2>Business Membership Tiers</h2>
          <div className="tiers-grid">
            <div className="tier-card basic">
              <h3>Basic</h3>
              <div className="price">Free</div>
              <ul>
                <li>Basic business listing</li>
                <li>Contact information display</li>
                <li>Customer reviews</li>
                <li>Basic analytics</li>
              </ul>
              <Link to="/merchant/register" className="tier-button">Get Started</Link>
            </div>

            <div className="tier-card premium">
              <h3>Premium</h3>
              <div className="price">GHS 50/month</div>
              <ul>
                <li>Everything in Basic</li>
                <li>Featured business placement</li>
                <li>Unlimited deals posting</li>
                <li>Advanced analytics</li>
                <li>Priority customer support</li>
              </ul>
              <Link to="/merchant/register" className="tier-button">Upgrade Now</Link>
            </div>

            <div className="tier-card enterprise">
              <h3>Enterprise</h3>
              <div className="price">GHS 150/month</div>
              <ul>
                <li>Everything in Premium</li>
                <li>Custom branding options</li>
                <li>Dedicated account manager</li>
                <li>Event sponsorship opportunities</li>
                <li>API access for integration</li>
              </ul>
              <Link to="/merchant/register" className="tier-button">Contact Sales</Link>
            </div>
          </div>
        </div>

        <div className="testimonials-section">
          <h2>What Our Business Partners Say</h2>
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <p>"Joining Indians in Ghana has significantly increased our customer base. The platform has been instrumental in connecting us with the community."</p>
              <div className="testimonial-author">
                <strong>Rajesh Patel</strong>
                <span>Owner, Patel Groceries</span>
              </div>
            </div>

            <div className="testimonial-card">
              <p>"The deals platform has helped us boost sales by 40%. Our customers love the exclusive offers we provide through this network."</p>
              <div className="testimonial-author">
                <strong>Priya Sharma</strong>
                <span>Manager, Bombay Palace Restaurant</span>
              </div>
            </div>

            <div className="testimonial-card">
              <p>"The networking opportunities have been invaluable. We've formed partnerships that have taken our business to the next level."</p>
              <div className="testimonial-author">
                <strong>Arjun Gupta</strong>
                <span>CEO, Gujarat Textiles</span>
              </div>
            </div>
          </div>
        </div>

        <div className="cta-section">
          <h2>Ready to Grow Your Business?</h2>
          <p>Join thousands of Indian businesses in Ghana and unlock your growth potential</p>
          <div className="cta-buttons">
            <Link to="/merchant/register" className="cta-button primary">
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
