import React from 'react';
import '../styles/about.css';
import '../styles/membership-plans.css';

const About = () => {  return (
    <div className="about-page">
      {/* Hero Banner with Images */}
      <div className="about-hero">
        <div className="hero-image-grid">
          {/* Replace these placeholder image URLs with actual community images */}
          <div className="hero-img-container">
            <img 
              src="https://images.unsplash.com/photo-1524601500432-1e1a4c71d692" 
              alt="Indian community celebration" 
            />
          </div>
          <div className="hero-img-container">
            <img 
              src="https://images.unsplash.com/photo-1544161515-4ab6ce6db874" 
              alt="Indian food and culture" 
            />
          </div>
          <div className="hero-img-container">
            <img 
              src="https://images.unsplash.com/photo-1600074169098-fd4104a34d3d" 
              alt="Cultural celebration" 
            />
          </div>
          <div className="hero-img-container">
            <img 
              src="https://images.unsplash.com/photo-1618151313441-bc79b11e5090" 
              alt="Business networking" 
            />
          </div>
        </div>
        
        <div className="hero-content">
          <h1>About Indians in Ghana</h1>
          <p>
            Connecting, celebrating, and empowering the vibrant Indian community across Ghana since 2010
          </p>
        </div>
      </div>      <div className="container">
        {/* About Us Introduction */}
        <section className="about-intro">
          <div className="intro-content">
            <h2 className="section-title">
              <i className="fas fa-users"></i>
              Our Community
            </h2>
            <p className="intro-text">
              <strong>Indians in Ghana</strong> is a vibrant community organization dedicated to connecting, 
              supporting, and empowering the Indian diaspora living in Ghana. Founded by a group of passionate 
              community leaders in 2010, we have grown to become Ghana's largest and most active Indian community 
              network with over 5,000 members across the country.
            </p>
            <p className="intro-text">
              Our community spans across various professional backgrounds, age groups, and regions within Ghana. 
              From business owners to professionals, students to families who have lived in Ghana for generations, 
              we provide a platform for everyone to connect, collaborate, and celebrate our shared heritage while 
              embracing our new home.
            </p>
          </div>
        </section>
        
        {/* Mission and Vision Section */}
        <div className="mission-vision-grid">
          <div className="mission-section">
            <h3 className="section-title">
              <i className="fas fa-bullseye"></i>
              Our Mission
            </h3>
            <p>
              To create a strong, supportive network for Indians in Ghana while promoting cultural exchange, 
              business opportunities, and community welfare. We aim to be the premier platform that connects 
              our community members with exclusive benefits, services, and opportunities.
            </p>
            <p>
              We strive to preserve and celebrate Indian culture while fostering integration with the local 
              Ghanaian community through cultural programs, business networking, and social initiatives.
            </p>
          </div>
          
          <div className="vision-section">
            <h3 className="section-title">
              <i className="fas fa-eye"></i>
              Our Vision
            </h3>
            <p>
              To build the most comprehensive and beneficial membership ecosystem for Indians in Ghana, 
              providing unmatched value through exclusive deals, community support, and cultural preservation.
            </p>
            <p>
              We envision a united, thriving Indian community that contributes significantly to Ghana's multicultural 
              landscape while maintaining strong connections to our roots and traditions.
            </p>
          </div>
        </div>
          {/* Community Initiatives */}
        <section className="community-initiatives">
          <h2 className="section-title-centered">
            <i className="fas fa-handshake"></i>
            Our Community Initiatives
          </h2>
          
          <div className="initiatives-grid">
            <div className="initiative-card">
              <div className="card-accent" style={{ background: 'var(--primary-color)' }}></div>
              <div className="card-content">
                <div className="icon-container" style={{ background: 'rgba(58, 80, 107, 0.1)' }}>
                  <i className="fas fa-graduation-cap" style={{ color: 'var(--primary-color)' }}></i>
                </div>
                <h3>Education Support</h3>
                <p>Scholarships and mentoring programs for Indian students in Ghana, plus educational workshops and career guidance.</p>
              </div>
            </div>
            
            <div className="initiative-card">
              <div className="card-accent" style={{ background: 'var(--accent-color)' }}></div>
              <div className="card-content">
                <div className="icon-container" style={{ background: 'rgba(111, 174, 175, 0.1)' }}>
                  <i className="fas fa-hands-helping" style={{ color: 'var(--accent-color)' }}></i>
                </div>
                <h3>Community Welfare</h3>
                <p>Support services for community members in need, emergency assistance, and welfare programs for the elderly.</p>
              </div>
            </div>
            
            <div className="initiative-card">
              <div className="card-accent" style={{ background: 'var(--primary-light)' }}></div>
              <div className="card-content">
                <div className="icon-container" style={{ background: 'rgba(92, 123, 164, 0.1)' }}>
                  <i className="fas fa-calendar-alt" style={{ color: 'var(--primary-light)' }}></i>
                </div>
                <h3>Cultural Celebrations</h3>
                <p>Regular events celebrating Indian festivals, cultural performances, and traditional gatherings throughout Ghana.</p>
              </div>
            </div>
          </div>
        </section>          {/* Membership Benefits Section - Refreshed */}
        <section className="membership-benefits">
          <h2 className="section-title-centered">
            <i className="fas fa-gem"></i>
            Membership Benefits
          </h2>
          
          <div className="benefits-grid-2x2">
            <div className="benefit-card-large">
              <div className="benefit-icon">
                <i className="fas fa-id-card" style={{ color: 'var(--primary-color)' }}></i>
              </div>
              <div className="benefit-content">
                <h4>Digital Membership Card</h4>
                <p>Get your digital membership card with QR code and barcode for easy verification.</p>
              </div>
            </div>
            
            <div className="benefit-card-large">
              <div className="benefit-icon">
                <i className="fas fa-users" style={{ color: 'var(--primary-light)' }}></i>
              </div>
              <div className="benefit-content">
                <h4>Community Network</h4>
                <p>Connect with the Indian community in Ghana and build meaningful relationships.</p>
              </div>
            </div>
            
            <div className="benefit-card-large">
              <div className="benefit-icon">
                <i className="fas fa-tags" style={{ color: 'var(--accent-color)' }}></i>
              </div>
              <div className="benefit-content">
                <h4>Member Benefits</h4>
                <p>Access member-only events, cultural celebrations, and community gatherings.</p>
              </div>
            </div>
            
            <div className="benefit-card-large">
              <div className="benefit-icon">
                <i className="fas fa-calendar-alt" style={{ color: 'var(--accent-light)' }}></i>
              </div>
              <div className="benefit-content">
                <h4>Community Events</h4>
                <p>Stay updated on cultural events, festivals, and community gatherings.</p>
              </div>
            </div>
          </div>
        </section>
          {/* Membership Plans Section - Interactive */}        <section className="membership-plans-section" style={{ background: 'linear-gradient(to bottom, #f5f5f5, #ffffff)', padding: '3rem 1rem', margin: '2rem 0', borderRadius: '0.5rem', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)' }}>
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
                <a href="/register" className="plan-button">Join Free</a>
              </div>
            </div>
            
            <div className="membership-card silver">
              <div className="card-header">
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
                <a href="/register" className="plan-button">Upgrade to Silver</a>
              </div>
            </div>              <div className="membership-card gold featured" style={{ animation: 'pulse 2s infinite' }}>
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
                <a href="/register" className="plan-button">Upgrade to Gold</a>              </div>
            </div>
          </div>
        </section>        {/* Clear floating elements if any */}
        <div style={{ clear: 'both' }}></div>
      </div>
      
      {/* Join Us CTA - Moved outside container */}
      <div className="contact-cta">
        <h3>
          <i className="fas fa-handshake"></i> Join Our Community Today!
        </h3>
        <p>
          Become part of Ghana's most connected Indian community. Access exclusive deals, 
          make meaningful connections, and celebrate our culture together.
        </p>
        <div className="cta-buttons">
          <a href="/register" className="cta-button-primary">
            <i className="fas fa-user-plus"></i> Register Now
          </a>
          <a href="/contact" className="cta-button-secondary">
            <i className="fas fa-envelope"></i> Contact Us
          </a>
        </div>
      </div>
    </div>
  );
};

export default About;
