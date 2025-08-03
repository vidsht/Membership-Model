import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import '../styles/global.css';
import '../styles/home.css';
import '../styles/membership-plans.css';

const Home = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [businesses, setBusinesses] = useState([]);
  const [stats, setStats] = useState({});
  const [adminSettings, setAdminSettings] = useState({
    content: { terms_conditions: '' },
    features: { show_statistics: true, business_directory: true }
  });
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

        // Fetch public admin settings
        try {
          const settingsResponse = await api.get('/admin/settings/public');
          if (settingsResponse.data.success) {
            setAdminSettings(settingsResponse.data.settings);
          }
        } catch (error) {
          // Use default settings if admin settings not accessible
          console.log('Using default settings');
        }

        // Fetch real stats from admin endpoint or use defaults
        try {
          if (isAuthenticated) {
            const statsResponse = await api.get('/admin/stats');
            if (statsResponse.data.success) {
              setStats({
                totalMembers: statsResponse.data.stats.totalUsers || 0,
                activeBusinesses: statsResponse.data.stats.activeBusinesses || 0,
                exclusiveDeals: statsResponse.data.stats.totalDeals || 0,
                pendingApprovals: statsResponse.data.stats.pendingApprovals || 0
              });
            } else {
              throw new Error('Failed to fetch stats');
            }
          } else {
            throw new Error('Not authenticated');
          }
        } catch (error) {
          // Mock stats for public display
          setStats({
            totalMembers: 1250,
            activeBusinesses: 85,
            exclusiveDeals: 42,
            pendingApprovals: 8
          });
        }

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
      </section>      <section className="stats">
        <div className="stats-container">
          <div className="stats-header">
            <h2><i className="fas fa-chart-bar"></i> Community Statistics</h2>
            <p>Real-time insights into our growing community</p>
          </div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-users"></i>
              </div>
              <div className="stat-number">{stats.totalMembers || 0}</div>
              <div className="stat-label">Community Members</div>
              <div className="stat-description">Active registered members</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-store"></i>
              </div>
              <div className="stat-number">{stats.activeBusinesses || 0}</div>
              <div className="stat-label">Active Businesses</div>
              <div className="stat-description">Verified business partners</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-tags"></i>
              </div>
              <div className="stat-number">{stats.exclusiveDeals || 0}</div>
              <div className="stat-label">Exclusive Deals</div>
              <div className="stat-description">Member-only offers</div>
            </div>
            {isAuthenticated && (
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-clock"></i>
                </div>
                <div className="stat-number">{stats.pendingApprovals || 0}</div>
                <div className="stat-label">Pending Approvals</div>
                <div className="stat-description">Awaiting verification</div>
              </div>
            )}
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
          </div>        </div>
      </section>

      {adminSettings.features?.business_directory && businesses.length > 0 && (
        <section className="business-partners">
          <div className="business-container">
            <div className="business-header">
              <h2><i className="fas fa-handshake"></i> Our Business Partners</h2>
              <p>Discover Indian-owned businesses and services in Ghana</p>
            </div>
            <div className="business-grid">
              {businesses.slice(0, 6).map((business, index) => (
                <div key={business.id || index} className="business-card">
                  <div className="business-logo">
                    {business.logo ? (
                      <img src={business.logo} alt={business.businessName} />
                    ) : (
                      <div className="business-placeholder">
                        <i className="fas fa-store"></i>
                      </div>
                    )}
                  </div>
                  <div className="business-info">
                    <h3 className="business-name">{business.businessName || business.name}</h3>
                    <p className="business-category">{business.category || business.sector}</p>
                    <p className="business-description">{business.description?.substring(0, 100)}...</p>
                    <div className="business-contact">
                      {business.phone && (
                        <a href={`tel:${business.phone}`} className="contact-link">
                          <i className="fas fa-phone"></i>
                        </a>
                      )}
                      {business.email && (
                        <a href={`mailto:${business.email}`} className="contact-link">
                          <i className="fas fa-envelope"></i>
                        </a>
                      )}
                      {business.website && (
                        <a href={business.website} target="_blank" rel="noopener noreferrer" className="contact-link">
                          <i className="fas fa-globe"></i>
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="business-badge">
                    <i className="fas fa-certificate" title="Verified Partner"></i>
                  </div>
                </div>
              ))}
            </div>
            {businesses.length > 6 && (
              <div className="business-actions">
                <Link to="/directory" className="btn btn-outline">
                  <i className="fas fa-search"></i> View All Businesses
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

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
      </section>      <section className="terms-preview">
        <div className="terms-container">
          <div className="terms-header">
            <h2><i className="fas fa-gavel"></i> Terms and Conditions</h2>
            <p>Important information about membership and community guidelines</p>
          </div>
          <div className="terms-content">
            <div className="terms-text">
              <p>{adminSettings.content?.terms_conditions || 'By using this service, you agree to abide by all rules and regulations set forth by the Indians in Ghana community. Membership benefits are subject to change without prior notice.'}</p>
            </div>
            <div className="terms-actions">
              <Link to="/about" className="btn btn-outline">
                <i className="fas fa-file-contract"></i> Read Full Terms
              </Link>
              <Link to="/unified-registration" className="btn btn-primary">
                <i className="fas fa-check"></i> I Agree & Join
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;