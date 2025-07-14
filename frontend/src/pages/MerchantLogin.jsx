import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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
    <div className="page active">
      <div className="card active-section">
        <div className="card-header">
          <h2 className="card-title">
            <i className="fas fa-store"></i> Merchant Login
          </h2>
          <div className="card-icon">
            <i className="fas fa-building"></i>
          </div>
        </div>

        {/* Notification */}
        {notification.message && (
          <div className={`notification ${notification.type || 'info'}`}>
            <span>{notification.message}</span>
            <button onClick={() => setNotification({ message: '', type: '' })}>×</button>
          </div>
        )}

        <div className="login-container">
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
              <h3>Merchant Benefits</h3>
              <ul>
                <li><i className="fas fa-users"></i> Access to 500+ community members</li>
                <li><i className="fas fa-tags"></i> Create exclusive deals and offers</li>
                <li><i className="fas fa-chart-bar"></i> Business analytics dashboard</li>
                <li><i className="fas fa-star"></i> Featured business listings</li>
              </ul>
            </div>
          </div>

          <div className="login-form-container">
            <form onSubmit={handleLogin}>
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
                          placeholder="Enter your business email" 
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
                          placeholder="Enter your password" 
                          required 
                        />
                      </td>
                    </tr>
                    <tr>
                      <td colSpan="2" className="options-cell">
                        <div className="form-options">
                          <label className="checkbox">
                            <input type="checkbox" />
                            <span className="checkmark"></span>
                            Remember me
                          </label>
                          <Link to="/forgot-password" className="forgot-password">Forgot password?</Link>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan="2" className="submit-cell">
                        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                          <i className="fas fa-sign-in-alt"></i> {loading ? 'Logging in...' : 'Login to Dashboard'}
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </form>

            <div className="auth-links">
              <p>Don't have a merchant account?</p>
              <Link to="/merchant/register" className="btn btn-secondary">
                <i className="fas fa-store"></i> Register as Merchant
              </Link>
              
              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <p>Looking for regular membership?</p>
                <Link to="/login" className="regular-login-link">
                  <i className="fas fa-user"></i> Member Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MerchantLogin;
