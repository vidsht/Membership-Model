import React, { useState, useEffect } from 'react';
import { useNotification } from '../../../../contexts/NotificationContext';
import api from '../../../../services/api';
import PasswordStrengthIndicator from '../../../PasswordStrengthIndicator/PasswordStrengthIndicator';
import { checkPasswordStrength } from '../../../../utils/passwordStrength';
import './QuickChangePassword.css';

const QuickChangePassword = ({ 
  user, 
  isOpen, 
  onClose, 
  onUpdate 
}) => {
  const { showNotification } = useNotification();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [isOpen]);

  const handleClose = () => {
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  const handleSave = async () => {
    if (!user) return;
    
    // Validate password using centralized password strength checker
    const passwordValidation = checkPasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      showNotification(passwordValidation.message, 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showNotification('Passwords do not match', 'error');
      return;
    }
    
    try {
      setSaving(true);
      console.log('🔐 QuickChangePassword: Changing password for user:', user.id);
      
      const payload = {
        newPassword: newPassword
      };
      
      const response = await api.put(`/admin/users/${user.id}/password`, payload);
      console.log('✅ QuickChangePassword: Password change response:', response);
      
      if (response.data.success) {
        showNotification('Password updated successfully. User will be notified.', 'success');
        handleClose();
        if (onUpdate) {
          onUpdate();
        }
      } else {
        throw new Error(response.data.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('❌ QuickChangePassword: Error changing password:', error);
      if (error.response && error.response.data && error.response.data.message) {
        showNotification(error.response.data.message, 'error');
      } else {
        showNotification('Failed to change password. Please try again.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const generateStrongPassword = () => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '@#$%^&*';
    
    const getRandomChar = (str) => str[Math.floor(Math.random() * str.length)];
    
    // Ensure at least one character from each type
    let password = 
      getRandomChar(uppercase) +
      getRandomChar(lowercase) +
      getRandomChar(numbers) +
      getRandomChar(symbols);
    
    // Add 4-6 more random characters
    const allChars = uppercase + lowercase + numbers + symbols;
    const additionalLength = 4 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < additionalLength; i++) {
      password += getRandomChar(allChars);
    }
    
    // Shuffle the password
    password = password.split('').sort(() => Math.random() - 0.5).join('');
    
    setNewPassword(password);
    setConfirmPassword(password);
  };

  if (!isOpen || !user) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content quick-change-password-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Change User Password</h3>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="user-info-section">
            <h4>{user.fullName}</h4>
            <div className="user-details-grid">
              <div className="info-row">
                <span className="info-label">Email:</span>
                <span className="info-value">{user.email}</span>
              </div>
              <div className="info-row">
                <span className="info-label">User Type:</span>
                <span className="info-value">
                  {user.userType ? user.userType.charAt(0).toUpperCase() + user.userType.slice(1) : 'User'}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Status:</span>
                <span className="info-value">
                  <span className={`status-badge status-${user.status}`}>
                    {user.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : 'Unknown'}
                  </span>
                </span>
              </div>
            </div>

            <div className="password-form">
              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="form-control"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
                <PasswordStrengthIndicator password={newPassword} showCriteria={true} />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="form-control"
                  autoComplete="new-password"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <small className="form-error">Passwords do not match</small>
                )}
              </div>

              <div className="password-tools">
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={generateStrongPassword}
                >
                  <i className="fas fa-magic"></i> Generate Strong Password
                </button>
              </div>

              <div className="password-notice">
                <div className="notice-box">
                  <i className="fas fa-info-circle"></i>
                  <div>
                    <strong>Important:</strong> The user will be notified of their new password via email. 
                    They should change it after their next login for security.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={handleClose}>
            Cancel
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={saving || !newPassword || newPassword !== confirmPassword}
          >
            {saving ? 'Changing Password...' : 'Change Password'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickChangePassword;
