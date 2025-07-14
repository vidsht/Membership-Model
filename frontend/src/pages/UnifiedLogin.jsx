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
        navigate('/merchant/dashboard');
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
        navigate('/merchant/dashboard');
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
    <div className="page active">
      <div className="unified-login-card">
        <div className="login-tabs">
          <button 
            className={`tab-btn ${activeTab === 'user' ? 'active' : ''}`}
            onClick={() => setActiveTab('user')}
          >
            <i className="fas fa-user"></i> Member Login
          </button>
          <button 
            className={`tab-btn ${activeTab === 'merchant' ? 'active' : ''}`}
            onClick={() => setActiveTab('merchant')}
          >
            <i className="fas fa-store"></i> Merchant Login
          </button>
          <div className={`slider ${activeTab}`}></div>
        </div>
          <div className={`login-content ${activeTab}`}>
          <div className="login-panels-container">
            <div className="login-panel" id="user-login">
              <div className="login-form-header">
                <h2><i className="fas fa-sign-in-alt"></i> Welcome Back</h2>
                <p>Access your membership benefits and exclusive deals</p>
              </div>
              
              <div className="login-image-container">
                <img 
                  src="https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80" 
                  alt="Member Login" 
                  className="login-image"
                  onError={(e) => {
                    e.target.src = 'https://placehold.co/600x400/CCCCCC/333333?text=Login+Image';
                  }}
                />
              </div>
            </div>
              <div className="login-panel" id="merchant-login">
              <div className="login-form-header">
                <h2><i className="fas fa-store"></i> Welcome Back</h2>
                <p>Access your business dashboard and manage offers</p>
              </div>
              
              <div className="login-image-container">
                <img 
                  src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80" 
                  alt="Merchant Login" 
                  className="login-image"
                  onError={(e) => {
                    e.target.src = 'https://placehold.co/600x400/CCCCCC/333333?text=Merchant+Login';
                  }}
                />
                
                <div className="merchant-benefits">
                  <h3>Business Benefits</h3>
                  <ul>
                    <li><i className="fas fa-users"></i> Access to 500+ community members</li>
                    <li><i className="fas fa-tags"></i> Create exclusive deals and offers</li>
                    <li><i className="fas fa-chart-bar"></i> Business analytics dashboard</li>
                    <li><i className="fas fa-star"></i> Featured business listings</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          <div className="login-form-container">
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="email">
                  <i className="fas fa-envelope"></i> Email Address
                </label>
                <input 
                  type="email" 
                  id="email" 
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder={activeTab === 'user' ? "Enter your email" : "Enter your business email"} 
                  required 
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="password">
                  <i className="fas fa-lock"></i> Password
                </label>
                <input 
                  type="password" 
                  id="password" 
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter password" 
                  required 
                />
              </div>
              
              <div className="form-options">
                <label className="checkbox-container">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  <span>Remember Me</span>
                </label>
                
                <Link to="/forgot-password" className="forgot-password">
                  Forgot Password?
                </Link>
              </div>
              
              <button type="submit" className="login-btn" disabled={loading}>
                <i className="fas fa-sign-in-alt"></i> 
                {loading ? 'Logging in...' : activeTab === 'user' ? 'Sign in' : 'Sign in as Merchant'}
              </button>
            </form>
            
            <div className="login-footer">
              <p>Don't have an account?</p>
              {activeTab === 'user' ? (
                <Link to="/register" className="register-btn">
                  <i className="fas fa-user-plus"></i> Register as Member
                </Link>
              ) : (
                <Link to="/merchant/register" className="register-btn">
                  <i className="fas fa-store"></i> Register as Merchant
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedLogin;
