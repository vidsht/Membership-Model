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
          <Link to="/register" className="cta-button">
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

        {/* <div className="membership-tiers">
          <h2>Membership Plans</h2>
          <div className="tiers-grid">
            <div className="tier-card basic">
              <h3>Basic</h3>
              <div className="price">Free</div>
              <ul>
                <li>Access to community directory</li>
                <li>Basic event notifications</li>
                <li>Member forum access</li>
                <li>Monthly newsletter</li>
              </ul>
              <Link to="/register" className="tier-button">Join Free</Link>
            </div>

            <div className="tier-card premium">
              <h3>Premium</h3>
              <div className="price">GHS 30/month</div>
              <ul>
                <li>Everything in Basic</li>
                <li>Exclusive discounts and deals</li>
                <li>Priority event booking</li>
                <li>Premium support services</li>
                <li>Family plan options</li>
              </ul>
              <Link to="/register" className="tier-button">Upgrade Now</Link>
            </div>

            <div className="tier-card family">
              <h3>Family</h3>
              <div className="price">GHS 75/month</div>
              <ul>
                <li>Everything in Premium</li>
                <li>Coverage for up to 5 family members</li>
                <li>Family event invitations</li>
                <li>Children's program access</li>
                <li>Spouse job search assistance</li>
              </ul>
              <Link to="/register" className="tier-button">Get Family Plan</Link>
            </div>
          </div>
        </div>

        <div className="featured-benefits">
          <h2>Featured Member Benefits</h2>
          <div className="featured-grid">
            <div className="featured-card">
              <h3>Diwali Celebration Package</h3>
              <p>Get 20% discount on Diwali shopping, exclusive access to community Diwali events, and complimentary traditional sweets delivery.</p>
              <span className="benefit-tag">Seasonal</span>
            </div>

            <div className="featured-card">
              <h3>New Arrival Support</h3>
              <p>Comprehensive assistance for new Indian arrivals including airport pickup, temporary accommodation help, and orientation sessions.</p>
              <span className="benefit-tag">Support</span>
            </div>

            <div className="featured-card">
              <h3>Business Directory Access</h3>
              <p>Complete directory of Indian-owned businesses in Ghana with verified contact information and exclusive member discounts.</p>
              <span className="benefit-tag">Directory</span>
            </div>

            <div className="featured-card">
              <h3>Emergency Assistance</h3>
              <p>24/7 emergency helpline for urgent situations, medical emergencies, and crisis support within the community.</p>
              <span className="benefit-tag">Emergency</span>
            </div>
          </div>
        </div> */}
{/* 
        <div className="testimonials-section">
          <h2>What Our Members Say</h2>
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <p>"Being a member has made my life in Ghana so much easier. The community support and discounts have been incredibly valuable."</p>
              <div className="testimonial-author">
                <strong>Meera Reddy</strong>
                <span>Software Engineer</span>
              </div>
            </div>

            <div className="testimonial-card">
              <p>"The networking opportunities have been amazing. I've made lifelong friends and found great business connections through this platform."</p>
              <div className="testimonial-author">
                <strong>Vikram Singh</strong>
                <span>Business Consultant</span>
              </div>
            </div>

            <div className="testimonial-card">
              <p>"When I first arrived in Ghana, the community support was overwhelming. The new arrival assistance program helped me settle in quickly."</p>
              <div className="testimonial-author">
                <strong>Anita Krishnan</strong>
                <span>Teacher</span>
              </div>
            </div>
          </div>
        </div> */}

        <div className="cta-section">
          <h2>Ready to Join Our Community?</h2>
          <p>Become part of a thriving Indian community in Ghana and unlock exclusive benefits</p>
          <div className="cta-buttons">
            <Link to="/register" className="cta-button primary">
              Become a Member
            </Link>
            <Link to="/contact" className="cta-button secondary">
              Learn More
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberBenefits;
