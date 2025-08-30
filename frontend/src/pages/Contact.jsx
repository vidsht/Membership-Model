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
            color: '#550B0B',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
          }}>
            Contact Us
          </h1>
          <p style={{
            fontSize: '1.2rem',
            marginBottom: '2rem',
            color: '#550B0B',
            opacity: '0.9'
          }}>
            We'd love to hear from you! Whether you have questions, suggestions, or need assistance, 
            our team is here to help you make the most of your membership.
          </p>
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
              <h3 style={{ color: '#4C0808', marginRight: '10px' }}>
                <i className="fas fa-map-marker-alt" style={{ color: '#4C0808', marginRight: '10px' }}></i>
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
                  <i className="fas fa-phone" style={{ fontSize: '1.5rem', color: '#4C0808' }}></i>
                  <div>
                    <strong style={{ color: '#4C0808' }}>Phone</strong>
                    <p style={{ margin: '0', color: '#666' }}>+233 57 232 3912</p>
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
                    <strong style={{ color: '#4C0808' }}>Email</strong>
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
                    <strong style={{ color: '#4C0808' }}>WhatsApp</strong>
                    <p style={{ margin: '0', color: '#666' }}>+233 57 232 3912</p>
                    <small>Quick support available</small>
                  </div>
                </div>
              </div>

              {/* Social Media Links */}
              <div className="social-links" style={{ marginTop: '30px' }}>
                <h4 style={{ marginBottom: '15px' }}>Follow Us</h4>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  <a href="https://www.facebook.com/profile.php?id=61565930895123" className="social-link" style={{
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
                  <a href="https://www.instagram.com/indians_in_ghana" className="social-link" style={{
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
                  <a href="https://www.youtube.com/channel/UCh0RgaDreZwXpo3nbMAoEYw" className="social-link" style={{
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
                  <a href="https://whatsapp.com/channel/0029Vb67LBOG3R3k14CA7y03" className="social-link" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 15px',
                    background: '#0CD7A2',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: 'var(--border-radius-btn)',
                    transition: 'all 0.3s ease'
                  }}>
                    <i className="fab fa-whatsapp"></i>
                    Whatsapp Channel
                  </a>
                </div>
              </div>
            </div>
          </div>

  

          {/* Emergency Contact */}
          <div className="emergency-contact" style={{
            background: 'linear-gradient(135deg, #E1D2AA, #d6bd77ff)',
            color: 'white',
            padding: '20px',
            borderRadius: 'var(--border-radius-card)',
            textAlign: 'center',
            marginTop: '30px'
          }}>
            <h4 style={{ marginBottom: '10px', color: '#4C0808' }}>
              <i className="fas fa-exclamation-triangle"></i> Emergency Contact
            </h4>
            <p style={{ marginBottom: '10px', color: '#4C0808' }}>
              For urgent community matters or emergencies affecting our members:
            </p>
            <p style={{ fontSize: '1.2rem', fontWeight: 'bold',color: '#4C0808' }}>
              <i className="fas fa-phone"></i> +233 57 232 3912
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default Contact;