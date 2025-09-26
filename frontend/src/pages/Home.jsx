import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useImageUrl, SmartImage, DefaultAvatar } from '../hooks/useImageUrl.jsx';
import { IndexablePage } from '../components/SEOHead';
import api from '../services/api';
import '../styles/global.css';
import '../styles/home.css';
import '../styles/membership-plans.css';
import '../styles/social-media-home.css';

const Home = () => {
  const { isAuthenticated } = useAuth();
  const { getMerchantLogoUrl } = useImageUrl();
  const location = useLocation();
  const [businesses, setBusinesses] = useState([]);
  const [stats, setStats] = useState({});
  const [adminSettings, setAdminSettings] = useState({
    content: { terms_conditions: '' },
    features: { show_statistics: true, business_directory: true }
  });
  const [loading, setLoading] = useState(true);
  const [showAuthNotification, setShowAuthNotification] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeFAQ, setActiveFAQ] = useState(null);
  
  // Helper to map membershipType to broad plan categories (mirrors MerchantDashboard logic)
  const getBusinessPlanCategory = (membershipType) => {
    if (!membershipType) return 'basic';
    const key = String(membershipType).toLowerCase();
    // Silver family -> premium
    if (['silver', 'silver_merchant', 'silver_business'].includes(key)) return 'premium';
    // Gold and higher families -> featured/Gold
    if (['gold', 'gold_merchant', 'gold_business'].includes(key)) return 'gold';
    // Premium plus / platinum_plus -> premium_plus
    if (['premium_plus', 'premium_plus_business', 'platinum_plus', 'platinum_plus_business'].includes(key)) return 'premium_plus';
    // Platinum and others -> featured
    if (['platinum', 'platinum_merchant', 'platinum_business'].includes(key)) return 'featured';
    return 'basic';
  };

  // Derive the set of premium partners to show on the home carousel (only platinum and platinum_plus)
  const premiumPartners = (Array.isArray(businesses) ? businesses : []).filter(b => {
    const membershipType = b.membershipLevel || b.membershipType || b.membership || '';
    const category = getBusinessPlanCategory(membershipType);
    // Only include platinum (featured) and premium_plus/platinum_plus plans
    return category === 'featured' || category === 'premium_plus';
  });
  
  // Helper function to parse social media data consistently
  const parseSocialMediaData = (platformData) => {
    if (!platformData || platformData === false || platformData === 'false') {
      return null;
    }
    
    // If it's already an object, return it
    if (typeof platformData === 'object' && platformData !== null) {
      return platformData;
    }
    
    // If it's a JSON string, try to parse it
    if (typeof platformData === 'string' && platformData.startsWith('{')) {
      try {
        return JSON.parse(platformData);
      } catch (e) {
        console.warn('Failed to parse social media data:', e);
        return null;
      }
    }
    
    return null;
  };

  // Normalize website URLs to ensure external links open correctly
  const normalizeWebsiteUrl = (url) => {
    if (!url) return '';
    let s = String(url).trim();
    // If already has protocol, return as-is
    if (/^https?:\/\//i.test(s)) return s;
    // Strip leading slashes so values like '/example.com' or '//example.com' become 'example.com'
    s = s.replace(/^\/+/, '');
    // Prepend https:// to open as an external link
    return 'https://' + s;
  };
  
  useEffect(() => {
    // Check if user was redirected from a protected route
    if (location.state && location.state.from) {
      setShowAuthNotification(true);
      // Hide notification after 5 seconds
      setTimeout(() => setShowAuthNotification(false), 5000);
    }
  }, [location]);

  // Carousel functionality
  const nextSlide = () => {
    if (premiumPartners.length > 0) {
      setCurrentSlide((prev) => (prev + 1) % premiumPartners.length);
    }
  };

  const prevSlide = () => {
    if (premiumPartners.length > 0) {
      setCurrentSlide((prev) => (prev - 1 + premiumPartners.length) % premiumPartners.length);
    }
  };

  // FAQ toggle function
  const toggleFAQ = (index) => {
    setActiveFAQ(activeFAQ === index ? null : index);
  };

  // Auto-scroll carousel
  useEffect(() => {
    if (premiumPartners.length > 0) {
      const interval = setInterval(nextSlide, 5000);
      return () => clearInterval(interval);
    }
  }, [premiumPartners.length]);

  // Add click handlers to carousel buttons
  useEffect(() => {
    const addCarouselListeners = () => {
      const nextBtn = document.querySelector('.next-btn');
      const prevBtn = document.querySelector('.prev-btn');
      
      if (nextBtn && prevBtn) {
        nextBtn.addEventListener('click', nextSlide);
        prevBtn.addEventListener('click', prevSlide);
        
        return () => {
          nextBtn.removeEventListener('click', nextSlide);
          prevBtn.removeEventListener('click', prevSlide);
        };
      }
    };

    const cleanup = addCarouselListeners();
    return cleanup;
  }, [premiumPartners.length]);

  useEffect(() => {
    const fetchWithTimeout = (promise, ms = 5000) => {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
      return Promise.race([promise, timeout]);
    };

    const fetchData = async () => {
      try {
        setLoading(true);

        // Priority 1: Critical above-the-fold data (businesses for hero/carousel)
        const criticalData = await Promise.allSettled([
          fetchWithTimeout(api.get('/businesses'), 3000), // Faster timeout for critical data
          fetchWithTimeout(api.get('/admin/settings/public'), 3000)
        ]);

        // Process critical data immediately
        if (criticalData[0].status === 'fulfilled') {
          const businessData = criticalData[0].value?.data;
          const businessArray = Array.isArray(businessData) ? businessData : [];
          setBusinesses(businessArray);
          console.log('✅ Critical: Fetched', businessArray.length, 'businesses');
        } else {
          console.warn('Critical businesses fetch failed:', criticalData[0].reason);
          setBusinesses([]); // fail gracefully
        }

        if (criticalData[1].status === 'fulfilled' && criticalData[1].value.data?.success) {
          const settingsData = criticalData[1].value.data.settings || {};
          setAdminSettings({
            content: settingsData.content || { terms_conditions: '' },
            features: settingsData.features || { show_statistics: true, business_directory: true },
            ...settingsData
          });
          console.log('✅ Critical: Admin settings loaded');
        } else {
          console.log('Using default admin settings (public settings failed or absent)');
          // Ensure default settings are always set
          setAdminSettings({
            content: { terms_conditions: '' },
            features: { show_statistics: true, business_directory: true }
          });
        }

        // Show initial content immediately
        setLoading(false);

        // Priority 2: Non-critical below-the-fold data (stats) - schedule after first paint
        requestIdleCallback(() => {
          fetchStatsAsync();
        }, { timeout: 1000 });

      } catch (error) {
        console.error('Critical data fetch failed:', error);
        setLoading(false);
      }
    };

    const fetchStatsAsync = async () => {
      try {
        if (isAuthenticated) {
          // try admin stats but with short timeout
          try {
            const adminStats = await fetchWithTimeout(api.get('/admin/stats'), 3000);
            if (adminStats.data?.success) {
              setStats({
                totalMembers: adminStats.data.stats.totalUsers || 0,
                activeBusinesses: adminStats.data.stats.activeBusinesses || 0, // Only approved merchants
                exclusiveDeals: adminStats.data.stats.totalDeals || 0,
                totalRedemptions: adminStats.data.stats.totalRedemptions || 0,
                pendingApprovals: adminStats.data.stats.pendingApprovals || 0
              });
              return;
            }
          } catch (e) {
            console.log('Admin stats failed or timed out, falling back to public stats');
          }
        }

        // Public stats fallback (also with a modest timeout)
        const publicStats = await fetchWithTimeout(api.get('/deals/home-stats'), 4000);
        if (publicStats.data?.success) {
          setStats({
            totalMembers: publicStats.data.stats.totalMembers || 0,
            // Use activeBusinesses if available, otherwise fallback to totalBusinesses
            activeBusinesses: publicStats.data.stats.activeBusinesses ?? publicStats.data.stats.totalBusinesses ?? 0,
            exclusiveDeals: publicStats.data.stats.totalDeals || 0,
            totalRedemptions: publicStats.data.stats.totalRedemptions || 0,
            pendingApprovals: 0
          });
        }
      } catch (err) {
        console.error('Stats fetch failed:', err);
        // Set default stats if all fail
        setStats({
          totalMembers: 0,
          activeBusinesses: 0,
          exclusiveDeals: 0,
          totalRedemptions: 0,
          pendingApprovals: 0
        });
      }
    };

    fetchData();
  }, [isAuthenticated]);

  const groupedBusinesses = (Array.isArray(businesses) ? businesses : []).reduce((acc, business) => {
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
          <h2 className="home-hero-subheading">Membership Program</h2>
          <p>Connecting the Indian community in Ghana through membership, business opportunities, and exclusive benefits.</p>
          {!isAuthenticated && (
            <div className="hero-actions">
              <Link to="/unified-registration" className="btn btn-primary">
                <i className="fas fa-user-plus"></i> Join Now
              </Link>
              <Link to="/login" className="btn btn-primary">
                <i className="fas fa-sign-in-alt"></i> Login
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Social Media Section */}
      {(() => {
  const showSocialHome = adminSettings.features?.show_social_media_home === true;
  const hasSocialPlatforms = Object.keys(adminSettings.socialMediaRequirements || {}).length > 0;
        console.log('🔍 Social Media:', {
          showSocialHome,
          hasSocialPlatforms,
          shouldShow: showSocialHome && hasSocialPlatforms
        });
  return showSocialHome && hasSocialPlatforms;
      })() && (
        <section className="social-media-home">
          <div className="social-container">
            <div className="social-header">
              <h2>{adminSettings.socialMediaRequirements?.home_section_title || 'Join Our Community'}</h2>
              <p>{adminSettings.socialMediaRequirements?.home_section_subtitle || 'Stay connected with the Indians in Ghana community through our social channels'}</p>
            </div>
            <div className="social-grid">
              {(() => {
                const whatsappData = parseSocialMediaData(adminSettings.socialMediaRequirements?.whatsapp_channel);
                return whatsappData && (
                  <div className="social-card">
                    <div className="social-icon">
                      <i className="fab fa-whatsapp"></i>
                    </div>
                    <h3>{whatsappData.display?.name || 'WhatsApp Channel'}</h3>
                    <p>{whatsappData.display?.description || 'Get official updates and announcements'}</p>
                    <a 
                      href={whatsappData.url || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn btn-primary"
                    >
                      <i className="fab fa-whatsapp"></i> {whatsappData.display?.button || 'Join Channel'}
                    </a>
                  </div>
                );
              })()}
              
              {(() => {
                const facebookData = parseSocialMediaData(adminSettings.socialMediaRequirements?.facebook);
                return facebookData && (
                  <div className="social-card">
                    <div className="social-icon">
                      <i className="fab fa-facebook-f"></i>
                    </div>
                    <h3>{facebookData.display?.name || 'Facebook'}</h3>
                    <p>{facebookData.display?.description || 'Follow us for community updates and events'}</p>
                    <a 
                      href={facebookData.url || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn btn-primary"
                    >
                      <i className="fab fa-facebook-f"></i> {facebookData.display?.button || 'Like & Follow'}
                    </a>
                  </div>
                );
              })()}
              
              {(() => {
                const instagramData = parseSocialMediaData(adminSettings.socialMediaRequirements?.instagram);
                return instagramData && (
                  <div className="social-card">
                    <div className="social-icon">
                      <i className="fab fa-instagram"></i>
                    </div>
                    <h3>{instagramData.display?.name || 'Instagram'}</h3>
                    <p>{instagramData.display?.description || 'See photos and stories from our community'}</p>
                    <a 
                      href={instagramData.url || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn btn-primary"
                    >
                      <i className="fab fa-instagram"></i> {instagramData.display?.button || 'Follow Us'}
                    </a>
                  </div>
                );
              })()}
              
              {(() => {
                const youtubeData = parseSocialMediaData(adminSettings.socialMediaRequirements?.youtube);
                return youtubeData && (
                  <div className="social-card">
                    <div className="social-icon">
                      <i className="fab fa-youtube"></i>
                    </div>
                    <h3>{youtubeData.display?.name || 'YouTube'}</h3>
                    <p>{youtubeData.display?.description || 'Watch our community events and tutorials'}</p>
                    <a 
                      href={youtubeData.url || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn btn-primary"
                    >
                      <i className="fab fa-youtube"></i> {youtubeData.display?.button || 'Subscribe Now'}
                    </a>
                  </div>
                );
              })()}
            </div>
          </div>
        </section>
      )}

      {/* Why Join Our Community section (features) */}
      <section className="features">
        <div className="features-header">
          <h2>Indians In Ghana Membership Card Program</h2>
          <p>Key Facts & Benefits of Indians In Ghana Membership Card</p>
        </div>
        <div className="features-container">
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-id-card"></i>
              </div>
              <h3 className="feature-title">Digital Membership Card</h3>
              <p className="feature-description">With over 5,000 cards to be issued, this initiative unites the Indian community under one trusted and rewarding network.</p>
              <a href="/unified-registration" className="feature-link">Get Your Card <i className="fas fa-arrow-right"></i></a>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-users"></i>
              </div>
              <h3 className="feature-title">1,000+ Exclusive Offers & Deals Will Be Listed</h3>
              <p className="feature-description">Over 1,000 exclusive offers and curated deals will be listed, providing meaningful value and everyday savings for our Indian community in Ghana.</p>
              <a href="/deals" className="feature-link">View Deals <i className="fas fa-arrow-right"></i></a>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-gift"></i>
              </div>
              <h3 className="feature-title">100+ Trusted Partner Businesses Will Be Onboard</h3>
              <p className="feature-description">We're partnering with 100+ respected brands to provide exclusive privileges to our Indian community in Ghana.</p>
              <a href="/business-directory" className="feature-link">Explore Business <i className="fas fa-arrow-right"></i></a>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-industry"></i>
              </div>
              <h3 className="feature-title">25+ Major Sectors Will Be Covered</h3>
              <p className="feature-description">Over 25 major sectors will be covered, ensuring members enjoy benefits across every essential area of life</p>
              <a href="/business-directory" className="feature-link">Explore Sectors <i className="fas fa-arrow-right"></i></a>
            </div>
          </div>
        </div>
      </section>

      {/* Move the CTA (Why Join Our Community) section here, right after hero */}


      {adminSettings.features?.business_directory && premiumPartners.length > 0 && (
        <section className="business-partners">
          <div className="business-partners-container">
            <div className="business-partners-header">
              <h2> Our Premium Partners</h2>
              <p>Discover Indian-owned businesses and services in Ghana</p>
            </div>
            <div className="business-carousel-container">
              <div className="business-carousel">
                <div 
                  className="business-carousel-track"
                  style={{
                    transform: `translateX(-${currentSlide * 320}px)`,
                    transition: 'transform 0.5s ease-in-out'
                  }}
                >
                  {[...premiumPartners, ...premiumPartners].map((business, index) => (
                    <div key={`${business.id || index}-${index}`} className="business-carousel-card">
                      <div className="business-carousel-logo">
                        <SmartImage
                          src={getMerchantLogoUrl(business)}
                          alt={`${business.businessName || business.name} logo`}
                          fallback={<DefaultAvatar name={business.businessName || business.name} />}
                          maxRetries={3}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: 'center'
                          }}
                        />
                      </div>
                      <div className="business-carousel-info">
                        <h3 className="business-carousel-name">{business.businessName || business.name}</h3>
                        <p className="business-carousel-category">{business.category || business.sector}</p>
                        <p className="business-carousel-description">{business.description?.substring(0, 80)}...</p>
                        <div className="business-carousel-contact">
                          {business.phone && (
                            <a href={`tel:${business.phone}`} className="carousel-contact-link">
                              <i className="fas fa-phone"></i>
                            </a>
                          )}
                          {business.email && (
                            <a href={`mailto:${business.email}`} className="carousel-contact-link">
                              <i className="fas fa-envelope"></i>
                            </a>
                          )}
                          {business.website && (
                            <a href={normalizeWebsiteUrl(business.website)} target="_blank" rel="noopener noreferrer" className="carousel-contact-link">
                              <i className="fas fa-globe"></i>
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="business-carousel-badge">
                        <i className="fas fa-certificate" title="Verified Partner"></i>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="business-partners-actions">
              <Link to="/business-directory" className="btn btn-outline">
                <i className="fas fa-search"></i> View All Businesses
              </Link>
            </div>
          </div>
        </section>
      )}


      {/* Why Get Your Membership Card Section */}
      <section className="why-section">
        <div className="why-container">
          <div className="features-header">
            <h2>Why Get Your Membership Card?</h2>
            <p>Discover the exclusive benefits and privileges that come with your Indians in Ghana membership</p>
          </div>
          
          <div className="cards-grid">
            <div className="card benefit-card">
              <div className="card-icon">
                <i className="fas fa-money-bill-wave benefit-icon"></i>
              </div>
              <h3 className="card-title">Exclusive Discounts</h3>
              <p className="card-desc">Enjoy significant savings at over 100 partner businesses across Ghana with exclusive member-only discounts.</p>
            </div>
            
            <div className="card benefit-card">
              <div className="card-icon">
                <i className="fas fa-users benefit-icon"></i>
              </div>
              <h3 className="card-title">Community Support</h3>
              <p className="card-desc">Access our network of support services including legal assistance, medical referrals, and cultural integration programs.</p>
            </div>
            
            <div className="card benefit-card">
              <div className="card-icon">
                <i className="fas fa-calendar-alt benefit-icon"></i>
              </div>
              <h3 className="card-title">Priority Event Access</h3>
              <p className="card-desc">Get VIP access and early bird pricing for cultural festivals, networking events, and community gatherings.</p>
            </div>
            
            <div className="card benefit-card">
              <div className="card-icon">
                <i className="fas fa-shield-alt benefit-icon"></i>
              </div>
              <h3 className="card-title">Identity & Security</h3>
              <p className="card-desc">A recognized form of identity within the Indian community in Ghana, with emergency support services.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Partner Business Testimonials */}
      <section className="partner-testimonials">
        <div className="partner-testimonials-container">
          <div className="partner-testimonials-header">
            <h2>What Our Partner Businesses Say</h2>
            <p>Hear from businesses that are proud to support the Indian community in Ghana</p>
          </div>
          <div className="partner-testimonials-grid">
            <div className="partner-testimonial-card">
              <div className="testimonial-quote-icon">
                <i className="fas fa-quote-left"></i>
              </div>
              <p className="partner-testimonial-content">
                "Partnering with Indians in Ghana has transformed our business. The loyalty and support from the community have been incredible. We're proud to offer exclusive benefits to members."
              </p>
              <div className="partner-testimonial-author">
                <div className="partner-author-avatar">D</div>
                <div className="partner-author-info">
                  <span className="partner-author-name">Mr. Dheeraj</span>
                  <span className="partner-author-role">Owner, Fly Dreams Travel</span>
                </div>
              </div>
            </div>
            
            <div className="partner-testimonial-card">
              <div className="testimonial-quote-icon">
                <i className="fas fa-quote-left"></i>
              </div>
              <p className="partner-testimonial-content">
                "This membership program is a game-changer for businesses serving the Indian community. It's helped us connect with our customers on a deeper level while growing our business."
              </p>
              <div className="partner-testimonial-author">
                <div className="partner-author-avatar">R</div>
                <div className="partner-author-info">
                  <span className="partner-author-name">Mr. Rajendra</span>
                  <span className="partner-author-role">Director, Alma Medical Laboratories</span>
                </div>
              </div>
            </div>
            
            <div className="partner-testimonial-card">
              <div className="testimonial-quote-icon">
                <i className="fas fa-quote-left"></i>
              </div>
              <p className="partner-testimonial-content">
                "As a dental practice with Indian-trained specialists, this program has been invaluable. The community support and networking opportunities have exceeded our expectations."
              </p>
              <div className="partner-testimonial-author">
                <div className="partner-author-avatar">S</div>
                <div className="partner-author-info">
                  <span className="partner-author-name">Dr. Shumaila</span>
                  <span className="partner-author-role">Jacob Dental Centre</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Community Member Testimonials */}
      <section className="community-testimonials">
        <div className="community-testimonials-container">
          <div className="community-testimonials-header">
            <h2> What Our Community Members Say</h2>
            <p>Hear from fellow Indians in Ghana about their membership experience</p>
          </div>
          <div className="community-testimonials-grid">
            <div className="community-testimonial-card">
              <div className="testimonial-quote-icon">
                <i className="fas fa-quote-left"></i>
              </div>
              <p className="community-testimonial-content">
                "The membership card has been invaluable! The discounts alone have saved me more than the cost of membership. But beyond savings, it's connected me to a supportive community."
              </p>
              <div className="community-testimonial-author">
                <div className="community-author-avatar">V</div>
                <div className="community-author-info">
                  <span className="community-author-name">Vikram Patel</span>
                  <span className="community-author-role">Business Owner, Accra</span>
                </div>
              </div>
            </div>
            
            <div className="community-testimonial-card">
              <div className="testimonial-quote-icon">
                <i className="fas fa-quote-left"></i>
              </div>
              <p className="community-testimonial-content">
                "As a newcomer to Ghana, this membership helped me settle in. From finding authentic groceries to connecting with cultural events, it's been my essential guide to Indian life in Ghana."
              </p>
              <div className="community-testimonial-author">
                <div className="community-author-avatar">P</div>
                <div className="community-author-info">
                  <span className="community-author-name">Priyanka Sharma</span>
                  <span className="community-author-role">Marketing Professional, Kumasi</span>
                </div>
              </div>
            </div>
            
            <div className="community-testimonial-card">
              <div className="testimonial-quote-icon">
                <i className="fas fa-quote-left"></i>
              </div>
              <p className="community-testimonial-content">
                "I've made more connections through this program in 3 months than in 3 years living in Ghana. The networking events and business directory have transformed my professional life here."
              </p>
              <div className="community-testimonial-author">
                <div className="community-author-avatar">S</div>
                <div className="community-author-info">
                  <span className="community-author-name">Sunita Reddy</span>
                  <span className="community-author-role">Entrepreneur, Takoradi</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq">
        <div className="faq-container">
          <div className="faq-header">
            <h2><i className="fas fa-question-circle"></i> Frequently Asked Questions</h2>
            <p>Find answers to common questions about our membership program</p>
          </div>
          <div className="faq-content">
            <div className="faq-item">
              <div 
                className="faq-question" 
                onClick={() => toggleFAQ(0)}
              >
                What is the cost of the membership card?
                <i className={`fas fa-chevron-down ${activeFAQ === 0 ? 'active' : ''}`}></i>
              </div>
              <div className={`faq-answer ${activeFAQ === 0 ? 'active' : ''}`}>
                <p>As part of our launch initiative, this premium membership card is offered free of charge to every individual who completes the registration process.</p>
                <p><strong>Need a Physical Membership Card?</strong></p>
                <p>Your digital card is always available when you log in.</p>
                <p>But if you'd like a physical card, we can print and prepare one for you.</p>
                <p><strong>Cost:</strong> GHS 100 (covers printing and admin fee)</p>
                <p><strong>Delivery:</strong> Postage charges are separate and depend on your location</p>
              </div>
            </div>

            <div className="faq-item">
              <div 
                className="faq-question" 
                onClick={() => toggleFAQ(1)}
              >
                How long does it take to receive my membership card?
                <i className={`fas fa-chevron-down ${activeFAQ === 1 ? 'active' : ''}`}></i>
              </div>
              <div className={`faq-answer ${activeFAQ === 1 ? 'active' : ''}`}>
                <p>After submitting your registration form, your details will undergo a verification process, including confirmation of form accuracy and validation of your linked social media account(s).</p>
                <p>Once verified, your digital membership ID will be activated within 1–2 business days.</p>
              </div>
            </div>

            <div className="faq-item">
              <div 
                className="faq-question" 
                onClick={() => toggleFAQ(2)}
              >
                Can I use the membership benefits immediately after pre-booking?
                <i className={`fas fa-chevron-down ${activeFAQ === 2 ? 'active' : ''}`}></i>
              </div>
              <div className={`faq-answer ${activeFAQ === 2 ? 'active' : ''}`}>
                <p>Yes! Once you complete your registration, your details will be verified, typically within 1–2 business days.</p>
                <p>After successful verification, your digital membership ID will be issued and ready for immediate use at all our registered partner businesses.</p>
              </div>
            </div>

            <div className="faq-item">
              <div 
                className="faq-question" 
                onClick={() => toggleFAQ(3)}
              >
                Are there any age restrictions for membership?
                <i className={`fas fa-chevron-down ${activeFAQ === 3 ? 'active' : ''}`}></i>
              </div>
              <div className={`faq-answer ${activeFAQ === 3 ? 'active' : ''}`}>
                <p>Membership is open to all individuals of Indian origin residing in Ghana.</p>
                <p>While we welcome members of all ages, membership cards are typically issued to individuals aged 18 and above who hold valid Ghanaian residential permits.</p>
                <p><strong>Please note:</strong> Short-term visitors and tourists are not eligible for membership at this time.</p>
              </div>
            </div>

            <div className="faq-item">
              <div 
                className="faq-question" 
                onClick={() => toggleFAQ(4)}
              >
                What happens if I lose my membership card?
                <i className={`fas fa-chevron-down ${activeFAQ === 4 ? 'active' : ''}`}></i>
              </div>
              <div className={`faq-answer ${activeFAQ === 4 ? 'active' : ''}`}>
                <p>As our membership card is digital-first, there's no risk of permanently losing access.</p>
                <p>If misplaced, simply log in to your account to retrieve your digital ID anytime.</p>
                <p>If you suspect that your membership card is being used without your permission, you can log in to your account and delete it immediately for your safety.</p>
              </div>
            </div>

            <div className="faq-item">
              <div 
                className="faq-question" 
                onClick={() => toggleFAQ(5)}
              >
                How do businesses become partners in this program?
                <i className={`fas fa-chevron-down ${activeFAQ === 5 ? 'active' : ''}`}></i>
              </div>
              <div className={`faq-answer ${activeFAQ === 5 ? 'active' : ''}`}>
                <p>Businesses interested in partnering with us can apply through our website or contact our business development team. We evaluate businesses based on their relevance to the community, quality of service, and the value they can offer our members.</p>
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
            <Link to="/unified-registration" className="btn btn-primary-join">
              <i className="fas fa-user-plus"></i> Join Now
            </Link>
            <Link to="/login" className="btn-secondary-join">
              <i className="fas fa-sign-in-alt"></i> Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Community Associations Section */}
      <section className="community-section">
        <div className="community-section-container">
          <div className="community-section-header">
            <h2>Our Community Associations</h2>
            <p>Representing the diversity and unity of Indians in Ghana</p>
          </div>
          
          <div className="communities-container">
            {/* Big Bengalies in Ghana */}
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2025/07/Big-Bengalis-in-Ghana-Logo.jpg" alt="Big Bengalies in Ghana" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">Big Bengalies in Ghana</h3>
            </div>
            
            {/* Bhojpuri Association of Ghana */}
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2024/10/Bhojpuri-Logo.jpg" alt="Bhojpuri Association of Ghana" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">Bhojpuri Association of Ghana</h3>
            </div>
            
            {/* Ghana Indian Malayalee Association */}
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2024/10/GIMA-Logo.jpg" alt="Ghana Indian Malayalee Association" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">Ghana Indian Malayalee Association</h3>
            </div>
            
            {/* Ghana Tamil Association */}
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2024/10/GTA-Logo-671d149a82a14.jpg" alt="Ghana Tamil Association" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">Ghana Tamil Association</h3>
            </div>
            
            {/* Gujarati Association of Ghana */}
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2024/10/Gujarati-Association-of-Ghana-Logo.jpg" alt="Gujarati Association of Ghana" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">Gujarati Association of Ghana</h3>
            </div>
            
            {/* Hindu Swayamsevak Sangh */}
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2025/06/Hindu-Swayamsevak-Sangh-HSS-Logo.jpg" alt="Hindu Swayamsevak Sangh" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">Hindu Swayamsevak Sangh</h3>
            </div>
            
            {/* Indian Association of Ghana */}
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2024/10/IAG-Logo.jpg" alt="Indian Association of Ghana" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">Indian Association of Ghana</h3>
            </div>
            
            {/* Indian Telugu Association of Ghana */}
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2024/10/iTAG-Logo.jpg" alt="Indian Telugu Association of Ghana" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">Indian Telugu Association of Ghana</h3>
            </div>
            
            {/* Indian Women's Association */}
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2024/10/Indian-Womens-Accociation-Accra.jpeg" alt="Indian Women's Association" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">Indian Women's Association</h3>
            </div>
            
            {/* Karnataka Sangha Ghana */}
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2024/10/Karnataka-Sangha-Ghana.jpg" alt="Karnataka Sangha Ghana" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">Karnataka Sangha Ghana</h3>
            </div>
            
            {/* Kumasi Indian Association */}
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2024/10/KIA-Logo.png" alt="Kumasi Indian Association" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">Kumasi Indian Association</h3>
            </div>
            
            {/* Maharashtra Mandal Ghana */}
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2024/10/WhatsApp-Image-2024-06-06-at-12.10.49_33fd33d7.jpg" alt="Maharashtra Mandal Ghana" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">Maharashtra Mandal Ghana</h3>
            </div>
            
            {/* Punjabi Association of Ghana */}
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2024/10/Punjabi-Association-of-Ghana-Logo-1.jpg" alt="Punjabi Association of Ghana" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">Punjabi Association of Ghana</h3>
            </div>
            
            {/* Rajasthan Association of Ghana */}
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2025/07/Rajasthan-Association-Logo.jpg" alt="Rajasthan Association of Ghana" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">Rajasthan Association of Ghana</h3>
            </div>
            
            {/* Sindhi Association of Ghana */}
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2025/07/SAG_Logo1.jpg" alt="Sindhi Association of Ghana" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">Sindhi Association of Ghana</h3>
            </div>
            
            {/* Utkala Ghana Association */}
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2024/10/Utkala-Association-of-Ghana-Logo.jpg" alt="Utkala Ghana Association" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">Utkala Ghana Association</h3>
            </div>
            
            {/* Uttarakhand Association of Ghana */}
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2025/06/Uttarakhand-Association-of-Ghana-Logo.jpg" alt="Uttarakhand Association of Ghana" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">Uttarakhand Association of Ghana</h3>
            </div>
            
            {/* World Malayalee Federation */}
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2024/10/0i1hnewV_400x400.jpg" alt="World Malayalee Federation" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">World Malayalee Federation</h3>
            </div>
            
            {/* Duplicates for continuous scrolling */}
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2025/07/Big-Bengalis-in-Ghana-Logo.jpg" alt="Big Bengalies in Ghana" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">Big Bengalies in Ghana</h3>
            </div>
            
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2024/10/Bhojpuri-Logo.jpg" alt="Bhojpuri Association of Ghana" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">Bhojpuri Association of Ghana</h3>
            </div>
            
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2024/10/GIMA-Logo.jpg" alt="Ghana Indian Malayalee Association" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">Ghana Indian Malayalee Association</h3>
            </div>
            
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2024/10/GTA-Logo-671d149a82a14.jpg" alt="Ghana Tamil Association" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">Ghana Tamil Association</h3>
            </div>
            
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2024/10/Gujarati-Association-of-Ghana-Logo.jpg" alt="Gujarati Association of Ghana" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">Gujarati Association of Ghana</h3>
            </div>
            
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2025/06/Hindu-Swayamsevak-Sangh-HSS-Logo.jpg" alt="Hindu Swayamsevak Sangh" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">Hindu Swayamsevak Sangh</h3>
            </div>
            
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2024/10/IAG-Logo.jpg" alt="Indian Association of Ghana" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">Indian Association of Ghana</h3>
            </div>
            
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2024/10/iTAG-Logo.jpg" alt="Indian Telugu Association of Ghana" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">Indian Telugu Association of Ghana</h3>
            </div>
            
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2024/10/Indian-Womens-Accociation-Accra.jpeg" alt="Indian Women's Association" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">Indian Women's Association</h3>
            </div>
            
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2024/10/Karnataka-Sangha-Ghana.jpg" alt="Karnataka Sangha Ghana" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">Karnataka Sangha Ghana</h3>
            </div>
            
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2024/10/KIA-Logo.png" alt="Kumasi Indian Association" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">Kumasi Indian Association</h3>
            </div>
            
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2024/10/WhatsApp-Image-2024-06-06-at-12.10.49_33fd33d7.jpg" alt="Maharashtra Mandal Ghana" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">Maharashtra Mandal Ghana</h3>
            </div>
            
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2024/10/Punjabi-Association-of-Ghana-Logo-1.jpg" alt="Punjabi Association of Ghana" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">Punjabi Association of Ghana</h3>
            </div>
            
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2025/07/Rajasthan-Association-Logo.jpg" alt="Rajasthan Association of Ghana" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">Rajasthan Association of Ghana</h3>
            </div>
            
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2025/07/SAG_Logo1.jpg" alt="Sindhi Association of Ghana" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">Sindhi Association of Ghana</h3>
            </div>
            
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2024/10/Utkala-Association-of-Ghana-Logo.jpg" alt="Utkala Ghana Association" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">Utkala Ghana Association</h3>
            </div>
            
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2025/06/Uttarakhand-Association-of-Ghana-Logo.jpg" alt="Uttarakhand Association of Ghana" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">Uttarakhand Association of Ghana</h3>
            </div>
            
            <div className="community-card">
              <img src="https://indiansinghana.com/wp-content/uploads/2024/10/0i1hnewV_400x400.jpg" alt="World Malayalee Federation" className="community-logo" width="120" height="120" loading="lazy" />
              <h3 className="community-name">World Malayalee Federation</h3>
            </div>
          </div>
        </div>
      </section>

      {/* Community Statistics Section */}
      {adminSettings.features?.show_community_statistics !== false && (
        <section className="stats">
          <div className="stats-container">
            <div className="stats-header">
              <h2> Membership Program Statistics</h2>
              <p>Real-time insights into our growing community</p>
            </div>
            <div className="stats-grid">
              {(adminSettings.features?.show_community_members !== false) && (
                <div className="stat-card">
                  <div className="stat-icon">
                    <i className="fas fa-users"></i>
                  </div>
                  <div className="stat-number">{stats.totalMembers || 0}</div>
                  <div className="stat-description">Active registered members</div>
                </div>
              )}
              {(adminSettings.features?.show_active_businesses !== false) && (
                <div className="stat-card">
                  <div className="stat-icon">
                    <i className="fas fa-store"></i>
                  </div>
                  <div className="stat-number">{stats.activeBusinesses || 0}</div>
                  <div className="stat-description">Verified business partners</div>
                </div>
              )}
              {(adminSettings.features?.show_exclusive_deals !== false) && (
                <div className="stat-card">
                  <div className="stat-icon">
                    <i className="fas fa-tags"></i>
                  </div>
                  <div className="stat-number">{stats.exclusiveDeals || 0}</div>
                  <div className="stat-description">Exclusive Member-only offers</div>
                </div>
              )}
              {(adminSettings.features?.show_total_redemptions !== false) && (
                <div className="stat-card">
                  <div className="stat-icon">
                    <i className="fas fa-receipt"></i>
                  </div>
                  <div className="stat-number">{stats.totalRedemptions || 0}</div>
                  <div className="stat-description">All-time redemption requests</div>
                </div>
              )}
             </div>
           </div>
         </section>
      )}

      {/* SEO Meta Tags */}
      <IndexablePage 
        title="Indians in Ghana - Connect, Thrive, Belong"
        description="Join Ghana's premier Indian community network. Access exclusive deals, connect with local businesses, and be part of a thriving community of Indians living in Ghana."
        keywords="Indians in Ghana, Indian community Ghana, Indian business directory Ghana, exclusive deals Ghana, Indian expats Ghana"
        canonicalUrl="https://membership.indiansinghana.com"
      />

      {/* ...footer is rendered after this in the layout... */}
    </div>
  );
};

export default Home;