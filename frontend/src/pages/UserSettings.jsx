import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import api from '../services/api';

const UserSettings = () => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Ghana'
    },
    profilePicture: '',
    preferences: {
      newsletter: true,
      eventNotifications: true,
      memberDirectory: true
    }
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || '',
        address: {
          street: user.address?.street || '',
          city: user.address?.city || '',
          state: user.address?.state || '',
          zipCode: user.address?.zipCode || '',
          country: user.address?.country || 'Ghana'
        },
        profilePicture: user.profilePicture || '',
        preferences: {
          newsletter: user.preferences?.newsletter ?? true,
          eventNotifications: user.preferences?.eventNotifications ?? true,
          memberDirectory: user.preferences?.memberDirectory ?? true
        }
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };
  const { showNotification } = useNotification();
  
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await api.put('/users/profile', formData);
      updateUser(response.data.user);
      setSuccess('Profile updated successfully! Your changes have been saved.');
      showNotification('Profile updated successfully! Your changes have been saved.', 'success');
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to update profile. Please try again.';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      const errorMsg = 'New passwords do not match. Please check and try again.';
      setError(errorMsg);
      showNotification(errorMsg, 'error');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      const errorMsg = 'New password must be at least 6 characters long.';
      setError(errorMsg);
      showNotification(errorMsg, 'error');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.put('/users/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      
      const successMsg = 'Password changed successfully! Your account is now more secure.';
      setSuccess(successMsg);
      showNotification(successMsg, 'success');
      
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to change password. Please check your current password and try again.';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Account Settings</h1>
        <p>Manage your profile, preferences, and security settings</p>
      </div>

      {/* Notification */}
      {(error || success) && (
        <div className={`notification ${success ? 'success' : 'error'}`}>
          <span>{error || success}</span>
          <button onClick={() => {
            setError('');
            setSuccess('');
          }}>×</button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="settings-tabs">
        <button 
          className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <i className="fas fa-user"></i> Profile
        </button>
        <button 
          className={`tab ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <i className="fas fa-shield-alt"></i> Security
        </button>
        <button 
          className={`tab ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          <i className="fas fa-cog"></i> Preferences
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="settings-section">
          <h2>Profile Information</h2>
          <form onSubmit={handleProfileUpdate} className="settings-form">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="fullName">
                  <i className="fas fa-user"></i> Full Name
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">
                  <i className="fas fa-envelope"></i> Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">
                  <i className="fas fa-phone"></i> Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+233 XX XXX XXXX"
                />
              </div>

              <div className="form-group">
                <label htmlFor="profilePicture">
                  <i className="fas fa-image"></i> Profile Picture URL
                </label>
                <input
                  type="url"
                  id="profilePicture"
                  name="profilePicture"
                  value={formData.profilePicture}
                  onChange={handleInputChange}
                  placeholder="https://example.com/your-photo.jpg"
                />
              </div>
            </div>

            <div className="address-section">
              <h3>Address Information</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="street">
                    <i className="fas fa-road"></i> Street Address
                  </label>
                  <input
                    type="text"
                    id="street"
                    name="address.street"
                    value={formData.address.street}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="city">
                    <i className="fas fa-city"></i> City
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="state">
                    <i className="fas fa-map"></i> State/Region
                  </label>
                  <input
                    type="text"
                    id="state"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="zipCode">
                    <i className="fas fa-mail-bulk"></i> ZIP/Postal Code
                  </label>
                  <input
                    type="text"
                    id="zipCode"
                    name="address.zipCode"
                    value={formData.address.zipCode}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              <i className="fas fa-save"></i>
              {loading ? 'Updating...' : 'Update Profile'}
            </button>
          </form>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="settings-section">
          <h2>Security Settings</h2>
          <form onSubmit={handlePasswordChange} className="settings-form">
            <div className="form-group">
              <label htmlFor="currentPassword">
                <i className="fas fa-lock"></i> Current Password
              </label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={passwordForm.currentPassword}
                onChange={handlePasswordInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">
                <i className="fas fa-key"></i> New Password
              </label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={passwordForm.newPassword}
                onChange={handlePasswordInputChange}
                minLength="6"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">
                <i className="fas fa-check"></i> Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordInputChange}
                minLength="6"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              <i className="fas fa-shield-alt"></i>
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="settings-section">
          <h2>Notification Preferences</h2>
          <form onSubmit={handleProfileUpdate} className="settings-form">
            <div className="preferences-grid">
              <div className="preference-item">
                <div className="preference-info">
                  <h4>Newsletter Subscription</h4>
                  <p>Receive monthly community updates and announcements</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    name="preferences.newsletter"
                    checked={formData.preferences.newsletter}
                    onChange={handleInputChange}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="preference-item">
                <div className="preference-info">
                  <h4>Event Notifications</h4>
                  <p>Get notified about upcoming community events and gatherings</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    name="preferences.eventNotifications"
                    checked={formData.preferences.eventNotifications}
                    onChange={handleInputChange}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="preference-item">
                <div className="preference-info">
                  <h4>Member Directory</h4>
                  <p>Allow other members to find and connect with you</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    name="preferences.memberDirectory"
                    checked={formData.preferences.memberDirectory}
                    onChange={handleInputChange}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              <i className="fas fa-save"></i>
              {loading ? 'Saving...' : 'Save Preferences'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default UserSettings;
