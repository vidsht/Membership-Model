import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/global.css';
import '../styles/home.css';
import '../styles/membership-plans.css';

const Home = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [businesses, setBusinesses] = useState([]);
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
    const fetchData = async () => {
      try {
        // Fetch businesses (public data)
        const businessResponse = await api.get('/businesses');
        setBusinesses(businessResponse.data);

        // Fetch admin settings for terms and public info
        try {
          const settingsResponse = await api.get('/admin/settings');
          setTerms(settingsResponse.data.termsConditions);
        } catch (error) {
          // Set default terms if admin settings not accessible
          setTerms('By using this service, you agree to abide by all rules and regulations set forth by the Indians in Ghana community. Membership benefits are subject to change without prior notice.');
        }

        // Mock stats for display (in production, you'd have a public stats endpoint)
        setStats({
          totalMembers: 1250,
          activeBusinesses: 85,
          exclusiveDeals: 42
        });

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const groupedBusinesses = businesses.reduce((acc, business) => {
    if (!acc[business.sector]) {
      acc[business.sector] = [];
    }
    acc[business.sector].push(business);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="home-container">
      {showAuthNotification && (
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
                <i className="fas fa-sign-in-alt"></i> Login
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
            <div className="stat-number">{stats.activeBusinesses}</div>
            <div className="stat-label">Active Businesses</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.exclusiveDeals}</div>
            <div className="stat-label">Exclusive Deals</div>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="features-container">
          <h2>Why Join Our Community?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <i className="fas fa-id-card"></i>
              <h3>Digital Membership Card</h3>
              <p>Get your digital membership card with QR code and barcode for easy verification.</p>
            </div>
            <div className="feature-card">
              <i className="fas fa-store"></i>
              <h3>Business Directory</h3>
              <p>Discover Indian businesses in Ghana and connect with fellow entrepreneurs.</p>
            </div>
            <div className="feature-card">
              <i className="fas fa-tags"></i>
              <h3>Exclusive Deals</h3>
              <p>Access member-only discounts and special offers from partner businesses.</p>
            </div>
            <div className="feature-card">
              <i className="fas fa-users"></i>
              <h3>Community Events</h3>
              <p>Stay updated on cultural events, festivals, and community gatherings.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="membership-plans">
        <div className="plans-container">
          <h2>Membership Plans</h2>
          <div className="plans-grid">
            <div className="plan-card">
              <h3>Community</h3>
              <div className="plan-price">Free</div>
              <ul className="plan-features">
                <li>Basic membership card</li>
                <li>Business directory access</li>
                <li>Community event updates</li>
              </ul>
              <Link to="/register" className="btn btn-outline">Get Started</Link>
            </div>
            <div className="plan-card featured">
              <h3>Silver</h3>
              <div className="plan-price">$50/year</div>
              <ul className="plan-features">
                <li>All Community features</li>
                <li>Exclusive deals access</li>
                <li>Priority event booking</li>
                <li>Monthly newsletter</li>
              </ul>
              <Link to="/register" className="btn btn-primary">Choose Silver</Link>
            </div>
            <div className="plan-card">
              <h3>Gold</h3>
              <div className="plan-price">$100/year</div>
              <ul className="plan-features">
                <li><i className="fas fa-check"></i> All Silver features</li>
                <li><i className="fas fa-check"></i> VIP access to events</li>
                <li><i className="fas fa-check"></i> Unlimited exclusive deals</li>
                <li><i className="fas fa-check"></i> Business networking</li>
                <li><i className="fas fa-check"></i> Priority customer service</li>
              </ul>
              <Link to="/unified-registration" className="plan-button">Upgrade to Gold</Link>
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
            <Link to="/unified-registration" className="btn btn-primary">
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
              <a href="/unified-registration" className="feature-link">Get Your Card <i className="fas fa-arrow-right"></i></a>
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
              <a href="/unified-registration" className="feature-link">View Benefits <i className="fas fa-arrow-right"></i></a>
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