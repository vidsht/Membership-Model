import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import '../styles/global.css';
import '../styles/home.css';
import '../styles/membership-plans.css';
import '../styles/social-media-home.css';

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
        setBusinesses(businessResponse.data);        // Fetch public admin settings
        try {
          const settingsResponse = await api.get('/admin/settings/public');
          if (settingsResponse.data.success) {
            console.log('✅ Admin settings received:', settingsResponse.data.settings);
            console.log('📱 Social media requirements:', settingsResponse.data.settings.socialMediaRequirements);
            console.log('🎛️ Features:', settingsResponse.data.settings.features);
            setAdminSettings(settingsResponse.data.settings);
          }
        } catch (error) {
          // Use default settings if admin settings not accessible
          console.log('❌ Admin settings error:', error);
          console.log('Using default settings');
        }// Fetch real stats - use admin endpoint for authenticated users, public endpoint for everyone else
        try {
          let statsResponse;
          if (isAuthenticated) {
            // For authenticated users, try admin stats first
            try {
              statsResponse = await api.get('/admin/stats');
              if (statsResponse.data.success) {
                setStats({
                  totalMembers: statsResponse.data.stats.totalUsers || 0,
                  activeBusinesses: statsResponse.data.stats.activeBusinesses || 0,
                  exclusiveDeals: statsResponse.data.stats.totalDeals || 0,
                  pendingApprovals: statsResponse.data.stats.pendingApprovals || 0
                });
              } else {
                throw new Error('Admin stats failed');
              }
            } catch (adminError) {
              // Fallback to public stats if admin stats fail
              console.log('Admin stats failed, using public stats');
              statsResponse = await api.get('/deals/home-stats');
              if (statsResponse.data.success) {
                setStats({
                  totalMembers: statsResponse.data.stats.totalMembers || 0,
                  activeBusinesses: statsResponse.data.stats.totalBusinesses || 0,
                  exclusiveDeals: statsResponse.data.stats.totalDeals || 0,
                  pendingApprovals: 0 // Not available in public stats
                });
              }
            }
          } else {
            // For public users, use the public home stats endpoint
            statsResponse = await api.get('/deals/home-stats');
            if (statsResponse.data.success) {
              setStats({
                totalMembers: statsResponse.data.stats.totalMembers || 0,
                activeBusinesses: statsResponse.data.stats.totalBusinesses || 0,
                exclusiveDeals: statsResponse.data.stats.totalDeals || 0,
                pendingApprovals: 0 // Not available in public stats
              });
            } else {
              throw new Error('Failed to fetch public stats');
            }
          }
        } catch (error) {
          console.error('Error fetching stats:', error);
          // Fallback to minimal default stats only if all endpoints fail
          setStats({
            totalMembers: 0,
            activeBusinesses: 0,
            exclusiveDeals: 0,
            pendingApprovals: 0
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
              <Link to="/unified-registration" className="btn btn-primary">
                <i className="fas fa-user-plus"></i> Join Now
              </Link>
              <Link to="/login" className="btn btn-secondary">
                <i className="fas fa-sign-in-alt"></i> Login
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Why Join Our Community section (features) */}
      <section className="features">
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
          </div>
        </div>
      </section>

      {/* Move the CTA (Why Join Our Community) section here, right after hero */}


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
                <Link to="/business-directory" className="btn btn-outline">
                  <i className="fas fa-search"></i> View All Businesses
                </Link>
              </div>
            )}
          </div>
        </section>
      )}



      
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
      </section>        {/* Social Media Section */}
      {(() => {
        const showSocialHome = adminSettings.features?.show_social_media_home !== false;
        const hasSocialPlatforms = Object.keys(adminSettings.socialMediaRequirements || {}).length > 0;
        console.log('🔍 Social Media Debug:', {
          showSocialHome,
          hasSocialPlatforms,
          features: adminSettings.features,
          socialMediaRequirements: adminSettings.socialMediaRequirements,
          shouldShow: showSocialHome && hasSocialPlatforms
        });
        return showSocialHome && hasSocialPlatforms;
      })() && (
        <section className="social-media-section">
          <div className="social-media-banner">
            {adminSettings.socialMediaRequirements?.whatsapp_channel && (
              <a
                className="social-media-box"
                href={adminSettings.socialMediaRequirements.whatsapp_channel.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp Channel"
              >
                <i className="fab fa-whatsapp"></i>
                <span>{adminSettings.socialMediaRequirements.whatsapp_channel.display?.name || 'WhatsApp'}</span>
              </a>
            )}
            {adminSettings.socialMediaRequirements?.facebook && (
              <a
                className="social-media-box"
                href={adminSettings.socialMediaRequirements.facebook.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
              >
                <i className="fab fa-facebook-f"></i>
                <span>{adminSettings.socialMediaRequirements.facebook.display?.name || 'Facebook'}</span>
              </a>
            )}
            {adminSettings.socialMediaRequirements?.instagram && (
              <a
                className="social-media-box"
                href={adminSettings.socialMediaRequirements.instagram.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
              >
                <i className="fab fa-instagram"></i>
                <span>{adminSettings.socialMediaRequirements.instagram.display?.name || 'Instagram'}</span>
              </a>
            )}
            {adminSettings.socialMediaRequirements?.youtube && (
              <a
                className="social-media-box"
                href={adminSettings.socialMediaRequirements.youtube.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
              >
                <i className="fab fa-youtube"></i>
                <span>{adminSettings.socialMediaRequirements.youtube.display?.name || 'YouTube'}</span>
              </a>
            )}
          </div>
        </section>
      )}

      <section className="terms-preview">
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

      <section className="stats">
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

      {/* ...footer is rendered after this in the layout... */}
    </div>
  );
};

export default Home;