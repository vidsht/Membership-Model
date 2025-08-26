import React, { useState, useEffect } from 'react';
import { useNotification } from '../../../contexts/NotificationContext';
import api from '../../../services/api';
import './QuickChangePassword.css';

const QuickChangePassword = ({ user, isOpen, onClose, onUpdate }) => {
  const { showNotification } = useNotification();
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
    notifyUser: true,
    sendByEmail: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: []
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      // Reset form when modal opens
      setFormData({
        newPassword: '',
        confirmPassword: '',
        notifyUser: true,
        sendByEmail: true
      });
      setErrors({});
      setPasswordStrength({ score: 0, feedback: [] });
    }
  }, [isOpen, user]);

  const calculatePasswordStrength = (password) => {
    const score = { value: 0, feedback: [] };
    
    if (password.length === 0) {
      return { score: 0, feedback: [] };
    }
    
    if (password.length < 8) {
      score.feedback.push('Password should be at least 8 characters');
    } else {
      score.value += 1;
    }
    
    if (!/[a-z]/.test(password)) {
      score.feedback.push('Add lowercase letters');
    } else {
      score.value += 1;
    }
    
    if (!/[A-Z]/.test(password)) {
      score.feedback.push('Add uppercase letters');
    } else {
      score.value += 1;
    }
    
    if (!/\d/.test(password)) {
      score.feedback.push('Add numbers');
    } else {
      score.value += 1;
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      score.feedback.push('Add special characters');
    } else {
      score.value += 1;
    }
    
    return { score: score.value, feedback: score.feedback };
  };

  const generateRandomPassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    setFormData(prev => ({
      ...prev,
      newPassword: password,
      confirmPassword: password
    }));
    setPasswordStrength(calculatePasswordStrength(password));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));

    if (name === 'newPassword') {
      setPasswordStrength(calculatePasswordStrength(value));
    }

    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters long';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm the password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        newPassword: formData.newPassword,
        notifyUser: formData.notifyUser,
        sendByEmail: formData.sendByEmail
      };

      await api.put(`/admin/users/${user.id}/password`, payload);
      
      showNotification('Password changed successfully', 'success');
      
      if (onUpdate) {
        onUpdate();
      }
      
      onClose();
    } catch (error) {
      console.error('Error changing password:', error);
      showNotification(
        error.response?.data?.message || 'Failed to change password',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    switch (passwordStrength.score) {
      case 0:
      case 1: return '#ef4444';
      case 2: return '#f59e0b';
      case 3: return '#eab308';
      case 4: return '#84cc16';
      case 5: return '#22c55e';
      default: return '#6b7280';
    }
  };

  const getPasswordStrengthText = () => {
    switch (passwordStrength.score) {
      case 0: return 'Very Weak';
      case 1: return 'Weak';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Strong';
      case 5: return 'Very Strong';
      default: return '';
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content quick-change-password-modal">
        <div className="modal-header">
          <h3>Change Password</h3>
          <button type="button" className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="user-info-section">
            <h4>Merchant Information</h4>
            <div className="user-details-grid">
              <div className="info-row">
                <span className="info-label">Name:</span>
                <span className="info-value">{user.fullName || 'N/A'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Email:</span>
                <span className="info-value">{user.email || 'N/A'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Business:</span>
                <span className="info-value">{user.businessName || 'N/A'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Status:</span>
                <span className={`status-badge status-${user.status}`}>
                  {user.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="password-form">
            <div className="form-group">
              <label htmlFor="newPassword">New Password <span className="required">*</span></label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  className={`form-control ${errors.newPassword ? 'error' : ''}`}
                  placeholder="Enter new password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
              {errors.newPassword && <span className="form-error">{errors.newPassword}</span>}
              
              {/* Password Strength Indicator */}
              {formData.newPassword && (
                <div className="password-strength">
                  <div className="strength-bar">
                    <div 
                      className="strength-fill" 
                      style={{
                        width: `${(passwordStrength.score / 5) * 100}%`,
                        backgroundColor: getPasswordStrengthColor()
                      }}
                    ></div>
                  </div>
                  <div className="strength-text" style={{ color: getPasswordStrengthColor() }}>
                    {getPasswordStrengthText()}
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <ul className="strength-feedback">
                      {passwordStrength.feedback.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password <span className="required">*</span></label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`form-control ${errors.confirmPassword ? 'error' : ''}`}
                placeholder="Confirm new password"
                disabled={isLoading}
              />
              {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
            </div>

            <div className="password-tools">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={generateRandomPassword}
                disabled={isLoading}
              >
                <i className="fas fa-magic"></i> Generate Password
              </button>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="notifyUser"
                  checked={formData.notifyUser}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
                <span>Notify merchant about password change</span>
              </label>
            </div>

            {formData.notifyUser && (
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="sendByEmail"
                    checked={formData.sendByEmail}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                  <span>Send new password via email</span>
                </label>
              </div>
            )}

            <div className="password-notice">
              <div className="notice-box">
                <i className="fas fa-exclamation-triangle"></i>
                <div>
                  <strong>Important:</strong> The merchant will need to use this new password to log in. 
                  {formData.sendByEmail 
                    ? ' The new password will be sent to their email address securely.' 
                    : ' Please share the new password with them securely through a different communication channel.'
                  }
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={isLoading || !formData.newPassword || !formData.confirmPassword}
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Changing...
              </>
            ) : (
              <>
                <i className="fas fa-key"></i> Change Password
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickChangePassword;
