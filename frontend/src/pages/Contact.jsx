import React, { useState } from 'react';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(false);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 5000);
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);    try {
      // Simulate form submission
      await new Promise(resolve => setTimeout(resolve, 2000));
      showNotification('Thank you for contacting us! Your message has been sent successfully. We will get back to you within 24 hours.', 'success');
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
    } catch (error) {
      showNotification('Sorry, there was an error sending your message. Please check your connection and try again.', 'error');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Hero Section */}
      <div style={{
        background: 'linear-gradient(135deg, #FFF0C4 0%, #E8C999 100%)',
        padding: '4rem 2rem',
        textAlign: 'center',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.1)',
          zIndex: 1
        }}></div>
        <div style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          <h1 style={{
            fontSize: '3rem',
            fontWeight: '700',
            marginBottom: '1rem',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
          }}>
            Contact Us
          </h1>
          <p style={{
            fontSize: '1.2rem',
            marginBottom: '2rem',
            opacity: '0.9'
          }}>
             We'd love to hear from you! Whether you have questions, suggestions, or need assistance, 
            our team is here to help you make the most of your membership.
          </p>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '3rem',
            marginTop: '2rem'
          }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{
                display: 'block',
                fontSize: '2.5rem',
                fontWeight: '700',
                marginBottom: '0.5rem'
              }}>24hrs</span>
              <span style={{
                fontSize: '0.9rem',
                opacity: '0.8',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>Response Time</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{
                display: 'block',
                fontSize: '2.5rem',
                fontWeight: '700',
                marginBottom: '0.5rem'
              }}>24/7</span>
              <span style={{
                fontSize: '0.9rem',
                opacity: '0.8',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>WhatsApp Support</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ 
        marginTop: '-2rem', 
        position: 'relative', 
        zIndex: 3 
      }}>
        {/* Notification */}
        {notification.message && (
        <div className={`notification show ${notification.type}`}>
          <i className={`fas ${notification.type === 'success' ? 'fa-check-circle' : notification.type === 'error' ? 'fa-exclamation-triangle' : 'fa-info-circle'}`}></i>
          {notification.message}
        </div>
      )}

      <div className="card">
        <div className="contact-content">
          <div className="contact-container" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '30px',
            marginBottom: '40px'
          }}>
            
            {/* Contact Information */}
            <div className="contact-info">
              <h3 className="section-title">
                <i className="fas fa-map-marker-alt" style={{ color: 'var(--primary)', marginRight: '10px' }}></i>
                Get In Touch
              </h3>
              
              <div className="contact-methods" style={{ marginTop: '20px' }}>
                <div className="contact-method" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  padding: '15px',
                  background: 'var(--light)',
                  borderRadius: 'var(--border-radius-btn)',
                  marginBottom: '15px',
                  borderLeft: '4px solid var(--primary)'
                }}>
                  <i className="fas fa-phone" style={{ fontSize: '1.5rem', color: 'var(--primary)' }}></i>
                  <div>
                    <strong>Phone</strong>
                    <p style={{ margin: '0', color: '#666' }}>+233 (0) 57 232 3912</p>
                    <small>Mon-Fri, 9:00 AM - 6:00 PM</small>
                  </div>
                </div>

                <div className="contact-method" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  padding: '15px',
                  background: 'var(--light)',
                  borderRadius: 'var(--border-radius-btn)',
                  marginBottom: '15px',
                  borderLeft: '4px solid var(--secondary)'
                }}>
                  <i className="fas fa-envelope" style={{ fontSize: '1.5rem', color: 'var(--secondary)' }}></i>
                  <div>
                    <strong>Email</strong>
                    <p style={{ margin: '0', color: '#666' }}>cards@indiansinghana.com</p>
                    <small>We respond within 24 hours</small>
                  </div>
                </div>

                <div className="contact-method" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  padding: '15px',
                  background: 'var(--light)',
                  borderRadius: 'var(--border-radius-btn)',
                  marginBottom: '15px',
                  borderLeft: '4px solid var(--success)'
                }}>
                  <i className="fab fa-whatsapp" style={{ fontSize: '1.5rem', color: 'var(--success)' }}></i>
                  <div>
                    <strong>WhatsApp</strong>
                    <p style={{ margin: '0', color: '#666' }}>+233 (0) 57 232 3912</p>
                    <small>Quick support available</small>
                  </div>
                </div>

                <div className="contact-method" style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '15px',
                  padding: '15px',
                  background: 'var(--light)',
                  borderRadius: 'var(--border-radius-btn)',
                  marginBottom: '15px',
                  borderLeft: '4px solid var(--accent)'
                }}>
                  <i className="fas fa-map-marker-alt" style={{ fontSize: '1.5rem', color: 'var(--accent)' }}></i>
                  <div>
                    <strong>Office Address</strong>
                    <p style={{ margin: '0', color: '#666' }}>
                      123 Community Street<br />
                      East Legon, Accra<br />
                      Ghana
                    </p>
                    <small>Visits by appointment only</small>
                  </div>
                </div>
              </div>

              {/* Social Media Links */}
              <div className="social-links" style={{ marginTop: '30px' }}>
                <h4 style={{ marginBottom: '15px' }}>Follow Us</h4>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  <a href="#" className="social-link" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 15px',
                    background: '#3b5998',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: 'var(--border-radius-btn)',
                    transition: 'all 0.3s ease'
                  }}>
                    <i className="fab fa-facebook"></i>
                    Facebook
                  </a>
                  <a href="#" className="social-link" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 15px',
                    background: '#e4405f',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: 'var(--border-radius-btn)',
                    transition: 'all 0.3s ease'
                  }}>
                    <i className="fab fa-instagram"></i>
                    Instagram
                  </a>
                  <a href="#" className="social-link" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 15px',
                    background: '#cd201f',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: 'var(--border-radius-btn)',
                    transition: 'all 0.3s ease'
                  }}>
                    <i className="fab fa-youtube"></i>
                    YouTube
                  </a>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="contact-form">
              <h3 className="section-title">
                <i className="fas fa-paper-plane" style={{ color: 'var(--secondary)', marginRight: '10px' }}></i>
                Send Us a Message
              </h3>
              
              <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
                <div className="form-group">
                  <label htmlFor="name">Full Name *</label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email address"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="e.g., +233 24 123 4567"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="subject">Subject *</label>
                  <select
                    id="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select a subject</option>
                    <option value="membership">Membership Questions</option>
                    <option value="technical">Technical Support</option>
                    <option value="deals">Deals & Offers</option>
                    <option value="events">Events & Programs</option>
                    <option value="business">Business Partnership</option>
                    <option value="feedback">Feedback & Suggestions</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="message">Message *</label>
                  <textarea
                    id="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder="Please provide details about your inquiry..."
                    rows="5"
                    required
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary btn-block"
                  disabled={loading}
                  style={{ marginTop: '20px' }}
                >
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Sending...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane"></i> Send Message
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

  

          {/* Emergency Contact */}
          <div className="emergency-contact" style={{
            background: 'linear-gradient(135deg, var(--danger), #d6345f)',
            color: 'white',
            padding: '20px',
            borderRadius: 'var(--border-radius-card)',
            textAlign: 'center',
            marginTop: '30px'
          }}>
            <h4 style={{ marginBottom: '10px' }}>
              <i className="fas fa-exclamation-triangle"></i> Emergency Contact
            </h4>
            <p style={{ marginBottom: '10px' }}>
              For urgent community matters or emergencies affecting our members:
            </p>
            <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
              <i className="fas fa-phone"></i> +233 (0) 57 232 3912
            </p>
            <small>Available 24/7 for genuine emergencies only</small>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default Contact;