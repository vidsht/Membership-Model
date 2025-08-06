import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Add responsive styles
const styles = `
  @media (max-width: 768px) {
    .merchant-login-grid {
      grid-template-columns: 1fr !important;
    }
    .merchant-hero h1 {
      font-size: 2rem !important;
    }
    .merchant-benefits-grid {
      grid-template-columns: 1fr !important;
    }
  }
`;

const MerchantLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: '' });

  const { merchantLogin, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // If user is already logged in as merchant, go to merchant dashboard
      if (user?.userType === 'merchant') {
        navigate('/merchant/dashboard');
      } else {
        // If logged in as regular user, go to regular dashboard
        navigate('/');
      }
    }
  }, [isAuthenticated, user, navigate]);

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

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);    try {
      const result = await merchantLogin({ email: formData.email, password: formData.password });
      
      // Check if the logged-in user is actually a merchant
      if (result.user && result.user.userType !== 'merchant') {
        showNotification('This login is for merchants only. Please use the regular login.', 'error');
        return;      }
      
      const successMessage = response.message || 'Login successful! Welcome to your merchant dashboard.';
      showNotification(successMessage, 'success');
      navigate('/merchant/dashboard');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed. Please check your credentials.';
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        {/* Hero Section */}
        <div className="merchant-hero" style={{
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.9) 100%)',
          padding: '3rem 2rem',
          textAlign: 'center',
          color: 'white'
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            marginBottom: '1rem',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
          }}>
            <i className="fas fa-store" style={{ marginRight: '0.5rem' }}></i>
            Merchant Portal
          </h1>
          <p style={{
            fontSize: '1.1rem',
            opacity: '0.9',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Access your business dashboard and connect with our thriving community of 5000+ members
          </p>
        </div>

        {/* Main Content */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '2rem',
          marginTop: '-1rem'
        }}>
          <div className="merchant-login-grid" style={{
            background: 'white',
            borderRadius: '20px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden',
            maxWidth: '1000px',
            width: '100%',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 0
          }}>
            {/* Left Side - Benefits */}
            <div style={{
              background: 'linear-gradient(45deg, #f8fafc 0%, #e9f1fa 100%)',
              padding: '3rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <h3 style={{
                fontSize: '1.8rem',
                fontWeight: '600',
                color: '#2d3748',
                marginBottom: '2rem',
                textAlign: 'center'
              }}>
                Why Partner With Us?
              </h3>
              <div className="merchant-benefits-grid" style={{ space: '1.5rem' }}>
                {[
                  { icon: 'fa-users', text: 'Access to 5000+ community members', color: '#667eea' },
                  { icon: 'fa-tags', text: 'Create exclusive deals and offers', color: '#764ba2' },
                  { icon: 'fa-chart-bar', text: 'Advanced business analytics', color: '#48bb78' },
                  { icon: 'fa-star', text: 'Featured business listings', color: '#ed8936' }
                ].map((benefit, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1rem',
                    background: 'white',
                    borderRadius: '12px',
                    marginBottom: '1rem',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                    border: `2px solid ${benefit.color}20`
                  }}>
                    <div style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '12px',
                      background: `${benefit.color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '1rem'
                    }}>
                      <i className={`fas ${benefit.icon}`} style={{ 
                        fontSize: '1.2rem', 
                        color: benefit.color 
                      }}></i>
                    </div>
                    <span style={{ 
                      fontWeight: '500', 
                      color: '#2d3748' 
                    }}>{benefit.text}</span>
                  </div>
                ))}
              </div>
            </div>

          {/* Right Side - Login Form */}
          <div style={{ padding: '3rem' }}>
            {/* Notification */}
            {notification.message && (
              <div style={{
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                background: notification.type === 'error' ? '#fed7d7' : '#c6f6d5',
                color: notification.type === 'error' ? '#9b2c2c' : '#22543d',
                border: `1px solid ${notification.type === 'error' ? '#fc8181' : '#68d391'}`
              }}>
                <span>{notification.message}</span>
                <button 
                  onClick={() => setNotification({ message: '', type: '' })}
                  style={{
                    float: 'right',
                    background: 'none',
                    border: 'none',
                    fontSize: '1.2rem',
                    cursor: 'pointer'
                  }}
                >×</button>
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: '#2d3748'
                }}>
                  <i className="fas fa-envelope" style={{ marginRight: '0.5rem', color: '#667eea' }}></i>
                  Email Address
                </label>
                <input 
                  type="email" 
                  id="email" 
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your business email"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    transition: 'border-color 0.3s',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: '#2d3748'
                }}>
                  <i className="fas fa-lock" style={{ marginRight: '0.5rem', color: '#667eea' }}></i>
                  Password
                </label>
                <input 
                  type="password" 
                  id="password" 
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    transition: 'border-color 0.3s',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" style={{ marginRight: '0.5rem' }} />
                  <span style={{ fontSize: '0.9rem', color: '#4a5568' }}>Remember me</span>
                </label>
                <Link 
                  to="/forgot-password"
                  style={{
                    color: '#667eea',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                  }}
                >
                  Forgot password?
                </Link>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'transform 0.2s',
                  marginBottom: '1.5rem',
                  opacity: loading ? 0.7 : 1
                }}
                onMouseOver={(e) => !loading && (e.target.style.transform = 'translateY(-1px)')}
                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
              >
                <i className="fas fa-sign-in-alt" style={{ marginRight: '0.5rem' }}></i>
                {loading ? 'Logging in...' : 'Login to Dashboard'}
              </button>

              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#4a5568', marginBottom: '1rem' }}>
                  Don't have a merchant account?
                </p>
                <Link 
                  to="/merchant/register"
                  style={{
                    display: 'inline-block',
                    padding: '0.5rem 1.5rem',
                    background: 'transparent',
                    color: '#667eea',
                    border: '2px solid #667eea',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: '500',
                    transition: 'all 0.3s',
                    marginBottom: '1rem'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = '#667eea';
                    e.target.style.color = 'white';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = 'transparent';
                    e.target.style.color = '#667eea';
                  }}
                >
                  <i className="fas fa-store" style={{ marginRight: '0.5rem' }}></i>
                  Register as Merchant
                </Link>
                
                <div>
                  <p style={{ color: '#4a5568', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    Looking for regular membership?
                  </p>
                  <Link 
                    to="/login"
                    style={{
                      color: '#667eea',
                      textDecoration: 'none',
                      fontWeight: '500'
                    }}
                  >
                    <i className="fas fa-user" style={{ marginRight: '0.5rem' }}></i>
                    Member Login
                  </Link>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default MerchantLogin;
