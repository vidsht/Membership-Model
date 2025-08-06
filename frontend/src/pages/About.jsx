import React from 'react';
import '../styles/about.css';
import '../styles/membership-plans.css';

const About = () => {
  return (
    <div className="about-page">
      <div className="about-page-content">
        {/* Hero Banner with Images */}
        <div className="about-hero">
          <div className="hero-image-grid">
            {/* Community and cultural images */}
            <div className="hero-img-container">
              <img 
                src="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" 
                alt="Indian community celebration in Ghana" 
              />
            </div>
            <div className="hero-img-container">
              <img 
                src="https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" 
                alt="Traditional Indian festival celebration" 
              />
            </div>
            <div className="hero-img-container">
              <img 
                src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" 
                alt="Community gathering and networking" 
              />
            </div>
            <div className="hero-img-container">
              <img 
                src="https://images.unsplash.com/photo-1515187029135-18ee286d815b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" 
                alt="Business networking and professional connections" 
              />
            </div>
          </div>
          
          <div className="hero-content-about">
            <h1>About Indians in Ghana</h1>
            <p>
              Connecting, celebrating, and empowering the vibrant Indian community across Ghana since 2010
            </p>
          </div>
        </div>

        <div className="container">
        {/* About Us Introduction - Enhanced */}
        <div className="about-intro membership-benefits-alt-about">
          <div className="membership-benefits-alt-container-about">
            <div className="membership-benefits-alt-header-about">
              <h2>
                Our Community
              </h2>
              <p>
                <strong>Indians in Ghana</strong> is a vibrant community organization dedicated to connecting, 
                supporting, and empowering the Indian diaspora living in Ghana. Founded by a group of passionate 
                community leaders in 2010, we have grown to become Ghana's largest and most active Indian community 
                network with over 5,000 members across the country.
              </p>
              <p>
                Our community spans across various professional backgrounds, age groups, and regions within Ghana. 
                From business owners to professionals, students to families who have lived in Ghana for generations, 
                we provide a platform for everyone to connect, collaborate, and celebrate our shared heritage while 
                embracing our new home.
              </p>
            </div>

            <div className="community-img-container">
              <img 
                src="https://images.unsplash.com/photo-1515187029135-18ee286d815b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" 
                alt="Business networking and professional connections" 
              />
            </div>
          </div>
        </div>
        
        {/* Mission and Vision Section - Enhanced */}
        <div className="membership-benefits-alt-rows-about">
          <div className="benefit-row">
            <div className="benefit-content">
              <div className="benefit-text">
                <div className="benefit-icon">
                <i className="fas fa-bullseye"></i>
              </div>
                <h3> Our Mission</h3>
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
            </div>

            <div className="benefit-content">
              <div className="benefit-text">
                <div className="benefit-icon">
                <i className="fas fa-eye"></i>
              </div>
                <h3>Our Vision</h3>
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
        </section>         
              {/* Clear floating elements if any */}
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
    </div>
  );
};

export default About;
