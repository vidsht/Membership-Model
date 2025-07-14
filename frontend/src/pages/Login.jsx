import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

const Login = () => {  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);  const [notification, setNotification] = useState({ message: '', type: '' });

  const { login, isAuthenticated } = useAuth();
  const { showNotification: notify } = useNotification();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 5000);
  };
  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    });
  };  // Check for saved credentials on component mount
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

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);    try {
      console.log('Login attempt with:', { email: formData.email, rememberMe });
      
      // Validate email format client-side before sending request
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        showNotification('Please enter a valid email address.', 'error');
        setLoading(false);
        return;
      }
      
      // Handle "Remember Me" functionality
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', formData.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }      const result = await login({ 
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
        </div>        {/* Notification */}
        {notification.message && (
          <div className={`notification ${notification.type || 'info'}`}>
            <span>{notification.message}</span>
            <button onClick={() => setNotification({ message: '', type: '' })}>×</button>
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
          </div>          <div className="login-form-container">
            {/* User Email Login Form */}
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
                            />                          </td>
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
                  </div>                </form>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
