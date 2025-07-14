import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/global.css';
import '../styles/home.css';
import '../styles/membership-plans.css';

const Home = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [stats, setStats] = useState({});
  const [terms, setTerms] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAuthNotification, setShowAuthNotification] = useState(false);
  
  useEffect(() => {
    // Check if user was redirected from a protected route
    if (location.state && location.state.from) {
      setShowAuthNotification(true);
      // Hide notification after 5 seconds
      setTimeout(() => setShowAuthNotification(false), 5000);
    }
  }, [location]);

  useEffect(() => {
    const initializeData = () => {
      try {
        // Set default terms
        setTerms('By using this service, you agree to abide by all rules and regulations set forth by the Indians in Ghana community. Membership benefits are subject to change without prior notice.');

        // Set static stats for display
        setStats({
          totalMembers: 1250,
          communityEvents: 25,
          membersBenefits: 15
        });

      } catch (error) {
        console.error('Error initializing data:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading...</p>
        </div>
      </div>
    );
  }  return (
    <div className="home-container">      {showAuthNotification && (
        <div className="auth-notification">
          <div className="notification-content">
            <i className="fas fa-info-circle"></i>
            <span>Please login or register to access member-only content</span>
            <button onClick={() => setShowAuthNotification(false)} className="close-btn">
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}
      
      <section className="hero">
        <div className="hero-content">
          <h1>Welcome to Indians in Ghana</h1>
          <p>Connecting the Indian community in Ghana through membership, business opportunities, and exclusive benefits.</p>
          
          {!isAuthenticated && (
            <div className="hero-actions">
              <Link to="/register" className="btn btn-primary">
                <i className="fas fa-user-plus"></i> Join Now
              </Link>
              <Link to="/login" className="btn btn-secondary">
                <i className="fas fa-sign-in-alt"></i> Sign In
              </Link>
            </div>
          )}
        </div>
      </section>
      
      <section className="stats">
        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-number">{stats.totalMembers}</div>
            <div className="stat-label">Community Members</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.communityEvents}</div>
            <div className="stat-label">Community Events</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.membersBenefits}</div>
            <div className="stat-label">Member Benefits</div>
          </div>
        </div>
      </section>
        <section className="features">
        <div className="features-header">
          <h2>Membership Benefits</h2>
          <p>Discover the exclusive advantages of being part of our community</p>
        </div>
        
        <div className="features-container">
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-id-card"></i>
              </div>
              <h3 className="feature-title">Digital Membership</h3>
              <p className="feature-description">Access your digital membership card anytime, anywhere with exclusive member benefits.</p>
              <Link to="/register" className="feature-link">Learn More <i className="fas fa-chevron-right"></i></Link>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-percentage"></i>
              </div>
              <h3 className="feature-title">Exclusive Discounts</h3>
              <p className="feature-description">Enjoy special discounts and offers at partner businesses across Ghana.</p>
              <Link to="/register" className="feature-link">View Offers <i className="fas fa-chevron-right"></i></Link>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-calendar-alt"></i>
              </div>
              <h3 className="feature-title">Community Events</h3>
              <p className="feature-description">Connect with fellow community members through regular cultural and networking events.</p>
              <Link to="/register" className="feature-link">See Calendar <i className="fas fa-chevron-right"></i></Link>
            </div>
          </div>        </div>
      </section>

      <section className="membership-plans-section" style={{ background: 'linear-gradient(to bottom, #f5f5f5, #ffffff)', padding: '3rem 1rem', margin: '2rem 0', borderRadius: '0.5rem', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)' }}>
        <h2 className="section-title-centered">
          <i className="fas fa-crown" style={{ marginRight: '0.5rem', color: '#ffd700' }}></i>
          Membership Plans
        </h2>
        <p style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 2rem', color: 'var(--neutral-medium)' }}>
          Choose the membership plan that's right for you and start enjoying exclusive benefits designed for the Indian community in Ghana.
        </p>
        
        <div className="membership-cards">
          <div className="membership-card">
            <div className="card-header">
              <h3>Community</h3>
              <p className="price">FREE</p>
            </div>
            <div className="card-body">
              <ul className="plan-features">
                <li><i className="fas fa-check"></i> Basic community access</li>
                <li><i className="fas fa-check"></i> Digital membership card</li>
                <li><i className="fas fa-check"></i> Member directory listing</li>
                <li><i className="fas fa-check"></i> Public event access</li>
              </ul>
              <Link to="/register" className="plan-button">Join Free</Link>
            </div>
          </div>
          
          <div className="membership-card silver" style={{ backgroundImage: 'linear-gradient(to bottom right, #f0f0f0, #e0e0e0, #c0c0c0, #e0e0e0, #f0f0f0)' }}>
            <div className="card-header" style={{ background: 'linear-gradient(to right, #c0c0c0, #d8d8d8, #c0c0c0)' }}>
              <h3>Silver</h3>
              <p className="price">GHS 50<span>/year</span></p>
            </div>
            <div className="card-body">
              <ul className="plan-features">
                <li><i className="fas fa-check"></i> All Community features</li>
                <li><i className="fas fa-check"></i> Member-only events</li>
                <li><i className="fas fa-check"></i> Business directory access</li>
                <li><i className="fas fa-check"></i> 5 exclusive deals monthly</li>
              </ul>
              <Link to="/register" className="plan-button">Upgrade to Silver</Link>
            </div>
          </div>
          
          <div className="membership-card gold featured" style={{ animation: 'pulse 2s infinite' }}>
            <div className="featured-badge">Most Popular</div>
            <div className="card-header">
              <h3>Gold</h3>
              <p className="price">GHS 100<span>/year</span></p>
            </div>
            <div className="card-body">
              <ul className="plan-features">
                <li><i className="fas fa-check"></i> All Silver features</li>
                <li><i className="fas fa-check"></i> VIP access to events</li>
                <li><i className="fas fa-check"></i> Unlimited exclusive deals</li>
                <li><i className="fas fa-check"></i> Business networking</li>
                <li><i className="fas fa-check"></i> Priority customer service</li>
              </ul>
              <Link to="/register" className="plan-button">Upgrade to Gold</Link>
            </div>
          </div>
        </div>
      </section>
      
      <section className="testimonials">
        <div className="testimonials-header">
          <h2>Community Voices</h2>
        </div>
        
        <div className="testimonials-container">
          <div className="testimonial-card">
            <div className="testimonial-content">
              <p>The Indians in Ghana community has been a home away from home. The membership benefits and networking opportunities have been invaluable for both personal connections and business growth.</p>
            </div>
            <div className="testimonial-author">
              <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="Testimonial" className="testimonial-avatar" />
              <div className="testimonial-info">
                <h4>Rajesh Patel</h4>
                <p>Member since 2023</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <section className="cta">
        <div className="cta-container">
          <h2>Join Our Community Today</h2>
          <p>Be part of a growing network of Indians in Ghana and unlock exclusive benefits</p>
          <div className="cta-buttons">
            <Link to="/register" className="btn btn-primary">
              <i className="fas fa-user-plus"></i> Join Now
            </Link>
            <Link to="/login" className="btn btn-secondary">
              <i className="fas fa-sign-in-alt"></i> Sign In
            </Link>
          </div>
        </div>
      </section>      <section className="features">
        <div className="features-header">
          <h2>Why Join Our Community?</h2>
          <p>Discover the benefits of becoming a member of the Indians in Ghana community</p>
        </div>
        <div className="features-container">
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-id-card"></i>
              </div>
              <h3 className="feature-title">Digital Membership Card</h3>
              <p className="feature-description">Get your digital membership card with QR code and barcode for easy verification at all community events and partner businesses.</p>
              <a href="/register" className="feature-link">Get Your Card <i className="fas fa-arrow-right"></i></a>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-users"></i>
              </div>
              <h3 className="feature-title">Community Network</h3>
              <p className="feature-description">Connect with the Indian community in Ghana and build meaningful relationships with fellow Indians through our various networking events.</p>
              <a href="/about" className="feature-link">Learn More <i className="fas fa-arrow-right"></i></a>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-gift"></i>
              </div>
              <h3 className="feature-title">Member Benefits</h3>
              <p className="feature-description">Access member-only events, cultural celebrations, exclusive deals with local businesses, and special community gatherings.</p>
              <a href="/register" className="feature-link">View Benefits <i className="fas fa-arrow-right"></i></a>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-calendar-alt"></i>
              </div>
              <h3 className="feature-title">Community Events</h3>
              <p className="feature-description">Stay updated on cultural events, festivals, Diwali celebrations, Holi festivities, and other community gatherings throughout the year.</p>
              <a href="/contact" className="feature-link">Upcoming Events <i className="fas fa-arrow-right"></i></a>
            </div>
          </div>        </div>
      </section>

      <section className="terms-preview">
        <div className="terms-container">
          <h2>Terms and Conditions</h2>
          <div className="terms-content">
            <p>{terms}</p>
            <Link to="/about" className="btn btn-link">Read Full Terms</Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
