  import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../services/api.js';
import { useNotification } from '../contexts/NotificationContext';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { showNotification } = useNotification();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      showNotification('Please enter your email address', 'error');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showNotification('Please enter a valid email address', 'error');
      return;
    }

    setLoading(true);
    
    try {
      const response = await authApi.requestPasswordReset(email);
      setSubmitted(true);
      showNotification(response.message || 'Password reset email sent! Please check your inbox.', 'success');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'An error occurred. Please try again.';
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
            <i className="fas fa-key"></i> Forgot Password
          </h2>
          <div className="card-icon">
            <i className="fas fa-unlock-alt"></i>
          </div>
        </div>

        <div className="form-container" style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
          {!submitted ? (
            <>
              <p style={{ marginBottom: '20px', textAlign: 'center' }}>
                Enter your email address below and we'll send you a link to reset your password.
              </p>
              
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="email">
                    <i className="fas fa-envelope"></i> Email Address
                  </label>
                  <input 
                    type="email" 
                    id="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your registered email" 
                    required 
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary btn-block" 
                  disabled={loading}
                  style={{ marginTop: '20px' }}
                >
                  <i className="fas fa-paper-plane"></i> {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          ) : (
            <div className="success-message" style={{ textAlign: 'center' }}>
              <i className="fas fa-check-circle" style={{ fontSize: '48px', color: '#28a745', marginBottom: '15px' }}></i>
              <h3>Check Your Email</h3>
              <p>
                We've sent a password reset link to <strong>{email}</strong>.<br />
                Please check your inbox and spam folder.
              </p>
              <p>
                The link will expire in 30 minutes for security reasons.
              </p>
            </div>
          )}
          
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <Link to="/login" style={{ color: '#3b82f6' }}>
              <i className="fas fa-arrow-left"></i> Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
