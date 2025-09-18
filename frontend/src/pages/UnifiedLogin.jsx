import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import '../styles/UnifiedLogin.css';

const UnifiedLogin = () => {
  const [activeTab, setActiveTab] = useState('user'); // 'user' or 'merchant'
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login, merchantLogin, isAuthenticated, user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (user?.userType === 'merchant') {
        navigate('/merchant-dashboard');
      } else {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, user, navigate]);

  // Check for saved credentials on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setFormData(prevState => ({
        ...prevState,
        email: savedEmail
      }));
      setRememberMe(true);
    }
  }, []);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Validate email format client-side before sending request
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        showNotification('Please enter a valid email address.', 'error');
        setLoading(false);
        return;
      }
      
      let result;
      
      // Handle "Remember Me" functionality
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', formData.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      if (activeTab === 'user') {
        result = await login({ 
          email: formData.email, 
          password: formData.password, 
          rememberMe: rememberMe 
        });
        
        if (result.success) {
          showNotification('Login successful! Welcome back.', 'success');
          navigate('/dashboard');
        }
      } else {
        result = await merchantLogin({ 
          email: formData.email, 
          password: formData.password 
        });
        
        // Check if the logged-in user is actually a merchant
        if (result.user && result.user.userType !== 'merchant') {
          showNotification('This login is for merchants only. Please use the regular login.', 'error');
          setLoading(false);
          return;
        }
        
        showNotification('Login successful! Welcome to your merchant dashboard.', 'success');
        navigate('/merchant-dashboard');
      }
    } catch (error) {
      console.error('Login error details:', error);
      const errorMessage = error.response?.data?.message || 'Login failed. Please check your credentials.';
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Back to Home floating button */}
      <Link className="back-home" to="/" style={{
        position: 'fixed',
        top: '18px',
        right: '24px',
        zIndex: 1000,
        background: 'rgba(255,255,255,0.95)',
        color: '#660B05',
        borderRadius: '50px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        padding: '8px 16px',
        fontWeight: 600,
        fontSize: '0.95rem',
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        textDecoration: 'none',
        border: '1px solid #e2e8f0',
        transition: 'background 0.2s'
      }}>
        <i className="fas fa-home home-icon" style={{ fontSize: '1.1rem', marginRight: '2px' }}></i>
        Home
      </Link>

      <div className="unified-login-container">
        <div className="unified-login-card">
          {/* Left Side - Hero Section */}
          <div className="login-hero-section">
            <div className="hero-content-login">
              <div className="logo-login">
                <img className="logo-img-login" src="/logo.jpeg" alt="logo" />
              </div>
              <h1 className="hero-title">Indians in Ghana</h1>
              <h2 className="hero-subheading">Membership Program</h2>
              <p className="hero-subtitle">
                Join our vibrant community and unlock exclusive benefits, deals, and connections.
              </p>
              <div className="hero-features">
                <div className="hero-feature">
                  <i className="fas fa-star"></i>
                  <span>Exclusive member deals and discounts</span>
                </div>
                <div className="hero-feature">
                  <i className="fas fa-network-wired"></i>
                  <span>Connect with fellow community members</span>
                </div>
                <div className="hero-feature">
                  <i className="fas fa-calendar-alt"></i>
                  <span>Access to cultural events and programs</span>
                </div>
                <div className="hero-feature">
                  <i className="fas fa-briefcase"></i>
                  <span>Business networking opportunities</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="login-form-section">
            <div className="login-form-container">
              <div className="form-header">
                <h2 className="form-title">
                  {activeTab === 'user' ? 'Welcome Back!' : 'Merchant Portal'}
                </h2>
              </div>

              <form onSubmit={handleLogin} className="login-form">
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input
                    type="password"
                    id="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    required
                  />
                </div>

                <div className="remember-forgot">
                  <label className="remember-me">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Remember me</span>
                  </label>
                  <Link to="/forgot-password" className="forgot-password">
                    Forgot password?
                  </Link>
                </div>

                <button 
                  type="submit" 
                  className="login-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Signing in...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-sign-in-alt"></i> Sign In
                    </>
                  )}
                </button>
              </form>

              <div className="form-divider">
                <span>New to our community?</span>
              </div>

              <div className="register-link">
                {activeTab === 'user' ? (
                  <p>Don't have an account? <Link to="/unified-registration">Join us today!</Link></p>
                ) : (
                  <p>Want to partner with us? <Link to="/unified-registration">Register your business</Link></p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UnifiedLogin;
