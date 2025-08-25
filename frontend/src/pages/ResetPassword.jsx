import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { authApi } from '../services/api.js';
import { useNotification } from '../contexts/NotificationContext';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator/PasswordStrengthIndicator';

const ResetPassword = () => {
  const [passwords, setPasswords] = useState({
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [validToken, setValidToken] = useState(true);
  const [completed, setCompleted] = useState(false);
  
  const { token } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  useEffect(() => {
    // Validate token on component mount
    const validateToken = async () => {
      try {
        await authApi.validateResetToken(token);
      } catch (error) {
        setValidToken(false);
        showNotification('Password reset link is invalid or has expired', 'error');
      }
    };

    validateToken();
  }, [token, showNotification]);

  const handleInputChange = (e) => {
    setPasswords({
      ...passwords,
      [e.target.id]: e.target.value
    });
  };

  const validateForm = () => {
    // Password validation with strength criteria
    const passwordCriteria = {
      hasMinLength: passwords.password.length >= 6,
      hasMaxLength: passwords.password.length <= 20,
      hasNumber: /\d/.test(passwords.password),
      hasSymbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passwords.password),
      hasLowercase: /[a-z]/.test(passwords.password),
      hasUppercase: /[A-Z]/.test(passwords.password),
      onlyLatin: /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/.test(passwords.password)
    };
    
    const isPasswordValid = Object.values(passwordCriteria).every(Boolean);
    
    if (!isPasswordValid) {
      const failedCriteria = [];
      if (!passwordCriteria.hasMinLength) failedCriteria.push('At least 6 characters');
      if (!passwordCriteria.hasMaxLength) failedCriteria.push('Maximum 20 characters');
      if (!passwordCriteria.hasNumber) failedCriteria.push('One number');
      if (!passwordCriteria.hasSymbol) failedCriteria.push('One symbol');
      if (!passwordCriteria.hasLowercase) failedCriteria.push('One lowercase letter');
      if (!passwordCriteria.hasUppercase) failedCriteria.push('One uppercase letter');
      if (!passwordCriteria.onlyLatin) failedCriteria.push('Only Latin letters and symbols');
      
      showNotification(`Password requirements: ${failedCriteria.join(', ')}`, 'error');
      return false;
    }

    if (passwords.password !== passwords.confirmPassword) {
      showNotification('Passwords do not match', 'error');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.resetPassword(token, passwords.password);
      setCompleted(true);
      showNotification(response.message || 'Password has been reset successfully!', 'success');
      
      // Redirect to login after 3 seconds
      // setTimeout(() => {
      //   navigate('/login');
      // }, 3000);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'An error occurred while resetting your password';
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!validToken) {
    return (
      <div className="page active">
        <div className="card active-section">
          <div className="card-header">
            <h2 className="card-title">
              <i className="fas fa-exclamation-triangle"></i> Invalid Reset Link
            </h2>
          </div>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <p>The password reset link is invalid or has expired.</p>
            <Link to="/forgot-password" className="btn btn-primary" style={{ marginTop: '20px' }}>
              Request New Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page active">
      <div className="card active-section">
        <div className="card-header">
          <h2 className="card-title">
            <i className="fas fa-key"></i> Reset Password
          </h2>
          <div className="card-icon">
            <i className="fas fa-lock"></i>
          </div>
        </div>

        <div className="form-container" style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
          {!completed ? (
            <>
              <p style={{ marginBottom: '20px', textAlign: 'center' }}>
                Please enter your new password below.
              </p>
              
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="password">
                    <i className="fas fa-lock"></i> New Password
                  </label>
                  <input 
                    type="password" 
                    id="password" 
                    value={passwords.password}
                    onChange={handleInputChange}
                    placeholder="Enter new password" 
                    required 
                  />
                  <PasswordStrengthIndicator 
                    password={passwords.password} 
                    showCriteria={true} 
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">
                    <i className="fas fa-lock"></i> Confirm New Password
                  </label>
                  <input 
                    type="password" 
                    id="confirmPassword" 
                    value={passwords.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm your new password" 
                    required 
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn btn-success btn-block" 
                  disabled={loading}
                  style={{ marginTop: '20px' }}
                >
                  <i className="fas fa-check-circle"></i> {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            </>
          ) : (
            <div className="success-message" style={{ textAlign: 'center' }}>
              <i className="fas fa-check-circle" style={{ fontSize: '48px', color: '#28a745', marginBottom: '15px' }}></i>
              <h3>Password Reset Successful</h3>
              <p>
                Your password has been reset successfully.<br />
                You will be redirected to the login page shortly.
              </p>
              <Link to="/login" className="btn btn-primary" style={{ marginTop: '20px' }}>
                Go to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
