import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

const Login = () => {
  const [activeTab, setActiveTab] = useState('user-phone');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phone: '',
    otp: ''
  });
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [rememberMe, setRememberMe] = useState(false);

  const { login, isAuthenticated, error, clearError } = useAuth();
  const { showNotification: notify } = useNotification();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Clear errors when component mounts or form changes
  useEffect(() => {
    if (clearError) {
      clearError();
    }
  }, [clearError, activeTab]);

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

  const handleTabSwitch = (tabId) => {
    setActiveTab(tabId);
    setFormData({ email: '', password: '', phone: '', otp: '' });
    setOtpSent(false);
    if (clearError) {
      clearError();
    }
  };

  const handlePhoneLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!otpSent) {
        // Send OTP
        const result = await login({ phone: formData.phone }, 'phone');
        if (result.success) {
          setOtpSent(true);
          showNotification('OTP sent successfully! Use 123456 for demo.', 'success');
        } else {
          showNotification(result.error, 'error');
        }
      } else {
        // Verify OTP and login
        const result = await login({ phone: formData.phone, otp: formData.otp }, 'phone');
        if (result.success) {
          showNotification('Login successful!', 'success');
          navigate('/');
        } else {
          showNotification(result.error, 'error');
        }
      }
    } catch (error) {
      showNotification('An error occurred. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      localStorage.removeItem('rememberedEmail');
      const result = await login({ 
        email: formData.email, 
        password: formData.password, 
        rememberMe: rememberMe 
      });
      if (result.success) {
        // Show notification using both systems for compatibility
        showNotification(result.message || 'Login successful!', 'success');
        notify(result.message || 'Login successful! Welcome back.', 'success');
        navigate('/dashboard');
      } else {
        showNotification(result.error || 'Login failed. Please check your credentials.', 'error');
        notify(result.error || 'Login failed. Please check your credentials.', 'error');
      }
    } catch (error) {
      console.error('Login error details:', error);
      const errorMessage = error.response?.data?.message || 'An error occurred. Please try again.';
      showNotification(errorMessage, 'error');
      notify(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMerchantLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login({ email: formData.email, password: formData.password }, 'email');
      if (result.success) {
        if (result.data.user.isMerchant || result.data.user.isAdmin) {
          showNotification('Merchant login successful!', 'success');
          navigate('/merchant');
        } else {
          showNotification('Access denied. Merchant account required.', 'error');
        }
      } else {
        showNotification(result.error, 'error');
      }
    } catch (error) {
      showNotification('An error occurred. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page active">
      <div className="card active-section">
        <div className="card-header">
          <h2 className="card-title">
            <i className="fas fa-sign-in-alt"></i> Login to Your Account
          </h2>
          <div className="card-icon">
            <i className="fas fa-user-circle"></i>
          </div>
        </div>

        {/* Notification */}
        {(notification.message || error) && (
          <div className={`notification ${notification.type || 'error'}`}>
            <span>{notification.message || error}</span>
            <button onClick={() => {
              setNotification({ message: '', type: '' });
              if (clearError) {
                clearError();
              }
            }}>×</button>
          </div>
        )}

        <div className="login-container">
          <div className="login-image-container">
            <img 
              src="https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80" 
              alt="Login" 
              className="login-image"
              onError={(e) => {
                e.target.src = 'https://placehold.co/600x400/CCCCCC/333333?text=Login+Image';
              }}
            />
          </div>

          <div className="login-form-container">
            {/* Tab Navigation */}
            <div className="tabs" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center', gap: '15px' }}>
              <div 
                className={`btn ${activeTab === 'user-phone' ? 'btn-primary active' : 'btn-secondary'}`}
                onClick={() => handleTabSwitch('user-phone')}
                style={{ flex: 1, cursor: 'pointer' }}
              >
                User Phone Login
              </div>
              <div 
                className={`btn ${activeTab === 'user-email' ? 'btn-primary active' : 'btn-secondary'}`}
                onClick={() => handleTabSwitch('user-email')}
                style={{ flex: 1, cursor: 'pointer' }}
              >
                User Email Login
              </div>
              <div 
                className={`btn ${activeTab === 'merchant-login' ? 'btn-primary active' : 'btn-secondary'}`}
                onClick={() => handleTabSwitch('merchant-login')}
                style={{ flex: 1, cursor: 'pointer' }}
              >
                Merchant Login
              </div>
            </div>

            {/* User Phone Login Tab */}
            {activeTab === 'user-phone' && (
              <div className="tab-content active">
                <form onSubmit={handlePhoneLogin}>
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input 
                      type="tel" 
                      id="phone" 
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="e.g., +233 24 123 4567" 
                      required 
                    />
                  </div>

                  {!otpSent ? (
                    <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                      <i className="fas fa-sms"></i> {loading ? 'Sending...' : 'Send OTP'}
                    </button>
                  ) : (
                    <div className="form-group" style={{ marginTop: '20px' }}>
                      <label>Enter OTP (Use: 123456)</label>
                      <input 
                        type="text" 
                        id="otp" 
                        value={formData.otp}
                        onChange={handleInputChange}
                        placeholder="Enter 6-digit OTP" 
                        maxLength="6"
                        required 
                      />
                      <button type="submit" className="btn btn-success btn-block" disabled={loading}>
                        <i className="fas fa-check-circle"></i> {loading ? 'Verifying...' : 'Login'}
                      </button>
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* User Email Login Tab */}
            {activeTab === 'user-email' && (
              <div className="tab-content active">
                <form onSubmit={handleEmailLogin}>
                  <div className="login-table-container">
                    <table className="login-table">
                      <tbody>
                        <tr>
                          <td className="label-cell">
                            <label htmlFor="email"><i className="fas fa-envelope"></i> Email Address</label>
                          </td>
                          <td className="input-cell">
                            <input 
                              type="email" 
                              id="email" 
                              value={formData.email}
                              onChange={handleInputChange}
                              placeholder="Enter your email" 
                              required 
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="label-cell">
                            <label htmlFor="password"><i className="fas fa-lock"></i> Password</label>
                          </td>
                          <td className="input-cell">
                            <input 
                              type="password" 
                              id="password" 
                              value={formData.password}
                              onChange={handleInputChange}
                              placeholder="Enter password" 
                              required 
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="label-cell">
                            <label htmlFor="remember-me"><i className="fas fa-save"></i> Remember Me</label>
                          </td>
                          <td className="input-cell">
                            <div className="remember-me-container" style={{ display: 'flex', alignItems: 'center' }}>
                              <input 
                                type="checkbox" 
                                id="remember-me" 
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                style={{ marginRight: '8px' }}
                              />
                              <label htmlFor="remember-me" style={{ margin: 0, cursor: 'pointer', fontSize: '0.9em' }}>
                                Keep me signed in on this device
                              </label>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td className="label-cell">
                            <label><i className="fas fa-user-plus"></i> Quick Actions</label>
                          </td>
                          <td className="input-cell">
                            <div className="login-links">
                              <Link to="/register">New User? Register</Link>
                              <Link to="/forgot-password">Forgot Password?</Link>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td colSpan="2" className="button-cell">
                            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                              <i className="fas fa-sign-in-alt"></i> {loading ? 'Logging in...' : 'Login with Email'}
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </form>
              </div>
            )}

            {/* Merchant Login Tab */}
            {activeTab === 'merchant-login' && (
              <div className="tab-content active">
                <form onSubmit={handleMerchantLogin}>
                  <div className="login-table-container">
                    <table className="login-table">
                      <tbody>
                        <tr>
                          <td className="label-cell">
                            <label htmlFor="merchant-email"><i className="fas fa-building"></i> Business Email</label>
                          </td>
                          <td className="input-cell">
                            <input 
                              type="email" 
                              id="email" 
                              value={formData.email}
                              onChange={handleInputChange}
                              placeholder="Enter business email" 
                              required 
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="label-cell">
                            <label htmlFor="merchant-password"><i className="fas fa-key"></i> Password</label>
                          </td>
                          <td className="input-cell">
                            <input 
                              type="password" 
                              id="password" 
                              value={formData.password}
                              onChange={handleInputChange}
                              placeholder="Enter password" 
                              required 
                            />
                          </td>
                        </tr>
                        <tr>
                          <td colSpan="2" className="button-cell">
                            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                              <i className="fas fa-sign-in-alt"></i> {loading ? 'Logging in...' : 'Merchant Login'}
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td colSpan="2" className="footer-cell">
                            <div className="form-footer">
                              <p>New Business? <Link to="/register">Register as Merchant</Link></p>
                              <p><small>Join 500+ businesses serving the Indian community in Ghana</small></p>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
